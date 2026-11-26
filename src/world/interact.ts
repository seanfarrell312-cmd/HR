import { DOOR_PRESETS, LOCK_MESSAGES } from '../data/doorPresets';
import { DOORS, PLAYER_RADIUS, TRANSITIONS, type Level, type LockState, type Spawn } from '../data/layout';
import { HOLY_CIRCLE, RELIC_NAMES, REMINDERS } from '../data/story';
import type { GameState } from '../state/store';
import { altarOpen, bibleWanted, blessBlocker, churchSealed, searchesDoor, tableReady, type StoryEvent } from '../story/events';
import { circleHitsRect, doorRect } from './collision';

export type Action =
  | { kind: 'toggle-door'; doorId: string }
  | { kind: 'travel'; to: Spawn }
  | { kind: 'message'; text: string }
  | { kind: 'story'; event: StoryEvent }
  | { kind: 'open-keypad' }
  /** Open a note to read: the supervisor's letter (the default) or the Easter egg. */
  | { kind: 'read-note'; note?: 'office' | 'stool' }
  | { kind: 'none' };

export interface Resolution {
  /** Short verb line shown under the crosshair. */
  prompt: string;
  /** What pressing E does. */
  action: Action;
  /** What holding the primary button completes, when the target supports it. */
  hold?: StoryEvent;
}

type Player = { x: number; y: number; level: Level };

const NONE: Resolution = { prompt: '', action: { kind: 'none' } };

export function lockState(state: GameState, doorId: string): LockState {
  // Story progress unlocks doors the preset starts locked.
  if (doorId === 'gate' && state.flags.has('gate-unlocked')) return 'unlocked';
  if (doorId === 'chapel' && state.inventory.has('chapel-key')) return 'unlocked';
  if (doorId === 'storage' && state.inventory.has('storage-key')) return 'unlocked';
  const preset = DOOR_PRESETS.find((p) => p.id === state.door_preset);
  return preset?.locks[doorId] ?? 'unlocked';
}

export function inHolyCircle(p: Player): boolean {
  return p.level === 0 && Math.hypot(p.x - HOLY_CIRCLE.x, p.y - HOLY_CIRCLE.y) <= HOLY_CIRCLE.r;
}

/**
 * Decide what pressing E (or holding the primary button) on a target does.
 * Never mutates state: the caller applies the action, so repeated presses
 * can't fire anything twice.
 */
export function resolve(targetId: string | null, state: GameState, player: Player): Resolution {
  if (!targetId) return NONE;
  const [kind, id] = targetId.split(':');

  if (kind === 'door') {
    const door = DOORS.find((d) => d.id === id);
    if (!door) return NONE;
    // Day 2: no leaving the church until it has been searched (D2-02).
    if (id === 'church' && !state.open_doors.has(id) && churchSealed(state) && player.level === 0 && player.y > door.y) {
      return { prompt: door.label, action: { kind: 'story', event: { type: 'try-church-doors' } } };
    }
    const lock = lockState(state, id);
    if (lock !== 'unlocked') {
      // Day 2: trying it is part of the search for the chalice (D2-02).
      if (searchesDoor(state, id)) {
        return { prompt: `${door.label} — ${lock}`, action: { kind: 'story', event: { type: 'try-locked-door', id } } };
      }
      const text = id === 'gate' ? "It's locked. There's a keypad beside it." : LOCK_MESSAGES[lock];
      return { prompt: `${door.label} — ${lock}`, action: { kind: 'message', text } };
    }
    if (state.open_doors.has(id)) {
      // Never swing a door shut onto the player.
      if (player.level === door.level && circleHitsRect(player.x, player.y, PLAYER_RADIUS + 0.05, doorRect(door))) {
        return { prompt: `${door.label}`, action: { kind: 'message', text: 'Step out of the doorway first.' } };
      }
      return { prompt: `E  Close ${door.label.toLowerCase()}`, action: { kind: 'toggle-door', doorId: id } };
    }
    return { prompt: `E  Open ${door.label.toLowerCase()}`, action: { kind: 'toggle-door', doorId: id } };
  }

  if (kind === 'transition') {
    const t = TRANSITIONS.find((tr) => tr.id === id);
    if (!t) return NONE;
    return { prompt: `E  ${t.label}`, action: { kind: 'travel', to: t.to } };
  }

  if (kind === 'item') return resolveItem(id, state, player);
  return NONE;
}

const story = (prompt: string, event: StoryEvent): Resolution => ({ prompt, action: { kind: 'story', event } });
const say = (prompt: string, text: string): Resolution => ({ prompt, action: { kind: 'message', text } });

function resolveItem(id: string, s: GameState, player: Player): Resolution {
  if (id.startsWith('candle-')) {
    const index = Number(id.slice('candle-'.length));
    if (s.candles_lit.has(index)) return NONE;
    if (!s.inventory.has('matches')) return say('Candle', 'I need the matches from the shelf.');
    return story('E  Light candle', { type: 'light-candle', index });
  }

  switch (id) {
    case 'keypad':
      if (s.flags.has('gate-unlocked')) return NONE;
      return { prompt: 'E  Use keypad', action: { kind: 'open-keypad' } };
    case 'drop-box':
      if (s.relic === 'none') return say('Relic drop box', REMINDERS.dropBoxEmpty);
      if (s.relic !== 'drop-box') return NONE;
      // Deliveries go in from the road; staff take them out from inside the gate.
      if (player.y < 0) return say('Relic drop box', REMINDERS.hatchInside);
      if (s.held_prop_id) return say('Relic drop box', REMINDERS.handsFull);
      return story('E  Take the delivery', { type: 'take-relic' });
    case 'office-note':
      return { prompt: 'E  Read note', action: { kind: 'read-note' } };
    case 'stool-note':
      // The Easter egg: readable any time, any day, hands full or not.
      return { prompt: 'E  Read note', action: { kind: 'read-note', note: 'stool' } };
    case 'chapel-key':
      if (s.inventory.has('chapel-key')) return NONE;
      return story('E  Take chapel key', { type: 'take', item: 'chapel-key' });
    case 'matches':
      if (s.inventory.has('matches')) return NONE;
      return story('E  Take matches', { type: 'take', item: 'matches' });
    case 'cross':
      if (s.inventory.has('cross')) return NONE;
      return story('E  Take cross', { type: 'take', item: 'cross' });
    case 'crucifix':
      // The standing crucifix on the altar, for the ritual table.
      if (s.inventory.has('crucifix') || s.flags.has('crucifix-staged')) return NONE;
      // Too early: just its name, and E gives the thought.
      if (!altarOpen(s)) return story('Crucifix', { type: 'take', item: 'crucifix' });
      return story('E  Take crucifix', { type: 'take', item: 'crucifix' });
    case 'clock': {
      // On the desk it's part of the desk: aiming at it searches the drawers.
      if (s.clock === 'office-desk') return resolveItem('office-desk', s, player);
      if (s.clock !== 'ritual-table') return NONE;
      if (s.flags.has('clock-blessed')) {
        if (s.held_prop_id) return say('Mantel clock', 'My hands are full.');
        return story('E  Pick up clock', { type: 'pickup-clock' });
      }
      const why = blessBlocker(s) ?? (inHolyCircle(player) ? null : 'I should stand in the holy circle.');
      if (why) return say('Mantel clock', why);
      return {
        prompt: 'Hold click  Bless the clock',
        action: { kind: 'message', text: 'Hold the left mouse button to bless it.' },
        hold: { type: 'bless-clock' },
      };
    }
    case 'office-desk':
      // Day 2: the storage closet key is in the drawers (D2-06).
      if (s.flags.has('water-wanted') && !s.inventory.has('storage-key')) {
        return story('E  Search the desk drawers', { type: 'take', item: 'storage-key' });
      }
      if (s.clock !== 'held') return NONE;
      return story('E  Put the clock down', { type: 'place-clock' });

    case 'bucket':
      if (s.bucket === 'held') return NONE;
      if (s.bucket === 'closet' && !s.flags.has('storage-opened')) return NONE;
      if (s.bucket === 'chapel' && s.bucket_filled) {
        // The rod goes in before the doll is splashed (designer, 2026-11-26).
        if (!s.inventory.has('rod') || s.flags.has('rod-wet') || s.flags.has('clown-doused') || !s.flags.has('water-wanted')) return NONE;
        return story('E  Dip the rod in the holy water', { type: 'wet-rod' });
      }
      if (s.held_prop_id) return say('Bucket', REMINDERS.handsFull);
      return story('E  Pick up the bucket', { type: 'pickup-bucket' });

    case 'rod':
      if (s.inventory.has('rod') || !s.flags.has('storage-opened')) return NONE;
      return story('E  Take the holy-water rod', { type: 'take', item: 'rod' });

    case 'fountain':
      if (s.bucket !== 'held' || s.bucket_filled) return NONE;
      return story('E  Fill the bucket', { type: 'fill-bucket' });

    case 'clown':
      return resolveClown(s, player);

    case 'chalice':
      // Day 2: left on the garden bench by a prankster ghost (D2-02).
      if (s.chalice === 'garden-bench') {
        // Hidden until the church has been searched.
        if (!s.flags.has('church-searched-thought-done')) return NONE;
        if (s.held_prop_id) return say('Chalice', REMINDERS.handsFull);
        return story('E  Take the chalice', { type: 'pickup-chalice' });
      }
      if (s.chalice !== 'altar') return NONE;
      // Too early: just its name, and E gives the thought.
      if (!altarOpen(s)) return story('Chalice', { type: 'pickup-chalice' });
      if (s.held_prop_id) return say('Chalice', REMINDERS.handsFull);
      return story('E  Take the chalice', { type: 'pickup-chalice' });

    case 'ritual-table': {
      // The bucket of holy water goes down beside it (D2-07).
      if (s.bucket === 'held') return story('E  Put the bucket down', { type: 'place-bucket' });
      const chalice = s.chalice === 'held';
      const crucifix = s.inventory.has('crucifix') && !s.flags.has('crucifix-staged');
      if (chalice || crucifix) {
        const what = chalice && crucifix ? 'the chalice and crucifix' : chalice ? 'the chalice' : 'the crucifix';
        return story(`E  Set out ${what}`, { type: 'stage-table' });
      }
      if (s.held_prop_id === s.relic_kind && s.relic === 'held' && !s.flags.has('relic-blessed')) {
        if (!tableReady(s)) return say('Ritual table', REMINDERS.tableNotReady);
        return story(`E  Put the ${RELIC_NAMES[s.relic_kind]} down`, { type: 'place-relic' });
      }
      // With a relic on it, the table answers for the relic: a small,
      // rattling relic is hard to keep under the crosshair through a hold.
      if (s.relic === 'ritual-table') return resolveItem(s.relic_kind, s, player);
      return NONE;
    }

    case 'teacup':
      return resolveScriptureRelic(s, player);

    case 'music-box': {
      if (s.relic_kind !== 'music-box' || s.relic !== 'ritual-table') return NONE;
      if (s.flags.has('relic-blessed')) {
        if (s.held_prop_id) return say('Music box', REMINDERS.handsFull);
        if (s.inventory.has('bible')) return say('Music box', REMINDERS.bibleBack);
        return story('E  Pick up music box', { type: 'pickup-relic' });
      }
      // Rattling, then the two thoughts: nothing to do until the Bible is wanted.
      if (s.flags.has('relic-rattled') && !s.flags.has('bible-prompted')) return NONE;
      // Shuddering again after the scripture.
      if (s.flags.has('scripture-read') && !s.flags.has('relic-weakened')) return NONE;
      if (!tableReady(s)) return say('Music box', REMINDERS.tableNotReady);
      if (!s.inventory.has('cross')) return say('Music box', REMINDERS.needCross);
      if (s.flags.has('relic-rattled') && !s.flags.has('scripture-read')) {
        if (!s.inventory.has('bible')) return say('Music box', REMINDERS.bibleFirst);
        if (!inHolyCircle(player)) return say('Music box', REMINDERS.standInCircle);
        return {
          prompt: 'Hold click  Read the music box some scripture',
          action: { kind: 'message', text: 'Hold the left mouse button to read to it.' },
          hold: { type: 'begin-scripture' },
        };
      }
      if (!inHolyCircle(player)) return say('Music box', REMINDERS.standInCircle);
      return {
        prompt: 'Hold click  Bless the music box',
        action: { kind: 'message', text: 'Hold the left mouse button to bless it.' },
        hold: { type: 'bless-relic' },
      };
    }

    case 'bible':
      // Off the stand once the music box needs scripture; back on it after.
      if (s.inventory.has('bible')) {
        if (!s.flags.has('relic-blessed')) return NONE;
        return story('E  Put the Bible back', { type: 'return-bible' });
      }
      if (!bibleWanted(s)) return NONE;
      return story('E  Pick up the Bible', { type: 'take', item: 'bible' });

    case 'relic-table':
      if (s.held_prop_id !== s.relic_kind || s.relic !== 'held' || !s.flags.has('relic-blessed')) return NONE;
      return story(`E  Put the ${RELIC_NAMES[s.relic_kind]} on the table`, { type: 'store-relic' });
  }
  return NONE;
}

/**
 * Day 2's clown doll on the ritual table (designer, 2026-11-26): the cross
 * gets a giggle and a wiggle; scripture; the cross again sets it dancing
 * (D2-05); holy water splashed from the rod stills it, and the cross once
 * more releases it (D2-07).
 */
function resolveClown(s: GameState, player: Player): Resolution {
  if (s.relic_kind !== 'clown' || s.relic !== 'ritual-table') return NONE;
  // Aiming at the doll with the bucket in hand still sets the bucket down.
  if (s.bucket === 'held') return story('E  Put the bucket down', { type: 'place-bucket' });
  const label = 'Clown doll';
  if (s.flags.has('relic-blessed')) {
    if (s.held_prop_id) return say(label, REMINDERS.handsFull);
    if (s.inventory.has('bible')) return say(label, REMINDERS.bibleBack);
    return story('E  Pick up the clown doll', { type: 'pickup-relic' });
  }
  if (!tableReady(s)) return say(label, REMINDERS.tableNotReady);
  const bless: Resolution = {
    prompt: 'Hold click  Bless the clown doll',
    action: { kind: 'message', text: 'Hold the left mouse button to bless it.' },
    hold: { type: 'bless-relic' },
  };
  if (!s.flags.has('clown-wiggled')) {
    if (!s.inventory.has('cross')) return say(label, REMINDERS.needCross);
    if (!inHolyCircle(player)) return say(label, REMINDERS.standInCircle);
    return bless;
  }
  // Giggling and wiggling.
  if (!s.flags.has('clown-wiggle-done')) return NONE;
  if (!s.flags.has('scripture-read')) {
    if (!s.inventory.has('bible')) return say(label, REMINDERS.bibleFirst);
    if (!inHolyCircle(player)) return say(label, REMINDERS.standInCircle);
    return {
      prompt: 'Hold click  Read the clown doll some scripture',
      action: { kind: 'message', text: 'Hold the left mouse button to read to it.' },
      hold: { type: 'begin-scripture' },
    };
  }
  if (!s.flags.has('clown-danced')) {
    if (!s.inventory.has('cross')) return say(label, REMINDERS.needCross);
    if (!inHolyCircle(player)) return say(label, REMINDERS.standInCircle);
    return bless;
  }
  // Dancing, then the two thoughts.
  if (!s.flags.has('water-wanted')) return NONE;
  if (!s.flags.has('clown-doused')) {
    if (!s.inventory.has('rod')) return say(label, REMINDERS.needRod);
    if (!s.flags.has('rod-wet')) return say(label, s.bucket === 'chapel' && s.bucket_filled ? REMINDERS.rodDry : REMINDERS.holyWaterFirst);
    if (!inHolyCircle(player)) return say(label, REMINDERS.standInCircle);
    return {
      prompt: 'Hold click  Splash the clown doll with holy water',
      action: { kind: 'message', text: 'Hold the left mouse button to splash it.' },
      hold: { type: 'splash-doll' },
    };
  }
  // Going still, then "Looks like that cooled him off."
  if (!s.flags.has('clown-cool-thought-done')) return NONE;
  if (!s.inventory.has('cross')) return say(label, REMINDERS.needCross);
  if (!inHolyCircle(player)) return say(label, REMINDERS.standInCircle);
  return bless;
}

/**
 * Day 2's first relic (D2-04), on the ritual table: read it scripture with the
 * Bible from the stand, then bless it with the cross; once cleansed, pick it
 * up (after the Bible goes back).
 */
function resolveScriptureRelic(s: GameState, player: Player): Resolution {
  if (s.relic !== 'ritual-table') return NONE;
  const label = RELIC_NAMES[s.relic_kind].replace(/^./, (c) => c.toUpperCase());
  const name = RELIC_NAMES[s.relic_kind];
  if (s.flags.has('relic-blessed')) {
    if (s.held_prop_id) return say(label, REMINDERS.handsFull);
    if (s.inventory.has('bible')) return say(label, REMINDERS.bibleBack);
    return story(`E  Pick up the ${name}`, { type: 'pickup-relic' });
  }
  if (!tableReady(s)) return say(label, REMINDERS.tableNotReady);
  if (!s.flags.has('scripture-read')) {
    if (!s.inventory.has('bible')) return say(label, REMINDERS.bibleFirst);
    if (!inHolyCircle(player)) return say(label, REMINDERS.standInCircle);
    return {
      prompt: `Hold click  Read the ${name} some scripture`,
      action: { kind: 'message', text: 'Hold the left mouse button to read to it.' },
      hold: { type: 'begin-scripture' },
    };
  }
  if (!s.inventory.has('cross')) return say(label, REMINDERS.needCross);
  if (!inHolyCircle(player)) return say(label, REMINDERS.standInCircle);
  return {
    prompt: `Hold click  Bless the ${name}`,
    action: { kind: 'message', text: 'Hold the left mouse button to bless it.' },
    hold: { type: 'bless-relic' },
  };
}

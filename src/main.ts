import * as THREE from 'three';
import './style.css';
import { Sfx } from './audio/sfx';
import { DOOR_PRESETS } from './data/doorPresets';
import { ARRIVAL, TELEPORTS } from './data/layout';
import { BLESS_SECONDS, DAY_TITLES, OFFICE_NOTE, SMS, THOUGHTS } from './data/story';
import { PlayerController } from './player/controller';
import { createInitialState, type GameState } from './state/store';
import { applyEvent, type Effect, type StoryEvent } from './story/events';
import { HoldMeter } from './story/hold';
import { currentObjective } from './story/objectives';
import { Hud, type Panel } from './ui/hud';
import { showTitleScreen } from './ui/title';
import { buildWorld, poseDoor } from './world/build';
import { closedDoorColliders, staticColliders, type Collider } from './world/collision';
import { lockState, resolve, type Action } from './world/interact';
import { StoryProps } from './world/storyProps';
import { zoneAt } from './world/zones';

const REACH = 2.6;
const SKY = '#a9c6e0';
/** Seconds after arrival before the supervisor's text comes in. */
const SMS_DELAY = 2.5;

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 30, 110);
scene.add(new THREE.HemisphereLight('#dfeaf5', '#4b5a3a', 1.6));
// Interiors have no lamps yet; keep ceilings and walls readable.
scene.add(new THREE.AmbientLight('#ffffff', 0.6));
const sun = new THREE.DirectionalLight('#fff4dd', 1.4);
sun.position.set(-30, 60, 20);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
// Held items are children of the camera, so it has to be in the scene.
scene.add(camera);
const world = buildWorld();
scene.add(world.root);
const props = new StoryProps(camera);
scene.add(props.root);
const raycastTargets = [...world.raycastTargets, ...props.raycastTargets];

const hud = new Hud(app);
const sfx = new Sfx();
const player = new PlayerController(camera, renderer.domElement);
const raycaster = new THREE.Raycaster(undefined, undefined, 0, REACH);
const centre = new THREE.Vector2(0, 0);
const blessMeter = new HoldMeter(BLESS_SECONDS);
props.onChime = (volume, agitation) => sfx.chime(volume, agitation);
props.onCue = (cue) => {
  if (cue === 'ghost') sfx.play('release');
  // The thought waits until the ghost has risen and gone.
  else if (cue === 'ghost-gone') hud.say(THOUGHTS.ghost);
  else sfx.play(cue);
};

let state: GameState = createInitialState();
const fixed = staticColliders();
let colliders: Collider[] = [];
let debugVisible = import.meta.env.DEV;
let started = false;
let target: string | null = null;
let panel: Panel | null = null;
let keypadEntry = '';
let smsTimer = -1;
/** Story events waiting on a timer ('after' effects). */
let pending: { seconds: number; event: StoryEvent }[] = [];
let primaryDown = false;

function refreshColliders(): void {
  colliders = [...fixed, ...closedDoorColliders(state.open_doors)];
}

function setDoor(id: string, open: boolean): void {
  if (open) state.open_doors.add(id);
  else state.open_doors.delete(id);
  const v = world.doors.get(id);
  if (v) v.target = open ? 1 : 0;
  refreshColliders();
}

// --- Story ------------------------------------------------------------------

function dispatch(event: StoryEvent): void {
  for (const effect of applyEvent(state, event)) handleEffect(effect);
}

function handleEffect(e: Effect): void {
  switch (e.kind) {
    case 'sfx':
      sfx.play(e.id);
      break;
    case 'say':
      hud.say(e.text);
      break;
    case 'flash':
      hud.flash(e.text, 2.5);
      break;
    case 'open-door':
      setDoor(e.id, true);
      break;
    case 'sms':
      hud.setPhoneAlert(true);
      break;
    case 'purify':
      props.startPurification();
      break;
    case 'after':
      pending.push({ seconds: e.seconds, event: e.event });
      break;
    case 'objective':
      break; // the objective box follows state every frame
  }
}

/** Start (or restart) the day: bus pulls away, title card, text on its way. */
function beginDay(): void {
  props.clearEffects();
  props.startIntro();
  const card = DAY_TITLES[state.day_index];
  hud.showTitle(card?.title ?? `Day ${state.day_index}`, card?.time);
  sfx.engine(5);
  smsTimer = SMS_DELAY;
}

function reset(): void {
  closePanel();
  state = createInitialState(state.door_preset);
  pending = [];
  for (const v of world.doors.values()) {
    v.amount = v.target = 0;
    poseDoor(v);
  }
  refreshColliders();
  hud.setPhoneAlert(false);
  props.clearEffects();
  player.teleport(ARRIVAL);
  if (started) beginDay();
}

function onFirstStart(): void {
  if (started) return;
  started = true;
  beginDay();
}

// --- Panels: phone, note, keypad, inventory -------------------------------

function openPanel(kind: Panel): void {
  panel = kind;
  player.frozen = true;
  primaryDown = false;
  if (kind === 'phone') {
    hud.openPanel('phone', Hud.phoneHtml(state.inbox.map((id) => SMS[id])), 'Q or E to put away');
    hud.setPhoneAlert(false);
  } else if (kind === 'note') {
    hud.openPanel('note', Hud.noteHtml(OFFICE_NOTE), 'E to put down');
    dispatch({ type: 'read-note' });
  } else if (kind === 'inventory') {
    hud.openPanel('inventory', Hud.inventoryHtml(inventoryNames()), 'I to close');
  } else {
    keypadEntry = '';
    hud.openPanel('keypad', Hud.keypadHtml(keypadEntry), 'Type the code · Backspace to clear · E to step back');
  }
}

function inventoryNames(): string[] {
  const names = [...state.inventory].map((i) => TOOL_NAMES[i]);
  if (state.held_prop_id === 'clock') names.push('Mantel clock (carrying)');
  return names;
}

function closePanel(): void {
  if (!panel) return;
  // The gate-code objective follows once the text has been read and put away.
  if (panel === 'phone') dispatch({ type: 'read-sms' });
  panel = null;
  player.frozen = false;
  hud.closePanel();
}

function keypadKey(e: KeyboardEvent): void {
  if (e.code === 'Backspace') {
    keypadEntry = keypadEntry.slice(0, -1);
  } else if (/^[0-9]$/.test(e.key) && keypadEntry.length < 4) {
    keypadEntry += e.key;
    sfx.play('beep');
  }
  hud.updatePanel(Hud.keypadHtml(keypadEntry));
  if (keypadEntry.length === 4) {
    dispatch({ type: 'keypad-submit', code: keypadEntry });
    if (state.flags.has('gate-unlocked')) closePanel();
    else {
      keypadEntry = '';
      hud.updatePanel(Hud.keypadHtml(keypadEntry));
    }
  }
}

// --- Actions ----------------------------------------------------------------

function apply(action: Action): void {
  switch (action.kind) {
    case 'toggle-door': {
      const opening = !state.open_doors.has(action.doorId);
      setDoor(action.doorId, opening);
      if (opening) dispatch({ type: 'door-opened', id: action.doorId });
      break;
    }
    case 'travel':
      player.teleport(action.to);
      break;
    case 'message':
      hud.flash(action.text);
      break;
    case 'story':
      dispatch(action.event);
      break;
    case 'open-keypad':
      openPanel('keypad');
      break;
    case 'read-note':
      openPanel('note');
      break;
  }
}

function cyclePreset(): void {
  const i = DOOR_PRESETS.findIndex((p) => p.id === state.door_preset);
  state.door_preset = DOOR_PRESETS[(i + 1) % DOOR_PRESETS.length].id;
  // Doors the new preset locks swing shut.
  for (const id of [...state.open_doors]) {
    if (lockState(state, id) !== 'unlocked') setDoor(id, false);
  }
  hud.flash(`Door preset: ${DOOR_PRESETS[(i + 1) % DOOR_PRESETS.length].label}`);
}

// --- Pointer lock and pausing ----------------------------------------------

function lockPointer(): void {
  sfx.unlock();
  let result: unknown;
  try {
    result = renderer.domElement.requestPointerLock();
  } catch {
    startDragLook();
    return;
  }
  if (result instanceof Promise) {
    result.catch(() => {
      // Chrome refuses a re-lock for about a second after Escape; anything
      // else means this page can't capture the mouse at all (embedded
      // previews, sandboxed frames), so play on without it.
      if (performance.now() - lastUnlock < 2000) hud.setPaused(true, 'Click again to resume');
      else startDragLook();
    });
  }
}

function startDragLook(): void {
  if (player.dragLook) return;
  player.dragLook = true;
  hud.setPaused(false, '');
  hud.flash('Mouse capture is blocked here. Hold the right button and drag to look.', 4);
  onFirstStart();
}

function pause(): void {
  player.dragLook = false;
  player.clearInput();
  primaryDown = false;
  closePanel();
  hud.setPaused(true, 'Paused — click to resume');
}

let lastUnlock = -Infinity;

app.addEventListener('click', () => {
  if (!player.active) lockPointer();
});
showTitleScreen(lockPointer);
app.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('pointerlockchange', () => {
  if (player.locked) onFirstStart();
  else {
    lastUnlock = performance.now();
    primaryDown = false;
    closePanel();
  }
  hud.setPaused(!player.locked, started ? 'Paused — click to resume' : 'Click to start');
});

document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && player.active && !panel) primaryDown = true;
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) primaryDown = false;
});
// With the mouse captured, wheel events go to the canvas, not the panel.
document.addEventListener('wheel', (e) => {
  if (panel === 'note') hud.scrollPanel(e.deltaY);
});
window.addEventListener('blur', () => {
  primaryDown = false;
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Backquote') {
    debugVisible = !debugVisible;
    return;
  }
  // With pointer lock the browser handles Escape itself; drag-look needs it here.
  if (e.code === 'Escape' && player.dragLook) {
    if (panel) closePanel();
    else pause();
    return;
  }
  if (!player.active || e.repeat) return;

  if (panel) {
    if (e.code === 'KeyE' || (e.code === 'KeyQ' && panel === 'phone') || (e.code === 'KeyI' && panel === 'inventory')) closePanel();
    else if (panel === 'note' && (e.code === 'KeyW' || e.code === 'ArrowUp')) hud.scrollPanel(-80);
    else if (panel === 'note' && (e.code === 'KeyS' || e.code === 'ArrowDown')) hud.scrollPanel(80);
    else if (panel === 'keypad') keypadKey(e);
    return;
  }

  if (e.code === 'KeyE') {
    apply(resolve(target, state, player).action);
    return;
  }
  if (e.code === 'KeyQ') {
    openPanel('phone');
    return;
  }
  if (e.code === 'KeyI') {
    openPanel('inventory');
    return;
  }
  if (e.code === 'KeyO') {
    hud.showObjective();
    return;
  }
  if (!debugVisible) return;
  if (e.code === 'KeyR') {
    reset();
    hud.flash('Reset to arrival');
    return;
  }
  if (e.code === 'KeyP') {
    cyclePreset();
    return;
  }
  const tp = TELEPORTS.find((t) => t.key === e.key);
  if (tp) {
    player.teleport(tp);
    hud.flash(`Teleport: ${tp.label}`);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function findTarget(): string | null {
  raycaster.setFromCamera(centre, camera);
  // Three.js raycasts ignore `visible`, so skip hidden items (taken tools, the
  // clock while it's carried) rather than letting them catch the ray.
  const hit = raycaster.intersectObjects(raycastTargets, true).find((h) => shown(h.object));
  for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
    if (o.userData.interactId) return o.userData.interactId as string;
  }
  return null;
}

function shown(o: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

const TOOL_NAMES: Record<string, string> = { 'chapel-key': 'Chapel key', matches: 'Matches', crucifix: 'Crucifix' };

let fps = 0;
function debugText(): string {
  const zone = zoneAt(player.x, player.y, player.level);
  const preset = DOOR_PRESETS.find((p) => p.id === state.door_preset);
  const yaw = ((((player.yaw * 180) / Math.PI) % 360) + 360) % 360;
  return [
    `zone      ${zone?.label ?? '—'}`,
    `pos       x ${player.x.toFixed(1)}  y ${player.y.toFixed(1)}  level ${player.level}`,
    `facing    ${yaw.toFixed(0)}°`,
    `fps       ${fps.toFixed(0)}`,
    `day       ${state.day_index}   objective ${state.objective_id}`,
    `done      ${state.completed_objectives.join(' ') || '—'}`,
    `flags     ${[...state.flags].join(', ') || '—'}`,
    `items     ${[...state.inventory].join(', ') || '—'}`,
    `candles   ${state.candles_lit.size}/4   clock ${state.clock}`,
    `doors     ${preset?.label}  (P to cycle)`,
    `open      ${[...state.open_doors].join(', ') || '—'}`,
    `target    ${target ?? '—'}`,
    '',
    'R reset   Shift fast walk',
    ...TELEPORTS.map((t) => `${t.key.padEnd(2)}${t.label}`),
  ].join('\n');
}

reset();
hud.setPaused(true, 'Click to start');

// Dev-only handle for automated checks and console poking.
if (import.meta.env.DEV) {
  Object.assign(window, {
    __hr: { player, get state() { return state; }, setDoor, reset, findTarget, dispatch, apply, resolve: () => resolve(target, state, player) },
  });
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  fps = fps * 0.95 + (dt > 0 ? 1 / dt : 0) * 0.05;

  player.allowFast = debugVisible;
  player.update(dt, colliders);

  // The inventory pauses the world; sound carries on.
  const worldPaused = panel === 'inventory';

  if (smsTimer > 0 && player.active && !worldPaused) {
    smsTimer -= dt;
    if (smsTimer <= 0) dispatch({ type: 'receive-sms', id: 'gateCode' });
  }

  if (!worldPaused && pending.length) {
    for (const p of pending) p.seconds -= dt;
    const due = pending.filter((p) => p.seconds <= 0);
    pending = pending.filter((p) => p.seconds > 0);
    for (const p of due) dispatch(p.event);
  }

  if (started && !worldPaused) {
    // Position checks; each event is a no-op once it has fired.
    const at = { x: player.x, y: player.y, level: player.level };
    if (!state.flags.has('church-approached')) dispatch({ type: 'approach-church', ...at });
    if (state.flags.has('heading-home')) {
      if (!state.fired_scares.includes('d1-tree-peek')) dispatch({ type: 'near-peek', ...at });
      dispatch({ type: 'reach-gate', ...at });
    }
  }

  for (const v of world.doors.values()) {
    if (v.amount === v.target) continue;
    const step = dt * 2.5;
    v.amount = v.target > v.amount ? Math.min(v.target, v.amount + step) : Math.max(v.target, v.amount - step);
    poseDoor(v);
  }

  target = player.active && !panel ? findTarget() : null;
  // The clock can't be picked up until it has finished settling.
  if (target === 'item:clock' && props.purifying) target = null;
  const res = resolve(target, state, player);
  if (blessMeter.update(dt, primaryDown, !!res.hold) && res.hold) dispatch(res.hold);
  hud.setHold(blessMeter.progress);
  hud.setPrompt(res.prompt);
  hud.setObjective(started ? currentObjective(state).task(state) : '');
  hud.setCornerHints(started);
  hud.update(dt);
  hud.setDebug(debugVisible, debugText());

  props.sync(state, dt, { active: !!res.hold && primaryDown, progress: blessMeter.progress }, camera.position, worldPaused);
  renderer.render(scene, camera);
});

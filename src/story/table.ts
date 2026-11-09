import type { GameState } from '../state/store';

/** The ritual table is set: chalice and standing crucifix in their places (D1-05). */
export function tableReady(s: GameState): boolean {
  return s.chalice === 'ritual-table' && s.flags.has('crucifix-staged');
}

/** The ritual site is prepared: candles lit and the table set. Only then does the clock get restless. */
export function siteReady(s: GameState): boolean {
  return s.candles_lit.size === 4 && tableReady(s);
}

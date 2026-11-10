// A door that shuts itself a set time after it opens (the front gate,
// decisions 2026-11-10). Pure timing: the caller says whether anything is in
// the doorway and closes the door when told to. A blocked door waits until
// the way is clear rather than shutting on the player.

export class AutoClose {
  private left = -1;

  constructor(readonly seconds: number) {}

  /** The door has just opened: start counting. */
  opened(): void {
    this.left = this.seconds;
  }

  /** The door has closed (or the day reset): stop counting. */
  cancel(): void {
    this.left = -1;
  }

  get running(): boolean {
    return this.left >= 0;
  }

  /**
   * Advance by `dt` seconds. Returns true exactly once, when the door should
   * close now; while `blocked`, an expired timer keeps waiting.
   */
  update(dt: number, blocked: boolean): boolean {
    if (this.left < 0) return false;
    this.left = Math.max(0, this.left - dt);
    if (this.left > 0 || blocked) return false;
    this.left = -1;
    return true;
  }
}

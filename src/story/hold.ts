/**
 * Hold-to-act meter (doc 5.1: "short visible circular progress meter while
 * held"). Fires once per press: after it completes, the button must be
 * released before it can fill again. Letting go, losing the target or
 * pausing empties it.
 */
export class HoldMeter {
  progress = 0;
  private latched = false;

  constructor(private readonly seconds: number) {}

  /** Returns true on the frame the hold completes. */
  update(dt: number, holding: boolean, targetValid: boolean): boolean {
    if (!holding) {
      this.latched = false;
      this.progress = 0;
      return false;
    }
    if (this.latched || !targetValid) {
      this.progress = 0;
      return false;
    }
    this.progress = Math.min(1, this.progress + dt / this.seconds);
    if (this.progress < 1) return false;
    this.latched = true;
    this.progress = 0;
    return true;
  }

  cancel(): void {
    this.progress = 0;
  }
}

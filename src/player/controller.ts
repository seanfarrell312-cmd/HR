import * as THREE from 'three';
import { EYE_HEIGHT, PLAYER_RADIUS, toWorld, type Level, type Spawn } from '../data/layout';
import { moveCircle, type Collider } from '../world/collision';

const WALK_SPEED = 3.4;
const FAST_SPEED = 10;
const MOUSE_SENSITIVITY = 0.0022;
const MAX_PITCH = Math.PI / 2 - 0.05;
/**
 * Chrome and Edge on Windows sometimes report one wildly large mouse movement
 * while the pointer is locked, which whips the view round (S2 playtest,
 * 2026-11-09). A single event this far beyond the recent movement is dropped.
 */
const SPIKE_PIXELS = 150;
const SPIKE_RATIO = 6;

/** First-person walker: pointer-lock look, WASD movement, circle collision. */
export class PlayerController {
  x = 0;
  y = 0;
  level: Level = 0;
  yaw = 0;
  pitch = 0;
  /** Debug-only fast movement while Shift is held. */
  allowFast = false;
  /**
   * Drag-to-look mode for browsers that refuse pointer lock (embedded
   * previews, some iframes). Play runs without capturing the mouse; the right
   * button drags the view so the left stays free for hold actions.
   */
  dragLook = false;
  /** Movement and look are suspended, e.g. while a note or keypad is open. */
  frozen = false;

  private keys = new Set<string>();
  /** Smoothed size of recent mouse movements, to tell a fast flick from a glitch. */
  private recentMove = 0;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private readonly element: HTMLElement,
  ) {
    camera.rotation.order = 'YXZ';
    document.addEventListener('keydown', (e) => this.keys.add(e.code));
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    document.addEventListener('mousemove', (e) => {
      const dragging = this.dragLook && (e.buttons & 2) === 2;
      if (this.frozen || (!this.locked && !dragging)) return;
      if (isMouseSpike(e.movementX, e.movementY, this.recentMove)) return;
      this.recentMove = this.recentMove * 0.7 + Math.hypot(e.movementX, e.movementY) * 0.3;
      this.yaw += e.movementX * MOUSE_SENSITIVITY;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * MOUSE_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
    });
    // Keys held when focus or pointer lock is lost never get their keyup, so
    // drop them all rather than leaving the player walking on their own.
    window.addEventListener('blur', () => this.clearInput());
    document.addEventListener('visibilitychange', () => this.clearInput());
    document.addEventListener('pointerlockchange', () => {
      if (!this.locked) this.clearInput();
      this.recentMove = 0;
    });
  }

  get locked(): boolean {
    return document.pointerLockElement === this.element;
  }

  /** True while the player is in control, with or without pointer lock. */
  get active(): boolean {
    return this.locked || this.dragLook;
  }

  clearInput(): void {
    this.keys.clear();
  }

  teleport(s: Spawn): void {
    this.x = s.x;
    this.y = s.y;
    this.level = s.level;
    this.yaw = s.yaw;
    this.pitch = 0;
    this.syncCamera();
  }

  update(dt: number, colliders: Collider[]): void {
    if (this.active && !this.frozen) {
      let f = 0;
      let r = 0;
      if (this.keys.has('KeyW')) f += 1;
      if (this.keys.has('KeyS')) f -= 1;
      if (this.keys.has('KeyD')) r += 1;
      if (this.keys.has('KeyA')) r -= 1;
      if (f !== 0 || r !== 0) {
        const len = Math.hypot(f, r);
        const fast = this.allowFast && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
        const step = ((fast ? FAST_SPEED : WALK_SPEED) * dt) / len;
        // Plan forward is (sin yaw, cos yaw); right is (cos yaw, -sin yaw).
        const dx = (Math.sin(this.yaw) * f + Math.cos(this.yaw) * r) * step;
        const dy = (Math.cos(this.yaw) * f - Math.sin(this.yaw) * r) * step;
        [this.x, this.y] = moveCircle(this.x, this.y, dx, dy, this.level, PLAYER_RADIUS, colliders);
      }
    }
    this.syncCamera();
  }

  private syncCamera(): void {
    this.camera.position.set(...toWorld(this.x, this.y, this.level, EYE_HEIGHT));
    this.camera.rotation.y = -this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}

/**
 * True for a mouse movement that is a browser glitch rather than the player:
 * far bigger than any real movement just before it. A genuine fast flick
 * builds up over several events, so it is never mistaken for one.
 */
export function isMouseSpike(dx: number, dy: number, recent: number): boolean {
  const size = Math.hypot(dx, dy);
  return size > SPIKE_PIXELS && size > SPIKE_RATIO * Math.max(recent, 10);
}

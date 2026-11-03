import * as THREE from 'three';
import './style.css';
import { DOOR_PRESETS } from './data/doorPresets';
import { ARRIVAL, TELEPORTS } from './data/layout';
import { PlayerController } from './player/controller';
import { createInitialState, type GameState } from './state/store';
import { Hud } from './ui/hud';
import { buildWorld, poseDoor } from './world/build';
import { closedDoorColliders, staticColliders, type Collider } from './world/collision';
import { lockState, resolve, type Action } from './world/interact';
import { zoneAt } from './world/zones';

const REACH = 2.6;
const SKY = '#a9c6e0';

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
const world = buildWorld();
scene.add(world.root);

const hud = new Hud(app);
const player = new PlayerController(camera, renderer.domElement);
const raycaster = new THREE.Raycaster(undefined, undefined, 0, REACH);
const centre = new THREE.Vector2(0, 0);

let state: GameState = createInitialState();
const fixed = staticColliders();
let colliders: Collider[] = [];
let debugVisible = import.meta.env.DEV;
let started = false;
let target: string | null = null;

function refreshColliders(): void {
  colliders = [...fixed, ...closedDoorColliders(state.open_doors)];
}

function reset(): void {
  state = createInitialState(state.door_preset);
  for (const v of world.doors.values()) {
    v.amount = v.target = 0;
    poseDoor(v);
  }
  refreshColliders();
  player.teleport(ARRIVAL);
}

function setDoor(id: string, open: boolean): void {
  if (open) state.open_doors.add(id);
  else state.open_doors.delete(id);
  const v = world.doors.get(id);
  if (v) v.target = open ? 1 : 0;
  refreshColliders();
}

function apply(action: Action): void {
  switch (action.kind) {
    case 'toggle-door':
      setDoor(action.doorId, !state.open_doors.has(action.doorId));
      break;
    case 'travel':
      player.teleport(action.to);
      break;
    case 'message':
      hud.flash(action.text);
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

function lockPointer(): void {
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
  started = true;
  hud.setPaused(false, '');
  hud.flash('Mouse capture is blocked here. Hold the left button and drag to look.', 4);
}

function pause(): void {
  player.dragLook = false;
  player.clearInput();
  hud.setPaused(true, 'Paused — click to resume');
}

let lastUnlock = -Infinity;

app.addEventListener('click', () => {
  if (!player.active) lockPointer();
});

document.addEventListener('pointerlockchange', () => {
  if (player.locked) started = true;
  else lastUnlock = performance.now();
  hud.setPaused(!player.locked, started ? 'Paused — click to resume' : 'Click to start');
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Backquote') {
    debugVisible = !debugVisible;
    return;
  }
  // With pointer lock the browser handles Escape itself; drag-look needs it here.
  if (e.code === 'Escape' && player.dragLook) {
    pause();
    return;
  }
  if (!player.active || e.repeat) return;
  if (e.code === 'KeyE') {
    apply(resolve(target, state, player).action);
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
  const hit = raycaster.intersectObjects(world.raycastTargets, true)[0];
  for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
    if (o.userData.interactId) return o.userData.interactId as string;
  }
  return null;
}

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
    `env       ${state.environment_preset}`,
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
  Object.assign(window, { __hr: { player, get state() { return state; }, setDoor, reset, findTarget } });
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  fps = fps * 0.95 + (dt > 0 ? 1 / dt : 0) * 0.05;

  player.allowFast = debugVisible;
  player.update(dt, colliders);

  for (const v of world.doors.values()) {
    if (v.amount === v.target) continue;
    const step = dt * 2.5;
    v.amount = v.target > v.amount ? Math.min(v.target, v.amount + step) : Math.max(v.target, v.amount - step);
    poseDoor(v);
  }

  target = player.active ? findTarget() : null;
  hud.setPrompt(resolve(target, state, player).prompt);
  hud.update(dt);
  hud.setDebug(debugVisible, debugText());

  renderer.render(scene, camera);
});

import type { Sms } from '../data/story';

// DOM overlay: crosshair, prompt and hold meter, the objective box, subtitles
// and feedback, the phone, note, keypad and inventory panels, the day title
// card, the pause screen and the developer debug panel.

export type Panel = 'phone' | 'note' | 'keypad' | 'inventory';

/** Seconds the objective stays up before it folds away to "(O) View Objectives". */
export const OBJECTIVE_SECONDS = 5;

export class Hud {
  private prompt: HTMLElement;
  private message: HTMLElement;
  private subtitle: HTMLElement;
  private objective: HTMLElement;
  private objectiveText: HTMLElement;
  private objectiveHint: HTMLElement;
  private inventoryHint: HTMLElement;
  private phoneAlert: HTMLElement;
  private holdRing: HTMLElement;
  private title: HTMLElement;
  private pause: HTMLElement;
  private pauseHint: HTMLElement;
  private debug: HTMLElement;
  private panel: HTMLElement;
  private panelBody: HTMLElement;
  private messageTimer = 0;
  private subtitleTimer = 0;
  private objectiveTimer = 0;

  constructor(root: HTMLElement) {
    root.insertAdjacentHTML(
      'beforeend',
      `<div class="crosshair"></div>
       <div class="hold-ring"></div>
       <div class="prompt"></div>
       <div class="objective"><div class="objective-label">Objective</div><div class="objective-text"></div></div>
       <div class="objective-hint">(O) View Objectives</div>
       <div class="corner-hints"><div class="phone-alert"></div><div class="inventory-hint">(I) View Inventory</div></div>
       <div class="subtitle"></div>
       <div class="message"></div>
       <div class="title-card"></div>
       <div class="panel"><div class="panel-body"></div><div class="panel-hint"></div></div>
       <pre class="debug"></pre>
       <div class="pause">
         <h1>Happy Resting</h1>
         <p class="sub">S1 build</p>
         <p class="hint">Click to start</p>
         <table class="controls">
           <tr><td>WASD</td><td>Move</td></tr>
           <tr><td>Mouse</td><td>Look</td></tr>
           <tr><td>E</td><td>Interact</td></tr>
           <tr><td>Hold click</td><td>Bless</td></tr>
           <tr><td>Q</td><td>Phone</td></tr>
           <tr><td>O</td><td>Objectives</td></tr>
           <tr><td>I</td><td>Inventory</td></tr>
           <tr><td>Esc</td><td>Pause</td></tr>
           <tr><td>\`</td><td>Debug panel</td></tr>
         </table>
       </div>`,
    );
    const q = (s: string) => root.querySelector<HTMLElement>(s)!;
    this.prompt = q('.prompt');
    this.message = q('.message');
    this.subtitle = q('.subtitle');
    this.objective = q('.objective');
    this.objectiveText = q('.objective-text');
    this.objectiveHint = q('.objective-hint');
    this.inventoryHint = q('.inventory-hint');
    this.phoneAlert = q('.phone-alert');
    this.holdRing = q('.hold-ring');
    this.title = q('.title-card');
    this.pause = q('.pause');
    this.pauseHint = q('.pause .hint');
    this.debug = q('.debug');
    this.panel = q('.panel');
    this.panelBody = q('.panel-body');
  }

  setPrompt(text: string): void {
    if (this.prompt.textContent !== text) this.prompt.textContent = text;
  }

  /** Current objective; a new one is shown in full for OBJECTIVE_SECONDS. */
  setObjective(text: string): void {
    if (this.objectiveText.textContent === text) return;
    this.objectiveText.textContent = text;
    if (text) {
      this.showObjective();
      this.objective.classList.remove('pulse');
      void this.objective.offsetWidth; // restart the animation
      this.objective.classList.add('pulse');
    } else {
      this.objectiveTimer = 0;
      this.objective.classList.remove('show');
      this.objectiveHint.classList.remove('show');
    }
  }

  /** Bring the objective back for OBJECTIVE_SECONDS (the O key). */
  showObjective(): void {
    if (!this.objectiveText.textContent) return;
    this.objectiveTimer = OBJECTIVE_SECONDS;
    this.objective.classList.add('show');
    this.objectiveHint.classList.remove('show');
  }

  setInventoryHint(visible: boolean): void {
    this.inventoryHint.classList.toggle('show', visible);
  }

  setPhoneAlert(unread: boolean): void {
    this.phoneAlert.textContent = unread ? '[Phone] New message — press Q' : '';
  }

  /** Hold meter around the crosshair; progress 0 hides it. */
  setHold(progress: number): void {
    this.holdRing.style.display = progress > 0 ? 'block' : 'none';
    this.holdRing.style.setProperty('--p', `${Math.round(progress * 360)}deg`);
  }

  /** System feedback: locks, reminders, wrong code. */
  flash(text: string, seconds = 1.8): void {
    this.message.textContent = text;
    this.message.classList.add('show');
    this.messageTimer = seconds;
  }

  /** The protagonist's subtitled thought (doc 3.2). */
  say(text: string, seconds = Math.max(3, text.length / 14)): void {
    this.subtitle.textContent = text;
    this.subtitle.classList.add('show');
    this.subtitleTimer = seconds;
  }

  /** Day card: a title with an optional smaller line under it (e.g. the time). */
  showTitle(text: string, sub?: string): void {
    this.title.innerHTML = `<div>${esc(text)}</div>${sub ? `<div class="title-card-sub">${esc(sub)}</div>` : ''}`;
    this.title.classList.remove('show');
    void this.title.offsetWidth;
    this.title.classList.add('show');
  }

  openPanel(kind: Panel, html: string, hint: string): void {
    this.panel.className = `panel show ${kind}`;
    this.panelBody.innerHTML = html;
    this.panelBody.scrollTop = 0;
    // Tell the player when there's more below (a long letter on a short screen).
    const overflows = this.panelBody.scrollHeight > this.panelBody.clientHeight + 4;
    this.panel.querySelector('.panel-hint')!.textContent = overflows ? `Scroll or W/S for more · ${hint}` : hint;
  }

  updatePanel(html: string): void {
    this.panelBody.innerHTML = html;
  }

  closePanel(): void {
    this.panel.className = 'panel';
  }

  static phoneHtml(messages: Sms[]): string {
    if (messages.length === 0) return '<p class="empty">No messages.</p>';
    return messages
      .map((m) => `<div class="sms"><div class="from">${esc(m.from)}</div><div>${esc(m.text)}</div></div>`)
      .join('');
  }

  static keypadHtml(entered: string): string {
    const slots = [0, 1, 2, 3].map((i) => `<span>${entered[i] ?? '_'}</span>`).join('');
    return `<div class="keypad-title">GATE</div><div class="keypad-digits">${slots}</div>`;
  }

  static inventoryHtml(items: string[]): string {
    const list = items.length
      ? `<ul class="inventory-list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
      : '<p class="empty">Nothing yet.</p>';
    return `<div class="panel-title">Inventory</div>${list}`;
  }

  static noteHtml(text: string): string {
    const paragraphs = text.split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`);
    return `<div class="note-text">${paragraphs.join('')}</div>`;
  }

  /** Scroll an open panel that overflows (the note on short screens). */
  scrollPanel(dy: number): void {
    this.panelBody.scrollTop += dy;
  }

  setPaused(paused: boolean, hint: string): void {
    this.pause.classList.toggle('show', paused);
    this.pauseHint.textContent = hint;
  }

  setDebug(visible: boolean, text: string): void {
    this.debug.classList.toggle('show', visible);
    if (visible && this.debug.textContent !== text) this.debug.textContent = text;
  }

  update(dt: number): void {
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message.classList.remove('show');
    }
    if (this.objectiveTimer > 0) {
      this.objectiveTimer -= dt;
      if (this.objectiveTimer <= 0) {
        this.objective.classList.remove('show');
        this.objectiveHint.classList.add('show');
      }
    }
    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= dt;
      if (this.subtitleTimer <= 0) this.subtitle.classList.remove('show');
    }
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

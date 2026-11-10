import { GATE_CAUTION, thoughtSeconds, type Sms } from '../data/story';

// DOM overlay: crosshair, prompt and hold meter, the objective box and SMS
// alert (top right), control reminders (bottom right), subtitles
// and feedback, the phone, note, keypad and inventory panels, the day title
// card, the pause screen and the developer debug panel.

export type Panel = 'phone' | 'note' | 'keypad' | 'inventory' | 'bible';

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
  private interactHint: HTMLElement;
  private smsAlert: HTMLElement;
  private holdRing: HTMLElement;
  private title: HTMLElement;
  private fade: HTMLElement;
  private pause: HTMLElement;
  private pauseHint: HTMLElement;
  private debug: HTMLElement;
  private panel: HTMLElement;
  private panelBody: HTMLElement;
  private guide: HTMLElement;
  /** Seconds until the control guide appears, then until it fades; -1 when off. */
  private guideDelay = -1;
  private guideTimer = 0;
  private messageTimer = 0;
  private subtitleTimer = 0;
  private objectiveTimer = 0;

  constructor(root: HTMLElement) {
    root.insertAdjacentHTML(
      'beforeend',
      `<div class="crosshair"></div>
       <div class="hold-ring"></div>
       <div class="prompt"></div>
       <div class="top-right">
         <div class="objective-slot">
           <div class="objective"><div class="objective-label">Objective</div><div class="objective-text"></div></div>
           <div class="objective-hint">(O) View Objectives</div>
         </div>
         <div class="sms-alert">New SMS - Press Q</div>
       </div>
       <div class="corner-hints"><div class="interact-hint">(E) Interact</div><div class="inventory-hint">(I) View Inventory</div></div>
       <div class="guide"></div>
       <div class="subtitle"></div>
       <div class="message"></div>
       <div class="fade"></div>
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
    this.guide = q('.guide');
    this.objective = q('.objective');
    this.objectiveText = q('.objective-text');
    this.objectiveHint = q('.objective-hint');
    this.inventoryHint = q('.inventory-hint');
    this.interactHint = q('.interact-hint');
    this.smsAlert = q('.sms-alert');
    this.holdRing = q('.hold-ring');
    this.title = q('.title-card');
    this.fade = q('.fade');
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

  /** The bottom-right control reminders: "(E) Interact" and "(I) View Inventory". */
  setCornerHints(visible: boolean): void {
    this.inventoryHint.classList.toggle('show', visible);
    this.interactHint.classList.toggle('show', visible);
  }

  /** Flashing red "New SMS - Press Q" under the objective while a text is unread. */
  setPhoneAlert(unread: boolean): void {
    this.smsAlert.classList.toggle('show', unread);
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
  say(text: string, seconds = thoughtSeconds(text)): void {
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

  /** First-day control guide: appears after `delay`, fades after `seconds`. */
  showGuide(lines: string[], delay: number, seconds: number): void {
    this.guide.innerHTML = lines.map((l) => `<div>${esc(l)}</div>`).join('');
    this.guide.classList.remove('show');
    this.guideDelay = delay;
    this.guideTimer = seconds;
  }

  hideGuide(): void {
    this.guideDelay = -1;
    this.guideTimer = 0;
    this.guide.classList.remove('show');
  }

  /** Fade the screen to black (end of a shift) or back in. */
  setFade(black: boolean): void {
    this.fade.classList.toggle('show', black);
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
    return `<div class="keypad-caution">${esc(GATE_CAUTION)}</div><div class="keypad-title">GATE</div><div class="keypad-digits">${slots}</div>`;
  }

  static inventoryHtml(items: string[]): string {
    const list = items.length
      ? `<ul class="inventory-list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
      : '<p class="empty">Nothing yet.</p>';
    return `<div class="panel-title">Inventory</div>${list}`;
  }

  static bibleHtml(reference: string, lines: string[]): string {
    return `<div class="panel-title">Holy Bible</div><div class="scripture">${lines
      .map((l) => `<p>${esc(l)}</p>`)
      .join('')}<p class="reference">${esc(reference)}</p></div>`;
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
    if (this.guideDelay >= 0) {
      this.guideDelay -= dt;
      if (this.guideDelay < 0) this.guide.classList.add('show');
    } else if (this.guideTimer > 0) {
      this.guideTimer -= dt;
      if (this.guideTimer <= 0) this.guide.classList.remove('show');
    }
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

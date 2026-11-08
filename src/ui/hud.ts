import type { Sms } from '../data/story';

// DOM overlay: crosshair, prompt and hold meter, task line, subtitles and
// feedback, the phone, note and keypad panels, the day title card, the pause
// screen and the developer debug panel.

export type Panel = 'phone' | 'note' | 'keypad';

export class Hud {
  private prompt: HTMLElement;
  private message: HTMLElement;
  private subtitle: HTMLElement;
  private task: HTMLElement;
  private tools: HTMLElement;
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

  constructor(root: HTMLElement) {
    root.insertAdjacentHTML(
      'beforeend',
      `<div class="crosshair"></div>
       <div class="hold-ring"></div>
       <div class="prompt"></div>
       <div class="task"></div>
       <div class="tools"></div>
       <div class="phone-alert"></div>
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
           <tr><td>Esc</td><td>Pause</td></tr>
           <tr><td>\`</td><td>Debug panel</td></tr>
         </table>
       </div>`,
    );
    const q = (s: string) => root.querySelector<HTMLElement>(s)!;
    this.prompt = q('.prompt');
    this.message = q('.message');
    this.subtitle = q('.subtitle');
    this.task = q('.task');
    this.tools = q('.tools');
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

  setTask(text: string): void {
    const t = text ? `Task: ${text}` : '';
    if (this.task.textContent === t) return;
    this.task.textContent = t;
    this.task.classList.remove('pulse');
    void this.task.offsetWidth; // restart the animation
    this.task.classList.add('pulse');
  }

  setTools(names: string[]): void {
    const t = names.join('  ·  ');
    if (this.tools.textContent !== t) this.tools.textContent = t;
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
  say(text: string, seconds = 3): void {
    this.subtitle.textContent = text;
    this.subtitle.classList.add('show');
    this.subtitleTimer = seconds;
  }

  showTitle(text: string): void {
    this.title.textContent = text;
    this.title.classList.remove('show');
    void this.title.offsetWidth;
    this.title.classList.add('show');
  }

  openPanel(kind: Panel, html: string, hint: string): void {
    this.panel.className = `panel show ${kind}`;
    this.panelBody.innerHTML = html;
    this.panel.querySelector('.panel-hint')!.textContent = hint;
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

  static noteHtml(text: string): string {
    return `<div class="note-text">${esc(text).replace(/\n/g, '<br>')}</div>`;
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
    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= dt;
      if (this.subtitleTimer <= 0) this.subtitle.classList.remove('show');
    }
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

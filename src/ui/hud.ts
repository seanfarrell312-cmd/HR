// DOM overlay: crosshair and prompt, short feedback messages, pause screen and
// the developer debug panel.

export class Hud {
  private prompt: HTMLElement;
  private message: HTMLElement;
  private pause: HTMLElement;
  private pauseHint: HTMLElement;
  private debug: HTMLElement;
  private messageTimer = 0;

  constructor(root: HTMLElement) {
    root.insertAdjacentHTML(
      'beforeend',
      `<div class="crosshair"></div>
       <div class="prompt"></div>
       <div class="message"></div>
       <pre class="debug"></pre>
       <div class="pause">
         <h1>Happy Resting</h1>
         <p class="sub">S0 greybox</p>
         <p class="hint">Click to start</p>
         <table class="controls">
           <tr><td>WASD</td><td>Move</td></tr>
           <tr><td>Mouse</td><td>Look</td></tr>
           <tr><td>E</td><td>Interact</td></tr>
           <tr><td>Esc</td><td>Pause</td></tr>
           <tr><td>\`</td><td>Debug panel</td></tr>
         </table>
       </div>`,
    );
    this.prompt = root.querySelector('.prompt')!;
    this.message = root.querySelector('.message')!;
    this.pause = root.querySelector('.pause')!;
    this.pauseHint = root.querySelector('.pause .hint')!;
    this.debug = root.querySelector('.debug')!;
  }

  setPrompt(text: string): void {
    if (this.prompt.textContent !== text) this.prompt.textContent = text;
  }

  flash(text: string, seconds = 1.8): void {
    this.message.textContent = text;
    this.message.classList.add('show');
    this.messageTimer = seconds;
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
  }
}

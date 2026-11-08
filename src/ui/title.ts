// Title screen shown on page load. It sits on <body>, above the game, so its
// clicks never reach the game's click-to-capture handler. START hands over to
// the game; OPTIONS is a placeholder until there is something to set.

export function showTitleScreen(onStart: () => void): void {
  const root = document.createElement('div');
  root.className = 'title-screen';
  root.innerHTML = `
    <h1 class="title-name">Happy Resting</h1>
    <p class="title-by">a game by seanologues</p>
    <div class="title-buttons">
      <button type="button" class="title-btn start">START</button>
      <button type="button" class="title-btn options" disabled title="Coming later">OPTIONS</button>
    </div>`;
  document.body.appendChild(root);

  const start = root.querySelector<HTMLButtonElement>('.start')!;
  start.focus();
  start.addEventListener('click', () => {
    root.remove();
    // Still inside the click, so the browser lets the game capture the mouse.
    onStart();
  });
}

/** Keep the page behind a modal until the visitor explicitly chooses sound. */
export function mountWelcome({dialog, audioButton, silentButton, onChoice}) {
  let entered = false;
  if (dialog.open) dialog.close();
  dialog.showModal();
  dialog.addEventListener('cancel', event => event.preventDefault());
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') event.preventDefault();
  });
  function enter(withAudio) {
    if (entered) return;
    entered = true;
    // Invoke in the click event, before any await, to preserve audio activation.
    dialog.close();
    onChoice(withAudio);
  }
  audioButton.addEventListener('click', () => enter(true));
  silentButton.addEventListener('click', () => enter(false));
}

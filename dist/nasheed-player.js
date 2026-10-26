const audio = document.querySelector('#nasheedAudio');
const panel = document.querySelector('#nasheedPlayer');
const status = document.querySelector('#nasheedStatus');
const button = document.querySelector('#soundToggle');
const settings = document.querySelector('#settingsSound');
const notice = document.querySelector('#audioNotice');
let requested = false, resume = false, session = 0;
audio.volume = .28;
function sync(playing) {
  document.body.classList.toggle('sound-playing', playing);
  button.setAttribute('aria-pressed', String(playing));
  button.setAttribute('aria-label', playing ? 'Pause nasheed humming' : 'Play nasheed humming');
  settings.setAttribute('aria-checked', String(playing));
}
function busy(value) {
  button.setAttribute('aria-busy', String(value));
  settings.setAttribute('aria-busy', String(value));
}
function stop(close = false) {
  session++; requested = false; resume = false; audio.pause(); busy(false); sync(false);
  if (close) panel.hidden = true;
}
async function start() {
  const id = ++session;
  requested = true; panel.hidden = false; busy(true); notice.textContent = '';
  status.textContent = 'Loading the nasheed…';
  try {
    await audio.play();
    if (id !== session) return;
    busy(false);
  } catch {
    if (id !== session) return;
    requested = false; busy(false); sync(false);
    status.textContent = 'Playback could not start. Try Play below or check your connection.';
    notice.textContent = status.textContent;
  }
}
function toggle() { if (requested || !audio.paused) stop(true); else start(); }
button.addEventListener('click', toggle);
settings.addEventListener('click', toggle);
document.querySelector('#closeNasheed').addEventListener('click', () => stop(true));
audio.addEventListener('playing', () => { requested = true; sync(true); busy(false); status.textContent = 'Playing Background Nasheed 6 · loops automatically.'; });
audio.addEventListener('pause', () => { requested = false; sync(false); busy(false); status.textContent = 'Paused. Press Play to continue.'; });
audio.addEventListener('waiting', () => { if (requested) { busy(true); status.textContent = 'Buffering the nasheed…'; } });
audio.addEventListener('error', () => { stop(); status.textContent = 'Audio unavailable. Please try again.'; notice.textContent = status.textContent; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { resume = !audio.paused; audio.pause(); }
  else if (resume) { resume = false; start(); }
});
window.addEventListener('pagehide', () => stop(true));

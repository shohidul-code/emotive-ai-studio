import { mountWelcome } from './welcome.js';

const audio = document.querySelector('#nasheedAudio');
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
function stop() {
  session++; requested = false; resume = false; audio.pause(); busy(false); sync(false);
}
async function start() {
  const id = ++session;
  requested = true; busy(true); notice.textContent = '';
  try {
    await audio.play();
    if (id !== session) return;
    busy(false);
  } catch {
    if (id !== session) return;
    requested = false; busy(false); sync(false);
    notice.textContent = 'Playback could not start. Please try the sound button again.';
    document.querySelector('#toast').textContent = notice.textContent;
    document.querySelector('#toast').classList.add('visible');
    setTimeout(() => document.querySelector('#toast').classList.remove('visible'), 3800);
  }
}
function toggle() { if (requested || !audio.paused) stop(); else start(); }
button.addEventListener('click', toggle);
settings.addEventListener('click', toggle);
audio.addEventListener('playing', () => { requested = true; sync(true); busy(false); });
audio.addEventListener('pause', () => { requested = false; sync(false); busy(false); });
audio.addEventListener('waiting', () => { if (requested) { busy(true); } });
audio.addEventListener('error', () => { stop(); notice.textContent = 'Audio unavailable. Please try again.'; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { resume = !audio.paused; audio.pause(); }
  else if (resume) { resume = false; start(); }
});
window.addEventListener('pagehide', () => stop());

mountWelcome({
  dialog: document.querySelector('#welcomeDialog'),
  audioButton: document.querySelector('#enterWithAudio'),
  silentButton: document.querySelector('#enterWithoutAudio'),
  onChoice(withAudio) {
    if (withAudio) start(); else stop();
    document.body.classList.remove('awaiting-entry');
    document.querySelector('#heroTitle').focus({preventScroll: true});
  }
});

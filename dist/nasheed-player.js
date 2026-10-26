const videoId = 'XOVHMU_K7no';
const panel = document.querySelector('#nasheedPlayer');
const status = document.querySelector('#nasheedStatus');
const soundButton = document.querySelector('#soundToggle');
const settingsSwitch = document.querySelector('#settingsSound');
const notice = document.querySelector('#audioNotice');
let player;
let apiPromise;
let starting = false;
let wantsPlayback = false;
let resumeOnVisible = false;
let session = 0;

function setPlaying(playing) {
  document.body.classList.toggle('sound-playing', playing);
  soundButton.setAttribute('aria-pressed', String(playing));
  soundButton.setAttribute('aria-label', playing ? 'Disable nasheed humming' : 'Enable nasheed humming');
  settingsSwitch.setAttribute('aria-checked', String(playing));
  panel.dataset.playing = String(playing);
}

function setBusy(busy) {
  starting = busy;
  soundButton.setAttribute('aria-busy', String(busy));
  settingsSwitch.setAttribute('aria-busy', String(busy));
}

function loadAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const timeout = setTimeout(() => {
      apiPromise = undefined;
      document.querySelector('#youtubePlayerAPI')?.remove();
      reject(new Error('The YouTube player did not load. Check your connection or open the track on YouTube.'));
    }, 15000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      if (typeof previousReady === 'function') previousReady();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.id = 'youtubePlayerAPI';
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      apiPromise = undefined;
      script.remove();
      reject(new Error('YouTube could not load. Check your connection or open the track on YouTube.'));
    };
    document.head.append(script);
  });
  return apiPromise;
}

function stop() {
  session++;
  wantsPlayback = false;
  resumeOnVisible = false;
  if (player) {
    player.destroy();
    player = undefined;
  }
  document.querySelector('#nasheedPlayerHost').replaceChildren();
  panel.hidden = true;
  delete panel.dataset.ready;
  delete panel.dataset.error;
  setPlaying(false);
  setBusy(false);
  notice.textContent = '';
}

async function start() {
  wantsPlayback = true;
  panel.hidden = false;
  delete panel.dataset.error;
  notice.textContent = '';
  if (player) {
    player.playVideo();
    status.textContent = 'Press Play in the YouTube player if prompted.';
    return;
  }
  setBusy(true);
  status.textContent = 'Loading your selected nasheed…';
  const currentSession = ++session;
  try {
    const YT = await loadAPI();
    if (currentSession !== session || !wantsPlayback) return;
    const host = document.querySelector('#nasheedPlayerHost');
    const mount = document.createElement('div');
    mount.id = 'nasheedVideo';
    host.replaceChildren(mount);
    player = new YT.Player('nasheedVideo', {
      host: 'https://www.youtube-nocookie.com',
      width: '100%',
      height: '200',
      videoId,
      playerVars: {
        autoplay: 1, controls: 1, playsinline: 1,
        loop: 1, playlist: videoId, rel: 0, origin: location.origin
      },
      events: {
        onReady(event) {
          if (currentSession !== session) return;
          setBusy(false);
          const iframe = event.target.getIframe();
          iframe.title = 'Emotional Famous Background Nasheed extended — DefiniteTruth';
          iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
          iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
          event.target.setVolume(32);
          status.textContent = 'Press Play in the YouTube player if prompted.';
          panel.dataset.ready = 'true';
          if (wantsPlayback) event.target.playVideo();
        },
        onStateChange(event) {
          if (currentSession !== session) return;
          panel.dataset.state = String(event.data);
          if (event.data === YT.PlayerState.PLAYING) {
            wantsPlayback = true;
            setPlaying(true);
            status.textContent = 'Playing your selected nasheed · loops automatically.';
          } else if (event.data === YT.PlayerState.PAUSED) {
            wantsPlayback = false;
            setPlaying(false);
            status.textContent = 'Paused. Press Play to resume.';
          } else if (event.data === YT.PlayerState.BUFFERING) {
            status.textContent = 'Buffering your selected nasheed…';
          } else if (event.data === YT.PlayerState.ENDED) {
            setPlaying(false);
            status.textContent = 'Restarting the nasheed…';
          }
        },
        onAutoplayBlocked() {
          if (currentSession !== session) return;
          setBusy(false);
          setPlaying(false);
          wantsPlayback = false;
          status.textContent = 'Press Play in the YouTube player to start the nasheed.';
        },
        onError(event) {
          if (currentSession !== session) return;
          setBusy(false);
          setPlaying(false);
          wantsPlayback = false;
          const message = [101,150].includes(event.data)
            ? 'This video cannot be embedded. Use Open on YouTube below.'
            : 'YouTube could not play this video here. Use Open on YouTube below.';
          status.textContent = message;
          notice.textContent = message;
          panel.dataset.error = String(event.data);
        }
      }
    });
  } catch (error) {
    if (currentSession !== session) return;
    setBusy(false);
    setPlaying(false);
    wantsPlayback = false;
    status.textContent = error.message;
    notice.textContent = error.message;
  }
}

function toggle() {
  if (starting || wantsPlayback || document.body.classList.contains('sound-playing')) stop();
  else start();
}
soundButton.addEventListener('click', toggle);
settingsSwitch.addEventListener('click', toggle);
document.querySelector('#closeNasheed').addEventListener('click', stop);
document.addEventListener('visibilitychange', () => {
  if (!player?.getPlayerState) return;
  if (document.hidden) {
    resumeOnVisible = player.getPlayerState() === 1;
    if (resumeOnVisible) player.pauseVideo();
  } else if (resumeOnVisible) {
    resumeOnVisible = false;
    player.playVideo();
  }
});
window.addEventListener('pagehide', stop);

import './nasheed-player.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const body = document.body;
const header = $('#header');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = motionPreference.matches;
let motionEnabled = !reducedMotion;
let immersive = false;
let previousScroll = 0;
let briefUrl;
let toastTimeout;
let lastDialogTrigger;

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => node.classList.remove('visible'), 3800);
}

function setMotion(enabled) {
  motionEnabled = enabled;
  body.classList.toggle('js-motion', enabled);
  body.classList.toggle('motion-reduced', !enabled);
  if (!enabled) $$('.tilt-surface').forEach(surface => { surface.style.transform = ''; });
  $('#motionToggle').setAttribute('aria-checked', String(enabled));
  document.dispatchEvent(new CustomEvent('studio:motion', { detail: enabled }));
}
setMotion(motionEnabled);
motionPreference.addEventListener('change', event => setMotion(!event.matches));

function setSettings(open) {
  $('#settingsPanel').hidden = !open;
  $('#settingsTrigger').setAttribute('aria-expanded', String(open));
  if (open) {
    setGuide(false);
    setMenu(false);
  }
}
$('#settingsTrigger').addEventListener('click', () => setSettings($('#settingsPanel').hidden));
$('#closeSettings').addEventListener('click', () => { setSettings(false); $('#settingsTrigger').focus(); });
$('#themeToggle').addEventListener('click', () => {
  const enabled = !body.classList.contains('light-studio');
  body.classList.toggle('light-studio', enabled);
  $('#themeToggle').setAttribute('aria-checked', String(enabled));
  document.dispatchEvent(new CustomEvent('studio:theme', { detail: enabled }));
});
$('#motionToggle').addEventListener('click', () => setMotion(!motionEnabled));
$('#qualitySelect').value = innerWidth < 761 ? 'eco' : 'high';
$('#qualitySelect').addEventListener('change', (event) => document.dispatchEvent(new CustomEvent('studio:quality', { detail: event.target.value })));
$('#creditsButton').addEventListener('click', () => { setSettings(true); $('#closeSettings').focus(); });

function setMenu(open) {
  $('#mobileNav').hidden = !open;
  $('#mobileMenuButton').setAttribute('aria-expanded', String(open));
  body.classList.toggle('menu-open', open);
}
$('#mobileMenuButton').addEventListener('click', () => setMenu($('#mobileNav').hidden));
$$('#mobileNav a').forEach(link => link.addEventListener('click', () => setMenu(false)));

function setGuide(open) {
  $('#guidePanel').hidden = !open;
  $('#guideOrb').setAttribute('aria-expanded', String(open));
  if (open) setSettings(false);
}
$('#guideOrb').addEventListener('click', () => setGuide($('#guidePanel').hidden));
$('#closeGuide').addEventListener('click', () => { setGuide(false); $('#guideOrb').focus(); });
$$('#guidePanel a').forEach(link => link.addEventListener('click', () => setGuide(false)));
document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('#settingsPanel, #settingsTrigger, #creditsButton')) setSettings(false);
  if (!event.target.closest('#guidePanel, #guideOrb')) setGuide(false);
});

function enterRoom() {
  if (!['webgl', 'software'].includes(body.dataset.renderer)) {
    toast('This device cannot open the 3D room. You can still explore the full story.');
    return;
  }
  previousScroll = window.scrollY;
  window.scrollTo({ top: 0, behavior: 'instant' });
  immersive = true;
  body.classList.add('immersive');
  $('#roomModeControls').hidden = false;
  setGuide(false);
  setSettings(false);
  document.dispatchEvent(new CustomEvent('studio:immersive', { detail: true }));
  $('#exitRoom').focus({ preventScroll: true });
}
function exitRoom() {
  if (!immersive) return;
  immersive = false;
  body.classList.remove('immersive');
  $('#roomModeControls').hidden = true;
  document.dispatchEvent(new CustomEvent('studio:immersive', { detail: false }));
  window.scrollTo({ top: previousScroll, behavior: 'instant' });
  $('#exploreRoom').focus({ preventScroll: true });
}
$('#exploreRoom').addEventListener('click', enterRoom);
$('#guideExplore').addEventListener('click', enterRoom);
$('#exitRoom').addEventListener('click', exitRoom);
$('#resetView').addEventListener('click', () => document.dispatchEvent(new Event('studio:reset')));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    exitRoom();
    setSettings(false);
    setGuide(false);
    setMenu(false);
  }
});

const lightSections = $$('.light-section');
const chapters = $$('.chapter');
let scheduled = false;
function updateScroll() {
  scheduled = false;
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  $('#scrollProgress').style.width = `${max > 0 ? 100 * y / max : 0}%`;
  const onLight = lightSections.some(section => {
    const r = section.getBoundingClientRect();
    return r.top <= 65 && r.bottom > 65;
  });
  header.classList.toggle('nav-light', onLight);
  const work = $('#work').getBoundingClientRect();
  const isWork = work.top < innerHeight * .45 && work.bottom > innerHeight * .3;
  $('[data-nav=about]').classList.toggle('active', !isWork);
  $('[data-nav=work]').classList.toggle('active', isWork);
  let chapterProgress = 0;
  for (let i = 0; i < chapters.length; i++) {
    const r = chapters[i].getBoundingClientRect();
    if (r.top < innerHeight * .6) chapterProgress = i + Math.max(0, Math.min(1, -r.top / r.height));
  }
  document.dispatchEvent(new CustomEvent('studio:scroll', { detail: { progress: chapterProgress, visible: y < $('.intro').offsetHeight + innerHeight } }));
}
window.addEventListener('scroll', () => {
  if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); }
}, { passive: true });
window.addEventListener('resize', updateScroll, { passive: true });
updateScroll();

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .08 });
$$('.reveal').forEach(node => revealObserver.observe(node));

if (matchMedia('(pointer: fine)').matches) {
  $$('.tilt-surface').forEach(surface => {
    surface.addEventListener('pointermove', event => {
      if (!motionEnabled || event.target.closest('button, a, input, select')) { surface.style.transform = ''; return; }
      const r = surface.getBoundingClientRect();
      const x = (event.clientX - r.left) / r.width - .5;
      const y = (event.clientY - r.top) / r.height - .5;
      surface.style.transform = `perspective(1000px) rotateX(${-y * 7}deg) rotateY(${x * 9}deg) translateY(-3px)`;
    });
    surface.addEventListener('pointerleave', () => { surface.style.transform = ''; });
  });
}
const portraitViews = {
  thoughtful: { src: '/assets/portrait-thoughtful.png', alt: 'A thoughtful seated portrait of the person behind Emotive in a navy blazer' },
  presence: { src: '/assets/portrait-presence.png', alt: 'Portrait looking toward the camera beneath a soft circular light' }
};
$$('[data-portrait]').forEach(button => button.addEventListener('click', () => {
  const view = portraitViews[button.dataset.portrait];
  if (!view) return;
  const portrait = $('#founderPortrait');
  portrait.src = view.src;
  portrait.alt = view.alt;
  $$('[data-portrait]').forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
}));

$$('.faq-list details').forEach(details => details.addEventListener('toggle', () => {
  if (details.open) $$('.faq-list details').forEach(other => { if (other !== details) other.open = false; });
}));

function openProject(trigger) {
  if (immersive) exitRoom();
  setMenu(false);
  setGuide(false);
  setSettings(false);
  if ($('#workDialog').open) $('#workDialog').close();
  lastDialogTrigger = trigger;
  $('#projectDialog').showModal();
}
$$('[data-open-project]').forEach(button => button.addEventListener('click', () => openProject(button)));
$$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => lastDialogTrigger?.focus({ preventScroll: true }));
});
$('#projectForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = new FormData(form);
  const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Asia/Dhaka' }).format(new Date());
  const text = `EMOTIVE — PROJECT BRIEF\nIntelligence with a human touch.\n\nCreated: ${date}\n\nName: ${values.get('name').trim()}\nEmail: ${values.get('email').trim()}\n\nInterested in:\n${values.getAll('services').map(value => '- ' + value).join('\n') || '- To be explored together'}\n\nThe idea:\n${values.get('idea').trim()}\n\nPreferred start:\n${values.get('timeline')}\n\nNext steps:\n1. Review and refine this idea.\n2. Identify the people, data and tools involved.\n3. Agree a scope, deliverables and evaluation criteria.\n\nThis brief was created locally in your browser. No message was sent.\n`;
  if (briefUrl) URL.revokeObjectURL(briefUrl);
  briefUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  $('#downloadBrief').href = briefUrl;
  form.hidden = true;
  $('#briefResult').hidden = false;
  $('#downloadBrief').focus();
});
$('#editBrief').addEventListener('click', () => {
  $('#briefResult').hidden = true;
  $('#projectForm').hidden = false;
  $('#projectForm input').focus();
});

const concepts = {
  knowledge: {
    category: 'Concept / 01 · Artificial intelligence & RAG', title: 'A second brain.',
    description: 'What if the answer was already in your knowledge — and finding it felt like asking a good question?',
    details: [['The idea', 'Bring a team’s documents, notes and policies into one searchable knowledge experience.'], ['The experience', 'Ask in natural language. Read a grounded response, open its source and see where the answer came from.'], ['The approach', 'Document processing, retrieval augmented generation, access controls and evaluation against real questions.'], ['The principle', 'Useful answers with visible sources, clear limits and human review when it matters.']]
  },
  automation: {
    category: 'Concept / 02 · Intelligent automation', title: 'Work, in flow.',
    description: 'What if the everyday work moved forward, while your team focused on the work only people can do?',
    details: [['The idea', 'Connect a recurring process across the tools a team already uses.'], ['The experience', 'A request becomes a clear workflow: collect information, validate it, route it for review and update the right system.'], ['The approach', 'Event based integrations, explicit rules, approval steps, retries and a readable activity history.'], ['The principle', 'Automate the repetition. Keep people in control of consequential decisions.']]
  },
  experience: {
    category: 'Concept / 03 · Interactive digital experience', title: 'Beyond the screen.',
    description: 'What if a website felt less like a document, and more like a place you could step into?',
    details: [['The idea', 'Turn an agency story into an explorable, dimensional studio. This website is the working exploration.'], ['The experience', 'Move your pointer, explore the room, change the light and follow a story through the space.'], ['The approach', 'Real time 3D, responsive camera movement, accessible HTML content, adaptive quality and reduced motion.'], ['The principle', 'Use the extra dimension to bring a story closer. Keep the page useful on every device.']]
  }
};
$$('[data-project]').forEach(button => button.addEventListener('click', () => {
  const concept = concepts[button.dataset.project];
  lastDialogTrigger = button;
  $('#workCategory').textContent = concept.category;
  $('#workTitle').textContent = concept.title;
  $('#workDescription').textContent = concept.description;
  const container = $('#conceptDetails');
  container.replaceChildren();
  concept.details.forEach(([heading, paragraph]) => {
    const row = document.createElement('div');
    const h3 = document.createElement('h3'); h3.textContent = heading;
    const p = document.createElement('p'); p.textContent = paragraph;
    row.append(h3, p); container.append(row);
  });
  $('#workDialog').showModal();
}));
$('#discussConcept').addEventListener('click', event => {
  const topic = $('#workTitle').textContent;
  const ideaField = $('#projectForm textarea');
  if (!ideaField.value) ideaField.value = `I’d like to explore an idea inspired by “${topic}”\n\n`;
  openProject(lastDialogTrigger);
});

function updateClock() {
  $('#dhakaTime').textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Dhaka' }).format(new Date());
}
updateClock();
setInterval(updateClock, 60000);
$('#currentYear').textContent = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date());
window.addEventListener('pagehide', event => { if (!event.persisted && briefUrl) URL.revokeObjectURL(briefUrl); });

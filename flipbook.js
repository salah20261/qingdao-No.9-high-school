const bookElement = document.querySelector("#book");
const pages = bookElement.querySelectorAll(".book-page");
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const pageStatus = document.querySelector("#page-status");
const orientationStatus = document.querySelector("#orientation");
const pageWidth = Number(bookElement.dataset.pageWidth) || 512;
const pageHeight = Number(bookElement.dataset.pageHeight) || 640;
document.documentElement.style.setProperty("--page-ratio", pageWidth / pageHeight);

const pageFlip = new St.PageFlip(bookElement, {
  width: pageWidth,
  height: pageHeight,
  size: "stretch",
  minWidth: Math.max(1, Math.round(pageWidth * 0.56)),
  maxWidth: Math.max(1, Math.round(pageWidth * 1.04)),
  minHeight: Math.max(1, Math.round(pageHeight * 0.56)),
  maxHeight: Math.max(1, Math.round(pageHeight * 1.04)),
  drawShadow: true,
  flippingTime: 760,
  usePortrait: true,
  startZIndex: 10,
  autoSize: true,
  maxShadowOpacity: 0.42,
  showCover: true,
  mobileScrollSupport: false,
  clickEventForward: true,
  useMouseEvents: true,
  swipeDistance: 24,
  showPageCorners: true,
  disableFlipByClick: false,
});


let currentPage = 0;
let isTurning = false;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const reducedMotion = reducedMotionQuery.matches;

// A small paper-rush synthesized with Web Audio. It starts only after a user gesture.
let audioContext = null;
let lastFlipState = "read";

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function primePageTurnAudio() {
  getAudioContext();
}

function playPageTurnSound() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const duration = 0.24;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    const progress = index / data.length;
    const envelope = Math.pow(1 - progress, 1.8) * Math.min(1, progress * 38);
    data[index] = (Math.random() * 2 - 1) * envelope;
  }
  const paper = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  paper.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1850, now);
  filter.frequency.exponentialRampToValueAtTime(780, now + duration);
  filter.Q.value = 0.72;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  paper.connect(filter).connect(gain).connect(context.destination);
  paper.start(now);
  paper.stop(now + duration);

  const thump = context.createOscillator();
  const thumpGain = context.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(135, now);
  thump.frequency.exponentialRampToValueAtTime(72, now + 0.11);
  thumpGain.gain.setValueAtTime(0.0001, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.045, now + 0.008);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  thump.connect(thumpGain).connect(context.destination);
  thump.start(now);
  thump.stop(now + 0.13);
}

window.addEventListener("pointerdown", primePageTurnAudio, { passive: true });
window.addEventListener("keydown", primePageTurnAudio);



const bookRig = document.querySelector("#book-rig");
const pageCurlSimulator = document.querySelector("#page-curl-simulator");
let cursorFrame = 0;
let queuedPointerEvent = null;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function updateCursorSimulation(event) {
  if (!bookRig || !pageCurlSimulator) return;
  if (reducedMotion) return;
  queuedPointerEvent = event;
  if (cursorFrame) return;
  cursorFrame = window.requestAnimationFrame(() => {
    cursorFrame = 0;
    if (!queuedPointerEvent) return;
    const pointer = queuedPointerEvent;
    queuedPointerEvent = null;
    const rect = bookRig.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clamp(((pointer.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((pointer.clientY - rect.top) / rect.height) * 100, 0, 100);
    pageCurlSimulator.style.setProperty("--pointer-x", `${x}%`);
    pageCurlSimulator.style.setProperty("--pointer-y", `${y}%`);
    pageCurlSimulator.style.setProperty("--pointer-tilt", `${(x - 50) * 0.08}deg`);
    pageCurlSimulator.dataset.side = x < 50 ? "left" : "right";
    pageCurlSimulator.classList.add("is-visible");
  });
}

function hideCursorSimulation() {
  pageCurlSimulator?.classList.remove("is-visible");
}

window.addEventListener("pointermove", updateCursorSimulation, { passive: true });
window.addEventListener("pointerleave", hideCursorSimulation, { passive: true });

// The book still responds to normal page clicks. This extends the same turn affordance
// to the surrounding reading room, using the mouse side to choose previous/next.
document.addEventListener("click", (event) => {
  if (isTurning || event.target.closest("button, a, input, audio")) return;
  if (event.target.closest("#book")) return;
  const midpoint = window.innerWidth / 2;
  if (event.clientX < midpoint) pageFlip.flipPrev("bottom");
  else pageFlip.flipNext("bottom");
});
const ambientAudio = document.querySelector("#ambient-audio");
const musicToggle = document.querySelector("#music-toggle");
let ambientMusicReady = false;

function setMusicLabel(label) {
  if (musicToggle) musicToggle.textContent = label;
}

async function loadAmbientMusic() {
  if (!ambientAudio || !ambientAudio.dataset.source) return;
  try {
    const response = await fetch(ambientAudio.dataset.source, { method: "HEAD", cache: "no-store" });
    if (!response.ok) throw new Error("licensed audio file unavailable");
    ambientAudio.src = ambientAudio.dataset.source;
    ambientAudio.volume = 0.42;
    ambientMusicReady = true;
    setMusicLabel("SOUND OFF");
    try {
      await ambientAudio.play();
      setMusicLabel("SOUND ON");
    } catch {
      setMusicLabel("CLICK FOR SOUND");
    }
  } catch {
    setMusicLabel("ADD LICENSED AUDIO");
    if (musicToggle) musicToggle.disabled = true;
  }
}

function unlockAmbientMusic() {
  if (!ambientMusicReady || !ambientAudio) return;
  ambientAudio.muted = false;
  void ambientAudio.play().then(() => setMusicLabel("SOUND ON")).catch(() => {});
}

window.addEventListener("pointerdown", unlockAmbientMusic, { passive: true });
window.addEventListener("keydown", unlockAmbientMusic);
musicToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!ambientAudio || !ambientMusicReady) return;
  if (ambientAudio.paused) {
    ambientAudio.muted = false;
    void ambientAudio.play().then(() => setMusicLabel("SOUND ON"));
  } else {
    ambientAudio.pause();
    setMusicLabel("SOUND OFF");
  }
});

void loadAmbientMusic();

function updateControls() {
  const pageCount = pageFlip.getPageCount();
  const lastPage = pageCount - 1;
  const progress = lastPage > 0 ? currentPage / lastPage : 0;
  bookElement.dataset.edge = currentPage === 0 ? "front" : currentPage === lastPage ? "back" : "inside";
  bookElement.dataset.page = String(currentPage);
  document.documentElement.style.setProperty("--read-progress", `${(progress * 100).toFixed(2)}%`);

  previousButton.disabled = currentPage === 0 || isTurning;
  nextButton.disabled = currentPage === lastPage || isTurning;

  if (currentPage === 0) {
    pageStatus.textContent = "COVER";
  } else if (currentPage === lastPage) {
    pageStatus.textContent = "BACK COVER";
  } else {
    pageStatus.textContent = `${String(currentPage + 1).padStart(2, "0")} / ${String(pageCount).padStart(2, "0")}`;
  }
}

pageFlip.on("flip", (event) => {
  currentPage = Number(event.data);
  updateControls();
});

pageFlip.on("changeState", (event) => {
  isTurning = event.data !== "read";
  if (event.data === "flipping" && lastFlipState !== "flipping") playPageTurnSound();
  lastFlipState = event.data;
  updateControls();
});

reducedMotionQuery.addEventListener?.("change", (event) => {
  if (event.matches) hideCursorSimulation();
});

function updateOrientation(orientation) {
  bookElement.dataset.layout = orientation;
  orientationStatus.textContent = orientation === "portrait" ? "SINGLE PAGE" : "OPEN SPREAD";
}

pageFlip.on("init", (event) => updateOrientation(event.data.mode));
pageFlip.on("changeOrientation", (event) => updateOrientation(event.data));

pageFlip.loadFromHTML(pages);
updateControls();

const requestedPage = Number(new URLSearchParams(location.search).get("page"));
if (Number.isInteger(requestedPage) && requestedPage >= 0 && requestedPage < pages.length) {
  pageFlip.turnToPage(requestedPage);
}

previousButton.addEventListener("click", () => {
  if (!isTurning) pageFlip.flipPrev("bottom");
});

nextButton.addEventListener("click", () => {
  if (!isTurning) pageFlip.flipNext("bottom");
});

window.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || isTurning) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    pageFlip.flipPrev("bottom");
  }

  if (event.key === "ArrowRight" || event.key === " ") {
    event.preventDefault();
    pageFlip.flipNext("bottom");
  }

  if (event.key === "Home") pageFlip.turnToPage(0);
  if (event.key === "End") pageFlip.turnToPage(pageFlip.getPageCount() - 1);
});

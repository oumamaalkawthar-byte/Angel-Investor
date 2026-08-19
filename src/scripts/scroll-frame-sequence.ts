import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let ownTriggers: ScrollTrigger[] = [];
let ownResizeHandlers: (() => void)[] = [];

function initSequence(section: HTMLElement) {
  const canvas = section.querySelector<HTMLCanvasElement>('[data-frame-canvas]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const frameCount = parseInt(section.dataset.frameCount ?? '0', 10);
  const framePath = section.dataset.framePath ?? '';
  const caption = section.querySelector<HTMLElement>('[data-frame-caption]');
  if (!frameCount || !framePath) return;

  const frameSrc = (i: number) => framePath.replace('{n}', String(i + 1).padStart(4, '0'));

  const images: HTMLImageElement[] = new Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    img.decoding = 'async';
    img.src = frameSrc(i);
    images[i] = img;
  }

  let currentIndex = 0;

  function drawFrame(index: number) {
    if (!canvas || !ctx) return;
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let sx: number, sy: number, sw: number, sh: number;

    if (imgRatio > canvasRatio) {
      sh = img.naturalHeight;
      sw = sh * canvasRatio;
      sy = 0;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sw = img.naturalWidth;
      sh = sw / canvasRatio;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }

  function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    drawFrame(currentIndex);
  }

  resizeCanvas();
  images[0].addEventListener('load', () => drawFrame(0), { once: true });
  window.addEventListener('resize', resizeCanvas);
  ownResizeHandlers.push(resizeCanvas);

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.35,
    onUpdate: (self) => {
      currentIndex = Math.min(frameCount - 1, Math.floor(self.progress * frameCount));
      drawFrame(currentIndex);
      if (caption) {
        const visible = self.progress > 0.12 && self.progress < 0.88;
        gsap.to(caption, { autoAlpha: visible ? 1 : 0, y: visible ? 0 : 16, duration: 0.4, overwrite: true });
      }
    },
  });
  ownTriggers.push(trigger);
}

function initAll() {
  ownTriggers.forEach((trigger) => trigger.kill());
  ownTriggers = [];
  ownResizeHandlers.forEach((handler) => window.removeEventListener('resize', handler));
  ownResizeHandlers = [];

  document.querySelectorAll<HTMLElement>('[data-frame-scroll]').forEach((section) => initSequence(section));
}

document.addEventListener('astro:page-load', initAll);

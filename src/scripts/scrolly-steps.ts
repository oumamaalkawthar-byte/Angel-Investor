import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Triggers created by this module only — see motion.ts for why a scoped
// array (never a global ScrollTrigger.getAll().kill()) is required here.
let ownTriggers: ScrollTrigger[] = [];

interface Keyframe {
  t: number;
  xPercent: number;
  yPercent: number;
  opacity: number;
}

function interp(frames: Keyframe[], t: number): { xPercent: number; yPercent: number; opacity: number } {
  if (t <= frames[0].t) return frames[0];
  const last = frames[frames.length - 1];
  if (t >= last.t) return last;
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (t >= a.t && t <= b.t) {
      const local = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return {
        xPercent: a.xPercent + (b.xPercent - a.xPercent) * local,
        yPercent: a.yPercent + (b.yPercent - a.yPercent) * local,
        opacity: a.opacity + (b.opacity - a.opacity) * local,
      };
    }
  }
  return last;
}

/**
 * Per-card keyframe timeline, in "virtual beats" (1 beat per scroll segment).
 * Card i slides in from the right during beat i, holds, then slides out left
 * as the next card arrives — except the last card, which swipes up and out
 * during its own extra trailing beat instead of sliding left (nothing behind
 * it to slide into), unpinning into the next section right after.
 */
function buildKeyframes(index: number, count: number): Keyframe[] {
  const isLast = index === count - 1;
  const enter = index + 0.7;
  const settle = index + 1.0;

  if (!isLast) {
    const exitStart = index + 1.0;
    const exitEnd = index + 1.3;
    return [
      { t: index, xPercent: index === 0 ? 0 : 120, yPercent: 0, opacity: index === 0 ? 1 : 0 },
      { t: enter, xPercent: 0, yPercent: 0, opacity: 1 },
      { t: settle, xPercent: 0, yPercent: 0, opacity: 1 },
      { t: exitStart, xPercent: 0, yPercent: 0, opacity: 1 },
      { t: exitEnd, xPercent: -120, yPercent: 0, opacity: 0 },
    ];
  }

  const swipeStart = index + 1.0;
  const swipeEnd = index + 1.3;
  return [
    { t: index, xPercent: 120, yPercent: 0, opacity: 0 },
    { t: enter, xPercent: 0, yPercent: 0, opacity: 1 },
    { t: settle, xPercent: 0, yPercent: 0, opacity: 1 },
    { t: swipeStart, xPercent: 0, yPercent: 0, opacity: 1 },
    { t: swipeEnd, xPercent: 0, yPercent: -120, opacity: 0 },
  ];
}

function initScrollySteps() {
  ownTriggers.forEach((t) => t.kill());
  ownTriggers = [];

  document.querySelectorAll<HTMLElement>('[data-scrolly]').forEach((section) => {
    const stage = section.querySelector<HTMLElement>('[data-scrolly-stage]');
    const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-scrolly-card]'));
    const frames = Array.from(section.querySelectorAll<HTMLElement>('[data-scrolly-frame]'));
    const tagEl = section.querySelector<HTMLElement>('[data-scrolly-tag]');
    if (cards.length === 0 || !stage) return;

    const count = cards.length;
    const tags = cards.map((c) => c.querySelector('.font-mono')?.textContent?.trim() ?? '');
    const keyframesByCard = cards.map((_, i) => buildKeyframes(i, count));
    let lastActive = -1;

    function setFrame(index: number) {
      if (index === lastActive) return;
      lastActive = index;
      frames.forEach((frame) => {
        frame.classList.toggle('hidden', frame.dataset.scrollyFrame !== String(index));
      });
      if (tagEl && tags[index]) tagEl.textContent = tags[index];
    }

    gsap.set(cards, { xPercent: 120, opacity: 0 });
    gsap.set(cards[0], { xPercent: 0, opacity: 1 });
    setFrame(0);

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${count * window.innerHeight}`,
      pin: stage,
      pinSpacing: false,
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const virtualT = self.progress * count;
        cards.forEach((card, i) => {
          const frame = interp(keyframesByCard[i], virtualT);
          gsap.set(card, frame);
        });
        setFrame(Math.min(count - 1, Math.max(0, Math.round(virtualT - 0.5))));
      },
    });
    ownTriggers.push(trigger);
  });
}

document.addEventListener('astro:page-load', initScrollySteps);

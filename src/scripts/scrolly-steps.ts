import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Triggers created by this module only — see motion.ts for why a scoped
// array (never a global ScrollTrigger.getAll().kill()) is required here.
let ownTriggers: ScrollTrigger[] = [];

function initScrollySteps() {
  ownTriggers.forEach((t) => t.kill());
  ownTriggers = [];

  document.querySelectorAll<HTMLElement>('[data-scrolly]').forEach((section) => {
    const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-scrolly-step]'));
    const frames = Array.from(section.querySelectorAll<HTMLElement>('[data-scrolly-frame]'));
    const tagEl = section.querySelector<HTMLElement>('[data-scrolly-tag]');
    if (steps.length === 0) return;

    const tags = steps.map((s) => s.querySelector('.font-mono')?.textContent?.trim() ?? '');

    function setActive(index: number) {
      steps.forEach((step, i) => step.dataset.active = String(i === index));
      frames.forEach((frame) => {
        frame.classList.toggle('hidden', frame.dataset.scrollyFrame !== String(index));
      });
      if (tagEl && tags[index]) tagEl.textContent = tags[index];
    }

    setActive(0);

    steps.forEach((step, i) => {
      const trigger = ScrollTrigger.create({
        trigger: step,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (self.isActive) setActive(i);
        },
      });
      ownTriggers.push(trigger);
    });
  });
}

document.addEventListener('astro:page-load', initScrollySteps);

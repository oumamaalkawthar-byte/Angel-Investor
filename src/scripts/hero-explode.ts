import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Triggers created by this module only — see motion.ts for why a scoped
// array (never a global ScrollTrigger.getAll().kill()) is required here.
let ownTriggers: ScrollTrigger[] = [];
let resizeHandler: (() => void) | null = null;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function initHeroExplode() {
  ownTriggers.forEach((t) => t.kill());
  ownTriggers = [];
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }

  const section = document.querySelector<HTMLElement>('[data-hero-explode]');
  if (!section) return;

  const cards = gsap.utils.toArray<HTMLElement>('[data-explode-card]', section);
  const content = section.querySelector<HTMLElement>('[data-hero-content]');
  if (cards.length === 0) return;

  if (prefersReducedMotion()) {
    gsap.set(cards, { clearProps: 'all' });
    return;
  }

  function pullToCenter() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2 - (gsap.getProperty(card, 'x') as number);
      const cardCenterY = rect.top + rect.height / 2 - (gsap.getProperty(card, 'y') as number);
      gsap.set(card, {
        x: centerX - cardCenterX,
        y: centerY - cardCenterY,
        scale: 0.3,
        opacity: 0,
      });
    });
  }

  pullToCenter();

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: '+=100%',
      scrub: 0.6,
      pin: true,
    },
  });

  cards.forEach((card, i) => {
    tl.to(
      card,
      { x: 0, y: 0, scale: 1, opacity: 1, duration: 1, ease: 'power2.out' },
      i * 0.06
    );
  });

  if (content) {
    tl.to(content, { opacity: 0.12, scale: 0.94, duration: 1, ease: 'power1.out' }, 0);
  }

  if (tl.scrollTrigger) ownTriggers.push(tl.scrollTrigger);

  resizeHandler = () => ScrollTrigger.refresh();
  window.addEventListener('resize', resizeHandler);
}

document.addEventListener('astro:page-load', initHeroExplode);

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function initAbout() {
  const root = document.querySelector<HTMLElement>('.about-page');
  if (!root) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scope = gsap.context(() => {
    const slider = root.querySelector<HTMLElement>('[data-hero-slider]');
    const slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')];
    const slideButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-slide-button]')];
    let currentSlide = 0;
    let timer = 0;

    const showSlide = (next: number) => {
      currentSlide = (next + slides.length) % slides.length;
      slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === currentSlide);
        slide.setAttribute('aria-hidden', String(index !== currentSlide));
      });
      slideButtons.forEach((button, index) => button.classList.toggle('active', index === currentSlide));
    };
    const startSlider = () => {
      if (reducedMotion) return;
      window.clearInterval(timer);
      timer = window.setInterval(() => showSlide(currentSlide + 1), 3000);
    };
    slideButtons.forEach((button) => button.addEventListener('click', () => { showSlide(Number(button.dataset.index)); startSlider(); }));
    slider?.addEventListener('mouseenter', () => window.clearInterval(timer));
    slider?.addEventListener('mouseleave', startSlider);
    slider?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') showSlide(currentSlide - 1);
      if (event.key === 'ArrowRight') showSlide(currentSlide + 1);
    });
    startSlider();

    const principleArticles = [...root.querySelectorAll<HTMLElement>('[data-principle]')];
    const principleButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-principle-button]')];
    const principleNumber = root.querySelector<HTMLElement>('[data-principle-number]');
    const principleKey = root.querySelector<HTMLElement>('[data-principle-key]');
    const principleData = [
      { number: '01', key: 'Values first' },
      { number: '02', key: 'Clear decisions' },
      { number: '03', key: 'Beyond funding' },
    ];
    const setPrinciple = (active: number) => {
      principleArticles.forEach((item, index) => item.classList.toggle('active', index === active));
      principleButtons.forEach((item, index) => item.classList.toggle('active', index === active));
      if (principleNumber) principleNumber.textContent = principleData[active].number;
      if (principleKey) principleKey.textContent = principleData[active].key;
    };
    principleArticles.forEach((article, index) => ScrollTrigger.create({ trigger: article, start: 'top 58%', end: 'bottom 42%', onEnter: () => setPrinciple(index), onEnterBack: () => setPrinciple(index) }));
    principleButtons.forEach((button) => button.addEventListener('click', () => principleArticles[Number(button.dataset.index)]?.scrollIntoView({ behavior: 'smooth', block: 'center' })));

    const approachCards = [...root.querySelectorAll<HTMLElement>('[data-approach-card]')];
    const approachTriggers = [...root.querySelectorAll<HTMLElement>('[data-approach-trigger]')];
    const approachButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-approach-button]')];
    const approachNumber = root.querySelector<HTMLElement>('[data-approach-number]');
    const setApproach = (active: number) => {
      approachCards.forEach((card, index) => {
        card.classList.remove('active', 'past', 'next', 'future');
        card.classList.add(index === active ? 'active' : index < active ? 'past' : index === active + 1 ? 'next' : 'future');
      });
      approachButtons.forEach((item, index) => item.classList.toggle('active', index === active));
      if (approachNumber) approachNumber.textContent = String(active + 1).padStart(2, '0');
    };
    approachTriggers.forEach((trigger, index) => ScrollTrigger.create({ trigger, start: 'top 52%', end: 'bottom 48%', onEnter: () => setApproach(index), onEnterBack: () => setApproach(index) }));
    approachButtons.forEach((button) => button.addEventListener('click', () => approachTriggers[Number(button.dataset.index)]?.scrollIntoView({ behavior: 'smooth', block: 'center' })));

    if (!reducedMotion) {
      gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.reveal')).forEach((element) => gsap.from(element, { y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 84%', once: true } }));
      gsap.from(root.querySelectorAll('.about-hero-copy > *'), { y: 34, opacity: 0, duration: 0.85, stagger: 0.09, delay: 0.25, ease: 'power3.out' });
    }

    return () => window.clearInterval(timer);
  }, root);

  return () => scope.revert();
}

let cleanup: (() => void) | undefined;
document.addEventListener('astro:page-load', () => {
  cleanup?.();
  cleanup = initAbout();
});

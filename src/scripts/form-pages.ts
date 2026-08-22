function validatePanel(panel: HTMLElement): boolean {
  const fields = panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[required]');
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  return true;
}

function showSuccess(root: HTMLElement, ref?: string) {
  const formView = root.querySelector<HTMLElement>('[data-form-view]');
  const successView = root.querySelector<HTMLElement>('[data-success-view]');
  const refEl = root.querySelector<HTMLElement>('[data-ref-number]');
  if (refEl && ref) refEl.textContent = ref;
  formView?.setAttribute('hidden', '');
  successView?.removeAttribute('hidden');
  successView?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initFormPages() {
  const root = document.querySelector<HTMLElement>('.ai-form-page');
  if (!root) return;

  root.querySelectorAll<HTMLElement>('[data-choice-group]').forEach((group) => {
    const hidden = group.querySelector<HTMLInputElement>('input[type="hidden"]');
    const multiple = group.dataset.multiple === 'true';
    const selected = new Set<string>((hidden?.value || '').split(',').map((v) => v.trim()).filter(Boolean));
    group.querySelectorAll<HTMLButtonElement>('button[data-value]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.value || '';
        if (multiple) (selected.has(value) ? selected.delete(value) : selected.add(value));
        else { selected.clear(); selected.add(value); }
        group.querySelectorAll<HTMLButtonElement>('button[data-value]').forEach((item) => {
          const active = selected.has(item.dataset.value || '');
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        if (hidden) hidden.value = [...selected].join(', ');
      });
    });
  });

  const startup = root.querySelector<HTMLElement>('[data-startup-form]');
  if (startup) {
    const panels = Array.from(startup.querySelectorAll<HTMLElement>('[data-step-panel]'));
    const navButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.ai-step-nav [data-step-target]'));
    const current = root.querySelector<HTMLElement>('[data-current-step]');
    const title = root.querySelector<HTMLElement>('[data-step-title]');
    const copy = root.querySelector<HTMLElement>('[data-step-copy]');
    const progress = root.querySelector<HTMLElement>('[data-progress-fill]');
    const actions = Array.from(startup.querySelectorAll<HTMLElement>('[data-step-action]'));
    let step = 0;

    const showStep = (next: number, shouldScroll = true) => {
      step = Math.max(0, Math.min(panels.length - 1, next));
      panels.forEach((panel, index) => {
        panel.classList.toggle('is-active', index === step);
        panel.setAttribute('aria-hidden', String(index !== step));
      });
      navButtons.forEach((button, index) => {
        button.classList.toggle('is-active', index === step);
        button.classList.toggle('is-done', index < step);
        const number = button.querySelector<HTMLElement>(':scope > span');
        if (number) number.textContent = index < step ? '✓' : String(index + 1).padStart(2, '0');
      });
      const activeButton = navButtons[step];
      if (current) current.textContent = `${String(step + 1).padStart(2, '0')} / 04`;
      if (title) title.textContent = activeButton?.dataset.title || '';
      if (copy) copy.textContent = activeButton?.dataset.copy || '';
      if (progress) progress.style.height = `${((step + 1) / panels.length) * 100}%`;
      actions.forEach((action) => action.toggleAttribute('hidden', Number(action.dataset.stepAction) !== step));
      if (shouldScroll) document.querySelector('#form-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Jumping backward or to an already-completed step never needs validation.
    navButtons.forEach((button, index) => button.addEventListener('click', () => {
      if (index > step && !validatePanel(panels[step])) return;
      showStep(index);
    }));
    startup.querySelectorAll<HTMLButtonElement>('.ai-review [data-step-target]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.stepTarget))));
    startup.querySelectorAll<HTMLButtonElement>('[data-next]').forEach((button) => button.addEventListener('click', () => {
      if (!validatePanel(panels[step])) return;
      showStep(step + 1);
    }));
    startup.querySelectorAll<HTMLButtonElement>('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(step - 1)));
    showStep(0, false);

    const addButton = startup.querySelector<HTMLButtonElement>('[data-add-cofounder]');
    const list = startup.querySelector<HTMLElement>('[data-cofounder-list]');
    const template = startup.querySelector<HTMLTemplateElement>('#cofounder-template');
    let cofounders = 0;
    addButton?.addEventListener('click', () => {
      if (!list || !template || cofounders >= 3) return;
      cofounders += 1;
      const html = template.innerHTML.replaceAll('__INDEX__', String(cofounders));
      list.insertAdjacentHTML('beforeend', html);
      if (cofounders === 3) addButton.hidden = true;
    });

    startup.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validatePanel(panels[step])) return;
      const ref = `AI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      showSuccess(root, ref);
    });
  }

  const investorForm = root.querySelector<HTMLFormElement>('#investor-application-form');
  investorForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!investorForm.reportValidity()) return;
    const ref = `AI-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    showSuccess(root, ref);
  });

  const contactForm = root.querySelector<HTMLFormElement>('#contact-form');
  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!contactForm.reportValidity()) return;
    showSuccess(root);
  });

  root.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((input) => {
    input.addEventListener('change', () => {
      const name = input.closest('.ai-file-drop')?.querySelector<HTMLElement>('[data-file-name]');
      if (name) name.textContent = input.files?.[0]?.name || 'No file selected';
    });
  });

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.querySelectorAll<HTMLElement>('.ai-form-hero-copy > *').forEach((item, index) => {
      item.animate([{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 760, delay: index * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    });
    root.querySelector<HTMLElement>('.ai-form-mark')?.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      (entry.target as HTMLElement).animate([{ opacity: 0, transform: 'translateY(36px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
      observer.unobserve(entry.target);
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    root.querySelectorAll<HTMLElement>('.ai-form-section,.ai-contact-card,.ai-trust-rail article').forEach((item) => observer.observe(item));
  }
}

document.addEventListener('astro:page-load', initFormPages);

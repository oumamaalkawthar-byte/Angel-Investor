// Shared interactive behavior for chips, radio-cards, and file uploads.
// Used by both the startup wizard and the investor form.

export function initChipGroups(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-chip-group]').forEach((group) => {
    const hidden = group.querySelector<HTMLInputElement>('[data-chip-value]');
    if (!hidden) return;
    const chips = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-chip]'));
    const selected = new Set<string>();

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const label = chip.textContent?.trim() ?? '';
        const isOn = chip.dataset.on === 'true';
        if (isOn) {
          chip.removeAttribute('data-on');
          selected.delete(label);
        } else {
          chip.dataset.on = 'true';
          selected.add(label);
        }
        hidden.value = [...selected].join(', ');
      });
    });
  });
}

export function initRadioGroups(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-radio-group]').forEach((group) => {
    const hidden = group.querySelector<HTMLInputElement>('[data-radio-value]');
    if (!hidden) return;
    const cards = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-radio-card]'));

    cards.forEach((card) => {
      card.addEventListener('click', () => {
        cards.forEach((c) => c.removeAttribute('data-on'));
        card.dataset.on = 'true';
        hidden.value = card.dataset.value ?? card.textContent?.trim() ?? '';
      });
    });
  });
}

export function initFileInputs(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement>('[data-file-input]').forEach((input) => {
    input.addEventListener('change', () => {
      const label = input.closest('[data-file-drop]')?.querySelector<HTMLElement>('[data-file-label]');
      if (label && input.files?.[0]) {
        label.textContent = input.files[0].name;
      }
    });
  });
}

// Custom-styled dropdown for <select> fields. Native select popups don't
// respect `color-scheme` on Windows Chrome (a long-standing Chromium
// limitation), so the picker always renders with the OS light theme
// regardless of page CSS — this replaces the visible popup with our own
// dark-styled panel while keeping a visually-hidden native <select> as the
// source of truth for form submission and required-field validation.
export function initSelects(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-select-root]').forEach((wrap) => {
    const trigger = wrap.querySelector<HTMLButtonElement>('[data-select-trigger]');
    const label = wrap.querySelector<HTMLElement>('[data-select-label]');
    const native = wrap.querySelector<HTMLSelectElement>('[data-select-native]');
    const panel = wrap.querySelector<HTMLElement>('[data-select-panel]');
    const chevron = wrap.querySelector<HTMLElement>('[data-select-chevron]');
    const options = Array.from(wrap.querySelectorAll<HTMLButtonElement>('[data-select-option]'));
    if (!trigger || !native || !panel || !label) return;

    const close = () => {
      panel.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
      chevron?.classList.remove('rotate-180');
    };
    const open = () => {
      panel.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      chevron?.classList.add('rotate-180');
    };

    trigger.addEventListener('click', () => {
      panel.classList.contains('hidden') ? open() : close();
    });

    options.forEach((opt) => {
      opt.addEventListener('click', () => {
        const value = opt.dataset.selectOption ?? '';
        native.value = value;
        native.dispatchEvent(new Event('change', { bubbles: true }));
        label.textContent = value;
        label.classList.remove('text-paper/30');
        options.forEach((o) => o.removeAttribute('data-active'));
        opt.dataset.active = 'true';
        close();
      });
    });

    wrap.addEventListener('focusout', (e) => {
      const next = (e as FocusEvent).relatedTarget as Node | null;
      if (!next || !wrap.contains(next)) close();
    });
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  });
}

export function initFormWidgets(root: ParentNode = document) {
  initChipGroups(root);
  initRadioGroups(root);
  initFileInputs(root);
  initSelects(root);
}

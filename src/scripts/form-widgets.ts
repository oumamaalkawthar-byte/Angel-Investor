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

export function initFormWidgets(root: ParentNode = document) {
  initChipGroups(root);
  initRadioGroups(root);
  initFileInputs(root);
}

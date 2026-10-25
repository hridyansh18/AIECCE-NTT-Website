/**
 * Contact page: "Send a quick message" opens WhatsApp with a prefilled text.
 * No data is stored or sent to a server.
 */
(() => {
  'use strict';

  const WHATSAPP_NUMBER = '919644119994';

  const form = document.getElementById('waForm');
  if (!form) return;

  const nameInput = document.getElementById('wName');
  const nameError = document.getElementById('e-wName');
  const courseSelect = document.getElementById('wCourse');
  const messageInput = document.getElementById('wMsg');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    if (name.length < 2) {
      nameError.textContent = 'Please enter your name.';
      nameInput.focus();
      return;
    }
    nameError.textContent = '';

    const extra = messageInput.value.trim();
    const text =
      `Hello SR NTT Institute, my name is ${name}. ` +
      `I am interested in: ${courseSelect.value}.` +
      (extra ? ` ${extra}` : '');

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener'
    );
  });
})();

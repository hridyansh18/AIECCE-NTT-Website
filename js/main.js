/**
 * Site-wide behaviour: mobile menu and scroll-reveal animation.
 */
(() => {
  'use strict';

  /* ---------- Mobile navigation ---------- */
  const burger = document.querySelector('.burger');
  const nav = document.getElementById('nav');

  if (burger && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    burger.addEventListener('click', () => {
      setOpen(!nav.classList.contains('open'));
    });

    // Close the menu after a link is tapped.
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        setOpen(false);
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = document.querySelectorAll(
    '.card, .gal img, .fact, .steps2 li, .photo'
  );

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    revealTargets.forEach((el) => {
      el.classList.add('reveal');
      observer.observe(el);
    });
  }
})();

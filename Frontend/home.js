/* ── Navbar darkens on scroll ─────────────────────────── */
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

/* ── Scroll-reveal via IntersectionObserver ──────────── */
const revealEls = document.querySelectorAll('.scroll-reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target); // animate once
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => observer.observe(el));

/* ── Hero reveals fire immediately on load ───────────── */
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal').forEach(el => {
    // Small timeout so CSS transition actually plays
    setTimeout(() => el.classList.add('visible'), 80);
  });
});
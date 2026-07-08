/* ============================================================
   DOMINIC PRO TOOLS — Main Script
   ============================================================ */

// ── Mobile Nav Toggle ──────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
});

// Close mobile nav on link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// Close mobile nav when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.navbar')) {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
  }
});

// Cart is managed by cart.js (addToCart defined there)

// ── Sticky Navbar shadow on scroll ─────────────────────────
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 10) {
    navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,.6)';
  } else {
    navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,.4)';
  }
});

// ── Scroll-in animation (fade up) ──────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(
  '.feature-card, .category-card, .product-card-item, .hero-product-card'
).forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});

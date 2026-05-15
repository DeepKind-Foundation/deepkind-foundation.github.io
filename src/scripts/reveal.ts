/**
 * Scroll-reveal — observes elements with class "reveal" and adds
 * "revealed" when they enter the viewport. Stagger delays are applied
 * via "reveal-delay-{n}" CSS classes defined in global.css.
 *
 * Skipped entirely when prefers-reduced-motion is set: the CSS
 * @media (prefers-reduced-motion: reduce) rule already forces all
 * .reveal elements to their visible state, so we just mark them all
 * revealed immediately and bail out.
 */

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReduced) {
  // Ensure every element is immediately visible (CSS handles this too,
  // but marking them revealed keeps any JS that checks the class in sync).
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.04, rootMargin: "0px" },
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

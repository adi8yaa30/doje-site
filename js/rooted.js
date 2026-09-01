/* ================================================================
   DOJE — 01 / Rooted in Assam
   Landscape reveals first, the can arrives second, copy last.
   Depends on GSAP + ScrollTrigger (loaded before this file).
   ================================================================ */

(function () {
    'use strict';

    const section = document.getElementById('rooted');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mountain  = document.getElementById('riaMountain');
    const sphere    = document.getElementById('riaSphere');
    const label     = document.getElementById('riaLabel');   /* the text, not the wrapper */
    const rule      = section.querySelector('.ria-rule');
    const heading   = document.getElementById('riaHeading');
    const lead      = document.getElementById('riaLead');
    const note      = document.getElementById('riaNote');
    const quote     = document.getElementById('riaQuote');

    const copy = [label, heading, lead, note, quote].filter(Boolean);

    // The can is not moved by this section. It stays locked in the centre of
    // the viewport for the whole journey — the landscape assembles around it
    // rather than the can flying in and out of frame.

    /* ------------------------------------------------------------------
       Reduced motion: show the settled composition, skip the choreography.
    ------------------------------------------------------------------ */
    if (reduced) {
        gsap.set(copy, { opacity: 1, y: 0 });
        gsap.set(sphere, { opacity: 1 });
        gsap.set(rule, { scaleX: 1 });
        return;
    }

    gsap.set(mountain, { yPercent: 100 });
    gsap.set(sphere,   { opacity: 0, scale: 0.88 });
    gsap.set(rule,     { scaleX: 0 });
    gsap.set(copy,     { opacity: 0, y: 26 });

    /* ------------------------------------------------------------------
       The scene itself. One scrubbed timeline over the pinned length; the can
       stays centred throughout and the landscape builds around it:

         0.00 → 0.36   mountain rises into frame beneath it
         0.12 → 0.26   rule draws itself in
         0.30 → 0.54   sphere fades up behind the mountain
         0.56 → 0.85   copy staggers in
         0.60 → 1.00   mountain keeps drifting (depth)
    ------------------------------------------------------------------ */
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            invalidateOnRefresh: true
        }
    });

    // Mountain — heavy and slow, rising into frame while the can is still on
    // its way down. power2.out covers most of the distance early then eases
    // into place, so it reads as decelerating mass rather than tracking the
    // wheel one-to-one.
    tl.fromTo(mountain,
        { yPercent: 100 },
        { yPercent: 0, duration: 0.36, ease: 'power2.out' }, 0);

    // The rule belongs to the section's initial state — it draws itself in
    // while the mountain is still rising, before anything else appears.
    tl.to(rule, { scaleX: 1, duration: 0.14, ease: 'power2.inOut' }, 0.12);

    // Sphere — once the mountain has landed, still under the descending can.
    tl.fromTo(sphere,
        { opacity: 0, scale: 0.88 },
        { opacity: 1, scale: 1, duration: 0.24, ease: 'power2.out' }, 0.30);

    // Copy — only after the can has settled, and spread out so no two blocks
    // land together.
    tl.to(label,   { opacity: 1, y: 0, duration: 0.09, ease: 'power2.out' }, 0.56);
    tl.to(heading, { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.61);
    tl.to(lead,    { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.66);
    tl.to(note,    { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.70);
    tl.to(quote,   { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.74);

    // Parallax tail: the mountain keeps creeping upward after it has settled,
    // so the scene has depth instead of freezing solid.
    tl.to(mountain, { yPercent: -3, duration: 0.40, ease: 'none' }, 0.60);

    // Pad the timeline to a full 1.0 so the position labels above are read as
    // fractions of the section's scroll, not of the last tween's end.
    tl.to({}, { duration: 0.01 }, 0.99);
})();

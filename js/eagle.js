/* ================================================================
   DOJE — 02 / The Eagle's Spirit
   The eagle waits behind an unbroken strip; the travelling can comes
   down, splits it, and the copy lands behind the split.
   Depends on GSAP + ScrollTrigger (loaded before this file).
   ================================================================ */

(function () {
    'use strict';

    const section = document.getElementById('eagle');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage   = document.getElementById('tesStage');
    const eagle   = document.getElementById('tesEagle');
    const stripL  = document.getElementById('tesStripL');
    const stripR  = document.getElementById('tesStripR');
    const label   = document.getElementById('tesLabel');
    const rule    = section.querySelector('.tes-rule');
    const heading = document.getElementById('tesHeading');
    const quote   = document.getElementById('tesQuote');
    const desc    = document.getElementById('tesDesc');
    const wings   = document.getElementById('tesWings');
    const gaze    = document.getElementById('tesGaze');
    const feathers = section.querySelectorAll('.tes-feather');

    const copy = [heading, quote, desc, wings, gaze].filter(Boolean);

    // The can is not moved by this section. It stays locked in the centre of
    // the viewport, already overlapping the strip when the section arrives, so
    // the split reads as the strip giving way to it.

    // How far each half travels when the strip splits. From the Figma: the
    // halves stop with their inner edges at 21% / 82% of the frame, which is
    // 88.6% of a half's own width in each direction.
    const SPLIT = 88.6;

    /* ------------------------------------------------------------------
       Reduced motion: settled composition, no choreography.
    ------------------------------------------------------------------ */
    if (reduced) {
        gsap.set([eagle, ...copy], { opacity: 1, y: 0 });
        gsap.set(label, { opacity: 1 });
        gsap.set(rule, { scaleX: 1 });
        gsap.set(stripL, { xPercent: -SPLIT });
        gsap.set(stripR, { xPercent: SPLIT });
        return;
    }

    gsap.set(eagle, { opacity: 0, y: 34 });
    gsap.set(label, { opacity: 0, y: 20 });
    gsap.set(rule,  { scaleX: 0 });
    gsap.set(copy,  { opacity: 0, y: 26 });

    /* ------------------------------------------------------------------
       Feathers — continuous drift and rotation, seamless in both directions.
       Started once and left alone; they are decorative and scroll-independent.
    ------------------------------------------------------------------ */
    feathers.forEach((f, i) => {
        const dir = i % 2 ? -1 : 1;
        gsap.to(f, {
            y: 18 * dir,
            duration: 7 + i * 1.7,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
        });
        gsap.to(f, {
            rotation: 7 * dir,
            duration: 9 + i * 2.3,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            transformOrigin: '50% 50%'
        });
    });

    /* ------------------------------------------------------------------
       ENTRANCE — runs while the section is still travelling up, before its
       sticky stage locks to the top of the viewport.

       The strip rides up with the section, so it sweeps past the stationary
       can. The split has to be cued to that sweep, not to the pin: by the time
       the stage locks, the strip already sits at 55% and is crossing the can's
       middle — far too late to look like the can met it.

       Where the strip's top meets the can's base, as a fraction of this
       window: the stage sits at (1 - p) * vh while unstuck, so
           (1 - p) * vh + STRIP_TOP * vh = vh / 2 + canHeight / 2
       Solved live so it holds on any viewport.
    ------------------------------------------------------------------ */
    const STRIP_TOP = 0.5535;                 // matches .tes-strip top in CSS
    const canEl = document.getElementById('globalCan');

    const meetPoint = () => {
        const vh = window.innerHeight;
        const canH = canEl ? canEl.getBoundingClientRect().height : vh * 0.66;
        const p = 1 + STRIP_TOP - 0.5 - canH / (2 * vh);
        return Math.min(0.82, Math.max(0.08, p));
    };

    const entrance = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'top top',
            scrub: 1,
            invalidateOnRefresh: true
        }
    });

    const MEET = meetPoint();

    // Eagle — established just ahead of the split, so it is already behind the
    // strip when the halves part rather than appearing out of nowhere after.
    entrance.to(eagle, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' },
                Math.max(0, MEET - 0.24));

    // Strip split — the can meets the rising strip and pushes it apart. Ends
    // just before the stage pins, so the halves are clear by then.
    entrance.to(stripL, { xPercent: -SPLIT, duration: 0.96 - MEET, ease: 'power3.inOut' }, MEET);
    entrance.to(stripR, { xPercent:  SPLIT, duration: 0.96 - MEET, ease: 'power3.inOut' }, MEET);

    // Pad to a full 1.0 so the positions above are fractions of this window and
    // not of the last tween's end.
    entrance.to({}, { duration: 0.01 }, 0.99);

    /* ------------------------------------------------------------------
       PINNED SCENE — the strip is already open by now, so the copy lands
       straight away, in the Figma's reading order.

         0.08 → 0.50   heading, label, quote, description, cards
         0.50 → 1.00   settled and stable
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

    tl.to(heading, { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.08);
    tl.to(label,   { opacity: 1, y: 0, duration: 0.09, ease: 'power2.out' }, 0.15);
    tl.to(rule,    { scaleX: 1, duration: 0.10, ease: 'power2.inOut' }, 0.18);
    tl.to(quote,   { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.22);
    tl.to(desc,    { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.30);
    tl.to(wings,   { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.37);
    tl.to(gaze,    { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.43);

    tl.to({}, { duration: 0.01 }, 0.99);
})();

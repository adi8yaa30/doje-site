/* ================================================================
   DOJE — 03 / Strong Yet Smooth
   Poured-beer foam along the bottom, carbonation rising through the
   scene, the can centred, then handed off to the story sequence.
   Depends on GSAP + ScrollTrigger (loaded before this file).
   ================================================================ */

(function () {
    'use strict';

    const section = document.getElementById('smooth');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fizz    = document.getElementById('sysFizz');
    const field   = document.getElementById('sysBubbles');
    const label   = document.getElementById('sysLabel');
    const rule    = section.querySelector('.sys-rule');
    const heading = document.getElementById('sysHeading');
    const abv     = document.getElementById('sysAbv');
    const served  = document.getElementById('sysServed');
    const copy    = document.getElementById('sysCopy');

    const reveal = [heading, abv, served, copy].filter(Boolean);

    /* ------------------------------------------------------------------
       Carbonation.

       The Figma shows one asset reused at many sizes: a dense column of
       small bubbles up the left edge, two large ones bleeding off it, and a
       small cluster around 74% across. Rather than hard-coding those nine,
       the field below reproduces that distribution and lets each bubble
       rise, drift, fade and respawn on its own clock — otherwise the loop
       reads as a repeating pattern rather than carbonation.

       Sizes are % of stage width, matching the 1.5%–6.8% range measured off
       the reference. A seeded generator keeps the layout stable between
       loads while still looking scattered.
    ------------------------------------------------------------------ */
    const loops = [];

    const BUBBLES = [
        // { x: % across, size: % of width, lane: how far it wanders }
        { x: 2.0,  size: 5.9 }, { x: 3.3,  size: 6.8 },
        { x: 15.5, size: 3.6 }, { x: 10.9, size: 2.1 },
        { x: 7.8,  size: 2.1 }, { x: 5.1,  size: 2.1 },
        { x: 3.2,  size: 2.1 }, { x: 12.6, size: 1.5 },
        { x: 1.4,  size: 3.1 }, { x: 8.9,  size: 1.6 },
        { x: 73.8, size: 3.2 }, { x: 76.1, size: 1.6 },
        { x: 71.6, size: 2.0 }, { x: 78.4, size: 1.4 },
        { x: 45.0, size: 1.5 }, { x: 88.0, size: 2.4 }
    ];

    // Deterministic pseudo-random so the field is identical on every load.
    let seed = 20260726;
    const rnd = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };

    function buildBubbles() {
        if (!field) return;

        const frag = document.createDocumentFragment();
        const made = [];

        BUBBLES.forEach((b) => {
            const el = document.createElement('span');
            el.className = 'sys-bubble';
            el.style.width = b.size + '%';
            el.style.left = b.x + '%';
            el.style.bottom = '0';
            frag.appendChild(el);
            made.push({ el, size: b.size });
        });
        field.appendChild(frag);

        if (reduced) {
            // Hold a still frame: scattered up the scene, no motion.
            made.forEach((m, i) => {
                gsap.set(m.el, { opacity: 0.5, y: -(20 + ((i * 37) % 60)) + 'vh' });
            });
            return;
        }

        made.forEach((m) => {
            // Bigger bubbles rise more slowly — reads as more mass.
            const dur   = 13 + m.size * 2.2 + rnd() * 9;
            const drift = (rnd() - 0.5) * 7;            // gentle lateral wander, in vw
            const peak  = 0.32 + rnd() * 0.38;          // how opaque it gets

            gsap.set(m.el, { y: '10vh', x: 0, opacity: 0 });

            const tl = gsap.timeline({ repeat: -1 })
                .to(m.el, { y: '-105vh', x: drift + 'vw', duration: dur, ease: 'none' }, 0)
                // fade in off the bottom, hold, then fade out before the top
                .to(m.el, { opacity: peak, duration: dur * 0.18, ease: 'sine.out' }, 0)
                .to(m.el, { opacity: 0, duration: dur * 0.30, ease: 'sine.in' }, dur * 0.70);

            // Seek each one to its own point in the cycle so the field is
            // already spread on the first painted frame. A negative delay would
            // mostly do this, but seeking is explicit and deterministic.
            tl.progress(rnd());
            loops.push(tl);
        });

        // Carbonation only needs to run while the section is on screen.
        ScrollTrigger.create({
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            onToggle: (self) => {
                loops.forEach((tl) => (self.isActive ? tl.play() : tl.pause()));
            }
        });
    }

    /* ------------------------------------------------------------------
       Foam. Bottom-anchored, so it can only breathe and sway — a slow
       vertical bob plus an even slower horizontal drift, on different
       periods so the loop point never lines up.
    ------------------------------------------------------------------ */
    function animateFizz() {
        if (!fizz || reduced) return;

        gsap.to(fizz, {
            yPercent: -2.2,
            duration: 9,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
        });
        gsap.to(fizz, {
            xPercent: 1.4,
            duration: 14,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
        });
    }

    /* ------------------------------------------------------------------
       Copy. The can is already centred when the section arrives, so the
       reveal starts straight away, in the order the brief asks for:
       label, ABV badge, heading, left info, right info.
    ------------------------------------------------------------------ */
    function scene() {
        if (reduced) {
            gsap.set(reveal, { opacity: 1, y: 0 });
            gsap.set(label, { opacity: 1 });
            gsap.set(rule, { scaleX: 1 });
            return;
        }

        gsap.set(label,  { opacity: 0, y: 18 });
        gsap.set(rule,   { scaleX: 0 });
        gsap.set(reveal, { opacity: 0, y: 24 });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1,
                invalidateOnRefresh: true
            }
        });

        tl.to(label,   { opacity: 1, y: 0, duration: 0.09, ease: 'power2.out' }, 0.06);
        tl.to(rule,    { scaleX: 1, duration: 0.10, ease: 'power2.inOut' }, 0.10);
        tl.to(abv,     { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.14);
        tl.to(heading, { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.20);
        tl.to(served,  { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.28);
        tl.to(copy,    { opacity: 1, y: 0, duration: 0.11, ease: 'power2.out' }, 0.35);

        // Pad to a full 1.0 so the positions above are fractions of the
        // section's scroll rather than of the last tween's end.
        tl.to({}, { duration: 0.01 }, 0.99);
    }

    /* ------------------------------------------------------------------
       No hand-off here any more: the travelling can carries on centred into
       the infinite-slider section, which now owns the release to the story
       sequence. See js/slider.js.
    ------------------------------------------------------------------ */

    buildBubbles();
    animateFizz();
    scene();
})();

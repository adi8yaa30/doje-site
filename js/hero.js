/* ================================================================
   DOJE — Hero section (redesign)
   Topography backdrop warp, intro sequence, can/bottle toggle.
   Depends on GSAP + ScrollTrigger (loaded before this file).
   ================================================================ */

(function () {
    'use strict';

    const hero = document.querySelector('.hero-section');
    if (!hero || typeof gsap === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const nav      = document.getElementById('heroNav');
    const format   = document.getElementById('heroFormat');
    const dojeText = document.getElementById('heroDojeText');
    const title    = document.getElementById('heroTitle');
    const gallery  = document.getElementById('heroGallery');
    // Drift lives on the HTML wrapper, not the <g>: a CSS transform on the
    // wrapper is composited, so the filtered SVG underneath is rasterised
    // once and simply re-used. Animating the <g>'s transform attribute
    // instead would re-run the filter on every single frame.
    const drift    = document.getElementById('heroTopo');
    const noise    = document.getElementById('heroTopoNoise');
    const disp     = document.getElementById('heroTopoDisp');

    /* ------------------------------------------------------------------
       1. Topography backdrop — "one drink in" drift.

       Two independent layers of motion so the pattern never repeats
       obviously:

         · drift  — a very slow transform on a wrapping <g>. Pure GPU
                    work, runs every frame.
         · warp   — feTurbulence + feDisplacementMap. Re-rasterising the
                    filter is the expensive part, so its parameters are
                    stepped at ~12fps instead of 60. At these speeds the
                    stepping is invisible, and it keeps the hero cheap.
    ------------------------------------------------------------------ */
    function startBackdrop() {
        if (!drift || reduced) return;

        // Slow drift + breathing scale. Different periods on each axis so
        // the loop point is never legible.
        gsap.to(drift, {
            duration: 34,
            x: 26,
            y: -18,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
        });
        gsap.to(drift, {
            duration: 47,
            rotation: 1.1,
            scale: 1.035,
            transformOrigin: '50% 50%',
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
        });

        if (!noise || !disp) return;

        // Guard: Firefox/Safari occasionally bail on animated filter
        // primitives. Everything above still runs if this part is skipped.
        const warp = { fx: 0.0017, fy: 0.0024, scale: 16, seed: 9 };
        let lastPaint = 0;

        const paint = () => {
            noise.setAttribute('baseFrequency', warp.fx.toFixed(5) + ' ' + warp.fy.toFixed(5));
            noise.setAttribute('seed', Math.round(warp.seed));
            disp.setAttribute('scale', warp.scale.toFixed(1));
        };

        // ~12fps repaint of the filter chain.
        const throttled = () => {
            const now = performance.now();
            if (now - lastPaint < 80) return;
            lastPaint = now;
            paint();
        };

        gsap.to(warp, {
            duration: 26,
            fx: 0.0029,
            fy: 0.0015,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            onUpdate: throttled
        });
        gsap.to(warp, {
            duration: 19,
            scale: 27,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            onUpdate: throttled
        });
    }

    /* ------------------------------------------------------------------
       2. Intro sequence — nav, backdrop, wordmark, can, card, heading.
          Simple fades and short rises only: no letter-level animation,
          no overshoot.
    ------------------------------------------------------------------ */
    function intro() {
        if (reduced) {
            gsap.set([nav, format, title, gallery].filter(Boolean), { opacity: 1, y: 0 });
            if (dojeText) gsap.set(dojeText, { opacity: 1, x: 0, y: 0, xPercent: -50, yPercent: -50 });
            return;
        }

        gsap.set(nav,      { opacity: 0, y: -14 });
        gsap.set(format,   { opacity: 0, y: -10 });
        // GSAP owns the whole transform once it touches this element. x/y are
        // zeroed explicitly: without them GSAP keeps the pixel offset it read
        // from the CSS `translate(-50%, -50%)` and xPercent centres it twice.
        gsap.set(dojeText, { opacity: 0, scale: 1.04, x: 0, y: 0, xPercent: -50, yPercent: -50 });
        gsap.set(title,    { opacity: 0, y: 22 });
        gsap.set(gallery,  { opacity: 0, y: 26 });

        const tl = gsap.timeline({ delay: 0.15, defaults: { ease: 'power3.out' } });

        tl.to(nav,      { opacity: 1, y: 0, duration: 1.0 })
          .to(format,   { opacity: 1, y: 0, duration: 0.8 }, '-=0.72')
          .to(dojeText, { opacity: 1, scale: 1, duration: 1.5, ease: 'power2.out' }, '-=0.55')
          .to(gallery,  { opacity: 1, y: 0, duration: 1.0 }, '-=0.85')
          .to(title,    { opacity: 1, y: 0, duration: 1.0 }, '-=0.8');
    }

    /* ------------------------------------------------------------------
       3. Scroll behaviour — the hero furniture releases as the can starts
          its journey down. The can itself is owned by script.js.
    ------------------------------------------------------------------ */
    function scrollOut() {
        if (typeof ScrollTrigger === 'undefined' || reduced) return;

        // Heading + card ease away just ahead of the section change so the
        // hero hands over rather than cutting.
        gsap.to([title, gallery].filter(Boolean), {
            opacity: 0,
            y: -18,
            ease: 'none',
            scrollTrigger: { trigger: hero, start: '12% top', end: '62% top', scrub: true }
        });

        // The backdrop drifts up a touch slower than the page: depth.
        if (drift) {
            gsap.to(drift, {
                yPercent: -6,
                ease: 'none',
                scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
            });
        }

        // Gentle parallax on the preview card.
        if (gallery) {
            gsap.to(gallery, {
                y: -34,
                ease: 'none',
                scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 }
            });
        }
    }

    /* ------------------------------------------------------------------
       4. Can / bottle toggle. The thumb slides immediately so the control
          feels responsive, then the page cross-fades out to the variant.
    ------------------------------------------------------------------ */
    function formatToggle() {
        if (!format) return;

        const opts = Array.from(format.querySelectorAll('.hero-format-opt'));
        const current = format.dataset.active || 'can';
        format.dataset.active = current;

        opts.forEach((opt) => {
            opt.addEventListener('click', (e) => {
                const next = opt.dataset.format;
                if (next === format.dataset.active) { e.preventDefault(); return; }

                e.preventDefault();
                format.dataset.active = next;
                opts.forEach((o) => o.classList.toggle('is-active', o === opt));

                const go = () => { window.location.href = opt.getAttribute('href'); };
                if (reduced) { go(); return; }

                // Let the thumb travel, then fade the page out into the swap.
                gsap.to(document.body, {
                    opacity: 0,
                    duration: 0.45,
                    delay: 0.22,
                    ease: 'power2.inOut',
                    onComplete: go
                });
            });
        });
    }

    /* ------------------------------------------------------------------
       5. Mark the toggle's starting side from the page we're on.
    ------------------------------------------------------------------ */
    function syncFormat() {
        if (!format) return;
        const onBottle = /bottle\.html$/i.test(window.location.pathname);
        format.dataset.active = onBottle ? 'bottle' : 'can';
        format.querySelectorAll('.hero-format-opt').forEach((o) => {
            o.classList.toggle('is-active', o.dataset.format === format.dataset.active);
        });
    }

    // Coming back via the bfcache would otherwise restore the faded-out body
    // left behind by the format swap.
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) gsap.set(document.body, { clearProps: 'opacity' });
    });

    const boot = () => {
        syncFormat();
        startBackdrop();
        intro();
        scrollOut();
        formatToggle();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

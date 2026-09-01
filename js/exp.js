/* ============================================================
   05 — EXP. (expanding imagery)

   The stage is pinned via CSS `position: sticky` on .exp-pin inside the tall
   .exp-track; this file only drives the scrubbed transforms:

     - the rock/can plate scales up from its lockup size until it nearly
       fills the viewport, staying centred throughout
     - the "E" slides off the left edge, "XP." off the right, in lock-step
       with the scale
     - "BEYOND" drops away below the fold

   Everything animated is a transform, except the plate's border-radius,
   which is divided by the live scale so the *visual* corner radius eases
   from a full pill down to the tighter radius in the final composition.
   ============================================================ */
(function () {
    'use strict';

    var section = document.getElementById('experience');
    var track   = document.getElementById('expTrack');
    var pin     = document.getElementById('expPin');
    var plate   = document.getElementById('expPlate');
    var letterE = document.getElementById('expE');
    var letterX = document.getElementById('expXP');
    var beyond  = document.getElementById('expBeyond');

    if (!section || !track || !plate || !letterE || !letterX) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- measurements (re-taken on resize) ---------------------------- */
    var m = {
        vw: 0, vh: 0,
        plateW: 1, plateH: 1,   // untransformed plate box
        maxScale: 1,
        eShift: 0, xShift: 0,   // travel needed to clear each edge
        cx: 0, cy: 0,           // plate centre offset from the stage centre
        vrStart: 1, vrEnd: 1    // visual corner radius, start -> end
    };

    function measure() {
        m.vw = window.innerWidth;
        m.vh = window.innerHeight;

        // Read the plate's natural (scale: 1) box.
        var prev = plate.style.transform;
        plate.style.transform = 'none';
        var pr = plate.getBoundingClientRect();
        m.plateW = Math.max(1, pr.width);
        m.plateH = Math.max(1, pr.height);
        // At rest the plate is not centred on the stage: "XP." is wider than
        // "E" so it sits left of middle, and "BEYOND" below the lockup pushes
        // it up. Record both offsets and unwind them as the plate grows, so
        // the full-bleed final frame lands dead centre.
        var pinRect = pin.getBoundingClientRect();
        m.cx = (pr.left - pinRect.left + pr.width / 2) - m.vw / 2;
        m.cy = (pr.top - pinRect.top + pr.height / 2) - m.vh / 2;
        plate.style.transform = prev;

        // The plate ends up covering the whole stage: take the larger of the
        // two ratios so neither axis is left short, and scale uniformly so
        // the photo never distorts (the overflow is cropped by the plate).
        m.maxScale = Math.max(
            m.vw / m.plateW,
            m.vh / m.plateH
        );
        if (!isFinite(m.maxScale) || m.maxScale < 1) m.maxScale = 1;

        // Corner radius: a full pill at rest. It holds its on-screen size
        // while the plate grows, then closes off at the very end so the
        // final frame is edge-to-edge.
        m.vrStart = m.plateH / 2;
        m.vrEnd   = 0;

        // Letter travel: enough to carry each one fully past its edge.
        var pe = letterE.style.transform, px = letterX.style.transform;
        letterE.style.transform = 'none';
        letterX.style.transform = 'none';
        var er = letterE.getBoundingClientRect();
        var xr = letterX.getBoundingClientRect();
        letterE.style.transform = pe;
        letterX.style.transform = px;

        m.eShift = er.right + 24;              // slide left until past x = 0
        m.xShift = (m.vw - xr.left) + 24;      // slide right until past x = vw
    }

    /* ---- easing ------------------------------------------------------- */
    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function lerp(a, b, t) { return a + (b - a) * t; }

    /* ---- render ------------------------------------------------------- */
    function render(p) {
        var e = easeInOut(clamp01(p));

        var s = lerp(1, m.maxScale, e);
        plate.style.setProperty('--s', s);
        plate.style.transform =
            'translate3d(' + (-m.cx * e) + 'px,' + (-m.cy * e) + 'px,0) ' +
            'scale(' + s + ')';

        // The corner radius keeps its on-screen size through most of the
        // growth (so the rounding stays visible), then eases to nothing over
        // the last stretch as the plate reaches the edges of the stage.
        var vr = easeInOut(clamp01((p - 0.6) / 0.4));
        plate.style.setProperty('--vr', lerp(m.vrStart, m.vrEnd, vr) + 'px');

        // The letters lead the scale slightly so they are clear of the plate
        // before it reaches full size — no overlap, no fading.
        var le = easeInOut(clamp01(p / 0.85));
        letterE.style.transform = 'translate3d(' + (-m.eShift * le) + 'px,0,0)';
        letterX.style.transform = 'translate3d(' + ( m.xShift * le) + 'px,0,0)';

        if (beyond) {
            beyond.style.transform =
                'translate3d(0,' + (m.vh * 0.6 * le) + 'px,0)';
        }
    }

    /* ---- scroll wiring ------------------------------------------------ */
    var hasGSAP = !!(window.gsap && window.ScrollTrigger);

    function chrome(rect) {
        var mid = m.vh * 0.5;
        document.body.classList.toggle(
            'exp-active', rect.top < mid && rect.bottom > mid);
        // The travelling GLB can ends here: hide it from the moment the
        // stage enters the viewport, and keep it hidden below.
        document.body.classList.toggle('exp-handoff', rect.top < m.vh);
    }

    function init() {
        measure();

        if (reduced) {
            render(0);
            return;
        }

        if (hasGSAP) {
            window.gsap.registerPlugin(window.ScrollTrigger);
            window.ScrollTrigger.create({
                trigger: track,
                start: 'top top',
                end: 'bottom bottom',
                // A short catch-up rather than a hard 1:1 lock — the scale
                // keeps easing for a beat after the wheel stops, which is
                // what makes the growth read as smooth.
                scrub: 0.8,
                invalidateOnRefresh: true,
                onRefreshInit: measure,
                onUpdate: function (self) { render(self.progress); }
            });
            // Chrome toggles ride along on plain scroll — cheap and always
            // correct even outside the scrubbed range.
            window.addEventListener('scroll', function () {
                chrome(pin.getBoundingClientRect());
            }, { passive: true });
        } else {
            var loop = function () {
                var r = track.getBoundingClientRect();
                var range = Math.max(1, r.height - m.vh);
                render(clamp01(-r.top / range));
                chrome(pin.getBoundingClientRect());
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }

        chrome(pin.getBoundingClientRect());
        render(0);

        window.addEventListener('resize', function () {
            measure();
            if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        });
        window.addEventListener('load', function () {
            measure();
            if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

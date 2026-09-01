/* ================================================================
   DOJE — 04 / Infinite sliding cans
   Nine GLB cans on a size-graded track sliding right→left. The
   travelling can descends into the centre slot and is handed over to
   the row without a visible transition; hovering any can tumbles it.
   Depends on GSAP + ScrollTrigger (loaded before this file).
   ================================================================ */

(function () {
    'use strict';

    const section = document.getElementById('slider');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const track   = document.getElementById('cisTrack');
    const heading = document.getElementById('cisHeading');
    const globalCan = document.getElementById('globalCan');

    const MODEL = 'assets/doje_can_premium.glb';

    /* ------------------------------------------------------------------
       The track.

       Measured off the Figma (frame 1728 x 1115): nine cans sharing one
       vertical centre, the middle one largest, each pair outwards smaller
       and closer together. Slot offsets from the centre, as % of width:

           0, ±13.08, ±25.43, ±36.83, ±46.46

       and the matching size ladder:

           1, 0.926, 0.852, 0.801, 0.742

       Those samples are fitted below to continuous curves in `u`, the
       track coordinate, with one slot per unit. A can at integer u sits
       exactly on slot u; between slots it interpolates. That matters
       because the row loops: a can drifting from slot 4 to slot 3 has to
       grow on the way, so position and scale must both be functions of u.
    ------------------------------------------------------------------ */
    const COUNT     = 9;      // cans, one per slot — the row the design shows
    const SPAN      = 4.5;    // |u| where a can wraps
    const X_REACH   = 46.46;  // % of width at |u| = 4
    const X_CURVE   = 0.87;   // <1 → spacing narrows outwards
    const S_DROP    = 0.258;  // scale lost at |u| = 4
    const S_CURVE   = 0.80;
    const LOOP_SECS = 4.6;    // seconds per slot — one can's slot-to-slot time
    const CENTRE    = 4;      // index of the middle can

    const sign = (n) => (n < 0 ? -1 : 1);
    const xAt = (u) => 50 + X_REACH * sign(u) * Math.pow(Math.abs(u) / 4, X_CURVE);
    const scaleAt = (u) => 1 - S_DROP * Math.pow(Math.abs(u) / 4, S_CURVE);

    const cans = [];

    /* ------------------------------------------------------------------
       Build. Every can is the same GLB the travelling can uses, with the
       same lighting and camera, so the centre hand-over is invisible.
    ------------------------------------------------------------------ */
    function build() {
        const frag = document.createDocumentFragment();

        for (let i = 0; i < COUNT; i++) {
            const el = document.createElement('div');
            el.className = 'cis-can';

            const mv = document.createElement('model-viewer');
            mv.setAttribute('src', MODEL);
            mv.setAttribute('alt', '');
            mv.setAttribute('loading', 'eager');
            mv.setAttribute('interaction-prompt', 'none');
            mv.setAttribute('disable-zoom', '');
            mv.setAttribute('shadow-intensity', '1');
            mv.setAttribute('exposure', '1');
            mv.setAttribute('environment-image', 'neutral');
            mv.setAttribute('camera-orbit', '0deg 85deg 2.4m');

            const hit = document.createElement('span');
            hit.className = 'cis-can-hit';

            el.appendChild(mv);
            el.appendChild(hit);
            frag.appendChild(el);

            // one can per slot, -4 … +4
            const u = i - CENTRE;
            cans.push({ el, mv, hit, u, u0: u, tumble: null, spin: { a: 0 } });
        }

        track.appendChild(frag);

        // Centre slot stays empty until the travelling can has arrived.
        cans[CENTRE].el.classList.add('is-hidden');

        cans.forEach(paint);
        wireHover();
    }

    // Stage width is cached rather than read per frame, and positions are in
    // px rather than vw: vw includes the scrollbar gutter, which would offset
    // the whole row from the centred travelling can by a few pixels.
    let stageW = 0;
    const measure = () => { stageW = section.getBoundingClientRect().width; };
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);
    window.addEventListener('resize', measure);

    // One write per can per frame: a single composited transform, no layout,
    // and no 3D re-render — the models only redraw when one is tumbling.
    function paint(c) {
        const s = scaleAt(c.u);
        const px = (xAt(c.u) / 100) * stageW;
        c.el.style.transform =
            'translate3d(' + px.toFixed(2) + 'px, -50%, 0) translateX(-50%) scale(' + s.toFixed(4) + ')';

        const z = Math.round(s * 100);
        if (z !== c.z) { c.el.style.zIndex = z; c.z = z; }

        // the outermost can fades through the wrap so it never pops
        const edge = Math.max(0, Math.abs(c.u) - (SPAN - 0.6)) / 0.6;
        const o = +(1 - Math.min(1, edge)).toFixed(2);
        if (o !== c.o) { c.el.style.opacity = o; c.o = o; }
    }

    /* ------------------------------------------------------------------
       Hover tumble.

       In the reference the hovered can rolls end over end and you see its
       lid come round — that only reads correctly as a real rotation of the
       model, so this drives model-viewer's own `orientation` rather than
       spinning a flat element in CSS.
    ------------------------------------------------------------------ */
    function tumble(c) {
        if (reduced || (c.tumble && c.tumble.isActive())) return;
        c.spin.a = 0;
        c.tumble = gsap.to(c.spin, {
            a: 360,
            duration: 1.25,
            ease: 'power2.inOut',
            onUpdate: () => {
                // pitch, not roll: rolling only tips the can over in the picture
                // plane, whereas pitch turns it end over end and brings the lid
                // round to face the viewer — the motion in the reference.
                c.mv.setAttribute('orientation', '0deg ' + c.spin.a.toFixed(1) + 'deg 0deg');
            },
            onComplete: () => {
                c.spin.a = 0;
                c.mv.setAttribute('orientation', '0deg 0deg 0deg');
            }
        });
    }

    function wireHover() {
        cans.forEach((c) => c.hit.addEventListener('pointerenter', () => tumble(c)));

        // The travelling can holds the centre slot before the hand-over, so it
        // gets the same interaction while it is the one on show.
        if (globalCan) {
            globalCan.addEventListener('pointerenter', () => {
                if (handedOver) tumble(cans[CENTRE]);
            });
        }
    }

    /* ------------------------------------------------------------------
       The belt. One tween drives a single scalar; every can reads from it.
    ------------------------------------------------------------------ */
    const belt = { v: 0 };
    let beltTween = null;
    let handedOver = false;

    function applyBelt() {
        const span = SPAN * 2;
        for (let i = 0; i < cans.length; i++) {
            const c = cans[i];
            let u = c.u0 - belt.v;
            u = ((u + SPAN) % span + span) % span - SPAN;
            c.u = u;
            paint(c);
        }
    }

    function startBelt() {
        if (reduced || beltTween) return;
        beltTween = gsap.to(belt, {
            v: '+=' + (SPAN * 2),
            duration: LOOP_SECS * SPAN * 2,
            ease: 'none',
            repeat: -1,
            onUpdate: applyBelt
        });
    }

    /* ------------------------------------------------------------------
       Hand-over. Both the travelling can and the row's centre can are the
       same model at the same size, camera and lighting, so swapping which
       one is painted is invisible — no fade, nothing to see.
    ------------------------------------------------------------------ */
    function handOver(on) {
        if (on === handedOver) return;
        handedOver = on;
        cans[CENTRE].el.classList.toggle('is-hidden', !on);
        if (globalCan) globalCan.style.visibility = on ? 'hidden' : '';
    }

    /* ------------------------------------------------------------------
       Scene.
    ------------------------------------------------------------------ */
    function scene() {
        // Travelling can rests at 14.44% of viewport width; the centre slot is
        // 12.09%, so it eases down to sit exactly like its neighbours.
        const rest = () => (window.DOJE_HERO && window.DOJE_HERO.heroCanScale) || 1;
        const SLOT_MATCH = 12.09 / 14.44;

        gsap.set(heading, { opacity: 0, y: 22 });

        if (reduced) {
            gsap.set(heading, { opacity: 1, y: 0 });
            handOver(true);
            return;
        }

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1,
                invalidateOnRefresh: true,
                // Scrubbing back up puts the travelling can back on show.
                onUpdate: (self) => {
                    if (self.progress < 0.14) handOver(false);
                }
            }
        });

        // The sit: a scale match and nothing else. No fade, no cross-dissolve.
        tl.fromTo('#globalCan',
            { scale: rest },
            { scale: () => rest() * SLOT_MATCH, duration: 0.14,
              ease: 'power2.inOut', immediateRender: false,
              onComplete: () => handOver(true) }, 0);

        tl.to(heading, { opacity: 1, y: 0, duration: 0.10, ease: 'power2.out' }, 0.18);
        tl.to({}, { duration: 0.01 }, 0.99);

        // Belt runs only while the section is on screen and the row owns the
        // centre slot.
        ScrollTrigger.create({
            trigger: section,
            start: 'top top+=1',
            end: 'bottom top',
            onToggle: (self) => {
                if (self.isActive) {
                    handOver(true);
                    if (!beltTween) startBelt(); else beltTween.play();
                } else if (beltTween) {
                    beltTween.pause();
                }
            }
        });

        /* --------------------------------------------------------------
           Exit. The belt eases to a stop with a can exactly on the centre
           slot — slots are one unit apart, so that is just the nearest
           whole value of the belt offset — and the travelling can takes
           that position back to carry on downward.
        -------------------------------------------------------------- */
        ScrollTrigger.create({
            trigger: section,
            start: 'bottom bottom',
            end: 'bottom top',
            onEnter: () => {
                if (!beltTween) return;
                beltTween.pause();
                gsap.to(belt, {
                    v: Math.round(belt.v),
                    duration: 0.9,
                    ease: 'power2.out',
                    onUpdate: applyBelt,
                    onComplete: () => handOver(false)
                });
            },
            onLeaveBack: () => {
                handOver(true);
                if (beltTween) beltTween.play();
            }
        });

        gsap.fromTo('#globalCan',
            { scale: () => rest() * SLOT_MATCH },
            {
                y: '22vh',
                scale: () => rest() * SLOT_MATCH * 0.72,
                ease: 'power2.inOut',
                immediateRender: false,
                scrollTrigger: {
                    trigger: section,
                    start: 'bottom bottom',
                    end: 'bottom top',
                    scrub: 1,
                    invalidateOnRefresh: true
                }
            });
    }

    build();
    scene();
})();

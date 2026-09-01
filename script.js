/* ================================================================
   DOJE — Premium Scrollytelling Animation Engine
   GSAP + ScrollTrigger + Lenis + Splitting.js
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // Splitting.js for char-level text reveals
    Splitting();

    // GSAP plugins
    gsap.registerPlugin(ScrollTrigger);

    // Smooth scrolling via Lenis
    const lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
    });
    // Exposed so other modules (and scroll-to links) can drive the page
    // through Lenis instead of fighting it with window.scrollTo.
    window.lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // ========== SITE SCROLL-COMPLETION LOADING BAR ==========
    // Fills the segmented top ruler as the visitor moves through the page.
    const siteProgress     = document.getElementById('siteProgress');
    const siteProgressFill = document.getElementById('siteProgressFill');
    if (siteProgressFill) {
        const setSiteProgress = (p) => {
            const pct = Math.max(0, Math.min(1, p || 0));
            const rounded = Math.round(pct * 100);
            siteProgressFill.style.width = (pct * 100) + '%';
            if (siteProgress) siteProgress.setAttribute('aria-valuenow', rounded);
        };
        const computeFromWindow = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            setSiteProgress(max > 0 ? window.scrollY / max : 0);
        };
        // Prefer Lenis' own progress value; fall back to window math.
        lenis.on('scroll', (e) => {
            if (e && typeof e.progress === 'number') setSiteProgress(e.progress);
            else computeFromWindow();
        });
        window.addEventListener('load', computeFromWindow);
        window.addEventListener('resize', computeFromWindow);
        ScrollTrigger.addEventListener('refresh', computeFromWindow);
        computeFromWindow();
    }

    // ScrollTrigger defaults — entrance animations don't reverse when
    // scrolling back up (fixes "elements disappear" glitch)
    ScrollTrigger.defaults({ toggleActions: 'play none none none' });

    // ========== NAVBAR ==========
    const navbar    = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');

    let lastScrollY = 0;
    ScrollTrigger.create({
        start: 'top -80px',
        onUpdate: (self) => {
            const y = self.scroll();
            if (!navbar) return;
            navbar.classList.toggle('scrolled', y > 80);

            // Hide on scroll-down past the threshold, show on scroll-up
            const goingDown = y > lastScrollY;
            if (y > 120 && goingDown) {
                navbar.classList.add('nav-hidden');
            } else {
                navbar.classList.remove('nav-hidden');
            }
            lastScrollY = y;
        }
    });

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });


    // ========== HERO INTRO ==========
    // Can is visible from the very first frame — it's the subject.
    // Centring lives in CSS (`translate: -50% -50%` on .global-can), which is
    // a separate property from `transform`. GSAP therefore owns x/y/scale
    // outright and can never clobber the centring, whatever order the
    // section modules create their tweens in.
    // Guard against a 0/undefined width during very early layout — otherwise
    // the can silently picks up the small-mobile scale on desktop.
    const viewportW = window.innerWidth || document.documentElement.clientWidth || 1440;
    const isSmallMobile = viewportW <= 480;
    const isTablet = viewportW <= 768;
    let initialCanScale = 1;
    if (isSmallMobile) initialCanScale = 2.0;
    else if (isTablet) initialCanScale = 1.6;

    // Rest pose for the whole journey, sized to the hero Figma (can ≈ 14.5% of
    // viewport width). The can holds this scale and stays centred through every
    // section; js/smooth.js shrinks it on the way out to the story sequence.
    //
    // Doje_Can_Premium.glb fills more of its viewer frame than the model it
    // replaced, so it already measures ~208px wide at scale 1 — the multiplier
    // the old model needed would now overshoot the design.
    let heroCanScale = initialCanScale * 1.0;
    if (isSmallMobile) heroCanScale = 1.15;
    else if (isTablet) heroCanScale = initialCanScale * 0.78;

    gsap.set('#globalCan', { opacity: 1, x: 0, y: 0, scale: heroCanScale });

    // Section modules read this for the can scale this file owns.
    window.DOJE_HERO = { initialCanScale, heroCanScale };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mouse parallax on hero (nudges the can subtly while on the hero)
    const heroSection = document.querySelector('.hero-section');
    let heroRafId = null;
    heroSection.addEventListener('mousemove', (e) => {
        if (window.scrollY > 10) return;
        if (heroRafId) return;
        heroRafId = requestAnimationFrame(() => {
            heroRafId = null;
            const rect = heroSection.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            gsap.to('#globalCan', {
                x: x * 20, y: y * 14,
                duration: 1, ease: 'power2.out', overwrite: 'auto',
            });
            if (document.getElementById('heroDiagram')) {
                gsap.to('#heroDiagram', {
                    x: x * -10, y: y * -8,
                    duration: 1.2, ease: 'power2.out', overwrite: 'auto',
                });
            }
        });
    });


    // ========== SECTION SCENES ==========
    // Every homepage scene now owns its own timeline in its own module:
    //   #rooted  → js/rooted.js
    //   #eagle   → js/eagle.js
    //   #smooth  → js/smooth.js
    // The old #pinnedZone that used to host all three has been removed along
    // with the can timeline it carried; #smooth hands the can off to the story
    // sequence below.

    // ========== UNIFIED LIFESTYLE SECTION (year-round + gallery) ==========

    // ----- EXP. SECTION (was: year-round availability) -----
    // The former year-round landing was removed; the expanding-imagery EXP
    // section that replaces it is self-contained in js/exp.js (it also hands
    // the hero #globalCan off and hides it via CSS).

    // Experience header
    gsap.fromTo('.exp-label',
        { opacity: 0, y: 20, scale: 0.9 },
        {
            opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: '#experienceHeader', start: 'top 90%' }
        });

    const galleryTitleChars = document.querySelectorAll('.experience-gallery-title .char');
    gsap.to(galleryTitleChars, {
        opacity: 1, y: 0, stagger: 0.03, duration: 0.8, ease: 'power4.out',
        scrollTrigger: { trigger: '#experienceHeader', start: 'top 85%' }
    });

    gsap.fromTo('.experience-gallery-subtitle',
        { opacity: 0, y: 20 },
        {
            opacity: 1, y: 0, duration: 1, delay: 0.3, ease: 'power3.out',
            scrollTrigger: { trigger: '#experienceHeader', start: 'top 85%' }
        });

    gsap.fromTo('.exp-header-line',
        { scaleX: 0 },
        {
            scaleX: 1, duration: 1, delay: 0.5, ease: 'power2.inOut',
            scrollTrigger: { trigger: '#experienceHeader', start: 'top 85%' }
        });

    // Section bridge divider
    gsap.fromTo('.section-bridge',
        { opacity: 0, scaleX: 0.5 },
        {
            opacity: 0.8, scaleX: 1, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: '.section-bridge', start: 'top 90%' }
        });

    // Gallery rows — parallax tilt
    gsap.to('#galleryRow1', {
        rotateX: 2, skewY: -0.5, ease: 'none',
        scrollTrigger: {
            trigger: '.lifestyle-section',
            start: 'top bottom', end: 'bottom top', scrub: 0.5,
        }
    });
    gsap.to('#galleryRow2', {
        rotateX: -2, skewY: 0.5, ease: 'none',
        scrollTrigger: {
            trigger: '.lifestyle-section',
            start: 'top bottom', end: 'bottom top', scrub: 0.5,
        }
    });

    // Editorial interlude — fade + drift in, rules expand outward
    gsap.fromTo('#expInterlude .exp-interlude-line',
        { opacity: 0, y: 12, letterSpacing: '8px' },
        {
            opacity: 1, y: 0, letterSpacing: '4px',
            duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: '#expInterlude', start: 'top 90%' }
        });
    gsap.fromTo('#expInterlude .exp-interlude-rule',
        { scaleX: 0, opacity: 0 },
        {
            scaleX: 1, opacity: 1, duration: 0.9, delay: 0.15,
            ease: 'power2.out',
            scrollTrigger: { trigger: '#expInterlude', start: 'top 90%' }
        });

    // Gallery photos — first-reveal stagger with blur-in
    const galleryPhotos = document.querySelectorAll('.gallery-row .gallery-photo');
    galleryPhotos.forEach((img) => img.classList.add('reveal-init'));

    const revealRow = (rowSelector) => {
        const row = document.querySelector(rowSelector);
        if (!row) return;
        const photos = row.querySelectorAll('.gallery-photo');
        ScrollTrigger.create({
            trigger: row,
            start: 'top 88%',
            once: true,
            onEnter: () => {
                photos.forEach((img, i) => {
                    setTimeout(() => img.classList.add('is-revealed'), i * 70);
                });
            }
        });
    };
    revealRow('#galleryRow1');
    revealRow('#galleryRow2');

    // Aurora blob parallax
    gsap.to('.aurora-blob-1', {
        y: -80, ease: 'none',
        scrollTrigger: { trigger: '.lifestyle-section', start: 'top bottom', end: 'bottom top', scrub: true }
    });
    gsap.to('.aurora-blob-2', {
        y: 60, ease: 'none',
        scrollTrigger: { trigger: '.lifestyle-section', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    // Spotlight beams intensity
    gsap.to('.tag-spotlight', {
        opacity: 1.5, ease: 'none',
        scrollTrigger: { trigger: '.lifestyle-section', start: 'top center', end: 'bottom center', scrub: true }
    });


    // ========== FOOTER REVEAL ==========
    gsap.fromTo('.footer-inner',
        { opacity: 0, y: 40 },
        {
            opacity: 1, y: 0, duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: '.footer', start: 'top 85%' }
        });

    // ========== FOOTER LIVE CLOCK (Guwahati / IST) ==========
    const footerClock = document.getElementById('footerClock');
    if (footerClock) {
        const tick = () => {
            footerClock.textContent = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true
            }).format(new Date());
        };
        tick();
        setInterval(tick, 1000);
    }

    // ========== FOOTER FLOWING RED LIQUID ==========
    (function footerFluid() {
        const canvas = document.getElementById('footerFluid');
        if (!canvas) return;
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const footer = canvas.closest('.footer') || canvas.parentElement;
        let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Soft red blobs that drift on Lissajous paths and merge additively.
        const blobs = [
            { hue: '255,26,26',  cx: 0.74, cy: 0.55, ax: 0.18, ay: 0.26, sx: 0.00018, sy: 0.00024, px: 0.0, py: 0.0, r: 0.46 },
            { hue: '214,0,18',   cx: 0.82, cy: 0.48, ax: 0.16, ay: 0.22, sx: 0.00026, sy: 0.00015, px: 1.7, py: 2.4, r: 0.40 },
            { hue: '255,70,46',  cx: 0.66, cy: 0.62, ax: 0.20, ay: 0.28, sx: 0.00021, sy: 0.00029, px: 3.1, py: 0.8, r: 0.34 },
            { hue: '150,0,10',   cx: 0.88, cy: 0.40, ax: 0.14, ay: 0.20, sx: 0.00013, sy: 0.00022, px: 4.6, py: 3.9, r: 0.50 }
        ];

        function resize() {
            const rect = footer.getBoundingClientRect();
            W = Math.max(rect.width, 1);
            H = Math.max(rect.height, 1);
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function draw(now) {
            ctx.clearRect(0, 0, W, H);
            // Base wash keeps the red anchored toward the right, like the reference.
            ctx.globalCompositeOperation = 'lighter';
            const maxR = Math.hypot(W, H);
            for (const b of blobs) {
                const cx = W * (b.cx + b.ax * Math.sin(now * b.sx + b.px));
                const cy = H * (b.cy + b.ay * Math.cos(now * b.sy + b.py));
                const rad = maxR * b.r;
                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
                g.addColorStop(0,    'rgba(' + b.hue + ',0.50)');
                g.addColorStop(0.4,  'rgba(' + b.hue + ',0.18)');
                g.addColorStop(1,    'rgba(' + b.hue + ',0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(cx, cy, rad, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        resize();
        window.addEventListener('resize', () => { resize(); if (prefersReduced) draw(0); });

        if (prefersReduced) { draw(0); return; }

        // Is the footer currently on screen? Computed per-frame so the loop never
        // gets stuck "stopped" the way an IntersectionObserver can under GSAP
        // ScrollTrigger pinning / Lenis smooth scroll on desktop.
        function inView() {
            const r = footer.getBoundingClientRect();
            const vh = window.innerHeight || document.documentElement.clientHeight;
            return r.bottom > 0 && r.top < vh;
        }

        // One continuous RAF loop. Drawing is skipped (cheaply) while the footer
        // is off screen or the tab is hidden, but the loop itself keeps running so
        // it always resumes when the footer scrolls back into view.
        function frame(t) {
            if (!document.hidden && inView()) draw(t);
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    })();


    // ========== REFRESH SCROLL TRIGGERS ==========
    window.addEventListener('load', () => ScrollTrigger.refresh());

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => ScrollTrigger.refresh(), 250);
    });
});

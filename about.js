/* ============================================================
   DOJE — About Us motion engine
   GSAP + ScrollTrigger, native scrolling. Slow, premium, cinematic.
   ============================================================ */
(function () {
    "use strict";

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasGSAP = typeof window.gsap !== "undefined";

    /* Native scrolling — no smooth-scroll library, so wheel/trackpad input
       stays untouched and the main thread stays free. */
    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

    /* ---------- Nav: solidify after scroll ---------- */
    const nav = document.getElementById("ab2Nav");
    const onScrollNav = () => {
        if (!nav) return;
        nav.classList.toggle("is-stuck", window.scrollY > 40);
    };
    onScrollNav();
    window.addEventListener("scroll", onScrollNav, { passive: true });

    /* ---------- Generic reveal-on-scroll (no GSAP fallback = IO) ---------- */
    const revealEls = document.querySelectorAll(".ab2-reveal, [data-feature]");
    if (prefersReduced) {
        revealEls.forEach((el) => el.classList.add("is-in"));
    } else {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
            });
        }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
        revealEls.forEach((el) => io.observe(el));
    }

    if (!hasGSAP || prefersReduced) {
        // Ensure milestones + hero are visible without GSAP.
        document.querySelectorAll("[data-ms]").forEach((m) => m.classList.add("is-in", "is-active"));
        const fill = document.getElementById("ab2TimelineFill");
        if (fill) fill.style.height = "100%";
        return;
    }

    /* ============================================================
       HERO — can rises + rotates into place, then floats forever
       ============================================================ */
    const heroCan = document.getElementById("ab2HeroCan");
    const heroLines = gsap.utils.toArray("[data-hero-line] > *, [data-hero-line]");

    const introTl = gsap.timeline({ delay: 0.15 });
    introTl.from("[data-hero-line] span, .ab2-hero-line", {
        yPercent: 115, duration: 1.2, ease: "power4.out", stagger: 0.12
    });

    if (heroCan) {
        introTl.from(heroCan, {
            y: () => window.innerHeight * 0.75,
            rotate: -18,
            opacity: 0,
            duration: 1.8,
            ease: "power4.out"
        }, 0.25)
        .add(startFloat, ">-0.2");
    }

    function startFloat() {
        if (!heroCan) return;
        gsap.to(heroCan, {
            y: -12, rotation: -5,
            duration: 4.5, ease: "sine.inOut",
            repeat: -1, yoyo: true
        });
        // set the resting rotation the float eases around
        gsap.set(heroCan, { rotation: -8 });
    }

    /* ---------- Subtle cloud parallax ---------- */
    const clouds = document.getElementById("ab2Clouds");
    const cloudsFar = document.getElementById("ab2CloudsFar");
    if (clouds) gsap.to(clouds, {
        yPercent: 12, ease: "none",
        scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 }
    });
    if (cloudsFar) gsap.to(cloudsFar, {
        yPercent: -8, ease: "none",
        scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1.4 }
    });

    /* ============================================================
       FEATURES — bottle drifts up as it enters
       ============================================================ */
    const bottle = document.getElementById("ab2Bottle");
    if (bottle) {
        gsap.from(bottle, {
            y: 70, opacity: 0, duration: 1.4, ease: "power3.out",
            scrollTrigger: { trigger: ".ab2-features", start: "top 78%" }
        });
        gsap.to(bottle, {
            y: -22, ease: "none",
            scrollTrigger: { trigger: ".ab2-features", start: "top bottom", end: "bottom top", scrub: 1 }
        });
    }

    /* ============================================================
       BREWING TIMELINE — connector fills, milestones activate
       ============================================================ */
    const fill = document.getElementById("ab2TimelineFill");
    const milestones = gsap.utils.toArray("[data-ms]");

    if (fill) {
        gsap.to(fill, {
            height: "100%", ease: "none",
            scrollTrigger: {
                trigger: ".ab2-timeline",
                start: "top 55%",
                end: "bottom 65%",
                scrub: 0.6
            }
        });
    }

    milestones.forEach((ms) => {
        // reveal each side (icon/title/number/text) with a soft stagger
        const sides = ms.querySelectorAll(".ab2-ms-side");
        gsap.to(sides, {
            opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.15,
            scrollTrigger: { trigger: ms, start: "top 82%" }
        });
        // active highlight while the milestone sits in the centre band
        ScrollTrigger.create({
            trigger: ms,
            start: "top 60%",
            end: "bottom 40%",
            onToggle: (self) => ms.classList.toggle("is-active", self.isActive)
        });
    });

    /* ============================================================
       SUNIT BREWERIES — image reveals + slow zoom while visible
       ============================================================ */
    const brandFig = document.querySelector("[data-brand-figure]");
    if (brandFig) {
        const img = brandFig.querySelector("img");
        gsap.from(brandFig, {
            clipPath: "inset(100% 0 0 0)",
            duration: 1.6, ease: "power4.out",
            scrollTrigger: { trigger: brandFig, start: "top 80%" }
        });
        if (img) gsap.fromTo(img, { scale: 1 }, {
            scale: 1.05, ease: "none",
            scrollTrigger: { trigger: brandFig, start: "top bottom", end: "bottom top", scrub: 1.2 }
        });
    }

    /* ============================================================
       CTA — hand+can rises into frame, then floats gently
       ============================================================ */
    const ctaCan = document.getElementById("ab2CtaCan");
    if (ctaCan) {
        // The CTA image is lazy-loaded and is the last element on the page, so it
        // arrives after the initial ScrollTrigger.refresh() and shifts the layout.
        // Safari won't re-fire the (now stale) trigger, leaving the image stuck at
        // opacity:0. Re-measure once the image has actually loaded.
        const ctaImg = ctaCan.querySelector("img");
        if (ctaImg && !ctaImg.complete) {
            ctaImg.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
        }
        gsap.from(ctaCan, {
            y: 140, rotation: 6, opacity: 0,
            duration: 1.6, ease: "power4.out",
            scrollTrigger: { trigger: ".ab2-cta", start: "top 90%" },
            onComplete: () => {
                gsap.to(ctaCan, {
                    y: -14, rotation: -1.5,
                    duration: 5, ease: "sine.inOut", repeat: -1, yoyo: true
                });
            }
        });
    }

    ScrollTrigger.refresh();
})();

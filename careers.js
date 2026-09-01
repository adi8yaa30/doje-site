/* ============================================================
   DOJE — Careers  (GSAP + ScrollTrigger)
   ============================================================ */
(() => {
    "use strict";

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasGSAP = typeof gsap !== "undefined";
    if (hasGSAP && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
    }

    /* ---------- Sticky nav shadow ---------- */
    const nav = document.getElementById("crNav");
    const onScroll = () => nav && nav.classList.toggle("is-stuck", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ---------- Reduced motion: reveal everything, skip anims ---------- */
    if (!hasGSAP || prefersReduced) {
        document.querySelectorAll(".cr-reveal, [data-why], [data-job], [data-field]")
            .forEach(el => el.classList.add("is-in"));
        buildForm();
        return;
    }

    /* ---------- Hero: image reveal (opacity + scale) ---------- */
    const heroImg = document.getElementById("crHeroImage");
    if (heroImg) {
        gsap.set(heroImg, { opacity: 0, scale: 1.05 });
        gsap.to(heroImg, { opacity: 1, scale: 1, duration: 1.2, ease: "power3.out", delay: 0.1 });
    }

    /* ---------- Generic scroll reveal helper ---------- */
    const reveal = (el, opts = {}) => {
        gsap.set(el, { opacity: 0, y: opts.y ?? 40 });
        gsap.to(el, {
            opacity: 1, y: 0,
            duration: opts.duration ?? 0.9,
            ease: "power3.out",
            delay: opts.delay ?? 0,
            scrollTrigger: { trigger: opts.trigger ?? el, start: "top 85%" },
            onStart: () => el.classList.add("is-in")
        });
    };

    document.querySelectorAll(".cr-reveal").forEach(el => reveal(el));

    /* ---------- Why Us: section fades up, cards stagger + number scale ---------- */
    const whyCards = gsap.utils.toArray("[data-why]");
    if (whyCards.length) {
        whyCards.forEach(c => c.classList.add("is-in"));
        gsap.from(whyCards, {
            opacity: 0, y: 44,
            duration: 0.9, ease: "power3.out",
            stagger: 0.15,
            scrollTrigger: { trigger: ".cr-why-inner", start: "top 78%" }
        });
        gsap.from(whyCards.map(c => c.querySelector(".cr-why-num")), {
            scale: 0.8, opacity: 0,
            duration: 1, ease: "back.out(1.6)",
            stagger: 0.15,
            scrollTrigger: { trigger: ".cr-why-inner", start: "top 78%" }
        });
    }

    /* ---------- Hiring cards: slide in alternately ---------- */
    gsap.utils.toArray("[data-job]").forEach(card => {
        const fromLeft = card.classList.contains("cr-job--left");
        gsap.set(card, { opacity: 1 });
        gsap.from(card, {
            opacity: 0,
            x: fromLeft ? -80 : 80,
            duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: card, start: "top 85%" }
        });
    });

    /* ---------- Form: fields reveal sequentially ---------- */
    const fields = gsap.utils.toArray("[data-field]");
    if (fields.length) {
        fields.forEach(f => f.classList.add("is-in"));
        gsap.from(fields, {
            opacity: 0, y: 30,
            duration: 0.7, ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: { trigger: ".cr-form", start: "top 80%" }
        });
    }

    /* ---------- Gallery: continuous horizontal marquee ---------- */
    const track = document.getElementById("crGalleryTrack");
    if (track) {
        // Track holds two identical groups (A + B). Shift by half its width and loop.
        const startMarquee = () => {
            gsap.killTweensOf(track);
            gsap.set(track, { x: 0 });
            const half = track.scrollWidth / 2;
            if (half <= 0) return;
            const speed = 26; // px per second — slow + constant
            const tween = gsap.to(track, {
                x: -half,
                duration: half / speed,
                ease: "none",
                repeat: -1,
                modifiers: { x: gsap.utils.unitize(x => parseFloat(x) % half) }
            });
            const gallery = document.getElementById("crGallery");
            gallery.addEventListener("mouseenter", () => tween.pause());
            gallery.addEventListener("mouseleave", () => tween.resume());
        };
        // wait for images so scrollWidth is accurate
        const imgs = track.querySelectorAll("img");
        let loaded = 0;
        const check = () => { if (++loaded >= imgs.length) startMarquee(); };
        imgs.forEach(img => img.complete ? check() : (img.addEventListener("load", check, { once: true }), img.addEventListener("error", check, { once: true })));
        window.addEventListener("resize", () => { clearTimeout(window.__crMq); window.__crMq = setTimeout(startMarquee, 200); });
    }

    ScrollTrigger.refresh();
    buildForm();

    /* ---------- Form behaviour ---------- */
    function buildForm() {
        const form = document.getElementById("crForm");
        if (!form) return;

        // filled-select styling
        form.querySelectorAll("select").forEach(sel => {
            const sync = () => sel.style.color = sel.value ? "var(--ink)" : "rgba(17,17,17,.55)";
            sel.addEventListener("change", sync); sync();
        });

        // resume filename feedback
        const resume = document.getElementById("resume");
        const upText = document.querySelector(".cr-upload-text");
        if (resume && upText) {
            resume.addEventListener("change", () => {
                upText.textContent = resume.files.length ? resume.files[0].name : "Click to upload or drag and drop";
            });
        }

        form.addEventListener("submit", e => {
            e.preventDefault();
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const btn = form.querySelector(".cr-submit");
            btn.textContent = "Application Sent ✓";
            btn.disabled = true;
            btn.style.opacity = ".9";
        });
    }
})();

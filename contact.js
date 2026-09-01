/* ============================================================
   DOJE — Contact  (GSAP + ScrollTrigger)
   ============================================================ */
(() => {
    "use strict";

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasGSAP = typeof gsap !== "undefined";
    if (hasGSAP && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
    }

    /* ---------- Sticky nav shadow ---------- */
    const nav = document.getElementById("ctNav");
    const onScroll = () => nav && nav.classList.toggle("is-stuck", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ---------- Reduced motion: reveal everything, skip anims ---------- */
    if (!hasGSAP || prefersReduced) {
        document.querySelectorAll(".ct-reveal, [data-field]").forEach(el => el.classList.add("is-in"));
        buildForm();
        return;
    }

    /* ---------- Hero: nav fade, heading slide, image fade + scale ---------- */
    gsap.from(".cr-nav", { opacity: 0, duration: 1, ease: "power2.out" });
    gsap.from(".ct-hero-title", { opacity: 0, y: 24, duration: 1, ease: "power3.out", delay: 0.1 });

    const heroImg = document.getElementById("ctHeroImage");
    if (heroImg) {
        gsap.set(heroImg, { opacity: 0, scale: 1.05 });
        gsap.to(heroImg, { opacity: 1, scale: 1, duration: 1.2, ease: "power3.out", delay: 0.15 });
    }

    /* ---------- Generic scroll reveal ---------- */
    document.querySelectorAll(".ct-reveal").forEach((el, i) => {
        gsap.set(el, { opacity: 0, y: 30 });
        gsap.to(el, {
            opacity: 1, y: 0,
            duration: 0.9, ease: "power3.out",
            delay: i * 0.12,
            scrollTrigger: { trigger: ".ct-contact", start: "top 82%" },
            onStart: () => el.classList.add("is-in")
        });
    });

    /* ---------- Form: card fades up, fields reveal sequentially ---------- */
    const fields = gsap.utils.toArray("[data-field]");
    if (fields.length) {
        fields.forEach(f => f.classList.add("is-in"));
        gsap.from(fields, {
            opacity: 0, y: 30,
            duration: 0.7, ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: { trigger: ".ct-form", start: "top 82%" }
        });
    }

    /* ---------- Map: fade up + slight zoom ---------- */
    const map = document.getElementById("ctMap");
    if (map) {
        gsap.from(map, {
            opacity: 0, y: 40, scale: 1.03,
            duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: ".ct-map-section", start: "top 85%" }
        });
    }

    /* ---------- Footer: slides up, nav then logo ---------- */
    const footer = document.getElementById("ctFooter");
    if (footer) {
        gsap.from(footer.querySelector(".cr-footer-nav"), {
            opacity: 0, y: 30, duration: 0.8, ease: "power3.out",
            scrollTrigger: { trigger: footer, start: "top 88%" }
        });
        gsap.from(footer.querySelector(".cr-footer-logo"), {
            opacity: 0, y: 40, duration: 1, ease: "power3.out", delay: 0.15,
            scrollTrigger: { trigger: footer, start: "top 88%" }
        });
    }

    ScrollTrigger.refresh();
    buildForm();

    /* ---------- Form behaviour ---------- */
    function buildForm() {
        const form = document.getElementById("ctForm");
        if (!form) return;
        form.addEventListener("submit", e => {
            e.preventDefault();
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const btn = form.querySelector(".ct-submit");
            btn.textContent = "Message Sent ✓";
            btn.disabled = true;
            btn.style.opacity = ".9";
        });
    }
})();

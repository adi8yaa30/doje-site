/* ============================================================
   DOJE — News  (GSAP + ScrollTrigger)
   ============================================================ */
(() => {
    "use strict";

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasGSAP = typeof gsap !== "undefined";
    if (hasGSAP && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
    }

    /* ---------- Sticky nav shadow ---------- */
    const nav = document.getElementById("nwNav");
    const onScroll = () => nav && nav.classList.toggle("is-stuck", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ---------- Reduced motion: reveal everything, skip anims ---------- */
    if (!hasGSAP || prefersReduced) {
        document.querySelectorAll("[data-card]").forEach(el => el.classList.add("is-in"));
        return;
    }

    /* ---------- Hero: image fades + zooms out, heading & sub rise ---------- */
    const media = document.getElementById("nwHeroMedia");
    if (media) {
        gsap.set(media, { opacity: 0, scale: 1.06 });
        gsap.to(media, { opacity: 1, scale: 1, duration: 1.3, ease: "power3.out" });
    }
    gsap.from(".nw-hero-title", { opacity: 0, y: 30, duration: 1, ease: "power3.out", delay: 0.25 });
    gsap.from(".nw-hero-sub", { opacity: 0, y: 24, duration: 1, ease: "power3.out", delay: 0.45 });

    /* ---------- Blog cards: reveal on scroll ----------
       Rise together (no vertical stagger, so cards stay aligned at every
       instant) while the fade-in is staggered for a sequential feel. */
    const cards = gsap.utils.toArray("[data-card]");
    cards.forEach(c => c.classList.add("is-in"));
    const cardST = { trigger: ".nw-grid", start: "top 82%" };
    gsap.from(cards, {
        y: 40,
        duration: 0.8, ease: "power3.out",
        clearProps: "transform",
        scrollTrigger: cardST
    });
    gsap.from(cards, {
        opacity: 0,
        duration: 0.7, ease: "power2.out",
        stagger: 0.08,
        scrollTrigger: cardST
    });

    ScrollTrigger.refresh();
})();

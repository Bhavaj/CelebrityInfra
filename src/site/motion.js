import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Scroll choreography that ties the page copy to the 3D scene, so it reads as part of the flyover instead
// of a flat layer scrolling over it:
//  - every section's content drifts at its own depth (slower than the page) while the camera moves,
//  - it rises into place as it arrives and recedes (fade, slight scale) as it leaves,
//  - the hero title pulls back into the landscape as the camera dives toward the plot.
// Only transform/opacity animate (compositor-only). Filter blur was tried and dropped: re-blurring large text
// layers every scroll frame over the WebGL canvas halved the frame rate on integrated GPUs.
// Wrappers are animated rather than the `.intro`/`.reveal` children, whose CSS animations own their transforms.
export function initMotion({ desktop }) {
  const vh = () => innerHeight;
  const depth = desktop ? 1 : 0.55;

  /* hero: title recedes, facts rail slides off, everything softens as the camera leaves */
  const hero = document.querySelector(".hero");
  gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.8 } })
    .to(".hero-copy", { y: () => -vh() * 0.16 * depth, scale: 0.92, transformOrigin: "0% 100%", ease: "none" }, 0)
    .to(".hero-copy", { autoAlpha: 0, ease: "power1.in", duration: 0.7 }, 0.3)
    .to(".hero-inner > .facts", { y: () => vh() * 0.08 * depth, autoAlpha: 0, ease: "power1.in", duration: 0.6 }, 0.15);

  /* sections */
  document.querySelectorAll("main > .sec").forEach((sec) => {
    const wrap = sec.querySelector(":scope > .wrap");
    if (!wrap) return;
    const last = sec.id === "enquire";
    // depth drift across the whole pass of the section
    gsap.fromTo(wrap, { y: () => vh() * 0.1 * depth }, {
      y: () => -vh() * (last ? 0 : 0.1) * depth, ease: "none",
      scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true },
    });
    // arrive: comes up out of the haze
    gsap.fromTo(wrap, { autoAlpha: 0.15, scale: desktop ? 0.97 : 1 }, {
      autoAlpha: 1, scale: 1, ease: "power2.out",
      // measured from where the content starts (phones open each section with a tall scene "window")
      scrollTrigger: { trigger: sec, start: () => `top+=${wrap.offsetTop} 92%`, end: () => `top+=${wrap.offsetTop} 40%`, scrub: 0.6, invalidateOnRefresh: true },
    });
    // leave: recedes back into the scene (the last section stays put above the footer)
    if (!last) gsap.fromTo(wrap, { opacity: 1 }, {
      opacity: 0, scale: desktop ? 0.96 : 1, ease: "power1.in", immediateRender: false,
      scrollTrigger: { trigger: sec, start: "bottom 52%", end: "bottom 4%", scrub: 0.6 },
    });
  });

  // the chairman's quote swells slightly as the camera circles the estate
  gsap.fromTo(".quote p", { scale: 0.95 }, {
    scale: 1.03, ease: "none",
    scrollTrigger: { trigger: ".chairman", start: "top bottom", end: "bottom top", scrub: 0.8 },
  });

  ScrollTrigger.refresh();
}

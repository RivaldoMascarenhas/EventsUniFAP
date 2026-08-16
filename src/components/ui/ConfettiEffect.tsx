"use client";

import confetti from "canvas-confetti";

export function fireInstitutionalConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors: ["#002B49", "#EAA023", "#0080C8", "#FFFFFF", "#FDB913"],
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Multi-tier fireworks burst
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.4,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

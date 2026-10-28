/* House motion tokens (studio-playbook motion.md) for hand-built compositions:
   <script src="assets/house/house-motion.js"></script>, then HM.f(6), HM.ease.arrive, HM.envelope(d, 0.4, 0.2).
   Deterministic helpers only: no clocks, no unseeded randomness. */
(function () {
  var FPS = 30;
  var HM = {
    fps: FPS,
    f: function (frames) { return frames / FPS; },
    dur: { micro: 4 / FPS, enter: 6 / FPS, pop: 8 / FPS, move: 12 / FPS, camera: 24 / FPS, count: 33 / FPS },
    ease: { arrive: 'expo.out', settle: 'power3.out', pop: 'back.out(1.6)', camera: 'power2.inOut', exit: 'power3.in', linear: 'none' },
    stagger: { letter: 1 / FPS, word: 2.5 / FPS, row: 2 / FPS, card: 3 / FPS },
    // IN and OUT are fixed; HOLD stretches. Short mounts compress IN and OUT together.
    envelope: function (duration, IN, OUT) {
      var k = duration < IN + OUT ? duration / (IN + OUT) : 1;
      return { IN: IN * k, OUT: OUT * k, HOLD: Math.max(0, duration - (IN + OUT) * k), OUT_AT: duration - OUT * k };
    },
    // Seeded random (mulberry32) for scrambles and variations that must render the same every time.
    rng: function (seed) {
      var a = seed >>> 0;
      return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    },
    // Frames per beat from BPM, computed per index so a long grid never drifts.
    beatTime: function (index, bpm, offset) { return (offset || 0) + Math.round((index * 60 / bpm) * FPS) / FPS; },
  };
  window.HM = HM;
})();

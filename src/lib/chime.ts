// 새 주문 "띵동" 소리. 파일 없이 브라우저에서 바로 만든다.
// 브라우저는 사용자가 한 번 누르기 전에는 소리를 막으므로, "소리 켜기"를 누를 때 준비해 둔다.

let ctx: AudioContext | null = null;

export function unlockChime() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

export function playChime() {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  // 두 음 (미 → 도), 두 번
  [0, 0.7].forEach((offset) => {
    [
      [1318.5, 0],
      [1046.5, 0.22],
    ].forEach(([freq, at]) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + offset + at;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  });
}

const KEY = "kkotpick.sound";
export function soundEnabled() {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}
export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
    window.dispatchEvent(new Event("kkotpick-sound"));
  } catch {
    // 저장이 막힌 브라우저
  }
}
export function subscribeSound(cb: () => void) {
  window.addEventListener("kkotpick-sound", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("kkotpick-sound", cb);
    window.removeEventListener("storage", cb);
  };
}

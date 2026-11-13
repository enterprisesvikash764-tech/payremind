let audioCtx: AudioContext | null = null;
let customAudioElement: HTMLAudioElement | null = null;

export const INSTRUMENTAL_RINGTONES = [
  { id: "piano", name: "Soft Morning Piano" },
  { id: "flute", name: "Peaceful Bansuri Flute" },
  { id: "chime", name: "Crystal Temple Chime" },
  { id: "harp", name: "Gentle Harp Melody" },
  { id: "bell", name: "Sweet Alert Bell" },
  { id: "kalimba", name: "Calm Kalimba Notes" },
] as const;

export async function enableChime() {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

export function playChime(selectedTone?: string, customDataUrl?: string) {
  try {
    const soundEnabled = localStorage.getItem("payremind-sound") !== "off";
    if (!soundEnabled) return;

    const tone = selectedTone || localStorage.getItem("payremind-ringtone") || "piano";
    const customUrl = customDataUrl || localStorage.getItem("payremind-custom-ringtone") || "";

    // Agar user ne apni custom ringtone lagayi hai
    if (tone === "custom" && customUrl) {
      if (customAudioElement) {
        customAudioElement.pause();
        customAudioElement.currentTime = 0;
      }
      customAudioElement = new Audio(customUrl);
      customAudioElement.play().catch(() => playInstrumentalNotes("piano"));
      if ("vibrate" in navigator) navigator.vibrate();
      return;
    }

    playInstrumentalNotes(tone);
    if ("vibrate" in navigator) {
      navigator.vibrate();
    }
  } catch (e) {
    console.error("Ringtone error:", e);
  }
}

function playInstrumentalNotes(tone: string) {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = audioCtx || new AudioContextClass();
  audioCtx = ctx;
  if (ctx.state === "suspended") ctx.resume();

  const patterns: Record<string, { freqs: number[]; type: OscillatorType; step: number }> = {
    piano: { freqs: [523.25, 659.25, 783.99, 1046.5], type: "sine", step: 0.28 },
    flute: { freqs: [587.33, 659.25, 783.99, 880.0, 783.99], type: "triangle", step: 0.35 },
    chime: { freqs: [1046.5, 1318.5, 1567.98], type: "sine", step: 0.4 },
    harp: { freqs: [440, 554.37, 659.25, 880, 1108.73], type: "triangle", step: 0.22 },
    bell: { freqs: [880, 1174.66, 880, 1174.66], type: "sine", step: 0.3 },
    kalimba: { freqs: [659.25, 523.25, 783.99, 659.25, 1046.5], type: "sine", step: 0.25 },
  };

  const p = patterns[tone] || patterns.piano;
  p.freqs.forEach((freq, idx) => {
    const start = ctx.currentTime + idx * p.step;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = p.type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.01, start);
    gain.gain.linearRampToValueAtTime(0.55, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + p.step + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + p.step + 0.38);
  });
}

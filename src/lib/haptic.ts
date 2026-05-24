// Lightweight haptic feedback. No-op on iOS Safari (no Vibration API),
// active on Android Chrome and most desktop browsers (silently ignored).
export function tapHaptic(ms: number = 10) {
  if (typeof navigator === "undefined") return;
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
}

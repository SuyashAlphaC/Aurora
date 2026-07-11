/** Euclidean distance between two face-api 128-dim descriptors */
export function descriptorDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** face-api.js default match threshold ~0.6; lower = stricter */
export const FACE_MATCH_THRESHOLD = 0.55;

export function findBestFaceMatch(
  probe: number[],
  candidates: Array<{ id: string; descriptor: number[] }>
): { id: string; distance: number; confidence: number } | null {
  let best: { id: string; distance: number } | null = null;

  for (const c of candidates) {
    if (!c.descriptor?.length) continue;
    const distance = descriptorDistance(probe, c.descriptor);
    if (distance > FACE_MATCH_THRESHOLD) continue;
    if (!best || distance < best.distance) {
      best = { id: c.id, distance };
    }
  }

  if (!best) return null;

  const confidence = Math.max(0, Math.min(100, Math.round((1 - best.distance / FACE_MATCH_THRESHOLD) * 100)));
  return { id: best.id, distance: best.distance, confidence };
}

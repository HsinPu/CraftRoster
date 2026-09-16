export function expectedPixel(inverted = false) {
  return [...[0.25, 0.5, 0.75].map(value => Math.round(255 * (inverted ? 1 - value : value))), 255];
}
export function comparePixel(bytes, inverted = false) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 4) return false;
  return expectedPixel(inverted).every((value, index) => Math.abs(bytes[index] - value) <= 1);
}
export function boundedSize(width, height, dpr = 1) {
  if (![width, height, dpr].every(v => Number.isFinite(v) && v > 0)) throw Error('Invalid display size');
  const ratio = Math.min(2, dpr);
  return { width: Math.max(1, Math.min(1024, Math.floor(width * ratio))), height: Math.max(1, Math.min(1024, Math.floor(height * ratio))) };
}

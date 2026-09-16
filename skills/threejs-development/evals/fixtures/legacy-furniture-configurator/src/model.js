export const mmToMeters = value => value / 1000;
export function chairParts(design) {
  const p = design.dimensionsMm, width = mmToMeters(p.width), depth = mmToMeters(p.depth), seat = mmToMeters(p.seatHeight), back = mmToMeters(p.backHeight);
  const parts = [];
  for (const x of [-1, 1]) for (const z of [-1, 1]) parts.push({ kind: 'leg', material: 'frame', size: [0.06, seat - 0.1, 0.06], position: [x * (width / 2 - 0.05), (seat - 0.1) / 2, z * (depth / 2 - 0.05)] });
  parts.push({ kind: 'support', material: 'frame', size: [width, 0.06, depth], position: [0, seat - 0.1, 0] });
  parts.push({ kind: 'cushion', material: 'upholstery', size: [width, 0.12, depth], position: [0, seat, 0] });
  parts.push({ kind: 'back', material: 'upholstery', size: [width, back, 0.1], position: [0, seat + back / 2, -depth / 2 + 0.05] });
  return parts;
}
export function cameraPose(design) {
  const c = design.camera, angle = c.yawDegrees * Math.PI / 180 + design.capture.timeSeconds / design.capture.durationSeconds * Math.PI * 2;
  const pitch = c.pitchDegrees * Math.PI / 180, distance = c.distanceMeters;
  return [Math.sin(angle) * Math.cos(pitch) * distance, 0.55 + Math.sin(pitch) * distance, Math.cos(angle) * Math.cos(pitch) * distance];
}
export function patternBytes(seed, variation = 12) {
  let state = seed >>> 0; const pixels = new Uint8Array(4 * 4 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = 255 - (state % (variation + 1)); pixels.set([value,value,value,255], index);
  }
  return pixels;
}
export function rasterSize(width, height, dpr, preference = 'auto', viewportWidth = width) {
  if (![width,height,dpr,viewportWidth].every(value => Number.isFinite(value) && value > 0) || !['auto','mobile','desktop'].includes(preference)) throw new Error('Invalid raster size or tier');
  const tier = preference === 'auto' ? (viewportWidth <= 640 ? 'mobile' : 'desktop') : preference;
  const cap = tier === 'mobile' ? 768 : 1536, ratio = Math.min(dpr, tier === 'mobile' ? 1 : 2);
  return { tier, width: Math.max(1,Math.min(cap,Math.floor(width * ratio))), height: Math.max(1,Math.min(cap,Math.floor(height * ratio))), dpr: ratio };
}

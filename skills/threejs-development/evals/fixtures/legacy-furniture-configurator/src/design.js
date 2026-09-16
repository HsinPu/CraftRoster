const clone = value => JSON.parse(JSON.stringify(value));
function object(value, keys, label) {
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) throw new Error('Invalid ' + label + ' fields');
}
function number(value, min, max, label, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error('Invalid ' + label);
}
function text(value, max, label) { if (typeof value !== 'string' || [...value].length < 1 || [...value].length > max) throw new Error('Invalid ' + label); }
export function validateDesign(value) {
  object(value, ['schemaVersion','id','name','dimensionsMm','finish','camera','capture'], 'document');
  if (value.schemaVersion !== 1) throw new Error('Unsupported saved design version');
  if (typeof value.id !== 'string' || !/^[a-z0-9-]{1,48}$/.test(value.id)) throw new Error('Invalid id');
  text(value.name, 80, 'name');
  object(value.dimensionsMm, ['width','depth','seatHeight','backHeight'], 'dimensions');
  for (const [name, min, max] of [['width',500,1000],['depth',500,900],['seatHeight',300,550],['backHeight',250,600]]) number(value.dimensionsMm[name], min, max, name, true);
  object(value.finish, ['frame','upholstery'], 'finish');
  if (!['oak','walnut'].includes(value.finish.frame) || !['teal','sand'].includes(value.finish.upholstery)) throw new Error('Unknown material');
  object(value.camera, ['yawDegrees','pitchDegrees','distanceMeters'], 'camera');
  number(value.camera.yawDegrees,-180,180,'yaw'); number(value.camera.pitchDegrees,5,60,'pitch'); number(value.camera.distanceMeters,2,6,'distance');
  object(value.capture, ['seed','timeSeconds','durationSeconds','fps','label','audioCue'], 'capture');
  number(value.capture.seed,0,4294967295,'seed',true); number(value.capture.durationSeconds,1,60,'duration');
  number(value.capture.timeSeconds,0,value.capture.durationSeconds,'time');
  if (![24,30,60].includes(value.capture.fps)) throw new Error('Invalid fps');
  text(value.capture.label,100,'label'); if (value.capture.audioCue !== 'tone-a') throw new Error('Unknown audio cue');
  return clone(value);
}
export function loadDesign(textValue) { return validateDesign(JSON.parse(textValue)); }
export function saveDesign(value) { return JSON.stringify(validateDesign(value), null, 2) + '\n'; }
export function changeDesign(value, section, key, next) {
  if (!['dimensionsMm','finish','camera','capture'].includes(section)) throw new Error('Unknown editable section');
  const copy = validateDesign(value); copy[section][key] = next; return validateDesign(copy);
}

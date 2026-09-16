'use strict';
function makeWav(cue) {
  if (cue.channels !== 1 || cue.sampleRate !== 16000 || cue.seconds !== 0.25 || cue.frequencyHz !== 440 || cue.amplitude !== 0.08) throw new Error('Only the fixed authored tone is supported');
  const frames = cue.sampleRate * cue.seconds, data = Buffer.alloc(frames * 2), header = Buffer.alloc(44);
  for (let i = 0; i < frames; i++) data.writeInt16LE(Math.round(Math.sin(2 * Math.PI * cue.frequencyHz * i / cue.sampleRate) * cue.amplitude * 32767), i * 2);
  header.write('RIFF',0); header.writeUInt32LE(36 + data.length,4); header.write('WAVEfmt ',8); header.writeUInt32LE(16,16);
  header.writeUInt16LE(1,20); header.writeUInt16LE(1,22); header.writeUInt32LE(cue.sampleRate,24); header.writeUInt32LE(cue.sampleRate * 2,28);
  header.writeUInt16LE(2,32); header.writeUInt16LE(16,34); header.write('data',36); header.writeUInt32LE(data.length,40);
  return Buffer.concat([header,data]);
}
module.exports = { makeWav };

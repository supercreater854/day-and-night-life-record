// Original 64-second arrangement, synthesized without recordings or samples.
// Soft struck-sine timbre, open chords, a sparse melody; tails wrap into the loop.
import { writeFile } from 'node:fs/promises';
// All synthesized harmonics are below 2 kHz; 16 kHz retains them and halves transfer size.
const rate = 16000, seconds = 64, length = rate * seconds;
const samples = new Float64Array(length);
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
function note(at, midi, gain = .11, sustain = 3.4) {
  const hz = frequency(midi), duration = 8;
  for (let i = 0; i < duration * rate; i++) {
    const t = i / rate;
    const attack = 1 - Math.exp(-t * 32);
    const tail = Math.min(1, (duration - t) / .5);
    const envelope = attack * Math.exp(-t / sustain) * tail;
    const wave = Math.sin(2 * Math.PI * hz * t) + .19 * Math.sin(2 * Math.PI * hz * 2 * t) * Math.exp(-t * 1.5) + .045 * Math.sin(2 * Math.PI * hz * 3 * t) * Math.exp(-t * 2.4);
    const value = wave * envelope * gain;
    const index = (Math.round(at * rate) + i) % length;
    samples[index] += value;
    samples[(index + Math.round(.31 * rate)) % length] += value * .13;
    samples[(index + Math.round(.73 * rate)) % length] += value * .06;
  }
}
const chords = [[48,55,59,64],[45,52,55,60],[41,48,55,57],[43,50,57,62]];
const melodies = [[76,74,71],[72,71,67],[69,72,76],[74,69,67],[71,74,76],[72,76,71],[69,67,72],[74,71,67]];
for (let bar = 0; bar < 8; bar++) {
  const start = bar * 8;
  chords[bar % 4].forEach((pitch, i) => note(start + i * .12, pitch, i ? .055 : .07, 2.8));
  melodies[bar].forEach((pitch, i) => note(start + 1.4 + i * 2, pitch, .085, 1.9));
}
let peak = 0; for (const value of samples) peak = Math.max(peak, Math.abs(value));
const data = Buffer.alloc(44 + length * 2);
data.write('RIFF',0); data.writeUInt32LE(data.length-8,4); data.write('WAVEfmt ',8);
data.writeUInt32LE(16,16); data.writeUInt16LE(1,20); data.writeUInt16LE(1,22);
data.writeUInt32LE(rate,24); data.writeUInt32LE(rate*2,28); data.writeUInt16LE(2,32); data.writeUInt16LE(16,34);
data.write('data',36); data.writeUInt32LE(length*2,40);
let energy=0;
for(let i=0;i<length;i++){const value=samples[i]/peak*.34;energy+=value*value;data.writeInt16LE(Math.round(value*32767),44+i*2);}
await writeFile(new URL('../public/quiet-orbit.wav',import.meta.url),data);
console.log(JSON.stringify({seconds,rate,bytes:data.length,peak:.34,rms:Math.sqrt(energy/length),loopSeam:Math.abs(samples[0]-samples[length-1])/peak*.34}));

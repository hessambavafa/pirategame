export class AudioSystem {
  constructor() {
    this.unlocked = false;
    this.currentMusicTimer = null;
    this.currentAmbientTimer = null;
    this.noiseBuffer = null;
  }

  attach(game) {
    this.game = game;
  }

  ensureAudioGraph() {
    if (this.masterGain) {
      return;
    }

    const context = this.game.sound.context;
    this.context = context;
    this.masterGain = context.createGain();
    this.musicGain = context.createGain();
    this.ambientGain = context.createGain();
    this.sfxGain = context.createGain();
    this.compressor = context.createDynamicsCompressor();

    this.masterGain.gain.value = 1;
    this.musicGain.gain.value = 0.15;
    this.ambientGain.gain.value = 0.08;
    this.sfxGain.gain.value = 0.28;

    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 20;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;

    this.musicGain.connect(this.compressor);
    this.ambientGain.connect(this.compressor);
    this.sfxGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(context.destination);
  }

  async unlock() {
    this.ensureAudioGraph();

    if (this.context.state !== 'running') {
      await this.context.resume();
    }

    this.unlocked = true;
    this.applyMuteState();
  }

  applyMuteState() {
    if (!this.masterGain) {
      return;
    }

    const muted = this.game.services.save.state.settings.muted;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.03);
  }

  stopLoops() {
    this.currentMusicTimer?.remove(false);
    this.currentAmbientTimer?.remove(false);
    this.currentMusicTimer = null;
    this.currentAmbientTimer = null;
  }

  playMenuLoop(scene) {
    this.stopLoops();
    this.applyMuteState();
    const melody = [76, 79, 83, 79, 74, 76, 72, 74];
    const bass = [52, 52, 55, 55, 48, 48, 50, 50];
    let step = 0;

    this.currentMusicTimer = scene.time.addEvent({
      delay: 340,
      loop: true,
      callback: () => {
        if (!this.unlocked) {
          return;
        }

        const note = melody[step % melody.length];
        const bassNote = bass[step % bass.length];
        this.playPluck(midiToFreq(note), 0.034, this.musicGain, step % 2 ? 0.05 : 0.06, 0);

        if (step % 2 === 0) {
          this.playPluck(midiToFreq(note + 7), 0.028, this.musicGain, 0.035, 0.03);
        }

        if (step % 4 === 0) {
          this.playSweepTone(midiToFreq(bassNote), midiToFreq(bassNote - 5), 0.16, {
            type: 'sine',
            volume: 0.05,
            gainNode: this.musicGain,
            attack: 0.006,
            release: 0.16,
          });
        }

        if (step % 4 === 2) {
          this.playNoise(0.04, { volume: 0.012, gainNode: this.musicGain, lowpassStart: 3200, lowpassEnd: 1800, highpass: 1200 });
        }

        step += 1;
      },
    });

    this.playOceanAmbience(scene);
  }

  playBattleLoop(scene) {
    this.stopLoops();
    this.applyMuteState();
    const melody = [72, 76, 79, 81, 79, 76, 74, 76, 77, 79, 81, 84, 81, 79, 76, 74];
    const bass = [48, 48, 50, 50, 52, 52, 50, 50, 45, 45, 47, 47, 48, 48, 50, 50];
    let step = 0;

    this.currentMusicTimer = scene.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        if (!this.unlocked) {
          return;
        }

        const note = melody[step % melody.length];
        const bassNote = bass[step % bass.length];
        this.playPluck(midiToFreq(note), 0.032, this.musicGain, 0.055, 0);

        if (step % 2 === 0) {
          this.playPluck(midiToFreq(note + 7), 0.026, this.musicGain, 0.036, 0.025);
        }

        if (step % 4 === 0) {
          this.playSweepTone(midiToFreq(bassNote), midiToFreq(bassNote - 5), 0.18, {
            type: 'triangle',
            volume: 0.06,
            gainNode: this.musicGain,
            attack: 0.004,
            release: 0.18,
          });
        }

        if (step % 2 === 1) {
          this.playNoise(0.035, { volume: 0.016, gainNode: this.musicGain, lowpassStart: 4200, lowpassEnd: 2200, highpass: 1600 });
        }

        step += 1;
      },
    });

    this.playOceanAmbience(scene);
  }

  playOceanAmbience(scene) {
    this.currentAmbientTimer?.remove(false);

    this.currentAmbientTimer = scene.time.addEvent({
      delay: 2100,
      loop: true,
      callback: () => {
        if (!this.unlocked) {
          return;
        }

        this.playSweepTone(196, 182, 1.4, {
          type: 'sine',
          volume: 0.032,
          gainNode: this.ambientGain,
          attack: 0.5,
          release: 0.8,
        });
        this.playSweepTone(246, 232, 1.1, {
          type: 'triangle',
          volume: 0.014,
          gainNode: this.ambientGain,
          attack: 0.4,
          release: 0.8,
        });
        this.playNoise(0.7, {
          volume: 0.02,
          gainNode: this.ambientGain,
          lowpassStart: 1600,
          lowpassEnd: 850,
          highpass: 120,
          attack: 0.08,
          release: 0.4,
        });
      },
    });
  }

  playButton() {
    this.playPluck(660, 0.045, this.sfxGain, 0.055, 0);
    this.playPluck(990, 0.03, this.sfxGain, 0.03, 0.02);
  }

  playHover() {
    this.playPluck(520, 0.025, this.sfxGain, 0.028, 0);
  }

  playCannon() {
    this.playTone(760, 0.018, { type: 'square', volume: 0.038, release: 0.02 });
    this.playNoise(0.05, { volume: 0.12, lowpassStart: 3400, lowpassEnd: 1500, highpass: 180, attack: 0.001, release: 0.06 });
    this.playSweepTone(260, 118, 0.11, { type: 'triangle', volume: 0.13, attack: 0.001, release: 0.08 });
    this.playSweepTone(126, 52, 0.19, { type: 'sine', volume: 0.19, attack: 0.001, release: 0.16 });
    this.playNoise(0.12, { volume: 0.08, lowpassStart: 1200, lowpassEnd: 300, highpass: 90, attack: 0.002, release: 0.12, delay: 0.02 });
  }

  playExplosion() {
    this.playNoise(0.16, { volume: 0.16, lowpassStart: 2400, lowpassEnd: 420, highpass: 60, attack: 0.001, release: 0.18 });
    this.playSweepTone(188, 56, 0.18, { type: 'sawtooth', volume: 0.11, attack: 0.001, release: 0.14 });
    this.playSweepTone(92, 34, 0.26, { type: 'sine', volume: 0.18, attack: 0.001, release: 0.18 });
    this.playTone(420, 0.03, { type: 'triangle', volume: 0.026, delay: 0.04, release: 0.04 });
    this.playTone(340, 0.035, { type: 'triangle', volume: 0.024, delay: 0.07, release: 0.04 });
  }

  playImpact() {
    this.playNoise(0.05, { volume: 0.07, lowpassStart: 1800, lowpassEnd: 700, highpass: 120, attack: 0.001, release: 0.05 });
    this.playSweepTone(180, 110, 0.08, { type: 'triangle', volume: 0.06, attack: 0.001, release: 0.07 });
  }

  playSuccess() {
    this.playPluck(784, 0.06, this.sfxGain, 0.08, 0);
    this.playPluck(988, 0.06, this.sfxGain, 0.06, 0.04);
    this.playPluck(1175, 0.08, this.sfxGain, 0.05, 0.08);
    this.playNoise(0.08, { volume: 0.03, lowpassStart: 5200, lowpassEnd: 2400, highpass: 2200, delay: 0.02, attack: 0.001, release: 0.05 });
  }

  playReward() {
    this.playPluck(1046, 0.05, this.sfxGain, 0.08, 0);
    this.playPluck(1318, 0.06, this.sfxGain, 0.07, 0.04);
    this.playTone(1760, 0.035, { type: 'sine', volume: 0.03, delay: 0.08, release: 0.05 });
    this.playNoise(0.05, { volume: 0.018, lowpassStart: 4800, lowpassEnd: 2400, highpass: 2000, delay: 0.03, attack: 0.001, release: 0.05 });
  }

  playMistake() {
    this.playSweepTone(280, 188, 0.08, { type: 'triangle', volume: 0.05, attack: 0.001, release: 0.08 });
    this.playSweepTone(190, 128, 0.16, { type: 'sine', volume: 0.05, attack: 0.001, release: 0.14 });
    this.playNoise(0.06, { volume: 0.02, lowpassStart: 900, lowpassEnd: 500, highpass: 180, attack: 0.001, release: 0.06 });
  }

  playPenalty() {
    this.playSweepTone(240, 150, 0.08, { type: 'triangle', volume: 0.045, attack: 0.001, release: 0.08 });
    this.playTone(140, 0.05, { type: 'sine', volume: 0.03, delay: 0.02, release: 0.08 });
  }

  playSplash() {
    this.playNoise(0.12, { volume: 0.1, lowpassStart: 2800, lowpassEnd: 900, highpass: 220, attack: 0.001, release: 0.12 });
    this.playSweepTone(540, 300, 0.12, { type: 'sine', volume: 0.042, attack: 0.001, release: 0.12, delay: 0.01 });
  }

  playUpgrade() {
    this.playPluck(660, 0.08, this.sfxGain, 0.08, 0);
    this.playPluck(988, 0.08, this.sfxGain, 0.07, 0.05);
    this.playPluck(1320, 0.12, this.sfxGain, 0.06, 0.1);
    this.playNoise(0.1, { volume: 0.04, lowpassStart: 5000, lowpassEnd: 2200, highpass: 1800, delay: 0.04, attack: 0.001, release: 0.08 });
  }

  playCelebration() {
    [784, 988, 1175, 1568].forEach((frequency, index) => {
      this.playPluck(frequency, 0.08 + index * 0.02, this.sfxGain, 0.08 - index * 0.01, index * 0.05);
    });
    this.playNoise(0.16, { volume: 0.05, lowpassStart: 5200, lowpassEnd: 2600, highpass: 2000, delay: 0.05, attack: 0.001, release: 0.14 });
  }

  playPluck(frequency, duration, gainNode = this.sfxGain, volume = 0.05, delay = 0) {
    this.playTone(frequency, duration, { type: 'triangle', volume, gainNode, attack: 0.002, release: 0.08, delay });
    this.playTone(frequency * 2, duration * 0.55, { type: 'sine', volume: volume * 0.33, gainNode, attack: 0.001, release: 0.05, delay });
  }

  playSweepTone(startFrequency, endFrequency, duration, options = {}) {
    if (!this.unlocked) {
      return;
    }

    this.ensureAudioGraph();
    const {
      type = 'triangle',
      volume = 0.05,
      attack = 0.01,
      release = 0.12,
      delay = 0,
      gainNode = this.sfxGain,
    } = options;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(10, endFrequency), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);

    oscillator.connect(gain);
    gain.connect(gainNode);
    oscillator.start(now);
    oscillator.stop(now + duration + release + 0.04);
  }

  playTone(frequency, duration, options = {}) {
    if (!this.unlocked) {
      return;
    }

    this.ensureAudioGraph();
    const {
      type = 'triangle',
      volume = 0.05,
      attack = 0.01,
      release = 0.12,
      detune = 0,
      delay = 0,
      gainNode = this.sfxGain,
    } = options;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);

    oscillator.connect(gain);
    gain.connect(gainNode);
    oscillator.start(now);
    oscillator.stop(now + duration + release + 0.04);
  }

  playNoise(duration, options = {}) {
    if (!this.unlocked) {
      return;
    }

    this.ensureAudioGraph();

    if (!this.noiseBuffer) {
      const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    const {
      volume = 0.04,
      gainNode = this.sfxGain,
      lowpassStart = 1200,
      lowpassEnd = lowpassStart,
      highpass = 0,
      delay = 0,
      attack = 0.004,
      release = duration,
    } = options;
    const now = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const low = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    low.type = 'lowpass';
    low.frequency.setValueAtTime(lowpassStart, now);
    low.frequency.exponentialRampToValueAtTime(Math.max(80, lowpassEnd), now + duration);
    source.buffer = this.noiseBuffer;
    source.connect(low);

    let output = low;
    if (highpass > 0) {
      const high = this.context.createBiquadFilter();
      high.type = 'highpass';
      high.frequency.value = highpass;
      low.connect(high);
      output = high;
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + release);
    output.connect(gain);
    gain.connect(gainNode);

    source.start(now);
    source.stop(now + release + 0.03);
  }
}

function midiToFreq(midiNote) {
  return 440 * 2 ** ((midiNote - 69) / 12);
}

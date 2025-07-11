class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    // Initialize with user preference
    const savedPreference = localStorage.getItem('sound-enabled');
    this.enabled = savedPreference !== 'false';
  }

  private async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private async playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.enabled) return;
    
    try {
      await this.initAudioContext();
      if (!this.audioContext) return;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }

  async playMessageReceived() {
    // Pleasant notification sound
    await this.playTone(800, 0.2);
    setTimeout(() => this.playTone(600, 0.2), 100);
  }

  async playFileTransferComplete() {
    // Success sound - ascending tones
    await this.playTone(523, 0.15); // C
    setTimeout(() => this.playTone(659, 0.15), 80); // E
    setTimeout(() => this.playTone(784, 0.2), 160); // G
  }

  async playFileTransferStart() {
    // Start sound - gentle ping
    await this.playTone(440, 0.1);
  }

  async playError() {
    // Error sound - descending tones
    await this.playTone(400, 0.2);
    setTimeout(() => this.playTone(300, 0.3), 100);
  }

  async playDeviceConnected() {
    // Device connected - gentle ascending
    await this.playTone(440, 0.1);
    setTimeout(() => this.playTone(554, 0.1), 50);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('sound-enabled', enabled.toString());
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const soundManager = new SoundManager();
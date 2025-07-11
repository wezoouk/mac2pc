class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    // Initialize with user preference - default to enabled
    const savedPreference = localStorage.getItem('sound-enabled');
    this.enabled = savedPreference !== null ? savedPreference === 'true' : true;
    console.log('SoundManager initialized, enabled:', this.enabled);
  }

  private async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('Audio context created, state:', this.audioContext.state);
    }
    
    if (this.audioContext.state === 'suspended') {
      console.log('Audio context suspended, attempting to resume...');
      await this.audioContext.resume();
      console.log('Audio context resumed, state:', this.audioContext.state);
    }
  }

  private async playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.enabled) {
      console.log('Sound disabled, skipping tone');
      return;
    }
    
    try {
      console.log('Playing tone:', frequency, 'Hz for', duration, 'seconds');
      await this.initAudioContext();
      if (!this.audioContext) {
        console.warn('Audio context not available');
        return;
      }

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
      
      console.log('Tone played successfully');
    } catch (error) {
      console.error('Sound playback failed:', error);
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
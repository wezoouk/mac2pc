// Audio notification system for messages and file transfers
export class NotificationSound {
  private static audioContext: AudioContext | null = null;
  private static initialized = false;

  // Initialize audio context (must be called after user interaction)
  static async initialize() {
    if (this.initialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  // Play a notification sound using Web Audio API
  static async playNotificationSound(type: 'message' | 'file' = 'message') {
    if (!this.audioContext) {
      await this.initialize();
    }

    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Different sounds for different notification types
      if (type === 'message') {
        // Higher pitched sound for messages
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
      } else {
        // Lower pitched sound for files
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.2);
      }

      // Envelope for the sound
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }

  // Play multiple notification sounds for bulk operations
  static async playBulkNotification(count: number) {
    for (let i = 0; i < Math.min(count, 3); i++) {
      setTimeout(() => this.playNotificationSound('file'), i * 100);
    }
  }
}

// Browser notification system
export class BrowserNotifications {
  private static permission: NotificationPermission = 'default';

  static async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    }
    return false;
  }

  static async showNotification(title: string, body: string, icon?: string) {
    if (this.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        silent: true, // We handle sound separately
      });
    }
  }
}

// Combined notification system
export class NotificationManager {
  private static soundEnabled = true;
  private static browserNotificationsEnabled = false;

  static async initialize() {
    await NotificationSound.initialize();
    this.browserNotificationsEnabled = await BrowserNotifications.requestPermission();
  }

  static setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  static async notifyMessage(fromName: string, message: string, selfDestruct?: number) {
    // Play sound notification
    if (this.soundEnabled) {
      await NotificationSound.playNotificationSound('message');
    }

    // Show browser notification if enabled
    if (this.browserNotificationsEnabled) {
      const title = `Message from ${fromName}`;
      const body = selfDestruct 
        ? `${message} (Self-destructs in ${selfDestruct}s)`
        : message;
      
      BrowserNotifications.showNotification(title, body);
    }
  }

  static async notifyFile(fromName: string, fileName: string, fileSize: number) {
    // Play sound notification
    if (this.soundEnabled) {
      await NotificationSound.playNotificationSound('file');
    }

    // Show browser notification if enabled
    if (this.browserNotificationsEnabled) {
      const title = `File from ${fromName}`;
      const body = `${fileName} (${this.formatFileSize(fileSize)})`;
      
      BrowserNotifications.showNotification(title, body);
    }
  }

  static async notifyMultipleFiles(fromName: string, count: number) {
    // Play bulk sound notification
    if (this.soundEnabled) {
      await NotificationSound.playBulkNotification(count);
    }

    // Show browser notification if enabled
    if (this.browserNotificationsEnabled) {
      const title = `Files from ${fromName}`;
      const body = `${count} files received`;
      
      BrowserNotifications.showNotification(title, body);
    }
  }

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
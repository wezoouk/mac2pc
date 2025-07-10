import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateDeviceId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour ago`;
  return `${Math.floor(diffInSeconds / 86400)} day ago`;
}

export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const userAgent = navigator.userAgent;
  if (/Mobile|Android|iPhone/.test(userAgent)) {
    return 'mobile';
  } else if (/iPad/.test(userAgent)) {
    return 'tablet';
  }
  return 'desktop';
}

export function generateRandomDeviceName(): string {
  const adjectives = [
    'swift', 'bright', 'clever', 'mighty', 'gentle', 'brave', 'cosmic', 'wild',
    'fuzzy', 'sleepy', 'happy', 'bouncy', 'sneaky', 'shiny', 'cozy', 'zippy',
    'dapper', 'quirky', 'fluffy', 'peppy', 'jolly', 'witty', 'noble', 'eager',
    'zesty', 'merry', 'nimble', 'dashing', 'spunky', 'crafty', 'bubbly', 'perky'
  ];
  
  const animals = [
    'wombat', 'pangolin', 'quokka', 'axolotl', 'narwhal', 'platypus', 'otter',
    'hedgehog', 'fennec', 'chinchilla', 'capybara', 'meerkat', 'lemur', 'sloth',
    'puffin', 'penguin', 'dolphin', 'turtle', 'koala', 'raccoon', 'squirrel',
    'hamster', 'ferret', 'rabbit', 'fox', 'wolf', 'bear', 'lion', 'tiger', 'cat'
  ];
  
  const devices = [
    'mac', 'pc', 'laptop', 'desktop', 'tablet', 'phone', 'workstation', 'chromebook',
    'surface', 'macbook', 'imac', 'thinkpad', 'dell', 'hp', 'asus', 'lenovo'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const device = devices[Math.floor(Math.random() * devices.length)];
  
  // Sometimes use adjective-animal-device, sometimes just animal-device
  if (Math.random() > 0.5) {
    return `${adjective}-${animal}-${device}`;
  } else {
    return `${animal}-${device}`;
  }
}

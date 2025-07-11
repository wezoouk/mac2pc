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

export function getDetailedDeviceType(): string {
  const userAgent = navigator.userAgent;
  
  // Mobile devices
  if (/iPhone/.test(userAgent)) return 'iPhone';
  if (/Android.*Mobile/.test(userAgent)) return 'Android';
  if (/Mobile/.test(userAgent)) return 'Mobile';
  
  // Tablets
  if (/iPad/.test(userAgent)) return 'iPad';
  if (/Android/.test(userAgent)) return 'Tablet';
  
  // Desktop/Laptop
  if (/Mac/.test(userAgent)) return 'Mac';
  if (/Windows/.test(userAgent)) return 'PC';
  if (/Linux/.test(userAgent)) return 'Linux';
  if (/CrOS/.test(userAgent)) return 'Chromebook';
  
  return 'Desktop';
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
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const deviceType = getDetailedDeviceType();
  
  // Sometimes use adjective-animal-device, sometimes just animal-device
  if (Math.random() > 0.5) {
    return `${adjective}-${animal}-${deviceType}`;
  } else {
    return `${animal}-${deviceType}`;
  }
}

export function getDeviceIcon(deviceName: string): {
  icon: string;
  color: string;
  description: string;
} {
  const name = deviceName.toLowerCase();
  
  // Apple devices
  if (name.includes('mac') || name.includes('imac') || name.includes('macbook')) {
    return { icon: '🍎', color: 'text-slate-600', description: 'Apple Mac' };
  }
  
  // iPhone/iOS
  if (name.includes('iphone') || name.includes('ios')) {
    return { icon: '📱', color: 'text-blue-600', description: 'iPhone' };
  }
  
  // iPad
  if (name.includes('ipad') || name.includes('tablet')) {
    return { icon: '📱', color: 'text-purple-600', description: 'Tablet' };
  }
  
  // Windows devices
  if (name.includes('pc') || name.includes('windows') || name.includes('dell') || 
      name.includes('hp') || name.includes('asus') || name.includes('lenovo') ||
      name.includes('thinkpad')) {
    return { icon: '💻', color: 'text-blue-500', description: 'Windows PC' };
  }
  
  // Surface
  if (name.includes('surface')) {
    return { icon: '💻', color: 'text-blue-400', description: 'Microsoft Surface' };
  }
  
  // Chromebook
  if (name.includes('chromebook') || name.includes('chrome')) {
    return { icon: '💻', color: 'text-green-500', description: 'Chromebook' };
  }
  
  // Workstation
  if (name.includes('workstation')) {
    return { icon: '🖥️', color: 'text-gray-700', description: 'Workstation' };
  }
  
  // Desktop
  if (name.includes('desktop')) {
    return { icon: '🖥️', color: 'text-gray-600', description: 'Desktop' };
  }
  
  // Laptop (generic)
  if (name.includes('laptop')) {
    return { icon: '💻', color: 'text-gray-500', description: 'Laptop' };
  }
  
  // Phone (generic)
  if (name.includes('phone')) {
    return { icon: '📱', color: 'text-green-600', description: 'Phone' };
  }
  
  // Default for unknown types
  return { icon: '💻', color: 'text-gray-500', description: 'Device' };
}

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
  if (/iPhone/.test(userAgent)) return 'iphone';
  if (/Android.*Mobile/.test(userAgent)) return 'android';
  if (/Mobile/.test(userAgent)) return 'mobile';
  
  // Tablets
  if (/iPad/.test(userAgent)) return 'ipad';
  if (/Android/.test(userAgent)) return 'tablet';
  
  // Desktop/Laptop
  if (/Mac/.test(userAgent)) return 'mac';
  if (/Windows/.test(userAgent)) return 'pc';
  if (/Linux/.test(userAgent)) return 'linux';
  if (/CrOS/.test(userAgent)) return 'chromebook';
  
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
  
  const words = [...adjectives, ...animals];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const deviceType = getDetailedDeviceType();
  
  return `${randomWord}-${deviceType}`;
}

export function getDeviceIcon(deviceName: string): {
  icon: string;
  color: string;
  description: string;
} {
  const name = deviceName.toLowerCase();
  
  // Apple devices
  if (name.includes('-mac') || name.includes('imac') || name.includes('macbook')) {
    return { icon: '🍎', color: 'text-slate-600', description: 'Apple Mac' };
  }
  
  // iPhone/iOS
  if (name.includes('-iphone') || name.includes('ios')) {
    return { icon: '📱', color: 'text-blue-600', description: 'iPhone' };
  }
  
  // iPad
  if (name.includes('-ipad') || name.includes('tablet')) {
    return { icon: '📱', color: 'text-purple-600', description: 'iPad' };
  }
  
  // Android devices
  if (name.includes('-android')) {
    return { icon: '📱', color: 'text-green-600', description: 'Android' };
  }
  
  // Windows devices
  if (name.includes('-pc') || name.includes('windows') || name.includes('dell') || 
      name.includes('hp') || name.includes('asus') || name.includes('lenovo') ||
      name.includes('thinkpad')) {
    return { icon: '💻', color: 'text-blue-500', description: 'Windows PC' };
  }
  
  // Linux devices
  if (name.includes('-linux')) {
    return { icon: '💻', color: 'text-orange-500', description: 'Linux' };
  }
  
  // Chromebook
  if (name.includes('-chromebook') || name.includes('chrome')) {
    return { icon: '💻', color: 'text-green-500', description: 'Chromebook' };
  }
  
  // Generic tablets
  if (name.includes('-tablet')) {
    return { icon: '📱', color: 'text-purple-600', description: 'Tablet' };
  }
  
  // Generic mobile
  if (name.includes('-mobile')) {
    return { icon: '📱', color: 'text-green-600', description: 'Mobile' };
  }
  
  // Desktop
  if (name.includes('-desktop')) {
    return { icon: '🖥️', color: 'text-gray-600', description: 'Desktop' };
  }
  
  // Legacy support for older names
  if (name.includes('surface')) {
    return { icon: '💻', color: 'text-blue-400', description: 'Microsoft Surface' };
  }
  
  if (name.includes('workstation')) {
    return { icon: '🖥️', color: 'text-gray-700', description: 'Workstation' };
  }
  
  if (name.includes('laptop')) {
    return { icon: '💻', color: 'text-gray-500', description: 'Laptop' };
  }
  
  if (name.includes('phone')) {
    return { icon: '📱', color: 'text-green-600', description: 'Phone' };
  }
  
  // Default for unknown types
  return { icon: '💻', color: 'text-gray-500', description: 'Device' };
}

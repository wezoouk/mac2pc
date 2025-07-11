import { useState, useEffect } from "react";
import { Smartphone, Monitor, Tablet, Wifi, Signal } from "lucide-react";
import { getDeviceIcon } from "@/lib/utils";
import type { Device } from "@shared/schema";

interface RadarViewProps {
  devices: Device[];
  selectedDevice: Device | null;
  onDeviceSelect: (device: Device) => void;
  currentDeviceId: string;
  currentDeviceName: string;
  currentDeviceType: string;
  isConnected: boolean;
}

export function RadarView({
  devices,
  selectedDevice,
  onDeviceSelect,
  currentDeviceId,
  currentDeviceName,
  currentDeviceType,
  isConnected
}: RadarViewProps) {
  const [animatedDevices, setAnimatedDevices] = useState<Device[]>([]);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    // Animate devices appearing
    const timer = setTimeout(() => {
      setAnimatedDevices(devices);
    }, 100);
    return () => clearTimeout(timer);
  }, [devices]);

  useEffect(() => {
    // Update window width on resize
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function getDeviceIconComponent(type: string, isCenter = false) {
    // Larger icon sizes for bigger radar
    const size = isCenter ? (radarSize >= 800 ? 72 : radarSize >= 600 ? 56 : 40) : (radarSize >= 800 ? 48 : radarSize >= 600 ? 36 : 28);
    const iconProps = { size, className: "text-white drop-shadow-lg" };
    
    switch (type) {
      case 'mobile':
        return <Smartphone {...iconProps} />;
      case 'tablet':
        return <Tablet {...iconProps} />;
      default:
        return <Monitor {...iconProps} />;
    }
  }

  function getDevicePosition(index: number, total: number) {
    if (total === 0) return { x: 0, y: 0 };
    
    const angle = (2 * Math.PI * index) / total;
    // Adjust radius based on radar size - keep devices well within bounds
    const margin = radarSize >= 800 ? 120 : radarSize >= 600 ? 100 : 60;
    const maxRadius = (radarSize / 2) - margin;
    const baseRadius = radarSize >= 800 ? 220 : radarSize >= 600 ? 180 : 80;
    const radius = Math.min(maxRadius, baseRadius + total * 15);
    
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  }

  function getDeviceColor(device: Device) {
    if (device.roomId) {
      return 'bg-amber-500'; // Remote devices
    }
    return 'bg-blue-500'; // Local devices
  }

  // Much larger radar size - 800px on desktop for better visibility
  const radarSize = windowWidth >= 1024 ? 800 : windowWidth >= 768 ? 600 : 320;
  const centerX = radarSize / 2;
  const centerY = radarSize / 2;

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Radar Display */}
      <div className="relative" style={{ width: radarSize, height: radarSize }}>
        {/* Radar Background - True Circle */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 shadow-2xl border-2 border-blue-500/30 dark:from-gray-800 dark:via-blue-800 dark:to-gray-800"
          style={{ borderRadius: '50%' }}
        >
          {/* Animated Radar Rings */}
          <div 
            className="absolute inset-0 border-2 border-blue-400/30 animate-pulse"
            style={{ borderRadius: '50%' }}
          ></div>
          <div 
            className="absolute border border-blue-400/20 animate-pulse"
            style={{ 
              borderRadius: '50%',
              top: '12.5%',
              left: '12.5%',
              right: '12.5%',
              bottom: '12.5%',
              animationDelay: '0.5s'
            }}
          ></div>
          <div 
            className="absolute border border-blue-400/15 animate-pulse"
            style={{ 
              borderRadius: '50%',
              top: '25%',
              left: '25%',
              right: '25%',
              bottom: '25%',
              animationDelay: '1s'
            }}
          ></div>
          <div 
            className="absolute border border-blue-400/10 animate-pulse"
            style={{ 
              borderRadius: '50%',
              top: '37.5%',
              left: '37.5%',
              right: '37.5%',
              bottom: '37.5%',
              animationDelay: '1.5s'
            }}
          ></div>
          
          {/* Radar Sweep Animation */}
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{ borderRadius: '50%' }}
          >
            <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent transform -translate-x-1/2 -translate-y-1/2 origin-left animate-spin opacity-60"></div>
          </div>
          
          {/* Radiating Pulse Effect */}
          <div 
            className="absolute inset-0 animate-ping opacity-20"
            style={{ 
              borderRadius: '50%',
              border: '2px solid rgb(34 197 94)',
              animationDuration: '3s'
            }}
          ></div>
        </div>

        {/* Center Device (Current User) */}
        <div 
          className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: centerX, top: centerY }}
        >
          <div className="relative">
            <div className={`rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-4 border-white ${
              isConnected ? 'ring-4 ring-emerald-200' : ''
            }`}
            style={{ 
              width: radarSize >= 800 ? '80px' : radarSize >= 600 ? '64px' : '48px',
              height: radarSize >= 800 ? '80px' : radarSize >= 600 ? '64px' : '48px'
            }}>
              {getDeviceIconComponent(currentDeviceType, true)}
            </div>
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
              <div className="text-sm font-semibold text-white whitespace-nowrap">You</div>
              <div className="text-xs text-white/70 truncate max-w-20">{currentDeviceName}</div>
            </div>
          </div>
        </div>

        {/* Other Devices */}
        {animatedDevices.map((device, index) => {
          const position = getDevicePosition(index, animatedDevices.length);
          const isSelected = selectedDevice?.id === device.id;
          
          return (
            <div
              key={device.id}
              className={`absolute z-10 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out cursor-pointer hover:scale-110 ${
                isSelected ? 'scale-110 z-30' : ''
              }`}
              style={{
                left: centerX + position.x,
                top: centerY + position.y,
                animationDelay: `${index * 100}ms`
              }}
              onClick={() => onDeviceSelect(device)}
            >
              <div className="relative">
                <div className={`rounded-full ${getDeviceColor(device)} flex items-center justify-center shadow-lg border-4 border-white transition-all duration-200 ${
                  isSelected ? 'ring-4 ring-blue-200 shadow-xl' : 'hover:shadow-xl'
                }`}
                style={{ 
                  width: radarSize >= 800 ? '64px' : radarSize >= 600 ? '48px' : '36px',
                  height: radarSize >= 800 ? '64px' : radarSize >= 600 ? '48px' : '36px'
                }}>
                  {getDeviceIconComponent(device.type)}
                </div>
                
                {/* Device Status Indicator */}
                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  device.roomId ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                
                {/* Device Info */}
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="text-xs font-medium text-white whitespace-nowrap max-w-20 truncate">{device.name}</div>
                  <div className="text-xs text-white/60">{device.type}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Radar Stats */}
      <div className="text-center text-white/80">
        <div className="text-sm">
          {devices.length} device{devices.length !== 1 ? 's' : ''} nearby
        </div>
      </div>
    </div>
  );
}
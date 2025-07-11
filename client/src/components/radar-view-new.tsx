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
    
    // Distribute devices evenly around the circle, starting from the top
    const baseAngle = (2 * Math.PI * index) / total;
    const angle = baseAngle - Math.PI / 2; // Start from top (12 o'clock position)
    
    // Adjust radius based on radar size - keep devices well within bounds
    const margin = radarSize >= 800 ? 120 : radarSize >= 600 ? 100 : 60;
    const maxRadius = (radarSize / 2) - margin;
    const baseRadius = radarSize >= 800 ? 220 : radarSize >= 600 ? 180 : 80;
    const radius = Math.min(maxRadius, baseRadius + total * 15);
    
    // Calculate position using trigonometry
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    console.log(`Device ${index}/${total}: baseAngle=${baseAngle.toFixed(2)}, angle=${angle.toFixed(2)}, radius=${radius}, x=${x.toFixed(1)}, y=${y.toFixed(1)}`);
    
    return { x, y };
  }

  function getDeviceColor(device: Device) {
    if (device.roomId) {
      return 'bg-amber-500'; // Remote devices
    }
    return 'bg-blue-500'; // Local devices
  }

  // Much larger radar size - responsive and contained
  const radarSize = windowWidth >= 1024 ? 800 : windowWidth >= 768 ? 600 : Math.min(windowWidth - 40, 320);
  const centerX = radarSize / 2;
  const centerY = radarSize / 2;

  return (
    <div className="flex flex-col items-center space-y-6 w-full">
      {/* Radar Display */}
      <div className="relative mx-auto" style={{ width: radarSize, height: radarSize, maxWidth: '100%' }}>
        {/* Radar Background - True Circle */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-slate-700 via-blue-700 to-slate-700 shadow-2xl border-2 border-blue-400/50 dark:from-gray-700 dark:via-blue-600 dark:to-gray-700 transition-all duration-500 hover:shadow-3xl"
          style={{ borderRadius: '50%' }}
        >
          {/* Static Radar Rings with Better Contrast */}
          <div 
            className="absolute inset-0 border-2 border-blue-300/60"
            style={{ borderRadius: '50%' }}
          ></div>
          <div 
            className="absolute border-2 border-blue-300/50"
            style={{ 
              borderRadius: '50%',
              top: '12.5%',
              left: '12.5%',
              right: '12.5%',
              bottom: '12.5%'
            }}
          ></div>
          <div 
            className="absolute border-2 border-blue-300/40"
            style={{ 
              borderRadius: '50%',
              top: '25%',
              left: '25%',
              right: '25%',
              bottom: '25%'
            }}
          ></div>
          <div 
            className="absolute border-2 border-blue-300/30"
            style={{ 
              borderRadius: '50%',
              top: '37.5%',
              left: '37.5%',
              right: '37.5%',
              bottom: '37.5%'
            }}
          ></div>
          
          {/* Radiating Pulse Effects - Multiple Circles */}
          <div 
            className="absolute inset-0 animate-ping opacity-30"
            style={{ 
              borderRadius: '50%',
              border: '2px solid rgb(59 130 246)',
              animationDuration: '3s'
            }}
          ></div>
          <div 
            className="absolute animate-ping opacity-20"
            style={{ 
              borderRadius: '50%',
              border: '2px solid rgb(34 197 94)',
              animationDuration: '4s',
              animationDelay: '0.5s',
              top: '10%',
              left: '10%',
              right: '10%',
              bottom: '10%'
            }}
          ></div>
          <div 
            className="absolute animate-ping opacity-15"
            style={{ 
              borderRadius: '50%',
              border: '2px solid rgb(168 85 247)',
              animationDuration: '5s',
              animationDelay: '1s',
              top: '20%',
              left: '20%',
              right: '20%',
              bottom: '20%'
            }}
          ></div>
          <div 
            className="absolute animate-ping opacity-10"
            style={{ 
              borderRadius: '50%',
              border: '2px solid rgb(236 72 153)',
              animationDuration: '6s',
              animationDelay: '1.5s',
              top: '30%',
              left: '30%',
              right: '30%',
              bottom: '30%'
            }}
          ></div>
        </div>

        {/* Center Device (Current User) */}
        <div 
          className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 animate-scaleIn"
          style={{ left: centerX, top: centerY }}
        >
          <div className="relative">
            <div className={`rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-4 border-white transition-all duration-300 ${
              isConnected ? 'ring-4 ring-emerald-200 animate-glow' : ''
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

        {/* Connection Line to Selected Device */}
        {selectedDevice && animatedDevices.find(d => d.id === selectedDevice.id) && (() => {
          const selectedIndex = animatedDevices.findIndex(d => d.id === selectedDevice.id);
          const position = getDevicePosition(selectedIndex, animatedDevices.length);
          
          // Calculate actual device position on screen
          const deviceX = centerX + position.x;
          const deviceY = centerY + position.y;
          
          // Calculate angle for proper line direction
          const angle = Math.atan2(position.y, position.x);
          const distance = Math.sqrt(position.x ** 2 + position.y ** 2);
          
          console.log('Connection calculation:', {
            selectedIndex, totalDevices: animatedDevices.length,
            'position.x': position.x, 'position.y': position.y,
            deviceX, deviceY, angle: angle.toFixed(2), distance: distance.toFixed(1)
          });
          
          return (
            <div className="absolute inset-0 pointer-events-none z-5">
              <svg 
                width={radarSize} 
                height={radarSize} 
                className="absolute inset-0"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={deviceX}
                  y2={deviceY}
                  stroke="url(#connectionGradient)"
                  strokeWidth="4"
                  strokeDasharray="8,4"
                  className="animate-pulse"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))',
                    animationDuration: '2s'
                  }}
                />
                {/* Static dots along the line */}
                {Array.from({ length: 6 }, (_, i) => {
                  const t = (i + 1) / 7;
                  const dotX = centerX + (deviceX - centerX) * t;
                  const dotY = centerY + (deviceY - centerY) * t;
                  return (
                    <circle
                      key={i}
                      cx={dotX}
                      cy={dotY}
                      r="2"
                      fill="rgb(34, 197, 94)"
                      opacity="0.8"
                    />
                  );
                })}
              </svg>
            </div>
          );
        })()}

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
                opacity: 0,
                animation: `fadeInPlace 0.6s ease-out ${index * 100}ms forwards`
              }}
              onClick={() => onDeviceSelect(device)}
            >
              <div className="relative">
                <div className={`rounded-full ${getDeviceColor(device)} flex items-center justify-center shadow-lg border-4 border-white transition-all duration-300 hover:shadow-xl ${
                  isSelected ? 'ring-4 ring-blue-200 animate-glow' : ''
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
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
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 768);

  useEffect(() => {
    // Animate devices appearing
    const timer = setTimeout(() => {
      setAnimatedDevices(devices);
    }, 100);
    return () => clearTimeout(timer);
  }, [devices]);

  useEffect(() => {
    // Update window dimensions on resize
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function getDeviceIconComponent(type: string, isCenter = false) {
    // Larger icon sizes for bigger radar
    const size = isCenter ? (radarSize >= 1000 ? 96 : radarSize >= 800 ? 80 : radarSize >= 600 ? 64 : 48) : (radarSize >= 1000 ? 64 : radarSize >= 800 ? 56 : radarSize >= 600 ? 48 : 36);
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
    const margin = radarSize >= 1000 ? 180 : radarSize >= 800 ? 160 : radarSize >= 600 ? 140 : radarSize >= 450 ? 120 : 100;
    const maxRadius = (radarSize / 2) - margin;
    const baseRadius = radarSize >= 1000 ? 350 : radarSize >= 800 ? 300 : radarSize >= 600 ? 240 : radarSize >= 450 ? 180 : 120;
    const radius = Math.min(maxRadius, baseRadius + total * 10);
    
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

  // Maximize radar size based on available screen space
  const containerPadding = 16; // Minimal padding since we have overlay text
  const headerFooterSpace = 180; // Reduced space for header and other UI
  const maxWidthSize = windowWidth - containerPadding;
  const maxHeightSize = windowHeight - headerFooterSpace;
  const maxRadarSize = Math.min(maxWidthSize, maxHeightSize);
  
  // Even larger base sizes to use more screen space
  const baseRadarSize = windowWidth >= 1440 ? 1000 : windowWidth >= 1024 ? 750 : windowWidth >= 768 ? 550 : 400;
  const radarSize = Math.max(400, Math.min(baseRadarSize, maxRadarSize)); // Minimum 400px, maximum viewport-constrained
  const centerX = radarSize / 2;
  const centerY = radarSize / 2;

  return (
    <div className="flex flex-col items-center space-y-6 w-full min-h-0">
      {/* Radar Container - Maximized Wrapper with Shadow Space */}
      <div 
        className="w-full flex justify-center items-center overflow-visible p-8 sm:p-12"
        style={{ 
          maxWidth: '100vw',
          maxHeight: `${windowHeight - 150}px`
        }}
      >
        {/* Radar Display - Perfect Square Container with CSS Grid */}
        <div 
          className="relative grid place-items-center overflow-hidden flex-shrink-0"
          style={{ 
            width: `${radarSize}px`, 
            height: `${radarSize}px`, 
            aspectRatio: '1/1',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr'
          }}
        >
        {/* Radar Background - Perfect Circle */}
        <div 
          className="col-start-1 row-start-1 bg-gradient-to-br from-slate-700 via-blue-700 to-slate-700 shadow-2xl border-2 border-blue-400/50 dark:from-gray-700 dark:via-blue-600 dark:to-gray-700"
          style={{ 
            borderRadius: '50%',
            width: `${radarSize}px`,
            height: `${radarSize}px`,
            aspectRatio: '1/1',
            position: 'relative'
          }}
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

        {/* Connection Line to Selected Device */}
        {selectedDevice && animatedDevices.find(d => d.id === selectedDevice.id) && (() => {
          const selectedIndex = animatedDevices.findIndex(d => d.id === selectedDevice.id);
          const position = getDevicePosition(selectedIndex, animatedDevices.length);
          const lineLength = Math.sqrt(position.x * position.x + position.y * position.y);
          const angle = Math.atan2(position.y, position.x) * 180 / Math.PI;
          
          return (
            <>
              {/* Main connection line */}
              <div
                className="absolute z-5 bg-gradient-to-r from-emerald-400 to-blue-400 opacity-70 animate-pulse"
                style={{
                  left: centerX,
                  top: centerY - 1,
                  width: lineLength,
                  height: '3px',
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: '0 50%',
                  borderRadius: '1px',
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
                }}
              />
              {/* Animated connection pulse */}
              <div
                className="absolute z-5 bg-white opacity-90 animate-ping"
                style={{
                  left: centerX,
                  top: centerY - 0.5,
                  width: lineLength,
                  height: '1px',
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: '0 50%',
                  animationDuration: '2s'
                }}
              />
            </>
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
import { useState, useEffect } from "react";
import { Smartphone, Monitor, Tablet, Wifi, Signal } from "lucide-react";
import { getDeviceIcon } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    // Animate devices appearing
    const timer = setTimeout(() => {
      setAnimatedDevices(devices);
    }, 100);
    return () => clearTimeout(timer);
  }, [devices]);

  function getDeviceIconComponent(type: string, isCenter = false) {
    // Responsive icon sizes
    const size = isCenter ? (radarSize >= 480 ? 48 : radarSize >= 360 ? 36 : 32) : (radarSize >= 480 ? 32 : radarSize >= 360 ? 28 : 24);
    const iconProps = { size, className: "text-white" };
    
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
    const margin = radarSize >= 480 ? 80 : radarSize >= 360 ? 60 : 50;
    const maxRadius = (radarSize / 2) - margin;
    const baseRadius = radarSize >= 480 ? 120 : radarSize >= 360 ? 90 : 60;
    const radius = Math.min(maxRadius, baseRadius + total * 8);
    
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

  // Responsive radar size - larger on desktop
  const radarSize = window.innerWidth >= 1024 ? 480 : window.innerWidth >= 768 ? 360 : 280;
  const centerX = radarSize / 2;
  const centerY = radarSize / 2;

  return (
    <Card className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto">
      <CardContent className="p-3 sm:p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Device Radar</h3>
          <p className="text-sm text-slate-600">
            {devices.length} device{devices.length !== 1 ? 's' : ''} nearby
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          {/* Radar Container */}
          <div 
            className="relative bg-slate-50 rounded-full border-2 border-slate-200"
            style={{ width: radarSize, height: radarSize }}
          >
            {/* Radar Rings */}
            <div className="absolute inset-8 rounded-full border border-blue-300 opacity-40" />
            <div className="absolute inset-16 rounded-full border border-blue-300 opacity-30" />
            <div className="absolute inset-24 rounded-full border border-blue-300 opacity-20" />
            <div className="absolute inset-32 rounded-full border border-blue-300 opacity-10" />
            
            {/* Center Device (Current User) */}
            <div 
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: centerX, top: centerY }}
            >
              <div className="relative">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-2 sm:border-4 border-white center-device ${
                  isConnected ? 'ring-2 sm:ring-4 ring-emerald-200' : ''
                }`}>
                  <div className="text-xl sm:text-2xl">{getDeviceIcon(currentDeviceName).icon}</div>
                </div>
                <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="text-xs font-semibold text-slate-900 whitespace-nowrap">You</div>
                  <div className="text-xs text-slate-600 truncate max-w-12 sm:max-w-16">{currentDeviceName}</div>
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
                  className={`absolute z-10 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out cursor-pointer hover:scale-110 device-icon ${
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
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${getDeviceColor(device)} flex items-center justify-center shadow-lg border-2 border-white transition-all duration-200 ${
                      isSelected ? 'ring-2 sm:ring-4 ring-blue-200 shadow-xl' : 'hover:shadow-xl'
                    }`}>
                      <div className="text-lg sm:text-xl">{getDeviceIcon(device.name).icon}</div>
                    </div>
                    
                    {/* Device Status Indicator */}
                    <div className={`absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white ${
                      device.roomId ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    
                    {/* Device Info */}
                    <div className="absolute -bottom-8 sm:-bottom-10 left-1/2 transform -translate-x-1/2 text-center">
                      <div className="text-xs font-medium text-slate-900 whitespace-nowrap max-w-16 sm:max-w-20 truncate text-center">
                        {device.name}
                      </div>
                      <Badge 
                        variant={device.roomId ? 'secondary' : 'default'}
                        className="text-xs mt-1 hidden sm:inline-flex"
                      >
                        {device.roomId ? 'Remote' : 'Local'}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Connection Lines (when device is selected) */}
            {selectedDevice && (
              <svg 
                className="absolute inset-0 pointer-events-none"
                style={{ width: radarSize, height: radarSize }}
              >
                {(() => {
                  const deviceIndex = animatedDevices.findIndex(d => d.id === selectedDevice.id);
                  if (deviceIndex === -1) return null;
                  
                  const position = getDevicePosition(deviceIndex, animatedDevices.length);
                  return (
                    <line
                      x1={centerX}
                      y1={centerY}
                      x2={centerX + position.x}
                      y2={centerY + position.y}
                      stroke="rgb(59, 130, 246)"
                      strokeWidth="2"
                      className="connection-line"
                    />
                  );
                })()}
              </svg>
            )}

            {/* Empty State */}
            {devices.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Wifi className="mx-auto mb-2 text-slate-400" size={32} />
                  <p className="text-sm text-slate-500">No devices found</p>
                  <p className="text-xs text-slate-400">Make sure devices are connected</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-6 flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm text-slate-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <Signal className="text-slate-400" size={16} />
        </div>

        {/* Selected Device Info */}
        {selectedDevice && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">{selectedDevice.name}</h4>
                <p className="text-sm text-slate-600">
                  {selectedDevice.type.charAt(0).toUpperCase() + selectedDevice.type.slice(1)} • {selectedDevice.roomId ? `Room: ${selectedDevice.roomId}` : 'Same Network'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${selectedDevice.roomId ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <Badge variant={selectedDevice.roomId ? 'secondary' : 'default'}>
                  {selectedDevice.roomId ? 'Remote' : 'Online'}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
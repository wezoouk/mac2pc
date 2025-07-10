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
    const size = isCenter ? 32 : 24;
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
    const radius = Math.min(120, 80 + total * 8); // Adaptive radius based on device count
    
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

  const radarSize = 320; // Fixed radar size
  const centerX = radarSize / 2;
  const centerY = radarSize / 2;

  return (
    <div className="w-full">
      <div className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Device Radar</h3>
          <p className="text-slate-600 mt-1">
            {devices.length} device{devices.length !== 1 ? 's' : ''} detected nearby
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          {/* Radar Container */}
          <div 
            className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-full border-4 border-slate-200 shadow-2xl"
            style={{ width: radarSize, height: radarSize }}
          >
            {/* Radar Rings */}
            <div className="radar-ring absolute inset-4 rounded-full border border-slate-200 opacity-50" />
            <div className="radar-ring absolute inset-8 rounded-full border border-slate-200 opacity-30" />
            <div className="radar-ring absolute inset-12 rounded-full border border-slate-200 opacity-20" />
            
            {/* Center Device (Current User) */}
            <div 
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: centerX, top: centerY }}
            >
              <div className="relative">
                <div className={`w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-4 border-white center-device ${
                  isConnected ? 'ring-4 ring-emerald-200' : ''
                }`}>
                  <div className="text-2xl">{getDeviceIcon(currentDeviceName).icon}</div>
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="text-xs font-semibold text-slate-900 whitespace-nowrap">You</div>
                  <div className="text-xs text-slate-600 truncate max-w-16">{currentDeviceName}</div>
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
                    <div className={`w-12 h-12 rounded-full ${getDeviceColor(device)} flex items-center justify-center shadow-lg border-2 border-white transition-all duration-200 ${
                      isSelected ? 'ring-4 ring-blue-200 shadow-xl' : 'hover:shadow-xl'
                    }`}>
                      <div className="text-xl">{getDeviceIcon(device.name).icon}</div>
                    </div>
                    
                    {/* Device Status Indicator */}
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      device.roomId ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    
                    {/* Device Info */}
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-center">
                      <div className="text-xs font-medium text-slate-900 whitespace-nowrap max-w-20 truncate flex items-center justify-center gap-1">
                        <span className="text-xs">{getDeviceIcon(device.name).icon}</span>
                        {device.name}
                      </div>
                      <Badge 
                        variant={device.roomId ? 'secondary' : 'default'}
                        className="text-xs mt-1"
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
      </div>
    </div>
  );
}
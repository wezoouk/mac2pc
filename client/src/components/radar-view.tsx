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

  const radarSize = 400; // Larger radar size for hero
  const centerX = radarSize / 2;
  const centerY = radarSize / 2;

  return (
    <div className="w-full">
      <div className="p-6">
        <div className="text-center mb-8">
          <p className="text-slate-600 text-lg">
            {devices.length === 0 ? 'Scanning for devices...' : 
             devices.length === 1 ? '1 device in range' : 
             `${devices.length} devices in range`}
          </p>
          {selectedDevice && (
            <div className="mt-2 inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700">Connected to {selectedDevice.name}</span>
            </div>
          )}
        </div>

        <div className="relative flex items-center justify-center">
          {/* Radar Container */}
          <div 
            className="relative bg-gradient-to-br from-slate-50/80 to-slate-100/80 rounded-full border-4 border-white/40 shadow-2xl backdrop-blur-sm"
            style={{ width: radarSize, height: radarSize }}
          >
            {/* Radar Rings */}
            <div className="radar-ring absolute inset-4 rounded-full border-2 border-gradient-to-r from-purple-300/50 to-blue-300/50 opacity-60" />
            <div className="radar-ring absolute inset-8 rounded-full border-2 border-gradient-to-r from-blue-300/40 to-indigo-300/40 opacity-40" />
            <div className="radar-ring absolute inset-12 rounded-full border-2 border-gradient-to-r from-indigo-300/30 to-purple-300/30 opacity-30" />
            <div className="radar-ring absolute inset-16 rounded-full border border-slate-200/20 opacity-20" />
            
            {/* Center Device (Current User) */}
            <div 
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: centerX, top: centerY }}
            >
              <div className="relative">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl border-4 border-white center-device ${
                  isConnected ? 'ring-4 ring-emerald-200' : ''
                }`}>
                  <div className="text-3xl">{getDeviceIcon(currentDeviceName).icon}</div>
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
                    <div className={`w-14 h-14 rounded-full ${getDeviceColor(device)} flex items-center justify-center shadow-xl border-3 border-white transition-all duration-200 ${
                      isSelected ? 'ring-4 ring-blue-200 shadow-2xl scale-110' : 'hover:shadow-2xl hover:scale-105'
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
import { RefreshCw, Smartphone, Monitor, Tablet } from "lucide-react";
import { getDeviceIcon } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Device } from "@shared/schema";

interface DeviceDiscoveryProps {
  devices: Device[];
  selectedDevice: Device | null;
  onDeviceSelect: (device: Device) => void;
  onRefresh: () => void;
}

export function DeviceDiscovery({
  devices,
  selectedDevice,
  onDeviceSelect,
  onRefresh
}: DeviceDiscoveryProps) {
  function getDeviceIconComponent(type: string) {
    switch (type) {
      case 'mobile':
        return <Smartphone className="text-blue-600" size={20} />;
      case 'tablet':
        return <Tablet className="text-amber-600" size={20} />;
      default:
        return <Monitor className="text-purple-600" size={20} />;
    }
  }

  function getDeviceTypeLabel(device: Device) {
    const typeLabel = device.type.charAt(0).toUpperCase() + device.type.slice(1);
    if (device.roomId) {
      return `${typeLabel} • Room: ${device.roomId}`;
    }
    return `${typeLabel} • Same Network`;
  }

  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-xl font-semibold">Available Devices</CardTitle>
          <p className="text-sm text-slate-600 mt-1">Devices on your network and room</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw size={16} />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {devices.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <RefreshCw className="mx-auto mb-3" size={32} />
            <p>No devices found</p>
            <p className="text-sm">Make sure devices are on the same network</p>
          </div>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              onClick={() => onDeviceSelect(device)}
              className={`flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer ${
                selectedDevice?.id === device.id
                  ? 'bg-blue-50 border-2 border-blue-200'
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <div className="text-lg">{getDeviceIcon(device.name).icon}</div>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <span className="text-xs opacity-75">{getDeviceIcon(device.name).description}</span>
                    {device.name}
                  </h4>
                  <p className="text-sm text-slate-600">{getDeviceTypeLabel(device)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  device.roomId ? 'bg-amber-500' : 'bg-emerald-500'
                }`}></div>
                <Badge variant={device.roomId ? 'secondary' : 'default'}>
                  {device.roomId ? 'Remote' : 'Online'}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

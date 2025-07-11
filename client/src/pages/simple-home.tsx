import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { TransferModal } from "@/components/transfer-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Share2, Upload, Download, Smartphone, Monitor, Tablet, Wifi } from "lucide-react";
import { nanoid } from "nanoid";
import { generateRandomDeviceName } from '@/lib/utils';
import { NotificationManager } from '@/lib/notifications';
import type { Device, Transfer } from "@shared/schema";

export default function SimpleHome() {
  const [deviceId] = useState(() => nanoid());
  const [deviceName, setDeviceName] = useState(() => generateRandomDeviceName());
  const [devices, setDevices] = useState<Device[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [incomingTransfer, setIncomingTransfer] = useState<any>(null);
  const [fileQueue, setFileQueue] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  // Initialize notification system
  useEffect(() => {
    NotificationManager.initialize();
  }, []);

  function getDeviceType() {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  function getDeviceIcon(type: string) {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-8 h-8" />;
      case 'tablet':
        return <Tablet className="w-8 h-8" />;
      default:
        return <Monitor className="w-8 h-8" />;
    }
  }

  async function fetchDevices() {
    try {
      const response = await fetch('/api/devices/network/local');
      if (response.ok) {
        const allDevices = await response.json();
        const filteredDevices = allDevices.filter((d: Device) => d.id !== deviceId);
        setDevices(filteredDevices);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  }

  function handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'device-list-update':
        setTimeout(() => fetchDevices(), 100);
        break;
      case 'direct-message':
        if (message.to === deviceId) {
          handleMessageReceived(message.message, message.from, message.selfDestructTimer, message.expiresAt);
          
          const senderDevice = devices.find(d => d.id === message.from);
          const senderName = senderDevice?.name || message.fromName || message.from.slice(-6);
          
          NotificationManager.notifyMessage(senderName, message.message, message.selfDestructTimer);
          
          toast({
            title: "Message received",
            description: `From ${senderName}: ${message.message}`,
            duration: 5000,
          });
        }
        break;
      case 'direct-file':
        if (message.to === deviceId) {
          const senderDevice = devices.find(d => d.id === message.from);
          const senderName = senderDevice?.name || message.fromName || message.from.slice(-6);
          
          const fileTransfer = {
            type: 'file',
            fileName: message.fileName,
            fileSize: message.fileSize,
            fileData: message.fileData,
            from: message.from,
            fromName: senderName
          };
          
          setFileQueue(prev => [...prev, fileTransfer]);
          NotificationManager.notifyFile(senderName, message.fileName, message.fileSize);
          
          toast({
            title: "File transfer request",
            description: `${message.fileName} from ${senderName}`,
            duration: 5000,
          });
        }
        break;
    }
  }

  function handleMessageReceived(message: string, from: string, selfDestructTimer?: number, expiresAt?: string) {
    const senderDevice = devices.find(d => d.id === from);
    const senderName = senderDevice?.name || from.slice(-6);
    
    const expiration = expiresAt ? new Date(expiresAt) : null;
    
    const transfer = {
      id: Date.now() + Math.random(),
      fromDeviceId: from,
      toDeviceId: deviceId,
      messageText: message,
      fileName: null,
      fileSize: null,
      status: 'completed' as const,
      progress: 100,
      expiresAt: expiration,
      isExpired: false,
      selfDestructTimer: selfDestructTimer || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setTransfers(prev => [transfer, ...prev]);
  }

  function handleFileReceived(transfer: any) {
    const a = document.createElement('a');
    a.href = transfer.fileData;
    a.download = transfer.fileName;
    a.click();
    
    const newTransfer = {
      id: Date.now() + Math.random(),
      fromDeviceId: transfer.from,
      toDeviceId: deviceId,
      fileName: transfer.fileName,
      fileSize: transfer.fileSize,
      status: 'completed' as const,
      progress: 100,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setTransfers(prev => [newTransfer, ...prev]);
  }

  const { isConnected, sendMessage } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      sendMessage({
        type: 'device-update',
        deviceId,
        data: {
          id: deviceId,
          name: deviceName,
          type: getDeviceType(),
          network: 'local',
        }
      });
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
    }
  });

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && devices.length > 0) {
      handleFileSend(files, devices[0]); // Send to first available device
    }
  }

  function handleFileSend(files: File[], targetDevice: Device) {
    files.forEach(async (file) => {
      try {
        const reader = new FileReader();
        
        reader.onload = () => {
          const fileData = {
            type: 'direct-file',
            to: targetDevice.id,
            from: deviceId,
            fromName: deviceName,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData: reader.result as string,
            timestamp: new Date().toISOString()
          };
          
          sendMessage(fileData);
        };
        
        reader.readAsDataURL(file);
        
        const transfer = {
          id: Date.now() + Math.random(),
          fromDeviceId: deviceId,
          toDeviceId: targetDevice.id,
          fileName: file.name,
          fileSize: file.size,
          messageText: null,
          status: 'completed' as const,
          progress: 100,
          expiresAt: null,
          isExpired: false,
          selfDestructTimer: null,
          createdAt: new Date(),
        };
        
        setTransfers(prev => [transfer, ...prev]);
      } catch (error) {
        console.error('File send error:', error);
      }
    });
  }

  function handleTransferAccept() {
    if (incomingTransfer && incomingTransfer.type === 'file') {
      handleFileReceived({
        fileName: incomingTransfer.fileName,
        fileSize: incomingTransfer.fileSize,
        fileData: incomingTransfer.fileData,
        from: incomingTransfer.from
      });
    }
    setIncomingTransfer(null);
  }

  function handleTransferDecline() {
    setIncomingTransfer(null);
  }

  // Process file queue
  useEffect(() => {
    if (!incomingTransfer && fileQueue.length > 0) {
      const nextFile = fileQueue[0];
      setIncomingTransfer(nextFile);
      setFileQueue(prev => prev.slice(1));
    }
  }, [incomingTransfer, fileQueue]);

  // Cleanup expired transfers
  useEffect(() => {
    const cleanup = () => {
      setTransfers(prev => prev.filter(transfer => {
        if (!transfer.expiresAt) return true;
        return new Date() < new Date(transfer.expiresAt);
      }));
    };

    const interval = setInterval(cleanup, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchDevices();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Share2 className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">ShareLink</h1>
              <p className="text-sm text-gray-500">Secure file sharing</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          
          {devices.length === 0 ? (
            // No devices state
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Wifi className="w-12 h-12 text-blue-500" />
                </div>
                <h2 className="text-2xl font-medium text-gray-900">
                  Open ShareLink on other devices to send files
                </h2>
                <p className="text-gray-600">
                  Pair devices to be discoverable on other networks
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                    <Wifi className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                    <span>You are known as:</span>
                    <Badge variant="secondary" className="font-medium">
                      {deviceName}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    You can be discovered by everyone on the network
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Devices available state
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-medium text-gray-900">
                  Send files to nearby devices
                </h2>
                <p className="text-gray-600">
                  Drop files here or click on a device to send
                </p>
              </div>

              {/* Radar View */}
              <div className="relative">
                <div
                  className={`relative w-80 h-80 mx-auto rounded-full border-4 transition-all duration-300 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                      : 'border-gray-200 bg-white shadow-sm'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Radar circles with subtle animation */}
                  <div className="absolute inset-4 rounded-full border border-gray-100 animate-pulse"></div>
                  <div className="absolute inset-8 rounded-full border border-gray-100 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute inset-12 rounded-full border border-gray-100 animate-pulse" style={{animationDelay: '1s'}}></div>
                  
                  {/* Center device (current device) */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <div className="text-white">
                      {getDeviceIcon(getDeviceType())}
                    </div>
                  </div>
                  
                  {/* Center device label */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-8 text-center">
                    <p className="text-sm font-medium text-gray-900">You</p>
                    <p className="text-xs text-gray-500">{deviceName}</p>
                  </div>
                  
                  {/* Other devices positioned around the circle */}
                  {devices.map((device, index) => {
                    const angle = (index * 360) / devices.length;
                    const radius = 120; // Distance from center
                    const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
                    const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
                    
                    return (
                      <div
                        key={device.id}
                        className="absolute group"
                        style={{
                          left: `calc(50% + ${x}px - 24px)`,
                          top: `calc(50% + ${y}px - 24px)`,
                        }}
                      >
                        <div
                          className="w-12 h-12 bg-white rounded-full border-2 border-green-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => {
                            toast({
                              title: "Device selected",
                              description: `Selected ${device.name}`,
                              duration: 2000,
                            });
                          }}
                        >
                          <div className="text-green-600 scale-75">
                            {getDeviceIcon(device.type)}
                          </div>
                        </div>
                        
                        {/* Device name tooltip */}
                        <div className="absolute left-1/2 transform -translate-x-1/2 -top-12 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {device.name}
                          <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Drop zone overlay */}
                  <div className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none">
                    {isDragging && (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-blue-700">
                          Drop to send
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Radar instructions */}
                <div className="text-center mt-6 space-y-2">
                  <p className="text-sm text-gray-600">
                    Drop files on the radar to send to all devices
                  </p>
                  <p className="text-xs text-gray-500">
                    Click on a device to select it specifically
                  </p>
                </div>
              </div>


            </div>
          )}

          {/* Recent transfers */}
          {transfers.length > 0 && (
            <div className="mt-12 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Recent transfers</h3>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {transfers.slice(0, 5).map((transfer) => (
                  <div key={transfer.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-400">
                        {transfer.fileName ? <Download className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transfer.fileName || 'Message'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transfer.fromDeviceId === deviceId ? 'Sent' : 'Received'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(transfer.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Transfer Modal */}
      <TransferModal
        transfer={incomingTransfer}
        onAccept={handleTransferAccept}
        onDecline={handleTransferDecline}
        queueCount={fileQueue.length}
      />
    </div>
  );
}
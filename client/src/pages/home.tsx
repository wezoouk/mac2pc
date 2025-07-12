import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useToast } from "@/hooks/use-toast";
import { DeviceDiscovery } from "@/components/device-discovery";
import { RadarView } from "@/components/radar-view";
import { FileTransfer } from "@/components/file-transfer";
import { MessagePanel } from "@/components/message-panel";
import { TransferHistory } from "@/components/transfer-history";
import { TransferModal } from "@/components/transfer-modal";
import { ProgressModal } from "@/components/progress-modal";
import { BannerAd, DynamicAds } from "@/components/google-ads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Share2, Laptop, Wifi, Signal, Lock, Radar, TestTube, DollarSign, Eye, EyeOff, RefreshCw } from "lucide-react";
import { nanoid } from "nanoid";
import { generateRandomDeviceName } from '@/lib/utils';
import { NotificationManager } from '@/lib/notifications';
import type { Device, Transfer } from "@shared/schema";

export default function Home() {
  const [deviceId] = useState(() => nanoid());
  const [deviceName, setDeviceName] = useState(() => generateRandomDeviceName());
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [incomingTransfer, setIncomingTransfer] = useState<any>(null);
  const [activeTransfer, setActiveTransfer] = useState<any>(null);
  const [transferQueue, setTransferQueue] = useState<File[]>([]);
  const [fileQueue, setFileQueue] = useState<any[]>([]);
  const [testMode, setTestMode] = useState(false);
  const { toast } = useToast();

  // Load admin settings from server
  const { data: appSettings } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Initialize notification system
  useEffect(() => {
    NotificationManager.initialize();
  }, []);

  // Listen for admin settings updates
  useEffect(() => {
    const handleAdminMessage = (event: MessageEvent) => {
      if (event.data.type === 'admin-settings-update') {
        const { settings } = event.data;
        if (settings.demoMode !== undefined) {
          setTestMode(settings.demoMode);
        }
        if (settings.adsEnabled !== undefined) {
          setAdsEnabled(settings.adsEnabled);
        }
      }
    };

    window.addEventListener('message', handleAdminMessage);
    return () => window.removeEventListener('message', handleAdminMessage);
  }, []);

  // Sync app settings from server
  useEffect(() => {
    if (appSettings) {
      setTestMode(appSettings.demoMode || false);
      setAdsEnabled(appSettings.adsEnabled !== undefined ? appSettings.adsEnabled : true);
    }
  }, [appSettings]);

  // Test devices for demo purposes
  const testDevices: Device[] = [
    {
      id: "test-device-1",
      name: "swift-otter-iphone",
      type: "mobile",
      network: "local",
      isOnline: true,
      lastSeen: new Date(),
      roomId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "test-device-2", 
      name: "fuzzy-wombat-macbook",
      type: "desktop",
      network: "local",
      isOnline: true,
      lastSeen: new Date(),
      roomId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "test-device-3",
      name: "sleepy-pangolin-tablet",
      type: "tablet", 
      network: "local",
      isOnline: true,
      lastSeen: new Date(),
      roomId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  function getDeviceType() {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  async function fetchDevices() {
    try {
      console.log('Fetching local network devices');
      const response = await fetch('/api/devices/network/local');
      if (response.ok) {
        const allDevices = await response.json();
        const filteredDevices = allDevices.filter((d: Device) => d.id !== deviceId);
        console.log(`Fetched ${allDevices.length} devices, showing ${filteredDevices.length} after filtering`);
        setDevices(filteredDevices);
      } else {
        console.error('Failed to fetch devices:', response.statusText);
        setDevices([]);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
    }
  }

  function handleWebSocketMessage(message: any) {
    console.log('Received WebSocket message:', message);
    
    switch (message.type) {
      case 'device-list-update':
        if (!currentRoom) {
          setDevices([]);
          setTimeout(() => fetchDevices(), 100);
        }
        break;
      case 'room-joined':
        console.log('Successfully joined room:', message.roomId);
        setCurrentRoom(message.roomId);
        setRoomName("");
        setRoomPassword("");
        break;
      case 'room-left':
        console.log('Successfully left room:', message.roomId);
        setCurrentRoom(null);
        setDevices([]);
        setTimeout(() => fetchDevices(), 100);
        break;
      case 'room-devices':
        if (!testMode) {
          const roomDevices = message.devices.filter((d: Device) => d.id !== deviceId);
          setDevices(roomDevices);
        }
        break;
      case 'direct-message':
        // Handle received message
        if (message.to === deviceId) {
          handleMessageReceived(message.message, message.from, message.selfDestructTimer, message.expiresAt);
          
          // Show toast notification with sound
          const senderDevice = devices.find(d => d.id === message.from);
          const senderName = senderDevice?.name || message.fromName || message.from.slice(-6);
          
          // Play sound notification
          NotificationManager.notifyMessage(senderName, message.message, message.selfDestructTimer);
          
          toast({
            title: "Message received",
            description: `From ${senderName}: ${message.message}`,
            duration: 5000,
          });
        }
        break;
      case 'direct-file':
        // Handle received file - show acceptance modal instead of auto-downloading
        console.log('Client received direct-file message:', {
          fileName: message.fileName,
          fileSize: message.fileSize,
          from: message.from,
          to: message.to,
          targetDeviceId: deviceId
        });
        
        if (message.to === deviceId) {
          console.log('File is for this device, adding to queue');
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
          
          // Add to queue
          setFileQueue(prev => [...prev, fileTransfer]);
          
          // Play sound notification for file
          NotificationManager.notifyFile(senderName, message.fileName, message.fileSize);
          
          // Show toast notification about incoming file
          toast({
            title: "File transfer request",
            description: `${message.fileName} from ${senderName}`,
            duration: 5000,
          });
        } else {
          console.log('File not for this device, ignoring');
        }
        break;
    }
  }

  function handleFileReceived(transfer: any) {
    const a = document.createElement('a');
    a.href = transfer.fileData;
    a.download = transfer.fileName;
    a.click();
    
    const newTransfer = {
      id: Date.now() + Math.random(), // Make ID unique
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

  function handleMessageReceived(message: string, from: string, selfDestructTimer?: number, expiresAt?: string) {
    const senderDevice = devices.find(d => d.id === from);
    const senderName = senderDevice?.name || from.slice(-6);
    
    // Parse expiration date if provided
    const expiration = expiresAt ? new Date(expiresAt) : null;
    
    const transfer = {
      id: Date.now() + Math.random(), // Make ID unique
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

  function handleTransferProgress(progress: any) {
    setActiveTransfer(prev => prev ? { ...prev, progress } : null);
  }

  function handleTransferRequest(request: any) {
    setIncomingTransfer(request);
  }

  const { isConnected, sendMessage } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('WebSocket connected successfully');
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

  const { 
    createOffer, 
    createAnswer, 
    handleOffer, 
    handleAnswer, 
    handleIceCandidate,
    sendFile,
    sendMessage: sendP2PMessage,
    isConnected: isP2PConnected 
  } = useWebRTC({
    onFileReceived: handleFileReceived,
    onMessageReceived: handleMessageReceived,
    onTransferProgress: handleTransferProgress,
    onTransferRequest: handleTransferRequest,
    onSignalingMessage: (message) => {
      sendMessage(message);
    }
  });

  function toggleTestMode() {
    const newTestMode = !testMode;
    setTestMode(newTestMode);
    
    if (newTestMode) {
      setDevices(testDevices);
    } else {
      setDevices([]);
      fetchDevices();
    }
  }

  async function joinRoom() {
    if (!roomName.trim()) return;
    
    sendMessage({
      type: 'join-room',
      roomId: roomName.trim(),
      password: roomPassword.trim() || undefined,
      deviceId,
      data: {
        id: deviceId,
        name: deviceName,
        type: getDeviceType(),
        network: 'local',
      }
    });
  }

  async function leaveRoom() {
    sendMessage({
      type: 'leave-room',
      roomId: currentRoom,
      deviceId
    });
  }

  function handleDeviceSelect(device: Device) {
    setSelectedDevice(device);
  }

  function handleFileSend(files: File[]) {
    if (!selectedDevice || files.length === 0) {
      console.error('No device selected or no files provided');
      return;
    }

    console.log(`Sending ${files.length} files to device:`, selectedDevice.name);

    files.forEach(async (file) => {
      try {
        console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);
        
        // Send all files via WebSocket as base64 (fallback for now since WebRTC isn't ready)
        console.log('Sending file via WebSocket');
        const reader = new FileReader();
        
        reader.onload = () => {
          console.log('File read successfully, sending via WebSocket');
          const fileData = {
            type: 'direct-file',
            to: selectedDevice.id,
            from: deviceId,
            fromName: deviceName,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData: reader.result as string,
            timestamp: new Date().toISOString()
          };
          
          console.log('Sending file data:', { 
            fileName: fileData.fileName, 
            fileSize: fileData.fileSize, 
            to: fileData.to 
          });
          sendMessage(fileData);
        };
        
        reader.onerror = () => {
          console.error('FileReader error:', reader.error);
        };
        
        reader.readAsDataURL(file);
        
        // Add to transfer history with unique ID
        const transfer = {
          id: Date.now() + Math.random(), // Make ID unique for multiple files
          fromDeviceId: deviceId,
          toDeviceId: selectedDevice.id,
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

  function handleMessageSend(message: string, selfDestructTimer?: number) {
    if (!selectedDevice) return;

    // Calculate expiration time if self-destruct timer is set
    let expiresAt = null;
    if (selfDestructTimer && selfDestructTimer > 0) {
      expiresAt = new Date(Date.now() + selfDestructTimer * 1000);
    }

    const messageData = {
      type: 'direct-message',
      to: selectedDevice.id,
      from: deviceId,
      fromName: deviceName,
      message,
      selfDestructTimer,
      expiresAt: expiresAt?.toISOString(),
      timestamp: new Date().toISOString()
    };

    // Send via WebSocket signaling (fallback when WebRTC not available)
    sendMessage(messageData);
    
    // Add to transfer history
    const transfer = {
      id: Date.now() + Math.random(), // Make ID unique
      fromDeviceId: deviceId,
      toDeviceId: selectedDevice.id,
      messageText: message,
      fileName: null,
      fileSize: null,
      status: 'completed' as const,
      progress: 100,
      expiresAt,
      isExpired: false,
      selfDestructTimer,
      createdAt: new Date(),
    };
    
    setTransfers(prev => [transfer, ...prev]);
  }

  function handleTransferAccept() {
    if (incomingTransfer && incomingTransfer.type === 'file') {
      // Download the accepted file
      handleFileReceived({
        fileName: incomingTransfer.fileName,
        fileSize: incomingTransfer.fileSize,
        fileData: incomingTransfer.fileData,
        from: incomingTransfer.from
      });
    }
    setIncomingTransfer(null);
  }

  function handleTransferAcceptAll() {
    // Download current file and all files in queue
    const allFiles = [incomingTransfer, ...fileQueue];
    
    allFiles.forEach(file => {
      if (file && file.type === 'file') {
        handleFileReceived({
          fileName: file.fileName,
          fileSize: file.fileSize,
          fileData: file.fileData,
          from: file.from
        });
      }
    });
    
    // Clear both current transfer and queue
    setIncomingTransfer(null);
    setFileQueue([]);
    
    toast({
      title: "All files downloaded",
      description: `Downloaded ${allFiles.length} files successfully`,
      duration: 3000,
    });
  }

  function handleTransferDecline() {
    if (incomingTransfer && incomingTransfer.type === 'file') {
      toast({
        title: "File declined",
        description: `Declined ${incomingTransfer.fileName}`,
        duration: 3000,
      });
    }
    setIncomingTransfer(null);
  }

  // Process file queue - show next file when no modal is active
  useEffect(() => {
    if (!incomingTransfer && fileQueue.length > 0) {
      console.log(`Processing file queue: ${fileQueue.length} files remaining`);
      const nextFile = fileQueue[0];
      setIncomingTransfer(nextFile);
      setFileQueue(prev => prev.slice(1)); // Remove processed file from queue
    }
  }, [incomingTransfer, fileQueue]);

  // Cleanup expired transfers every 30 seconds
  useEffect(() => {
    const cleanupExpiredTransfers = () => {
      setTransfers(prev => prev.filter(transfer => {
        if (!transfer.expiresAt) return true;
        return new Date() < new Date(transfer.expiresAt);
      }));
    };

    const interval = setInterval(cleanupExpiredTransfers, 30000); // Clean up every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentRoom && !testMode) {
      fetchDevices();
    }
  }, [currentRoom, testMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Share2 className="text-white" size={18} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900">ShareLink</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Secure P2P File Transfer</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-slate-600 hidden sm:inline">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="px-2 sm:px-3"
                onClick={toggleTestMode}
              >
                <TestTube size={16} className={testMode ? 'text-amber-600' : 'text-slate-600'} />
                <span className="hidden sm:inline ml-2">{testMode ? 'Exit Demo' : 'Demo Mode'}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="px-2 sm:px-3"
                onClick={fetchDevices}
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="px-2 sm:px-3"
                onClick={() => setAdsEnabled(!adsEnabled)}
              >
                {adsEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                <span className="hidden sm:inline ml-2">Ads</span>
              </Button>
              
              <Button variant="ghost" size="sm" className="px-2 sm:px-3" onClick={() => window.open('/admin', '_blank')}>
                <Settings size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
        {/* Top Banner Ad */}
        {adsEnabled && (
          <div className="mb-6">
            <DynamicAds position="top-banner" isEnabled={adsEnabled} />
          </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Device Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Your Device</CardTitle>
              <Laptop className="text-blue-600" size={20} />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Device Name</span>
                <span className="text-sm font-medium text-slate-900">{deviceName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Network</span>
                <span className="text-sm font-medium text-slate-900">
                  {currentRoom || 'Local Network'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">ID</span>
                <span className="text-sm font-mono text-slate-900">{deviceId.slice(-6)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Room Join Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Join Room</CardTitle>
              <Wifi className="text-amber-600" size={20} />
            </CardHeader>
            <CardContent className="space-y-3">
              {!currentRoom ? (
                <>
                  <Input
                    placeholder="Enter room name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                  />
                  <Input
                    type="password"
                    placeholder="Room password (optional)"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                  />
                  <Button onClick={joinRoom} className="w-full" disabled={!roomName.trim()}>
                    Join Room
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Current Room</span>
                    <Badge variant="secondary">{currentRoom}</Badge>
                  </div>
                  <Button onClick={leaveRoom} variant="outline" className="w-full">
                    Leave Room
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Network Stats Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Network Stats</CardTitle>
              <Signal className="text-emerald-600" size={20} />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Devices Found</span>
                <span className="text-sm font-medium text-slate-900">{devices.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Connection Type</span>
                <span className="text-sm font-medium text-emerald-600">
                  {isP2PConnected ? 'P2P Direct' : 'Signaling'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Ads</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdsEnabled(!adsEnabled)}
                  className="h-6 p-1"
                >
                  {adsEnabled ? (
                    <Eye size={12} className="text-emerald-600" />
                  ) : (
                    <EyeOff size={12} className="text-slate-400" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content with sidebar layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area (3/4 width) */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="radar" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="radar" className="flex items-center space-x-2">
                  <Radar size={16} />
                  <span>Radar View</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center space-x-2">
                  <Signal size={16} />
                  <span>Device List</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="radar" className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <RadarView
                    devices={devices}
                    selectedDevice={selectedDevice}
                    onDeviceSelect={handleDeviceSelect}
                    currentDeviceId={deviceId}
                    currentDeviceName={deviceName}
                    currentDeviceType={getDeviceType()}
                    isConnected={isConnected}
                  />

                  <div className="space-y-6">
                    <FileTransfer
                      selectedDevice={selectedDevice}
                      onFileSend={handleFileSend}
                    />
                    <MessagePanel
                      selectedDevice={selectedDevice}
                      onMessageSend={handleMessageSend}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="list" className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <DeviceDiscovery
                    devices={devices}
                    selectedDevice={selectedDevice}
                    onDeviceSelect={handleDeviceSelect}
                    onRefresh={fetchDevices}
                  />

                  <div className="space-y-6">
                    <FileTransfer
                      selectedDevice={selectedDevice}
                      onFileSend={handleFileSend}
                    />
                    <MessagePanel
                      selectedDevice={selectedDevice}
                      onMessageSend={handleMessageSend}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar (1/4 width) */}
          <div className="lg:col-span-1">
            {adsEnabled && (
              <div className="sticky top-20">
                <DynamicAds position="sidebar" isEnabled={adsEnabled} />
              </div>
            )}
          </div>
        </div>

        {/* Google Ads Banner */}
        {adsEnabled && (
          <div className="mb-8">
            <DynamicAds position="between-content" isEnabled={adsEnabled} />
          </div>
        )}
        
        {/* Transfer History */}
        <TransferHistory transfers={transfers} currentDeviceId={deviceId} onClear={() => setTransfers([])} />

        {/* Footer Ad */}
        {adsEnabled && (
          <div className="mt-8">
            <DynamicAds position="footer" isEnabled={adsEnabled} />
          </div>
        )}
      </main>

      {/* Modals */}
      <TransferModal
        transfer={incomingTransfer}
        onAccept={handleTransferAccept}
        onDecline={handleTransferDecline}
        onAcceptAll={handleTransferAcceptAll}
        queueCount={fileQueue.length}
      />
      
      <ProgressModal
        transfer={activeTransfer}
        onCancel={() => setActiveTransfer(null)}
      />
    </div>
  );
}
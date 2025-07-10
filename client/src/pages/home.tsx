import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useWebRTC } from "@/hooks/use-webrtc";
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
  const [testMode, setTestMode] = useState(false);

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
    }
  }

  function handleFileReceived(transfer: any) {
    const a = document.createElement('a');
    a.href = transfer.fileData;
    a.download = transfer.fileName;
    a.click();
    
    const newTransfer = {
      id: Date.now(),
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

  function handleMessageReceived(message: string, from: string) {
    const senderDevice = devices.find(d => d.id === from);
    const senderName = senderDevice?.name || from.slice(-6);
    
    const transfer = {
      id: Date.now(),
      fromDeviceId: from,
      toDeviceId: deviceId,
      messageText: message,
      status: 'completed' as const,
      progress: 100,
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
    // Implementation for file sending
  }

  function handleMessageSend(message: string) {
    // Implementation for message sending
  }

  function handleTransferAccept() {
    setIncomingTransfer(null);
  }

  function handleTransferDecline() {
    setIncomingTransfer(null);
  }

  useEffect(() => {
    if (!currentRoom && !testMode) {
      fetchDevices();
    }
  }, [currentRoom, testMode]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center">
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
              <Button variant="ghost" size="sm" className="px-2 sm:px-3" onClick={() => window.open('/admin', '_blank')}>
                <Settings size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
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

        {/* Sidebar/Top Content Ad */}
        {adsEnabled && (
          <div className="mb-6">
            <DynamicAds position="sidebar" isEnabled={adsEnabled} />
          </div>
        )}

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
      />
      
      <ProgressModal
        transfer={activeTransfer}
        onCancel={() => setActiveTransfer(null)}
      />
    </div>
  );
}
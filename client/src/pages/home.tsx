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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Share2, Laptop, Wifi, Signal, Lock, Radar } from "lucide-react";
import { nanoid } from "nanoid";
import type { Device, Transfer } from "@shared/schema";

export default function Home() {
  const [deviceId] = useState(() => nanoid());
  const [deviceName, setDeviceName] = useState(() => 
    `${navigator.platform.includes('Mac') ? 'MacBook' : navigator.platform.includes('Win') ? 'Windows PC' : 'Device'}-${deviceId.slice(-4)}`
  );
  const [roomName, setRoomName] = useState("");
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [incomingTransfer, setIncomingTransfer] = useState<any>(null);
  const [activeTransfer, setActiveTransfer] = useState<any>(null);

  const { isConnected, sendMessage } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('WebSocket connected successfully');
      // Register device when connected
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

  function getDeviceType() {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  function handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'device-list-update':
        // Refresh device list
        fetchDevices();
        break;
      case 'offer':
        handleOffer(message.data, message.from);
        break;
      case 'answer':
        handleAnswer(message.data, message.from);
        break;
      case 'ice-candidate':
        handleIceCandidate(message.data, message.from);
        break;
      case 'transfer-request':
        setIncomingTransfer(message.data);
        break;
      case 'transfer-response':
        if (message.data.accepted) {
          // Start file transfer
          startFileTransfer(message.data);
        }
        break;
      case 'transfer-progress':
        handleTransferProgress(message.data);
        break;
    }
  }

  function handleFileReceived(file: File, from: string) {
    // Auto-download received file
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleMessageReceived(message: string, from: string) {
    // Add to transfer history
    const transfer = {
      id: Date.now(),
      fromDeviceId: from,
      toDeviceId: deviceId,
      messageText: message,
      status: 'completed',
      progress: 100,
      createdAt: new Date(),
    };
    setTransfers(prev => [transfer, ...prev]);
  }

  function handleTransferProgress(progress: any) {
    setActiveTransfer(prev => prev ? { ...prev, progress } : null);
  }

  function handleTransferRequest(request: any) {
    setIncomingTransfer(request);
  }

  function startFileTransfer(data: any) {
    setActiveTransfer(data);
  }

  async function fetchDevices() {
    try {
      const response = await fetch('/api/devices');
      const allDevices = await response.json();
      setDevices(allDevices.filter((d: Device) => d.id !== deviceId));
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  }

  async function joinRoom() {
    if (!roomName.trim()) return;
    
    try {
      // Create or join room
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nanoid(), name: roomName })
      });
      
      setCurrentRoom(roomName);
      sendMessage({
        type: 'join-room',
        deviceId,
        roomId: roomName
      });
      
      fetchDevices();
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  }

  async function leaveRoom() {
    if (!currentRoom) return;
    
    sendMessage({
      type: 'leave-room',
      deviceId
    });
    
    setCurrentRoom(null);
    fetchDevices();
  }

  function handleDeviceSelect(device: Device) {
    setSelectedDevice(device);
  }

  function handleFileSend(files: File[]) {
    if (!selectedDevice) return;
    
    files.forEach(file => {
      const transferRequest = {
        id: nanoid(),
        fileName: file.name,
        fileSize: file.size,
        from: deviceId,
        to: selectedDevice.id,
        type: 'file'
      };
      
      sendMessage({
        type: 'transfer-request',
        from: deviceId,
        to: selectedDevice.id,
        data: transferRequest
      });
    });
  }

  function handleMessageSend(message: string) {
    if (!selectedDevice) return;
    
    const transferRequest = {
      id: nanoid(),
      messageText: message,
      from: deviceId,
      to: selectedDevice.id,
      type: 'message'
    };
    
    sendMessage({
      type: 'transfer-request',
      from: deviceId,
      to: selectedDevice.id,
      data: transferRequest
    });
  }

  function handleTransferAccept() {
    if (!incomingTransfer) return;
    
    sendMessage({
      type: 'transfer-response',
      from: deviceId,
      to: incomingTransfer.from,
      data: { ...incomingTransfer, accepted: true }
    });
    
    setIncomingTransfer(null);
  }

  function handleTransferDecline() {
    if (!incomingTransfer) return;
    
    sendMessage({
      type: 'transfer-response',
      from: deviceId,
      to: incomingTransfer.from,
      data: { ...incomingTransfer, accepted: false }
    });
    
    setIncomingTransfer(null);
  }

  useEffect(() => {
    if (isConnected) {
      fetchDevices();
    }
  }, [isConnected]);

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Share2 className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">ShareLink</h1>
                <p className="text-xs text-slate-500">Secure P2P Sharing</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-emerald-50 rounded-full">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-emerald-700 font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <Button variant="ghost" size="sm">
                <Settings size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
              <div className="text-xs text-slate-500 text-center">
                Share room name with remote users
              </div>
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
                <span className="text-sm text-slate-600">Encryption</span>
                <span className="text-sm font-medium text-emerald-600">
                  <Lock size={12} className="inline mr-1" />
                  AES-256
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

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
              {/* Radar View */}
              <RadarView
                devices={devices}
                selectedDevice={selectedDevice}
                onDeviceSelect={handleDeviceSelect}
                currentDeviceId={deviceId}
                currentDeviceName={deviceName}
                currentDeviceType={getDeviceType()}
                isConnected={isConnected}
              />

              {/* File Transfer and Message Panel */}
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
              {/* Device Discovery */}
              <DeviceDiscovery
                devices={devices}
                selectedDevice={selectedDevice}
                onDeviceSelect={handleDeviceSelect}
                onRefresh={fetchDevices}
              />

              {/* File Transfer and Message Panel */}
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

        {/* Transfer History */}
        <TransferHistory transfers={transfers} />
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

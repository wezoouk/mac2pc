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
import { Settings, Share2, Laptop, Wifi, Signal, Lock, Radar, TestTube } from "lucide-react";
import { nanoid } from "nanoid";
import { generateRandomDeviceName } from '@/lib/utils';
import type { Device, Transfer } from "@shared/schema";

export default function Home() {
  const [deviceId] = useState(() => nanoid());
  const [deviceName, setDeviceName] = useState(() => generateRandomDeviceName());
  const [roomName, setRoomName] = useState("");
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [incomingTransfer, setIncomingTransfer] = useState<any>(null);
  const [activeTransfer, setActiveTransfer] = useState<any>(null);
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
    },
    {
      id: "test-device-4",
      name: "Remote PC",
      type: "desktop",
      network: "remote",
      isOnline: true,
      lastSeen: new Date(),
      roomId: "demo-room",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

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
    console.log('Received WebSocket message:', message);
    
    switch (message.type) {
      case 'device-list-update':
        // Refresh device list
        fetchDevices();
        break;
      case 'room-joined':
        console.log('Successfully joined room:', message.roomId);
        setCurrentRoom(message.roomId);
        fetchDevices();
        break;
      case 'room-left':
        console.log('Successfully left room:', message.roomId);
        setCurrentRoom(null);
        fetchDevices();
        break;
      case 'room-devices':
        // Update devices from room
        if (!testMode) {
          setDevices(message.devices);
        }
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
        console.log('Received transfer request:', message.data);
        if (message.data.type === 'message') {
          // Auto-accept messages
          handleMessageReceived(message.data.messageText, message.data.from);
          // Send acceptance response
          sendMessage({
            type: 'transfer-response',
            from: deviceId,
            to: message.data.from,
            data: { ...message.data, accepted: true }
          });
        } else {
          // Show modal for file transfers
          setIncomingTransfer(message.data);
        }
        break;
      case 'transfer-response':
        console.log('Received transfer response:', message.data);
        if (message.data.accepted) {
          // Only handle file transfers here (messages are auto-accepted)
          if (message.data.type === 'file') {
            // Handle file transfer completion
            handleFileReceived(message.data);
          }
        } else {
          console.log('Transfer was declined');
        }
        break;
      case 'transfer-progress':
        handleTransferProgress(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  function handleFileReceived(transfer: any) {
    // Convert base64 back to file and auto-download
    const a = document.createElement('a');
    a.href = transfer.fileData;
    a.download = transfer.fileName;
    a.click();
    
    // Add to transfer history
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
    // Find the device name
    const senderDevice = devices.find(d => d.id === from);
    const senderName = senderDevice?.name || from.slice(-6);
    
    // Add to transfer history
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
    
    // Show notification
    console.log(`Message from ${senderName}: ${message}`);
    
    // Create a custom notification toast
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm cursor-pointer transition-all duration-300';
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
        <div>
          <div class="font-medium">Message from ${senderName}</div>
          <div class="text-sm opacity-90">${message}</div>
        </div>
      </div>
    `;
    
    const removeNotification = () => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    };
    
    // Click to dismiss
    notification.addEventListener('click', removeNotification);
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(removeNotification, 5000);
  }

  function handleTransferProgress(progress: any) {
    setActiveTransfer(prev => prev ? { ...prev, progress } : null);
  }

  function handleTransferRequest(request: any) {
    console.log('Incoming transfer request:', request);
    setIncomingTransfer(request);
  }

  function startFileTransfer(data: any) {
    setActiveTransfer(data);
  }

  function toggleTestMode() {
    const newTestMode = !testMode;
    console.log('Toggling test mode from', testMode, 'to', newTestMode);
    setTestMode(newTestMode);
    
    if (newTestMode) {
      // Enable test mode - show mock devices and transfers
      setDevices(testDevices);
      setTransfers([
        {
          id: 1,
          fromDeviceId: "test-device-1",
          toDeviceId: deviceId,
          fileName: "vacation-photos.zip",
          fileSize: 15728640,
          status: "completed",
          progress: 100,
          createdAt: new Date(Date.now() - 3600000),
          updatedAt: new Date(Date.now() - 3600000)
        },
        {
          id: 2,
          fromDeviceId: deviceId,
          toDeviceId: "test-device-2",
          fileName: "presentation.pdf",
          fileSize: 2097152,
          status: "completed",
          progress: 100,
          createdAt: new Date(Date.now() - 1800000),
          updatedAt: new Date(Date.now() - 1800000)
        },
        {
          id: 3,
          fromDeviceId: "test-device-3",
          toDeviceId: deviceId,
          fileName: "document.docx",
          fileSize: 524288,
          status: "failed",
          progress: 45,
          createdAt: new Date(Date.now() - 900000),
          updatedAt: new Date(Date.now() - 900000)
        }
      ]);
    } else {
      // Disable test mode - fetch real devices
      fetchDevices();
      setTransfers([]);
    }
  }

  async function fetchDevices() {
    if (testMode) {
      setDevices(testDevices);
      return;
    }
    
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
      // Send join room message via WebSocket
      sendMessage({
        type: 'join-room',
        roomId: roomName.trim(),
        deviceId,
        data: {
          id: deviceId,
          name: deviceName,
          type: getDeviceType(),
          network: 'remote',
        }
      });
      
      console.log(`Attempting to join room: ${roomName.trim()}`);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  }

  async function leaveRoom() {
    if (!currentRoom) return;
    
    sendMessage({
      type: 'leave-room',
      deviceId,
      roomId: currentRoom
    });
    
    console.log(`Leaving room: ${currentRoom}`);
  }

  function handleDeviceSelect(device: Device) {
    setSelectedDevice(device);
  }

  function handleFileSend(files: File[]) {
    if (!selectedDevice) return;
    
    files.forEach(async file => {
      const transferId = nanoid();
      
      // Show progress modal immediately
      setActiveTransfer({
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        type: 'send',
        deviceName: selectedDevice.name,
        speed: '0 KB/s',
        timeRemaining: 'calculating...'
      });
      
      // Convert file to base64 for simple transfer
      const reader = new FileReader();
      reader.onload = () => {
        // Simulate progress during transfer
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15 + 5; // Random progress increments
          if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            
            // Send actual transfer request
            const transferRequest = {
              id: transferId,
              fileName: file.name,
              fileSize: file.size,
              fileData: reader.result, // Base64 data
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
            
            // Clear progress modal after a short delay
            setTimeout(() => setActiveTransfer(null), 1000);
          } else {
            // Update progress with realistic speed calculation
            const speed = Math.floor(file.size * (progress/100) / 1024 / ((Date.now() - transferStart) / 1000));
            const remainingBytes = file.size * ((100 - progress) / 100);
            const timeRemaining = speed > 0 ? Math.ceil(remainingBytes / 1024 / speed) : 0;
            
            setActiveTransfer(prev => prev ? {
              ...prev,
              progress: Math.floor(progress),
              speed: `${speed} KB/s`,
              timeRemaining: timeRemaining > 0 ? `${timeRemaining}s` : 'almost done...'
            } : null);
          }
        }, 200); // Update every 200ms
        
        const transferStart = Date.now();
      };
      reader.readAsDataURL(file);
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
    
    console.log('Accepting transfer:', incomingTransfer);
    
    // For messages, just accept immediately
    if (incomingTransfer.type === 'message') {
      handleMessageReceived(incomingTransfer.messageText, incomingTransfer.from);
    } else if (incomingTransfer.type === 'file' && incomingTransfer.fileData) {
      // Handle file download
      handleFileReceived(incomingTransfer);
    }
    
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

  useEffect(() => {
    console.log('Test mode state:', testMode);
  }, [testMode]);

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
              <Button
                variant={testMode ? "default" : "outline"}
                size="sm"
                onClick={toggleTestMode}
                className="flex items-center space-x-1"
              >
                <TestTube size={14} />
                <span className="hidden sm:inline">{testMode ? 'Exit Demo' : 'Demo Mode'}</span>
              </Button>
              <Button variant="ghost" size="sm">
                <Settings size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Mode Notice */}
        {testMode === true && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <TestTube className="text-amber-600" size={20} />
              <div>
                <h3 className="font-medium text-amber-800">Demo Mode Active</h3>
                <p className="text-sm text-amber-700">
                  Showing sample devices and transfers for testing the radar view. Click "Exit Demo" to return to normal mode.
                </p>
              </div>
            </div>
          </div>
        )}
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Share Code</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(currentRoom)}
                      className="text-xs"
                    >
                      Copy Room Name
                    </Button>
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
        <TransferHistory transfers={transfers} currentDeviceId={deviceId} onClear={() => setTransfers([])} />
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

import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useToast } from "@/hooks/use-toast";
import { BannerAd } from "@/components/google-ads";
import { TransferModal } from "@/components/transfer-modal";
import { RadarView } from "@/components/radar-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Share2, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Wifi, 
  Signal, 
  Upload, 
  Download,
  MessageSquare,
  FileText,
  Users,
  Lock,
  Eye,
  EyeOff,
  TestTube,
  Trash2,
  Settings,
  Zap,
  Globe,
  RefreshCw,
  Send,
  Paperclip,
  X,
  Check,
  Clock,
  AlertCircle
} from "lucide-react";
import { nanoid } from "nanoid";
import { generateRandomDeviceName, getDeviceIcon, formatFileSize, formatTimeAgo } from '@/lib/utils';
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
  const [messageText, setMessageText] = useState("");
  const [selfDestructTimer, setSelfDestructTimer] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [testMode, setTestMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Test devices for demo
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

  function getDeviceIcon(deviceType: string) {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  }

  async function fetchDevices() {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
        toast({
          title: "Room joined",
          description: `Connected to room: ${message.roomId}`,
        });
        break;
      case 'room-left':
        console.log('Successfully left room:', message.roomId);
        setCurrentRoom(null);
        setDevices([]);
        setTimeout(() => fetchDevices(), 100);
        toast({
          title: "Room left",
          description: "Returned to local network",
        });
        break;
      case 'room-devices':
        if (!testMode) {
          const roomDevices = message.devices.filter((d: Device) => d.id !== deviceId);
          setDevices(roomDevices);
        }
        break;
      case 'direct-message':
        if (message.to === deviceId) {
          handleMessageReceived(message.message, message.from);
          
          const senderDevice = devices.find(d => d.id === message.from);
          const senderName = senderDevice?.name || message.fromName || message.from.slice(-6);
          
          toast({
            title: "Message received",
            description: `From ${senderName}: ${message.message}`,
            duration: 5000,
          });
        }
        break;
      case 'direct-file':
        if (message.to === deviceId) {
          console.log('File is for this device, showing acceptance modal');
          const senderDevice = devices.find(d => d.id === message.from);
          const senderName = senderDevice?.name || message.fromName || message.from.slice(-6);
          
          setIncomingTransfer({
            type: 'file',
            fileName: message.fileName,
            fileSize: message.fileSize,
            fileData: message.fileData,
            from: message.from,
            fromName: senderName
          });
          
          toast({
            title: "File transfer request",
            description: `${message.fileName} from ${senderName}`,
            duration: 5000,
          });
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

  function handleMessageReceived(message: string, from: string) {
    const senderDevice = devices.find(d => d.id === from);
    const senderName = senderDevice?.name || from.slice(-6);
    
    const transfer = {
      id: Date.now() + Math.random(),
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
    onTransferProgress: () => {},
    onTransferRequest: () => {},
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

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  function handleSendFiles() {
    if (!selectedDevice || selectedFiles.length === 0) return;

    selectedFiles.forEach(async (file) => {
      try {
        const reader = new FileReader();
        
        reader.onload = () => {
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
          
          sendMessage(fileData);
        };
        
        reader.readAsDataURL(file);
        
        const transfer = {
          id: Date.now() + Math.random(),
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

    setSelectedFiles([]);
    toast({
      title: "Files sent",
      description: `${selectedFiles.length} file(s) sent to ${selectedDevice.name}`,
    });
  }

  function handleSendMessage() {
    if (!selectedDevice || !messageText.trim()) return;

    let expiresAt = null;
    if (selfDestructTimer && selfDestructTimer > 0) {
      expiresAt = new Date(Date.now() + selfDestructTimer * 1000);
    }

    const messageData = {
      type: 'direct-message',
      to: selectedDevice.id,
      from: deviceId,
      fromName: deviceName,
      message: messageText.trim(),
      selfDestructTimer,
      expiresAt: expiresAt?.toISOString(),
      timestamp: new Date().toISOString()
    };

    sendMessage(messageData);
    
    const transfer = {
      id: Date.now() + Math.random(),
      fromDeviceId: deviceId,
      toDeviceId: selectedDevice.id,
      messageText: messageText.trim(),
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
    setMessageText("");
    setSelfDestructTimer(null);

    toast({
      title: "Message sent",
      description: `Sent to ${selectedDevice.name}`,
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
      toast({
        title: "File accepted",
        description: `Downloaded ${incomingTransfer.fileName}`,
      });
    }
    setIncomingTransfer(null);
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

  function clearTransferHistory() {
    setTransfers([]);
    toast({
      title: "History cleared",
      description: "Transfer history has been cleared",
    });
  }

  // Cleanup expired transfers
  useEffect(() => {
    const cleanupExpiredTransfers = () => {
      setTransfers(prev => prev.filter(transfer => {
        if (!transfer.expiresAt) return true;
        return new Date() < new Date(transfer.expiresAt);
      }));
    };

    const interval = setInterval(cleanupExpiredTransfers, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentRoom && !testMode) {
      fetchDevices();
    }
  }, [currentRoom, testMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50">
      {/* Modern Header with Glass Effect */}
      <header className="bg-white/70 backdrop-blur-xl shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/20">
                <Share2 className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">ShareLink</h1>
                <p className="text-sm text-slate-600">Secure P2P File Transfer</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status with Animation */}
              <div className="flex items-center space-x-2 px-3 py-2 rounded-full bg-white/50 backdrop-blur-sm">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  {isConnected && (
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {/* Test Mode Toggle */}
              <Button
                variant={testMode ? "default" : "ghost"}
                size="sm"
                onClick={toggleTestMode}
                className={`flex items-center space-x-2 transition-all duration-200 ${
                  testMode 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg' 
                    : 'hover:bg-white/50 backdrop-blur-sm'
                }`}
              >
                <TestTube className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">{testMode ? 'Exit Demo' : 'Demo'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-0 w-72 h-72 bg-gradient-to-l from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-t from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
              Device Radar
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Discover and connect with devices on your network instantly. Share files and messages with beautiful, secure peer-to-peer connections.
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-slate-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>{devices.length} devices detected</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
              </div>
            </div>
          </div>

          {/* Radar View - Hero Component */}
          <div className="flex justify-center mb-20">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full blur-2xl transform scale-110"></div>
              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-white/20 p-8 border border-white/30">
                <RadarView
                  devices={devices}
                  selectedDevice={selectedDevice}
                  onDeviceSelect={setSelectedDevice}
                  currentDeviceId={deviceId}
                  currentDeviceName={deviceName}
                  currentDeviceType={getDeviceType()}
                  isConnected={isConnected}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Device Info Card with Enhanced Design */}
            <Card className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-black/5">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-white/30">
                      <div className="text-white text-xl">{getDeviceIcon(getDeviceType())}</div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{deviceName}</h3>
                      <p className="text-sm text-slate-600 capitalize flex items-center space-x-2">
                        <span>{getDeviceType()} Device</span>
                        <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                        <span className="text-emerald-600 font-medium">Online</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <Badge 
                      variant={currentRoom ? "secondary" : "default"} 
                      className={`text-xs font-medium ${
                        currentRoom 
                          ? 'bg-amber-100 text-amber-800 border-amber-200' 
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}
                    >
                      {currentRoom ? `Room: ${currentRoom}` : 'Local Network'}
                    </Badge>
                    <span className="text-xs text-slate-500">ID: {deviceId.slice(-6)}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Room Management with Enhanced UI */}
            <Card className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-black/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span>Room Connection</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentRoom ? (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-green-700 font-medium">Connected to room</p>
                          <p className="text-lg font-bold text-green-900">{currentRoom}</p>
                        </div>
                      </div>
                      <Button onClick={leaveRoom} variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-100">
                        Leave Room
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <Globe className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                      <p className="text-sm text-slate-600">Join a room to connect with devices anywhere</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="roomName" className="text-sm font-medium">Room Name</Label>
                        <Input
                          id="roomName"
                          placeholder="Enter room name"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          className="bg-white/50 backdrop-blur-sm border-slate-200 focus:border-purple-300 focus:ring-purple-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roomPassword" className="text-sm font-medium">Password <span className="text-slate-400">(optional)</span></Label>
                        <Input
                          id="roomPassword"
                          type="password"
                          placeholder="Room password"
                          value={roomPassword}
                          onChange={(e) => setRoomPassword(e.target.value)}
                          className="bg-white/50 backdrop-blur-sm border-slate-200 focus:border-purple-300 focus:ring-purple-100"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={joinRoom} 
                      className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium shadow-lg transition-all duration-200"
                      disabled={!roomName.trim()}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Join Room
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats & Info */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-black/5 rounded-xl p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Network Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">{devices.length}</div>
                    <div className="text-sm text-slate-600">Devices Found</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{transfers.length}</div>
                    <div className="text-sm text-slate-600">Transfers</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Device List (Compact) */}
            <Card className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-black/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <Signal className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-lg">Device List</span>
                      <p className="text-sm text-slate-500 font-normal">
                        {devices.length} device{devices.length !== 1 ? 's' : ''} nearby
                      </p>
                    </div>
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchDevices}
                    className="hover:bg-white/50 backdrop-blur-sm"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-4 rounded-xl bg-slate-50 border-2 border-slate-200">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-lg" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Skeleton className="w-2 h-2 rounded-full" />
                            <Skeleton className="h-5 w-12 rounded-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : devices.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <Signal className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">No devices found</p>
                    <p className="text-sm text-slate-500 mt-1">Make sure devices are on the same network or join a room</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchDevices}
                      className="mt-4"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        onClick={() => setSelectedDevice(device)}
                        className={`group p-4 rounded-xl transition-all duration-200 cursor-pointer border-2 ${
                          selectedDevice?.id === device.id
                            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg ring-2 ring-blue-100'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                            selectedDevice?.id === device.id
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                              : 'bg-gradient-to-br from-emerald-500 to-teal-600 group-hover:from-emerald-600 group-hover:to-teal-700'
                          }`}>
                            <div className="text-lg text-white">{getDeviceIcon(device.name).icon}</div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs text-slate-500 font-medium">{getDeviceIcon(device.name).description}</span>
                              <div className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                            </div>
                            <h4 className="font-semibold text-slate-900 group-hover:text-slate-800">{device.name}</h4>
                            <p className="text-sm text-slate-600 capitalize">{device.type} device</p>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <Badge variant={device.roomId ? 'secondary' : 'default'} className="text-xs">
                              {device.roomId ? 'Remote' : 'Local'}
                            </Badge>
                            <span className="text-xs text-slate-500">{formatTimeAgo(device.lastSeen)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transfer Interface */}
            {selectedDevice && (
              <Card className="bg-white/70 backdrop-blur-sm border-slate-200/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>Send to {selectedDevice.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="files" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="files" className="flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>Files</span>
                      </TabsTrigger>
                      <TabsTrigger value="message" className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Message</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="files" className="space-y-4">
                      {/* File Drop Zone */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                          dragOver 
                            ? 'border-blue-400 bg-blue-50' 
                            : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                        <p className="text-lg font-medium text-slate-700">Drop files here</p>
                        <p className="text-sm text-slate-500 mb-4">or click to select</p>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-input"
                        />
                        <Button variant="outline" onClick={() => document.getElementById('file-input')?.click()}>
                          <Paperclip className="w-4 h-4 mr-2" />
                          Select Files
                        </Button>
                      </div>

                      {/* Selected Files */}
                      {selectedFiles.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-slate-900">Selected Files ({selectedFiles.length})</h4>
                          <div className="space-y-2">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <FileText className="w-5 h-5 text-slate-500" />
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button onClick={handleSendFiles} className="w-full">
                            <Send className="w-4 h-4 mr-2" />
                            Send {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="message" className="space-y-4">
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          placeholder="Type your message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="timer">Self-destruct Timer (optional)</Label>
                        <Select value={selfDestructTimer?.toString() || "0"} onValueChange={(value) => setSelfDestructTimer(value && value !== "0" ? parseInt(value) : null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="No timer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No timer</SelectItem>
                            <SelectItem value="300">5 minutes</SelectItem>
                            <SelectItem value="3600">1 hour</SelectItem>
                            <SelectItem value="86400">24 hours</SelectItem>
                            <SelectItem value="604800">1 week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button onClick={handleSendMessage} className="w-full" disabled={!messageText.trim()}>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </Button>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ads */}
            {adsEnabled && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdsEnabled(!adsEnabled)}
                  className="absolute top-2 right-2 z-10"
                >
                  {adsEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <BannerAd isEnabled={adsEnabled} />
              </div>
            )}

            {/* Transfer History */}
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/50 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearTransferHistory}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {transfers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transfers.slice(0, 10).map((transfer) => (
                      <div key={transfer.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          {transfer.fileName ? (
                            <FileText className="w-4 h-4 text-white" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Badge variant={transfer.fromDeviceId === deviceId ? "default" : "secondary"} className="text-xs">
                              {transfer.fromDeviceId === deviceId ? (
                                <><Upload className="w-3 h-3 mr-1" /> Sent</>
                              ) : (
                                <><Download className="w-3 h-3 mr-1" /> Received</>
                              )}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {transfer.fileName || transfer.messageText}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatTimeAgo(transfer.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {incomingTransfer && (
        <TransferModal
          transfer={incomingTransfer}
          onAccept={handleTransferAccept}
          onDecline={handleTransferDecline}
        />
      )}
    </div>
  );
}
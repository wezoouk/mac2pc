import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useToast } from "@/hooks/use-toast";
import { BannerAd } from "@/components/google-ads";
import { TransferModal } from "@/components/transfer-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Share2 className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">ShareLink</h1>
                <p className="text-sm text-slate-600">Secure P2P File Transfer</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-ping`}></div>
                </div>
                <span className="text-sm text-slate-700 hidden sm:inline">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {/* Test Mode Toggle */}
              <Button
                variant={testMode ? "default" : "ghost"}
                size="sm"
                onClick={toggleTestMode}
                className="flex items-center space-x-2"
              >
                <TestTube className="w-4 h-4" />
                <span className="hidden sm:inline">{testMode ? 'Exit Demo' : 'Demo'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Device Info Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/50 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      {getDeviceIcon(getDeviceType())}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{deviceName}</h3>
                      <p className="text-sm text-slate-600 capitalize">{getDeviceType()} Device</p>
                    </div>
                  </div>
                  <Badge variant={currentRoom ? "secondary" : "default"} className="text-xs">
                    {currentRoom ? `Room: ${currentRoom}` : 'Local Network'}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Room Management */}
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Room Connection</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentRoom ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Connected to room</p>
                      <p className="font-medium text-slate-900">{currentRoom}</p>
                    </div>
                    <Button onClick={leaveRoom} variant="outline" size="sm">
                      Leave Room
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="roomName">Room Name</Label>
                        <Input
                          id="roomName"
                          placeholder="Enter room name"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="roomPassword">Password (optional)</Label>
                        <Input
                          id="roomPassword"
                          type="password"
                          placeholder="Room password"
                          value={roomPassword}
                          onChange={(e) => setRoomPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button onClick={joinRoom} className="w-full">
                      <Users className="w-4 h-4 mr-2" />
                      Join Room
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Devices */}
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/50 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Signal className="w-5 h-5" />
                    <span>Available Devices</span>
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={fetchDevices}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Signal className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No devices found</p>
                    <p className="text-sm">Make sure devices are on the same network or join a room</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        onClick={() => setSelectedDevice(device)}
                        className={`p-4 rounded-xl transition-all duration-200 cursor-pointer border-2 ${
                          selectedDevice?.id === device.id
                            ? 'bg-blue-50 border-blue-200 shadow-md'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                            <div className="text-lg">{getDeviceIcon(device.name).icon}</div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-slate-500">{getDeviceIcon(device.name).description}</span>
                              <h4 className="font-medium text-slate-900">{device.name}</h4>
                            </div>
                            <p className="text-sm text-slate-600 capitalize">{device.type}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                            <Badge variant={device.roomId ? 'secondary' : 'default'} className="text-xs">
                              {device.roomId ? 'Remote' : 'Local'}
                            </Badge>
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
                        <Select value={selfDestructTimer?.toString() || ""} onValueChange={(value) => setSelfDestructTimer(value ? parseInt(value) : null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="No timer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No timer</SelectItem>
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
import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useToast } from "@/hooks/use-toast";
import { RadarView } from "@/components/radar-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Share2, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Wifi, 
  Upload, 
  Download,
  MessageSquare,
  Users,
  TestTube,
  Trash2,
  RefreshCw,
  Send,
  Paperclip,
  X,
  Clock,
  ArrowRight,
  FileText,
  Image,
  Music,
  Video,
  Archive,
  Settings,
  Zap
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
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [incomingTransfer, setIncomingTransfer] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [testMode, setTestMode] = useState(true);
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
    }
  ];

  const { sendMessage, isConnected } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log("WebSocket connected successfully");
      // Register this device when connected
      sendMessage({
        type: 'device-update',
        deviceId,
        deviceName,
        deviceType: getDeviceType(),
        timestamp: new Date().toISOString()
      });
    },
    onDisconnect: () => {
      console.log("WebSocket disconnected");
    }
  });

  const { sendFile } = useWebRTC({
    onFileReceived: handleFileReceived,
    onMessageReceived: handleMessageReceived,
    onTransferProgress: () => {},
    onTransferRequest: (request) => {
      if (request.type === 'file') {
        setIncomingTransfer(request);
      }
    },
    onSignalingMessage: (message) => {
      sendMessage(message);
    }
  });

  function getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('android')) return 'mobile';
    if (userAgent.includes('ipad') || userAgent.includes('tablet')) return 'tablet';
    return 'desktop';
  }

  function getDeviceIcon(deviceType: string) {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) return '🍎';
    if (userAgent.includes('iphone')) return '📱';
    if (userAgent.includes('ipad')) return '📱';
    if (userAgent.includes('android')) return '🤖';
    if (userAgent.includes('windows')) return '💻';
    return deviceType === 'mobile' ? '📱' : deviceType === 'tablet' ? '📱' : '💻';
  }

  async function fetchDevices() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/devices/network/local');
      const allDevices = await response.json();
      console.log('Fetched devices:', allDevices);
      
      const filteredDevices = allDevices.filter((d: Device) => d.id !== deviceId);
      setDevices(filteredDevices);
      console.log(`Fetched ${allDevices.length} devices, showing ${filteredDevices.length} after filtering`);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleWebSocketMessage(message: any) {
    console.log('Received WebSocket message:', message);
    
    if (message.type === 'device-list-update') {
      fetchDevices();
    } else if (message.type === 'direct-message') {
      handleMessageReceived(message.message, message.from);
    } else if (message.type === 'direct-file') {
      setIncomingTransfer({
        type: 'file',
        fileName: message.fileName,
        fileSize: message.fileSize,
        fileData: message.fileData,
        from: message.from,
        fromName: message.fromName
      });
    }
  }

  function handleFileReceived(transfer: any) {
    try {
      const link = document.createElement('a');
      link.href = transfer.fileData;
      link.download = transfer.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      const newTransfer = {
        id: Date.now() + Math.random(),
        fromDeviceId: transfer.from,
        toDeviceId: deviceId,
        fileName: transfer.fileName,
        fileSize: transfer.fileSize,
        messageText: null,
        status: 'completed' as const,
        progress: 100,
        expiresAt: null,
        isExpired: false,
        selfDestructTimer: null,
        createdAt: new Date(),
      };
      
      setTransfers(prev => [newTransfer, ...prev]);
      
      toast({
        title: "File received",
        description: `Downloaded ${transfer.fileName}`,
      });
    } catch (error) {
      console.error('Error handling file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  }

  function handleMessageReceived(message: string, from: string) {
    const newTransfer = {
      id: Date.now() + Math.random(),
      fromDeviceId: from,
      toDeviceId: deviceId,
      messageText: message,
      fileName: null,
      fileSize: null,
      status: 'completed' as const,
      progress: 100,
      expiresAt: null,
      isExpired: false,
      selfDestructTimer: null,
      createdAt: new Date(),
    };
    
    setTransfers(prev => [newTransfer, ...prev]);
    
    toast({
      title: "Message received",
      description: message.length > 50 ? message.substring(0, 50) + '...' : message,
    });
  }

  function toggleTestMode() {
    setTestMode(!testMode);
    if (!testMode) {
      setDevices(testDevices);
      toast({
        title: "Demo mode enabled",
        description: "Showing test devices for demonstration",
      });
    } else {
      setDevices([]);
      fetchDevices();
      toast({
        title: "Demo mode disabled",
        description: "Back to real device discovery",
      });
    }
  }

  async function joinRoom() {
    if (!roomName.trim()) return;
    
    try {
      const roomData = {
        type: 'join-room',
        roomId: roomName.trim(),
        password: roomPassword.trim() || undefined,
        deviceId,
        deviceName,
        deviceType: getDeviceType(),
      };
      
      sendMessage(roomData);
      setCurrentRoom(roomName.trim());
      setRoomName("");
      setRoomPassword("");
      
      toast({
        title: "Joined room",
        description: `Connected to room: ${roomName.trim()}`,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive",
      });
    }
  }

  async function leaveRoom() {
    if (!currentRoom) return;
    
    try {
      sendMessage({
        type: 'leave-room',
        roomId: currentRoom,
        deviceId
      });
      
      setCurrentRoom(null);
      setDevices([]);
      fetchDevices();
      
      toast({
        title: "Left room",
        description: "Returned to local network",
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
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

    const messageData = {
      type: 'direct-message',
      to: selectedDevice.id,
      from: deviceId,
      fromName: deviceName,
      message: messageText.trim(),
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
      expiresAt: null,
      isExpired: false,
      selfDestructTimer: null,
      createdAt: new Date(),
    };
    
    setTransfers(prev => [transfer, ...prev]);
    setMessageText("");

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

  function getFileIcon(file: File) {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (file.type.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (file.type.includes('zip') || file.type.includes('archive')) return <Archive className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  }

  useEffect(() => {
    if (testMode) {
      setDevices(testDevices);
    } else if (!currentRoom) {
      fetchDevices();
    }
  }, [currentRoom, testMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Simple Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Share2 className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ShareLink</h1>
                <p className="text-sm text-gray-600">File Transfer</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              
              <Button
                variant={testMode ? "default" : "outline"}
                size="sm"
                onClick={toggleTestMode}
                className="flex items-center space-x-2"
              >
                <TestTube className="w-4 h-4" />
                <span>{testMode ? 'Exit Demo' : 'Demo Mode'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section with Radar */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Device Radar
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Discover and connect with nearby devices. Share files and messages instantly.
          </p>
          
          {/* Radar View */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Your Device */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">{getDeviceIcon(getDeviceType())}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{deviceName}</h3>
                      <p className="text-sm text-gray-600 capitalize">{getDeviceType()} Device</p>
                    </div>
                  </div>
                  <Badge variant={currentRoom ? "secondary" : "default"}>
                    {currentRoom ? `Room: ${currentRoom}` : 'Local Network'}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Room Management */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Room Connection</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentRoom ? (
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">Connected to room: {currentRoom}</p>
                      <p className="text-sm text-green-600">You can share with devices in this room</p>
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
                          className="mt-1"
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
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={joinRoom} 
                      className="w-full"
                      disabled={!roomName.trim()}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Join Room
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Transfer */}
            {selectedDevice && (
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="w-5 h-5" />
                    <span>Send to {selectedDevice.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">Drop files here or click to select</p>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Choose Files
                    </Button>
                  </div>

                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Selected Files ({selectedFiles.length})</Label>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              {getFileIcon(file)}
                              <span className="text-sm font-medium">{file.name}</span>
                              <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
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
                        Send Files
                      </Button>
                    </div>
                  )}

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Quick Message</Label>
                    <div className="flex space-x-2">
                      <Textarea
                        id="message"
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="flex-1"
                        rows={2}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim()}
                        size="sm"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Device List */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Nearby Devices</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchDevices}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Wifi className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No devices found</p>
                    <p className="text-sm">Make sure devices are on the same network</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        onClick={() => setSelectedDevice(device)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedDevice?.id === device.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-sm">{getDeviceIcon(device.type)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{device.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{device.type}</p>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transfer History */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Activity</span>
                  {transfers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearTransferHistory}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transfers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No transfers yet</p>
                    <p className="text-sm">Your transfer history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {transfers.map((transfer) => (
                      <div key={transfer.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            {transfer.fileName ? (
                              <Download className="w-4 h-4 text-blue-600" />
                            ) : (
                              <MessageSquare className="w-4 h-4 text-green-600" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {transfer.fileName || 'Message'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {transfer.fromDeviceId === deviceId ? 'Sent' : 'Received'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(transfer.createdAt)}
                          </span>
                        </div>
                        {transfer.messageText && (
                          <p className="text-sm text-gray-700 mt-2 p-2 bg-white rounded">
                            {transfer.messageText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Incoming Transfer Modal */}
      {incomingTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Incoming File</h3>
            <div className="space-y-2 mb-6">
              <p><strong>From:</strong> {incomingTransfer.fromName}</p>
              <p><strong>File:</strong> {incomingTransfer.fileName}</p>
              <p><strong>Size:</strong> {formatFileSize(incomingTransfer.fileSize)}</p>
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleTransferAccept} className="flex-1">
                Accept
              </Button>
              <Button onClick={handleTransferDecline} variant="outline" className="flex-1">
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useToast } from "@/hooks/use-toast";
import { RadarView } from "@/components/radar-view-new";
import { FileTransfer } from "@/components/file-transfer";
import { MessagePanel } from "@/components/message-panel";
import { TransferHistory } from "@/components/transfer-history";
import { TransferModal } from "@/components/transfer-modal";
import { ProgressModal } from "@/components/progress-modal";
import { DevicePairing } from "@/components/device-pairing";
import { DynamicAds } from "@/components/google-ads";
import { TrustedDevicesManager } from "@/components/trusted-devices-manager";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, Share2, TestTube, RefreshCw, Eye, EyeOff, Link2, ChevronDown, Volume2, VolumeX } from "lucide-react";
import { soundManager } from "@/lib/sound-manager";
import { nanoid } from "nanoid";
import { generateRandomDeviceName, getDetailedDeviceType, getDeviceType } from '@/lib/utils';
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
  const [showPairing, setShowPairing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const { toast } = useToast();

  function handlePairWithCode(code: string) {
    // Join a special pairing room using the code
    const pairRoomId = `pair-${code}`;
    
    console.log('Joining pairing room:', pairRoomId, 'with device:', deviceId);
    
    sendMessage({
      type: 'join-room',
      roomId: pairRoomId,
      deviceId,
      data: {
        id: deviceId,
        name: deviceName,
        type: getDeviceType(),
        network: 'remote',
      }
    });
    
    // Update current room to show we're in a pairing room
    setCurrentRoom(pairRoomId);
    setRoomName(pairRoomId);
    
    // Don't close the pairing dialog when joining via QR code
    // This allows the user to see the confirmation
  }

  // Initialize notification and sound systems
  useEffect(() => {
    NotificationManager.initialize();
    
    // Initialize sound state from soundManager
    const soundState = soundManager.isEnabled();
    console.log('Initial sound state:', soundState);
    setSoundEnabled(soundState);
    NotificationManager.setSoundEnabled(soundState);
    
    // Check for pairing code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const pairCode = urlParams.get('pair');
    if (pairCode) {
      handlePairWithCode(pairCode);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show pairing dialog as confirmation for QR code scanning
      setShowPairing(true);
    }

    // Listen for admin settings updates from admin panel
    const handleAdminMessage = (event: MessageEvent) => {
      if (event.data.type === 'admin-settings-update') {
        const { demoMode, adsEnabled } = event.data.settings;
        setTestMode(demoMode);
        setAdsEnabled(adsEnabled);
      }
    };

    window.addEventListener('message', handleAdminMessage);
    return () => window.removeEventListener('message', handleAdminMessage);
  }, []);

  // Test devices for demo purposes
  const testDevices: Device[] = [
    {
      id: "test-device-1",
      name: "swift-otter-iPhone",
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
      name: "fuzzy-wombat-Mac",
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
      name: "sleepy-pangolin-iPad",
      type: "tablet", 
      network: "local",
      isOnline: true,
      lastSeen: new Date(),
      roomId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];



  async function fetchDevices() {
    try {
      // If we're in a pairing room, don't fetch local devices
      // Room devices will be provided via 'room-devices' WebSocket message
      if (currentRoom && currentRoom.startsWith('pair-')) {
        console.log('In pairing room, not fetching local devices');
        return;
      }
      
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
        // Only fetch devices if we're not in a pairing room
        if (!currentRoom || !currentRoom.startsWith('pair-')) {
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
          console.log(`Room devices received: ${roomDevices.length} devices in room ${message.roomId}`);
          console.log('Room devices data:', roomDevices);
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
          console.log('Message received - Sound enabled:', soundEnabled);
          if (soundEnabled) {
            console.log('Playing message received sound');
            soundManager.playMessageReceived();
          } else {
            console.log('Sound disabled, not playing notification');
          }
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
          if (soundEnabled) {
            soundManager.playFileTransferStart();
          }
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
    
    // Play success sound
    if (soundEnabled) {
      soundManager.playFileTransferComplete();
    }
    
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

  async function toggleSound() {
    const newEnabled = !soundEnabled;
    console.log('Toggling sound from', soundEnabled, 'to', newEnabled);
    setSoundEnabled(newEnabled);
    await soundManager.setEnabled(newEnabled);
    NotificationManager.setSoundEnabled(newEnabled);
    
    // Play a test sound when enabling
    if (newEnabled) {
      console.log('Playing test sound after enabling');
      await soundManager.playDeviceConnected();
    }
    
    toast({
      title: newEnabled ? "Sound enabled" : "Sound disabled",
      description: newEnabled ? "You'll hear notifications for transfers" : "Audio notifications turned off",
      duration: 2000,
    });
  }

  async function addToTrustedDevices(device: Device) {
    try {
      const response = await fetch('/api/trusted-devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: deviceId,
          trustedDeviceId: device.id,
          deviceName: deviceName,
          trustedDeviceName: device.name,
          autoAcceptFiles: true,
          autoAcceptMessages: true,
        }),
      });

      if (response.ok) {
        toast({
          title: "Device trusted",
          description: `${device.name} has been added to your trusted devices`,
          duration: 3000,
        });
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error('Error adding trusted device:', error);
      toast({
        title: "Error",
        description: "Failed to add device to trusted list",
        variant: "destructive",
        duration: 3000,
      });
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-900 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm border-b border-slate-200 dark:border-gray-700 sticky top-0 z-40">
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
              
              {/* Room Status */}
              {currentRoom && currentRoom.startsWith('pair-') && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-xs text-blue-600 hidden sm:inline">
                    Pairing Room: {currentRoom.replace('pair-', '')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={leaveRoom}
                    className="px-1 text-xs text-red-600 hover:text-red-700"
                  >
                    Leave
                  </Button>
                </div>
              )}
              
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
                onClick={() => setShowPairing(true)}
              >
                <Link2 size={16} />
                <span className="hidden sm:inline ml-2">Pair</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="px-2 sm:px-3"
                onClick={toggleSound}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span className="hidden sm:inline ml-2">Sound</span>
              </Button>
              
              <ThemeToggle />
              
              <Button variant="ghost" size="sm" className="px-2 sm:px-3" onClick={() => window.open('/admin', '_blank')}>
                <Settings size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-screen px-2 sm:px-4 py-8 w-full overflow-x-hidden">
        {/* Top Banner Ad */}
        {adsEnabled && (
          <div className="mb-6 w-full max-w-4xl">
            <DynamicAds position="header" isEnabled={adsEnabled} />
          </div>
        )}

        {/* Header Message */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-slate-700 mb-3">
            Open ShareLink on other devices to send files
          </h2>
          <p className="text-sm text-slate-500 hidden sm:block">
            Pair devices to be discoverable on other networks
          </p>
        </div>

        {/* Large Radar View */}
        <div className="w-full max-w-sm sm:max-w-lg lg:max-w-6xl mb-8 sm:mb-12 px-2 sm:px-0">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-3xl p-4 sm:p-8 lg:p-12 shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
            <RadarView
              devices={devices}
              selectedDevice={selectedDevice}
              onDeviceSelect={handleDeviceSelect}
              currentDeviceId={deviceId}
              currentDeviceName={deviceName}
              currentDeviceType={getDeviceType()}
              isConnected={isConnected}
            />
          </div>
        </div>

        {/* Device Info */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3 shadow-lg border border-white/30">
            <div className="text-sm text-slate-600 flex items-center space-x-2">
              <span className="hidden sm:inline">You are known as:</span>
              <span className="font-medium text-blue-600">{deviceName}</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 space-y-1 hidden sm:block">
            <div>You can be discovered by everyone on this network</div>
            <div>Traffic is routed through this server, if WebRTC is not available</div>
            <div className="text-xs text-slate-400 mt-2">
              Device ID: {deviceId.slice(-8)} • Device Name: {deviceName}
            </div>
          </div>
          
          {/* Trust Device Button for Selected Device */}
          {selectedDevice && (
            <div className="mt-4">
              <Button
                onClick={() => addToTrustedDevices(selectedDevice)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
                size="sm"
              >
                Trust {selectedDevice.name}
              </Button>
            </div>
          )}
        </div>

        {/* Compact Controls */}
        <div className="w-full max-w-xl space-y-4 mb-8">
          {/* Room Controls */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
            <CardContent className="p-4">
              {!currentRoom ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-slate-700 text-center">Join Room</div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Room name"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                      className="flex-1 h-9 bg-white/50"
                    />
                    <Input
                      placeholder="Password"
                      type="password"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                      className="flex-1 h-9 bg-white/50"
                    />
                    <Button onClick={joinRoom} disabled={!roomName.trim()} size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Join
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      onClick={() => handlePairWithCode("509836")} 
                      variant="outline" 
                      size="sm"
                      className="text-xs"
                    >
                      Test: Join 509836
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium text-slate-700">Room: {currentRoom}</div>
                    <div className="text-xs text-slate-500">Cross-network sharing</div>
                  </div>
                  <Button variant="outline" onClick={leaveRoom} size="sm">
                    Leave
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Transfer & Messages */}
          {selectedDevice && (
            <div className="space-y-4">
              <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-center flex items-center justify-between">
                    <span>Send to {selectedDevice.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addToTrustedDevices(selectedDevice)}
                      className="text-xs px-2 py-1 h-7"
                    >
                      Trust Device
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <FileTransfer
                    selectedDevice={selectedDevice}
                    onFileSend={handleFileSend}
                  />
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
                <CardContent className="p-4">
                  <MessagePanel
                    selectedDevice={selectedDevice}
                    onMessageSend={handleMessageSend}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Ad Space */}
        {adsEnabled && (
          <div className="w-full max-w-2xl mb-8">
            <DynamicAds position="between-content" isEnabled={adsEnabled} />
          </div>
        )}

        {/* Transfer History - Compact */}
        {transfers.length > 0 && (
          <div className="w-full max-w-2xl mb-8">
            <TransferHistory transfers={transfers} currentDeviceId={deviceId} onClear={() => setTransfers([])} />
          </div>
        )}

        {/* Trusted Devices Manager */}
        <div className="w-full max-w-2xl mb-8">
          <Collapsible>
            <CollapsibleTrigger className="w-full">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>Device Settings</span>
                    <ChevronDown className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-blue-800">
                      <div className="font-medium mb-2">About Device Identity:</div>
                      <div className="space-y-1 text-xs">
                        <div><strong>Device Name:</strong> {deviceName} (Fun random name for easy recognition)</div>
                        <div><strong>Device ID:</strong> {deviceId.slice(-8)}... (Unique identifier for security)</div>
                        <div className="text-blue-600 mt-2">
                          Trusted devices can automatically accept transfers from each other
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <TrustedDevicesManager currentDeviceId={deviceId} currentDeviceName={deviceName} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

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
      
      <DevicePairing
        isOpen={showPairing}
        onClose={() => setShowPairing(false)}
        deviceId={deviceId}
        deviceName={deviceName}
        onPairWithCode={handlePairWithCode}
        onGenerateCode={handlePairWithCode}
        currentRoom={currentRoom}
      />
    </div>
  );
}
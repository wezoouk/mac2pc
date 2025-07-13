import { useState, useEffect } from "react";
import { Link } from "wouter";
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
import { queryClient } from '@/lib/queryClient';
import type { Device, Transfer } from "@shared/schema";

export default function Home() {
  const [deviceId] = useState(() => {
    // Create a completely unique device ID for each tab instance
    // Don't use sessionStorage to ensure each tab gets a fresh ID
    const newId = `${nanoid()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Generated new device ID:', newId);
    return newId;
  });
  const [deviceName, setDeviceName] = useState(() => {
    // Create a unique device name for each tab instance
    return generateRandomDeviceName();
  });
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [currentRoom, setCurrentRoom] = useState<string | null>(() => {
    // Load room from localStorage on startup
    return localStorage.getItem('currentRoom') || null;
  });
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState(deviceName);
  const [pendingPairCode, setPendingPairCode] = useState<string | null>(null);
  const [pendingRoomName, setPendingRoomName] = useState<string | null>(null);
  const { toast } = useToast();

  // Helper function to update current room and persist to localStorage
  const updateCurrentRoom = (room: string | null) => {
    setCurrentRoom(room);
    if (room) {
      localStorage.setItem('currentRoom', room);
    } else {
      localStorage.removeItem('currentRoom');
    }
  };

  // WebSocket hook must be defined before functions that use isConnected
  const { isConnected, sendMessage } = useWebSocket({
    onMessage: (message: any) => {
      // Handle WebSocket messages
      handleWebSocketMessage(message);
    },
    onConnect: () => {
      console.log('WebSocket connected successfully');
      
      // If we were in a room before disconnect, rejoin it
      if (currentRoom) {
        console.log('Rejoining room after WebSocket reconnection:', currentRoom);
        sendMessage({
          type: 'join-room',
          roomId: currentRoom,
          password: '', // We'll store password if needed
          deviceId,
          data: {
            id: deviceId,
            name: deviceName,
            type: getDeviceType(),
            network: 'remote',
          }
        });
      } else {
        // Normal device update for local network
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
      }
      
      // Process pending actions after WebSocket connects
      if (pendingPairCode) {
        console.log('🔗 WebSocket connected, processing pending pair code:', pendingPairCode);
        processPairCode(pendingPairCode);
      }
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
    }
  });

  function handlePairWithCode(code: string) {
    console.log('🔗 QR Code scanned, processing code:', code);
    
    if (!isConnected) {
      console.log('WebSocket not connected, storing for later processing');
      setPendingPairCode(code);
      toast({
        title: "QR Code Detected",
        description: `Connecting to join room: pair-${code}`,
        duration: 3000,
      });
      return;
    }
    
    // Process immediately if connected
    processPairCode(code);
  }

  function processPairCode(code: string) {
    if (!code || !isConnected) {
      console.log('❌ Cannot process pair code - missing code or not connected');
      return;
    }
    
    const pairRoomId = `pair-${code}`;
    console.log('🎯 Joining pairing room:', pairRoomId);
    
    // Clear any existing room first
    if (currentRoom) {
      sendMessage({
        type: 'leave-room',
        roomId: currentRoom,
        deviceId
      });
    }
    
    // Join the pairing room
    sendMessage({
      type: 'join-room',
      roomId: pairRoomId,
      password: '',
      deviceId,
      data: {
        id: deviceId,
        name: deviceName,
        type: getDeviceType(),
        network: 'remote',
      }
    });
    
    // Update local state
    updateCurrentRoom(pairRoomId);
    setRoomName('');
    setRoomPassword('');
    
    // Clear pending code
    setPendingPairCode(null);
    
    toast({
      title: "Joining Room",
      description: `Connecting to pairing room: ${pairRoomId}`,
      duration: 3000,
    });
  }

  function handleDeviceNameChange() {
    if (newDeviceName.trim() && newDeviceName.trim() !== deviceName) {
      const updatedName = newDeviceName.trim();
      setDeviceName(updatedName);
      setIsEditingName(false);
      
      // Update device name in storage and broadcast to other devices
      sendMessage({
        type: 'device-update',
        deviceId,
        data: {
          id: deviceId,
          name: updatedName,
          type: getDeviceType(),
          network: 'local',
        }
      });

      toast({
        title: "Device name updated",
        description: `Your device is now known as: ${updatedName}`,
        duration: 3000,
      });
    } else {
      setIsEditingName(false);
      setNewDeviceName(deviceName);
    }
  }

  function cancelNameEdit() {
    setIsEditingName(false);
    setNewDeviceName(deviceName);
  }

  // Initialize notification and sound systems
  useEffect(() => {
    NotificationManager.initialize();
    
    // Initialize sound state from soundManager
    const soundState = soundManager.isEnabled();
    console.log('Initial sound state:', soundState);
    setSoundEnabled(soundState);
    NotificationManager.setSoundEnabled(soundState);

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

  // Simple URL parameter detection for QR codes
  useEffect(() => {
    function detectQRCode() {
      const urlParams = new URLSearchParams(window.location.search);
      const pairCode = urlParams.get('pair');
      
      console.log('Checking URL for QR code:', window.location.href);
      console.log('Detected pair code:', pairCode);
      
      if (pairCode && !pendingPairCode) {
        console.log('🎯 QR Code found in URL:', pairCode);
        
        // Clean URL immediately
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Process the pairing code
        handlePairWithCode(pairCode);
      }
    }
    
    // Check immediately
    detectQRCode();
    
    // Listen for URL changes
    window.addEventListener('popstate', detectQRCode);
    
    return () => {
      window.removeEventListener('popstate', detectQRCode);
    };
  }, [deviceId, pendingPairCode, isConnected]); // Dependencies for proper timing
  
  // Process pending pair code when WebSocket connects
  useEffect(() => {
    if (isConnected && pendingPairCode) {
      console.log('🔗 WebSocket connected, processing pending pair code:', pendingPairCode);
      // Add a small delay to ensure WebSocket is fully ready
      setTimeout(() => {
        processPairCode(pendingPairCode);
      }, 100);
    }
  }, [isConnected, pendingPairCode]);

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
        } else {
          console.log('In pairing room, ignoring device-list-update');
        }
        break;
      case 'room-joined':
        console.log('Successfully joined room:', message.roomId);
        console.log('Setting current room state to:', message.roomId);
        updateCurrentRoom(message.roomId);
        setRoomName("");
        setRoomPassword("");
        console.log('Current room state updated via room-joined message');
        break;
      case 'room-left':
        console.log('Successfully left room:', message.roomId);
        updateCurrentRoom(null);
        setDevices([]);
        setTimeout(() => fetchDevices(), 100);
        break;
      case 'room-devices':
        console.log('Raw room devices from server:', message.devices);
        console.log('Current device ID:', deviceId);
        console.log('Device IDs from server:', message.devices.map((d: Device) => d.id));
        console.log('Filtering logic: removing devices with ID matching:', deviceId);
        
        const roomDevices = message.devices.filter((d: Device) => d.id !== deviceId);
        console.log(`Room devices received: ${roomDevices.length} devices in room ${message.roomId}`);
        console.log('Room devices data:', roomDevices);
        console.log('Test mode:', testMode);
        
        // Always set room devices regardless of test mode
        setDevices(roomDevices);
        
        // Show success message when other devices are found
        if (roomDevices.length > 0) {
          toast({
            title: "Device(s) found!",
            description: `Found ${roomDevices.length} device(s) in room ${message.roomId}`,
            duration: 3000,
          });
        } else {
          console.log('No other devices found in room after filtering');
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
      console.log('Adding trusted device:', {
        deviceId: deviceId,
        trustedDeviceId: device.id,
        deviceName: deviceName,
        trustedDeviceName: device.name,
      });
      
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

      console.log('Trust device response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Trust device success:', result);
        
        // Invalidate the trusted devices cache to refresh the list
        queryClient.invalidateQueries({ queryKey: [`/api/trusted-devices/${deviceId}`] });
        
        toast({
          title: "Device trusted",
          description: `${device.name} has been added to your trusted devices`,
          duration: 3000,
        });
      } else {
        const error = await response.text();
        console.error('Trust device error response:', error);
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

  // Keep newDeviceName synchronized with deviceName
  useEffect(() => {
    setNewDeviceName(deviceName);
  }, [deviceName]);

  // Debug current room state changes
  useEffect(() => {
    console.log('Current room state changed to:', currentRoom);
  }, [currentRoom]);

  // Debug devices state changes
  useEffect(() => {
    console.log('Devices state updated:', devices.length, 'devices');
    console.log('Current devices:', devices.map(d => ({ id: d.id, name: d.name })));
  }, [devices]);

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
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">Mac2PC</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Free Peer-to-Peer File Transfer</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-slate-600 hidden sm:inline">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {pendingPairCode && (
                  <div className="ml-2 text-xs text-blue-600 font-medium">
                    Joining room...
                  </div>
                )}
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
      <main className="flex flex-col items-center justify-start min-h-screen px-1 sm:px-2 py-4 w-full overflow-x-hidden">
        {/* Top Banner Ad */}
        {adsEnabled && (
          <div className="mb-6 w-full max-w-4xl">
            <DynamicAds position="top-banner" isEnabled={adsEnabled} />
          </div>
        )}

        {/* Site Description */}
        <div className="text-center mb-4 sm:mb-6 max-w-6xl mx-auto px-2">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-slate-700 dark:text-slate-300 mb-3">
            Transfer Files Instantly Between Your Devices
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-4">
            Secure peer-to-peer file sharing between Mac, PC, iPhone, iPad, and any device on your network. 
            No accounts required, no file size limits, completely free.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">✓ End-to-End Encrypted</span>
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">✓ No Data Storage</span>
            <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">✓ Cross-Platform</span>
            <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">✓ QR Code Pairing</span>
          </div>
        </div>

        {/* Large Radar View */}
        <div className="w-full max-w-none px-1 sm:px-2 lg:px-4 mb-4 sm:mb-6">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-3xl p-1 sm:p-2 lg:p-3 shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-visible relative" style={{ minHeight: '75vh' }}>
            {/* Status Info - Overlaid on Radar */}
            <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-2 text-xs text-white space-y-1">
              <div>Devices Found: {devices.length}</div>
              <div>Current Room: {currentRoom || 'None'}</div>
              <div>Your Device ID: {deviceId.slice(-8)}</div>
            </div>
            

            
            <RadarView
              devices={testMode ? devices.concat(testDevices) : devices}
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
                      <div className="font-medium mb-3">Device Identity:</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-blue-600 mb-1">Device Name (Your Call Sign)</div>
                            {isEditingName ? (
                              <div className="flex gap-2">
                                <Input
                                  value={newDeviceName}
                                  onChange={(e) => setNewDeviceName(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleDeviceNameChange();
                                    if (e.key === 'Escape') cancelNameEdit();
                                  }}
                                  className="h-8 text-sm bg-white"
                                  placeholder="Enter new device name"
                                  autoFocus
                                />
                                <Button 
                                  size="sm" 
                                  onClick={handleDeviceNameChange}
                                  className="h-8 px-3 text-xs"
                                >
                                  Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={cancelNameEdit}
                                  className="h-8 px-3 text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{deviceName}</span>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setIsEditingName(true)}
                                  className="h-6 px-2 text-xs"
                                >
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs border-t border-blue-200 pt-2">
                          <div><strong>Device ID:</strong> {deviceId.slice(-8)}... (Unique identifier for security)</div>
                          <div className="text-blue-600 mt-2">
                            Trusted devices can automatically accept transfers from each other
                          </div>
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

        {/* Footer Ad */}
        {adsEnabled && (
          <div className="mt-8 w-full max-w-4xl">
            <DynamicAds position="footer" isEnabled={adsEnabled} />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="flex justify-center space-x-6 mb-4">
              <Link href="/terms" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                Privacy Policy
              </Link>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p className="mb-2">Mac2PC - Free peer-to-peer file transfer between devices</p>
              <p>© 2025 Mac2PC. All transfers are end-to-end encrypted and never stored on our servers.</p>
            </div>
          </div>
        </div>
      </footer>

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
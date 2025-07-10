import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertDeviceSchema, insertRoomSchema, insertTransferSchema } from "@shared/schema";
import { nanoid } from "nanoid";

interface WebSocketClient extends WebSocket {
  deviceId?: string;
  roomId?: string;
  clientIP?: string;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'leave-room' | 'device-update' | 'transfer-request' | 'transfer-response' | 'transfer-progress';
  from?: string;
  to?: string;
  data?: any;
  roomId?: string;
  deviceId?: string;
  password?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for signaling
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocketClient>();
  
  // Track the first IP that connects to establish the "local network" baseline
  let firstLocalIP: string | null = null;

  // Device management API
  app.post('/api/devices', async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      res.json(device);
    } catch (error) {
      res.status(400).json({ error: 'Invalid device data' });
    }
  });

  app.get('/api/devices/:id', async (req, res) => {
    const device = await storage.getDevice(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  });

  app.patch('/api/devices/:id', async (req, res) => {
    try {
      const device = await storage.updateDevice(req.params.id, req.body);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json(device);
    } catch (error) {
      res.status(400).json({ error: 'Invalid update data' });
    }
  });

  app.get('/api/devices/room/:roomId', async (req, res) => {
    const devices = await storage.getDevicesByRoom(req.params.roomId);
    res.json(devices);
  });

  app.get('/api/devices/network/:network', async (req, res) => {
    const requestedNetwork = req.params.network;
    
    // If requesting local network devices, verify the requesting IP is actually local
    if (requestedNetwork === 'local') {
      const clientIP = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
      const requestingDeviceNetworkType = determineNetworkType(clientIP);
      
      console.log(`API request for local devices from IP: ${clientIP}, determined as: ${requestingDeviceNetworkType}`);
      
      // Only return local devices if the requesting device is also local
      if (requestingDeviceNetworkType !== 'local') {
        console.log('Remote device requested local devices - returning empty array');
        return res.json([]);
      }
    }
    
    const devices = await storage.getDevicesByNetwork(requestedNetwork);
    // Filter out the requesting device itself (remove self from list)
    const filteredDevices = devices.filter(device => device.id !== req.query.excludeId);
    res.json(filteredDevices);
  });

  app.get('/api/devices', async (req, res) => {
    const devices = await storage.getAllOnlineDevices();
    res.json(devices);
  });

  // Room management API
  app.post('/api/rooms', async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(roomData);
      res.json(room);
    } catch (error) {
      res.status(400).json({ error: 'Invalid room data' });
    }
  });

  app.get('/api/rooms/:id', async (req, res) => {
    const room = await storage.getRoom(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  });

  app.get('/api/rooms/name/:name', async (req, res) => {
    const room = await storage.getRoomByName(req.params.name);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  });

  // Transfer management API
  app.post('/api/transfers', async (req, res) => {
    try {
      const transferData = insertTransferSchema.parse(req.body);
      const transfer = await storage.createTransfer(transferData);
      res.json(transfer);
    } catch (error) {
      res.status(400).json({ error: 'Invalid transfer data' });
    }
  });

  app.patch('/api/transfers/:id', async (req, res) => {
    try {
      const transfer = await storage.updateTransfer(parseInt(req.params.id), req.body);
      if (!transfer) {
        return res.status(404).json({ error: 'Transfer not found' });
      }
      res.json(transfer);
    } catch (error) {
      res.status(400).json({ error: 'Invalid update data' });
    }
  });

  app.get('/api/transfers/device/:deviceId', async (req, res) => {
    const transfers = await storage.getTransfersByDevice(req.params.deviceId);
    res.json(transfers);
  });

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocketClient, req) => {
    // Get client IP for network detection
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    ws.clientIP = clientIP;
    console.log('New WebSocket connection from:', clientIP);

    ws.on('message', async (message: Buffer) => {
      try {
        const data: SignalingMessage = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'join-room':
            await handleJoinRoom(ws, data);
            break;
          case 'leave-room':
            await handleLeaveRoom(ws, data);
            break;
          case 'device-update':
            await handleDeviceUpdate(ws, data);
            break;
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            await handleSignaling(ws, data);
            break;
          case 'transfer-request':
            await handleTransferRequest(ws, data);
            break;
          case 'transfer-response':
            await handleTransferResponse(ws, data);
            break;
          case 'transfer-progress':
            await handleTransferProgress(ws, data);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (ws.deviceId) {
        await storage.updateDevice(ws.deviceId, { isOnline: false });
        clients.delete(ws.deviceId);
        await broadcastDeviceUpdate(ws.deviceId, ws.roomId);
      }
    });
  });

  async function handleJoinRoom(ws: WebSocketClient, data: SignalingMessage) {
    if (!data.deviceId || !data.roomId) return;

    // Leave current room if any
    if (ws.roomId && ws.roomId !== data.roomId) {
      await handleLeaveRoom(ws, { ...data, roomId: ws.roomId });
    }

    ws.deviceId = data.deviceId;
    ws.roomId = data.roomId;
    clients.set(data.deviceId, ws);

    // Create or get room
    let room = await storage.getRoomByName(data.roomId);
    if (!room) {
      // Create new room with password if provided
      room = await storage.createRoom({
        id: nanoid(),
        name: data.roomId,
        password: data.password || null
      });
    } else {
      // Check password if room exists and has one
      if (room.password && room.password !== data.password) {
        ws.send(JSON.stringify({
          type: 'room-error',
          roomId: data.roomId,
          deviceId: data.deviceId,
          message: 'Incorrect room password'
        }));
        return;
      }
    }

    // Create or update device
    let device = await storage.getDevice(data.deviceId);
    if (device) {
      await storage.updateDevice(data.deviceId, { 
        roomId: data.roomId,
        network: 'remote', // Mark as remote when joining a room
        isOnline: true,
        lastSeen: new Date()
      });
    } else if (data.data) {
      await storage.createDevice({
        ...data.data,
        id: data.deviceId,
        roomId: data.roomId,
        network: 'remote', // Always remote when in a room
        isOnline: true,
        lastSeen: new Date()
      });
    }

    // Send current room devices to the new joiner
    const roomDevices = await storage.getDevicesByRoom(data.roomId);
    ws.send(JSON.stringify({
      type: 'room-devices',
      roomId: data.roomId,
      devices: roomDevices.filter(d => d.id !== data.deviceId)
    }));

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'room-joined',
      roomId: data.roomId,
      deviceId: data.deviceId,
      message: `Joined room "${data.roomId}" successfully`
    }));

    // Broadcast to other devices in the room
    await broadcastDeviceUpdate(data.deviceId, data.roomId);
    
    console.log(`Device ${data.deviceId} joined room ${data.roomId}`);
  }

  async function handleLeaveRoom(ws: WebSocketClient, data: SignalingMessage) {
    if (!ws.deviceId) return;

    const oldRoomId = ws.roomId;
    
    await storage.updateDevice(ws.deviceId, { 
      roomId: null,
      network: 'local' // Return to local network when leaving room
    });
    
    // Notify others in the old room
    await broadcastDeviceUpdate(ws.deviceId, oldRoomId);
    
    // Send leave confirmation
    ws.send(JSON.stringify({
      type: 'room-left',
      roomId: oldRoomId,
      deviceId: ws.deviceId,
      message: `Left room "${oldRoomId}" successfully`
    }));
    
    ws.roomId = undefined;
    
    console.log(`Device ${ws.deviceId} left room ${oldRoomId}`);
  }

  function determineNetworkType(clientIP: string): 'local' | 'remote' {
    // Extract the main external IP (first IP in the chain)
    const ipArray = Array.isArray(clientIP) ? clientIP[0] : clientIP;
    const cleanIP = typeof ipArray === 'string' ? ipArray.split(',')[0].trim() : String(ipArray);
    
    // Always treat localhost/127.0.0.1 as local for development
    if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP === 'localhost') {
      return 'local';
    }
    
    // Track the first IP that connects - consider it the "local network base"
    if (!firstLocalIP) {
      const baseIP = cleanIP.split(',')[0].trim();
      firstLocalIP = baseIP;
      console.log(`Setting base local IP: ${firstLocalIP}`);
    }
    
    const currentIP = cleanIP.split(',')[0].trim();
    console.log(`Checking network type for IP: ${currentIP} vs base: ${firstLocalIP}`);
    
    // Consider devices from the same external IP as local (same home/office network)
    if (currentIP === firstLocalIP) {
      return 'local';
    }
    
    return 'remote';
  }

  async function handleDeviceUpdate(ws: WebSocketClient, data: SignalingMessage) {
    if (!data.deviceId) return;

    ws.deviceId = data.deviceId;
    clients.set(data.deviceId, ws);

    // Create or update device
    if (data.data) {
      const networkType = determineNetworkType(ws.clientIP || '');
      
      let device = await storage.getDevice(data.deviceId);
      if (device) {
        console.log(`Updating existing device ${data.deviceId} with network: ${networkType}`);
        await storage.updateDevice(data.deviceId, {
          ...data.data,
          network: networkType,
          isOnline: true,
          lastSeen: new Date()
        });
      } else {
        console.log(`Creating new device ${data.deviceId} with network: ${networkType} (IP: ${ws.clientIP})`);
        await storage.createDevice({
          ...data.data,
          id: data.deviceId,
          network: networkType,
          isOnline: true,
          lastSeen: new Date()
        });
      }
    }

    await broadcastDeviceUpdate(data.deviceId, ws.roomId);
  }

  async function handleSignaling(ws: WebSocketClient, data: SignalingMessage) {
    if (!data.to || !data.from) return;

    const targetWs = clients.get(data.to);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify(data));
    }
  }

  async function handleTransferRequest(ws: WebSocketClient, data: SignalingMessage) {
    if (!data.to || !data.from) return;

    const targetWs = clients.get(data.to);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify(data));
    }
  }

  async function handleTransferResponse(ws: WebSocketClient, data: SignalingMessage) {
    if (!data.to || !data.from) return;

    const targetWs = clients.get(data.to);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify(data));
    }
  }

  async function handleTransferProgress(ws: WebSocketClient, data: SignalingMessage) {
    if (!data.to || !data.from) return;

    const targetWs = clients.get(data.to);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify(data));
    }
  }

  async function broadcastDeviceUpdate(deviceId: string, roomId?: string) {
    const message = JSON.stringify({
      type: 'device-list-update',
      deviceId,
      roomId
    });

    // Send updated room devices to all clients in the same room
    if (roomId) {
      const roomDevices = await storage.getDevicesByRoom(roomId);
      const roomMessage = JSON.stringify({
        type: 'room-devices',
        roomId,
        devices: roomDevices
      });
      
      clients.forEach((client, clientId) => {
        if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
          client.send(roomMessage);
        }
      });
    } else {
      // For non-room updates, send the regular device-list-update
      clients.forEach((client, clientId) => {
        if (client.readyState === WebSocket.OPEN && !client.roomId) {
          client.send(message);
        }
      });
    }
  }

  return httpServer;
}

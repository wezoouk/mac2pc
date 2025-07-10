import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertDeviceSchema, insertRoomSchema, insertTransferSchema } from "@shared/schema";
import { nanoid } from "nanoid";

interface WebSocketClient extends WebSocket {
  deviceId?: string;
  roomId?: string;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'leave-room' | 'device-update' | 'transfer-request' | 'transfer-response' | 'transfer-progress';
  from?: string;
  to?: string;
  data?: any;
  roomId?: string;
  deviceId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for signaling
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocketClient>();

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
    const devices = await storage.getDevicesByNetwork(req.params.network);
    res.json(devices);
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
  wss.on('connection', (ws: WebSocketClient) => {
    console.log('New WebSocket connection');

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
        broadcastDeviceUpdate(ws.deviceId, ws.roomId);
      }
    });
  });

  async function handleJoinRoom(ws: WebSocketClient, data: SignalingMessage) {
    if (!data.deviceId || !data.roomId) return;

    ws.deviceId = data.deviceId;
    ws.roomId = data.roomId;
    clients.set(data.deviceId, ws);

    // Update device with room info
    await storage.updateDevice(data.deviceId, { 
      roomId: data.roomId, 
      isOnline: true 
    });

    // Broadcast to other devices in the room
    broadcastDeviceUpdate(data.deviceId, data.roomId);
  }

  async function handleLeaveRoom(ws: WebSocketClient, data: SignalingMessage) {
    if (!ws.deviceId) return;

    await storage.updateDevice(ws.deviceId, { roomId: null });
    broadcastDeviceUpdate(ws.deviceId, ws.roomId);
    
    ws.roomId = undefined;
  }

  async function handleDeviceUpdate(ws: WebSocketClient, data: SignalingMessage) {
    if (!data.deviceId) return;

    ws.deviceId = data.deviceId;
    clients.set(data.deviceId, ws);

    // Update device info
    if (data.data) {
      await storage.updateDevice(data.deviceId, data.data);
    }

    broadcastDeviceUpdate(data.deviceId, ws.roomId);
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

  function broadcastDeviceUpdate(deviceId: string, roomId?: string) {
    const message = JSON.stringify({
      type: 'device-list-update',
      deviceId,
      roomId
    });

    clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN && 
          (client.roomId === roomId || (!roomId && !client.roomId))) {
        client.send(message);
      }
    });
  }

  return httpServer;
}

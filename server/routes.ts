import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { insertDeviceSchema, insertRoomSchema, insertTransferSchema, insertTrustedDeviceSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import path from "path";

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

  // Serve the QR redirect page
  app.get('/qr-redirect.html', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'client', 'qr-redirect.html'));
  });

  // Serve the test page
  app.get('/test-qr-url.html', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'test-qr-url.html'));
  });

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

  // Self-destruct cleanup endpoint
  app.post('/api/transfers/cleanup', async (req, res) => {
    try {
      const cleanedCount = await storage.cleanupExpiredTransfers();
      res.json({ message: `Cleaned up ${cleanedCount} expired transfers`, count: cleanedCount });
    } catch (error) {
      console.error('Error cleaning up transfers:', error);
      res.status(500).json({ error: 'Failed to cleanup transfers' });
    }
  });

  // Get active transfers endpoint
  app.get('/api/transfers/active', async (req, res) => {
    try {
      const transfers = await storage.getActiveTransfers();
      res.json(transfers);
    } catch (error) {
      console.error('Error fetching active transfers:', error);
      res.status(500).json({ error: 'Failed to fetch active transfers' });
    }
  });

  // Public ad placement API (no auth required)
  app.get("/api/ad-placements/enabled", async (req, res) => {
    try {
      const placements = await storage.getEnabledAdPlacements();
      res.json(placements);
    } catch (error) {
      console.error("Error fetching enabled ad placements:", error);
      res.status(500).json({ message: "Failed to fetch enabled ad placements" });
    }
  });

  // Public admin settings API (no auth required)
  app.get("/api/settings", async (req, res) => {
    try {
      const demoModeSetting = await storage.getAdminSetting('demoMode');
      const adsEnabledSetting = await storage.getAdminSetting('adsEnabled');
      
      res.json({
        demoMode: demoModeSetting ? demoModeSetting.value === 'true' : false,
        adsEnabled: adsEnabledSetting ? adsEnabledSetting.value === 'true' : true
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // Admin authentication middleware
  function requireAuth(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token || token !== 'admin-session') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    next();
  }

  // Admin authentication routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      console.log("Login attempt with username:", username, "password:", password);
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }
      
      // Try to find admin by email first, then by username
      let admin = await storage.getAdminByEmail(username);
      if (!admin) {
        admin = await storage.getAdminByUsername(username);
      }
      
      console.log("Found admin:", admin ? admin.username : 'none');
      
      if (!admin || !admin.isActive) {
        console.log("Admin not found or inactive. Available admins:", await storage.getAllAdmins());
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const isValid = await bcrypt.compare(password, admin.passwordHash);
      console.log("Password valid:", isValid);
      
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Update last login
      await storage.updateAdminAuth(admin.id, { lastLogin: new Date() });
      
      res.json({ 
        success: true, 
        token: 'admin-session', // Simple token for demo
        admin: { id: admin.id, username: admin.username } 
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Protected admin routes
  app.get("/api/admin/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getAllAdminSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ message: "Failed to fetch admin settings" });
    }
  });

  app.get("/api/admin/ad-placements", requireAuth, async (req, res) => {
    try {
      const placements = await storage.getAllAdPlacements();
      res.json(placements);
    } catch (error) {
      console.error("Error fetching ad placements:", error);
      res.status(500).json({ message: "Failed to fetch ad placements" });
    }
  });

  app.post("/api/admin/ad-placements", requireAuth, async (req, res) => {
    try {
      const placement = await storage.createAdPlacement(req.body);
      res.json(placement);
    } catch (error) {
      console.error("Error creating ad placement:", error);
      res.status(500).json({ message: "Failed to create ad placement" });
    }
  });

  app.put("/api/admin/ad-placements/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const placement = await storage.updateAdPlacement(id, req.body);
      if (!placement) {
        res.status(404).json({ message: "Ad placement not found" });
        return;
      }
      res.json(placement);
    } catch (error) {
      console.error("Error updating ad placement:", error);
      res.status(500).json({ message: "Failed to update ad placement" });
    }
  });

  app.delete("/api/admin/ad-placements/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAdPlacement(id);
      res.json({ message: "Ad placement deleted successfully" });
    } catch (error) {
      console.error("Error deleting ad placement:", error);
      res.status(500).json({ message: "Failed to delete ad placement" });
    }
  });

  // Admin user management endpoints
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      const safeAdmins = admins.map(admin => ({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }));
      res.json(safeAdmins);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: 'Failed to fetch admin users' });
    }
  });

  app.post("/api/admin/users", requireAuth, async (req, res) => {
    try {
      const { username, email, password, isActive } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }
      
      // Check if username or email already exists
      const existingByUsername = await storage.getAdminByUsername(username);
      const existingByEmail = await storage.getAdminByEmail(email);
      
      if (existingByUsername) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      if (existingByEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create new admin
      const newAdmin = await storage.createAdminAuth({
        username,
        email,
        passwordHash,
        isActive: isActive !== undefined ? isActive : true
      });
      
      // Return safe admin data
      const safeAdmin = {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        isActive: newAdmin.isActive,
        lastLogin: newAdmin.lastLogin,
        createdAt: newAdmin.createdAt,
        updatedAt: newAdmin.updatedAt
      };
      
      res.json(safeAdmin);
    } catch (error) {
      console.error("Error creating admin user:", error);
      res.status(500).json({ error: 'Failed to create admin user' });
    }
  });

  app.put("/api/admin/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { username, email, isActive } = req.body;
      
      if (!username || !email) {
        return res.status(400).json({ error: 'Username and email are required' });
      }
      
      // Check if username or email already exists (excluding current user)
      const existingByUsername = await storage.getAdminByUsername(username);
      const existingByEmail = await storage.getAdminByEmail(email);
      
      if (existingByUsername && existingByUsername.id !== id) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      if (existingByEmail && existingByEmail.id !== id) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      
      // Update admin
      const updatedAdmin = await storage.updateAdminAuth(id, {
        username,
        email,
        isActive: isActive !== undefined ? isActive : true
      });
      
      if (!updatedAdmin) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      // Return safe admin data
      const safeAdmin = {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        email: updatedAdmin.email,
        isActive: updatedAdmin.isActive,
        lastLogin: updatedAdmin.lastLogin,
        createdAt: updatedAdmin.createdAt,
        updatedAt: updatedAdmin.updatedAt
      };
      
      res.json(safeAdmin);
    } catch (error) {
      console.error("Error updating admin user:", error);
      res.status(500).json({ error: 'Failed to update admin user' });
    }
  });

  app.post("/api/admin/change-password", requireAuth, async (req, res) => {
    try {
      const { adminId, currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      
      // Get admin by ID or use first admin if no ID provided
      let admin;
      if (adminId) {
        const admins = await storage.getAllAdmins();
        admin = admins.find(a => a.id === adminId);
      } else {
        const admins = await storage.getAllAdmins();
        admin = admins[0];
      }
      
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      
      // Verify current password
      const isValidCurrentPassword = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isValidCurrentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await storage.updateAdminAuth(admin.id, { 
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      });
      
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  // Password reset functionality
  app.post("/api/admin/request-reset", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      const token = await storage.generatePasswordResetToken(email);
      
      if (!token) {
        // Don't reveal if email exists or not for security
        return res.json({ success: true, message: 'If the email exists, a reset token has been generated' });
      }
      
      // In a real app, you'd send this token via email
      // For now, we'll just return it (insecure but functional for demo)
      res.json({ 
        success: true, 
        message: 'Password reset token generated',
        token: token // Remove this in production
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  });

  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }
      
      const success = await storage.resetPasswordWithToken(token, newPassword);
      
      if (!success) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }
      
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // Global ads control endpoint
  app.post("/api/admin/toggle-ads", requireAuth, async (req, res) => {
    try {
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Enabled must be a boolean' });
      }
      
      // Update all ad placements
      const allPlacements = await storage.getAllAdPlacements();
      const updatePromises = allPlacements.map(placement => 
        storage.updateAdPlacement(placement.id, { isEnabled: enabled })
      );
      
      await Promise.all(updatePromises);
      
      res.json({ success: true, message: `Ads ${enabled ? 'enabled' : 'disabled'} globally` });
    } catch (error) {
      console.error("Error toggling ads:", error);
      res.status(500).json({ error: 'Failed to toggle ads' });
    }
  });

  // Admin settings endpoints
  app.post("/api/admin/settings", requireAuth, async (req, res) => {
    try {
      const { demoMode, adsEnabled } = req.body;
      
      // Save demo mode setting
      if (demoMode !== undefined) {
        await storage.updateAdminSetting('demoMode', demoMode.toString());
      }
      
      // Save ads enabled setting
      if (adsEnabled !== undefined) {
        await storage.updateAdminSetting('adsEnabled', adsEnabled.toString());
      }
      
      res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
      console.error("Error saving admin settings:", error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  app.get("/api/admin/settings", requireAuth, async (req, res) => {
    try {
      const demoModeSetting = await storage.getAdminSetting('demoMode');
      const adsEnabledSetting = await storage.getAdminSetting('adsEnabled');
      
      res.json({
        demoMode: demoModeSetting ? demoModeSetting.value === 'true' : false,
        adsEnabled: adsEnabledSetting ? adsEnabledSetting.value === 'true' : true
      });
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // Trusted devices API routes
  app.get("/api/trusted-devices/:deviceId", async (req, res) => {
    try {
      const trustedDevices = await storage.getTrustedDevices(req.params.deviceId);
      res.json(trustedDevices);
    } catch (error) {
      console.error("Error fetching trusted devices:", error);
      res.status(500).json({ message: "Failed to fetch trusted devices" });
    }
  });

  app.post("/api/trusted-devices", async (req, res) => {
    try {
      const trustedDeviceData = insertTrustedDeviceSchema.parse(req.body);
      const trustedDevice = await storage.createTrustedDevice(trustedDeviceData);
      res.json(trustedDevice);
    } catch (error) {
      console.error("Error creating trusted device:", error);
      res.status(500).json({ message: "Failed to create trusted device" });
    }
  });

  app.put("/api/trusted-devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const trustedDevice = await storage.updateTrustedDevice(id, req.body);
      if (!trustedDevice) {
        res.status(404).json({ message: "Trusted device not found" });
        return;
      }
      res.json(trustedDevice);
    } catch (error) {
      console.error("Error updating trusted device:", error);
      res.status(500).json({ message: "Failed to update trusted device" });
    }
  });

  app.delete("/api/trusted-devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTrustedDevice(id);
      res.json({ message: "Trusted device removed successfully" });
    } catch (error) {
      console.error("Error deleting trusted device:", error);
      res.status(500).json({ message: "Failed to remove trusted device" });
    }
  });

  app.get("/api/trusted-devices/check/:deviceId/:trustedDeviceId", async (req, res) => {
    try {
      const isTrusted = await storage.isTrustedDevice(req.params.deviceId, req.params.trustedDeviceId);
      res.json({ isTrusted });
    } catch (error) {
      console.error("Error checking trusted device:", error);
      res.status(500).json({ message: "Failed to check trusted device" });
    }
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
          case 'direct-message':
            await handleDirectMessage(ws, data);
            break;
          case 'direct-file':
            await handleDirectFile(ws, data);
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

    // Set device and room IDs first
    ws.deviceId = data.deviceId;
    ws.roomId = data.roomId;
    clients.set(data.deviceId, ws);
    
    console.log(`Device ${data.deviceId} attempting to join room ${data.roomId}`);

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
    const filteredDevices = roomDevices.filter(d => d.id !== data.deviceId);
    
    console.log(`Sending room devices to ${data.deviceId}:`, filteredDevices.map(d => ({ id: d.id, name: d.name })));
    
    ws.send(JSON.stringify({
      type: 'room-devices',
      roomId: data.roomId,
      devices: filteredDevices
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

    // Check if the sender is a trusted device for auto-accepting files
    const isTrusted = await storage.isTrustedDevice(data.to, data.from);
    
    if (isTrusted) {
      // Auto-accept the transfer for trusted devices
      const autoAcceptResponse = {
        type: 'transfer-response',
        from: data.to,
        to: data.from,
        data: {
          accepted: true,
          autoAccepted: true,
          message: 'Auto-accepted from trusted device'
        }
      };
      
      const senderWs = clients.get(data.from);
      if (senderWs && senderWs.readyState === WebSocket.OPEN) {
        senderWs.send(JSON.stringify(autoAcceptResponse));
      }
    } else {
      // Normal transfer request requiring user acceptance
      const targetWs = clients.get(data.to);
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify(data));
      }
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

  async function handleDirectMessage(ws: WebSocketClient, data: any) {
    if (!data.to || !data.from) return;

    const targetWs = clients.get(data.to);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify(data));
    }
  }

  async function handleDirectFile(ws: WebSocketClient, data: any) {
    console.log('Server received file transfer:', {
      fileName: data.fileName,
      fileSize: data.fileSize,
      from: data.from,
      to: data.to,
      fromName: data.fromName
    });

    if (!data.to || !data.from) {
      console.log('Missing to or from in file transfer');
      return;
    }

    const targetWs = clients.get(data.to);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      console.log('Forwarding file to target device:', data.to);
      targetWs.send(JSON.stringify(data));
    } else {
      console.log('Target device not found or disconnected:', data.to);
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
      console.log(`Broadcasting room devices for room ${roomId}: ${roomDevices.length} devices`);
      console.log('Room devices:', roomDevices.map(d => ({ id: d.id, name: d.name })));
      
      const roomMessage = JSON.stringify({
        type: 'room-devices',
        roomId,
        devices: roomDevices
      });
      
      let sentCount = 0;
      clients.forEach((client, clientId) => {
        if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
          client.send(roomMessage);
          sentCount++;
        }
      });
      
      console.log(`Sent room devices to ${sentCount} clients in room ${roomId}`);
    } else {
      // For non-room updates, send the regular device-list-update
      clients.forEach((client, clientId) => {
        if (client.readyState === WebSocket.OPEN && !client.roomId) {
          client.send(message);
        }
      });
    }
  }

  // Start automatic cleanup scheduler for expired transfers
  setInterval(async () => {
    try {
      const cleanedCount = await storage.cleanupExpiredTransfers();
      if (cleanedCount > 0) {
        console.log(`Auto-cleanup: Removed ${cleanedCount} expired transfers`);
      }
    } catch (error) {
      console.error('Auto-cleanup error:', error);
    }
  }, 60000); // Run every minute

  return httpServer;
}

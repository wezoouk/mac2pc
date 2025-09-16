import {
  devices,
  rooms,
  transfers,
  adminSettings,
  adPlacements,
  trustedDevices,
  adminAuth,
  type Device,
  type Room,
  type Transfer,
  type AdminSetting,
  type AdPlacement,
  type TrustedDevice,
  type AdminAuth,
  type InsertDevice,
  type InsertRoom,
  type InsertTransfer,
  type InsertAdminSetting,
  type InsertAdPlacement,
  type InsertTrustedDevice,
  type InsertAdminAuth,
} from "@shared/schema";

export interface IStorage {
  // Device operations
  createDevice(device: InsertDevice): Promise<Device>;
  getDevice(id: string): Promise<Device | undefined>;
  updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined>;
  deleteDevice(id: string): Promise<void>;
  getDevicesByRoom(roomId: string): Promise<Device[]>;
  getDevicesByNetwork(network: string): Promise<Device[]>;
  getAllOnlineDevices(): Promise<Device[]>;
  
  // Room operations
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(id: string): Promise<Room | undefined>;
  getRoomByName(name: string): Promise<Room | undefined>;
  
  // Transfer operations
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;
  getTransfer(id: number): Promise<Transfer | undefined>;
  updateTransfer(id: number, updates: Partial<Transfer>): Promise<Transfer | undefined>;
  getTransfersByDevice(deviceId: string): Promise<Transfer[]>;
  
  // Self-destruct operations
  cleanupExpiredTransfers(): Promise<number>;
  getActiveTransfers(): Promise<Transfer[]>;
  
  // Admin operations
  createAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting>;
  getAdminSetting(key: string): Promise<AdminSetting | undefined>;
  updateAdminSetting(key: string, value: string): Promise<AdminSetting | undefined>;
  getAllAdminSettings(): Promise<AdminSetting[]>;
  
  // Ad placement operations
  createAdPlacement(placement: InsertAdPlacement): Promise<AdPlacement>;
  getAdPlacement(id: number): Promise<AdPlacement | undefined>;
  updateAdPlacement(id: number, updates: Partial<AdPlacement>): Promise<AdPlacement | undefined>;
  deleteAdPlacement(id: number): Promise<void>;
  getAllAdPlacements(): Promise<AdPlacement[]>;
  getEnabledAdPlacements(): Promise<AdPlacement[]>;
  
  // Trusted devices operations
  createTrustedDevice(trustedDevice: InsertTrustedDevice): Promise<TrustedDevice>;
  getTrustedDevice(deviceId: string, trustedDeviceId: string): Promise<TrustedDevice | undefined>;
  getTrustedDevices(deviceId: string): Promise<TrustedDevice[]>;
  updateTrustedDevice(id: number, updates: Partial<TrustedDevice>): Promise<TrustedDevice | undefined>;
  deleteTrustedDevice(id: number): Promise<void>;
  isTrustedDevice(deviceId: string, trustedDeviceId: string): Promise<boolean>;
  
  // Admin authentication operations
  createAdminAuth(admin: InsertAdminAuth): Promise<AdminAuth>;
  getAdminByUsername(username: string): Promise<AdminAuth | undefined>;
  getAdminByEmail(email: string): Promise<AdminAuth | undefined>;
  updateAdminAuth(id: number, updates: Partial<AdminAuth>): Promise<AdminAuth | undefined>;
  getAllAdmins(): Promise<AdminAuth[]>;
  generatePasswordResetToken(email: string): Promise<string | null>;
  resetPasswordWithToken(token: string, newPassword: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private devices: Map<string, Device>;
  private rooms: Map<string, Room>;
  private transfers: Map<number, Transfer>;
  private adminSettings: Map<string, AdminSetting>;
  private adPlacements: Map<number, AdPlacement>;
  private trustedDevices: Map<number, TrustedDevice>;
  private adminAuth: Map<number, AdminAuth>;
  private currentTransferId: number;
  private currentAdPlacementId: number;
  private currentTrustedDeviceId: number;
  private currentAdminAuthId: number;

  constructor() {
    this.devices = new Map();
    this.rooms = new Map();
    this.transfers = new Map();
    this.adminSettings = new Map();
    this.adPlacements = new Map();
    this.trustedDevices = new Map();
    this.adminAuth = new Map();
    this.currentTransferId = 1;
    this.currentAdPlacementId = 1;
    this.currentTrustedDeviceId = 1;
    this.currentAdminAuthId = 1;
    
    // Initialize with default ad placements and admin account
    this.initializeDefaultAdPlacements();
    this.initializeDefaultAdmin();
  }
  
  private async initializeDefaultAdmin() {
    // Create default admin account with email "davwez@gmail.com" and password "we5ton99!!"
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('we5ton99!!', 10);
    
    const defaultAdmin: AdminAuth = {
      id: this.currentAdminAuthId++,
      username: "davwez",
      email: "davwez@gmail.com",
      passwordHash: passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.adminAuth.set(defaultAdmin.id, defaultAdmin);
    console.log("Created default admin:", defaultAdmin.username, "with ID:", defaultAdmin.id);
  }
  
  private async initializeDefaultAdPlacements() {
    // Create default ad placements
    const defaultPlacements = [
      {
        name: "Top Banner",
        position: "top-banner",
        adClient: "ca-pub-1630199465253721",
        adSlot: "1111111111",
        adFormat: "banner",
        isEnabled: true,
        priority: 1,
      },
      {
        name: "Sidebar Ad",
        position: "sidebar",
        adClient: "ca-pub-1630199465253721", 
        adSlot: "2222222222",
        adFormat: "rectangle",
        isEnabled: true,
        priority: 2,
      },
      {
        name: "Main Banner",
        position: "between-content",
        adClient: "ca-pub-1630199465253721",
        adSlot: "3333333333",
        adFormat: "auto",
        isEnabled: true,
        priority: 3,
      },
      {
        name: "Footer Ad",
        position: "footer",
        adClient: "ca-pub-1630199465253721",
        adSlot: "4444444444", 
        adFormat: "banner",
        isEnabled: true,
        priority: 4,
      }
    ];
    
    for (const placement of defaultPlacements) {
      await this.createAdPlacement(placement);
    }
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const device: Device = {
      ...insertDevice,
      roomId: insertDevice.roomId || null,
      network: insertDevice.network || null,
      isOnline: true,
      lastSeen: new Date(),
    };
    this.devices.set(device.id, device);
    return device;
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updated = { ...device, ...updates };
    this.devices.set(id, updated);
    return updated;
  }

  async deleteDevice(id: string): Promise<void> {
    this.devices.delete(id);
  }

  async getDevicesByRoom(roomId: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(
      (device) => device.roomId === roomId && device.isOnline
    );
  }

  async getDevicesByNetwork(network: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(
      (device) => device.network === network && device.isOnline
    );
  }

  async getAllOnlineDevices(): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(
      (device) => device.isOnline
    );
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const room: Room = {
      ...insertRoom,
      createdAt: new Date(),
    };
    this.rooms.set(room.id, room);
    return room;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getRoomByName(name: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(
      (room) => room.name === name
    );
  }

  async createTransfer(insertTransfer: InsertTransfer): Promise<Transfer> {
    const id = this.currentTransferId++;
    
    // Calculate expiration time if self-destruct timer is set
    let expiresAt = null;
    if (insertTransfer.selfDestructTimer && insertTransfer.selfDestructTimer > 0) {
      expiresAt = new Date(Date.now() + insertTransfer.selfDestructTimer * 1000);
    }
    
    const transfer: Transfer = {
      ...insertTransfer,
      id,
      fileName: insertTransfer.fileName || null,
      fileSize: insertTransfer.fileSize || null,
      messageText: insertTransfer.messageText || null,
      progress: 0,
      expiresAt,
      isExpired: false,
      selfDestructTimer: insertTransfer.selfDestructTimer || null,
      createdAt: new Date(),
    };
    this.transfers.set(id, transfer);
    return transfer;
  }

  async getTransfer(id: number): Promise<Transfer | undefined> {
    return this.transfers.get(id);
  }

  async updateTransfer(id: number, updates: Partial<Transfer>): Promise<Transfer | undefined> {
    const transfer = this.transfers.get(id);
    if (!transfer) return undefined;
    
    const updated = { ...transfer, ...updates };
    this.transfers.set(id, updated);
    return updated;
  }

  async getTransfersByDevice(deviceId: string): Promise<Transfer[]> {
    return Array.from(this.transfers.values()).filter(
      (transfer) => transfer.fromDeviceId === deviceId || transfer.toDeviceId === deviceId
    );
  }

  // Self-destruct operations
  async cleanupExpiredTransfers(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [id, transfer] of this.transfers.entries()) {
      if (transfer.expiresAt && now >= transfer.expiresAt && !transfer.isExpired) {
        // Mark as expired
        await this.updateTransfer(id, { isExpired: true });
        // Remove from storage after marking as expired
        this.transfers.delete(id);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  async getActiveTransfers(): Promise<Transfer[]> {
    const now = new Date();
    return Array.from(this.transfers.values()).filter(
      (transfer) => !transfer.isExpired && (!transfer.expiresAt || now < transfer.expiresAt)
    );
  }
  
  // Admin settings operations
  async createAdminSetting(insertSetting: InsertAdminSetting): Promise<AdminSetting> {
    const setting: AdminSetting = {
      id: Math.floor(Math.random() * 1000000),
      ...insertSetting,
      value: insertSetting.value || null,
      description: insertSetting.description || null,
      category: insertSetting.category || "general",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.adminSettings.set(setting.key, setting);
    return setting;
  }

  async getAdminSetting(key: string): Promise<AdminSetting | undefined> {
    return this.adminSettings.get(key);
  }

  async updateAdminSetting(key: string, value: string): Promise<AdminSetting | undefined> {
    const setting = this.adminSettings.get(key);
    if (!setting) return undefined;
    
    const updated = { ...setting, value, updatedAt: new Date() };
    this.adminSettings.set(key, updated);
    return updated;
  }

  async getAllAdminSettings(): Promise<AdminSetting[]> {
    return Array.from(this.adminSettings.values());
  }
  
  // Ad placement operations
  async createAdPlacement(insertPlacement: InsertAdPlacement): Promise<AdPlacement> {
    const id = this.currentAdPlacementId++;
    const placement: AdPlacement = {
      ...insertPlacement,
      id,
      adClient: insertPlacement.adClient || null,
      adSlot: insertPlacement.adSlot || null,
      adFormat: insertPlacement.adFormat || "auto",
      isEnabled: insertPlacement.isEnabled ?? true,
      priority: insertPlacement.priority || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.adPlacements.set(id, placement);
    return placement;
  }

  async getAdPlacement(id: number): Promise<AdPlacement | undefined> {
    return this.adPlacements.get(id);
  }

  async updateAdPlacement(id: number, updates: Partial<AdPlacement>): Promise<AdPlacement | undefined> {
    const placement = this.adPlacements.get(id);
    if (!placement) return undefined;
    
    const updated = { ...placement, ...updates, updatedAt: new Date() };
    this.adPlacements.set(id, updated);
    return updated;
  }

  async deleteAdPlacement(id: number): Promise<void> {
    this.adPlacements.delete(id);
  }

  async getAllAdPlacements(): Promise<AdPlacement[]> {
    return Array.from(this.adPlacements.values()).sort((a, b) => a.priority - b.priority);
  }

  async getEnabledAdPlacements(): Promise<AdPlacement[]> {
    return Array.from(this.adPlacements.values())
      .filter(placement => placement.isEnabled)
      .sort((a, b) => a.priority - b.priority);
  }

  // Trusted devices operations
  async createTrustedDevice(insertTrustedDevice: InsertTrustedDevice): Promise<TrustedDevice> {
    const id = this.currentTrustedDeviceId++;
    const trustedDevice: TrustedDevice = {
      id,
      deviceId: insertTrustedDevice.deviceId,
      trustedDeviceId: insertTrustedDevice.trustedDeviceId,
      deviceName: insertTrustedDevice.deviceName,
      trustedDeviceName: insertTrustedDevice.trustedDeviceName,
      autoAcceptFiles: insertTrustedDevice.autoAcceptFiles ?? true,
      autoAcceptMessages: insertTrustedDevice.autoAcceptMessages ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.trustedDevices.set(id, trustedDevice);
    return trustedDevice;
  }

  async getTrustedDevice(deviceId: string, trustedDeviceId: string): Promise<TrustedDevice | undefined> {
    return Array.from(this.trustedDevices.values())
      .find(td => td.deviceId === deviceId && td.trustedDeviceId === trustedDeviceId);
  }

  async getTrustedDevices(deviceId: string): Promise<TrustedDevice[]> {
    return Array.from(this.trustedDevices.values())
      .filter(td => td.deviceId === deviceId);
  }

  async updateTrustedDevice(id: number, updates: Partial<TrustedDevice>): Promise<TrustedDevice | undefined> {
    const trustedDevice = this.trustedDevices.get(id);
    if (!trustedDevice) return undefined;
    
    const updated = { ...trustedDevice, ...updates, updatedAt: new Date() };
    this.trustedDevices.set(id, updated);
    return updated;
  }

  async deleteTrustedDevice(id: number): Promise<void> {
    this.trustedDevices.delete(id);
  }

  async isTrustedDevice(deviceId: string, trustedDeviceId: string): Promise<boolean> {
    const trustedDevice = await this.getTrustedDevice(deviceId, trustedDeviceId);
    return trustedDevice !== undefined;
  }

  // Admin authentication operations
  async createAdminAuth(insertAdmin: InsertAdminAuth): Promise<AdminAuth> {
    const id = this.currentAdminAuthId++;
    const admin: AdminAuth = {
      id,
      username: insertAdmin.username,
      email: insertAdmin.email,
      passwordHash: insertAdmin.passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      isActive: insertAdmin.isActive ?? true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.adminAuth.set(id, admin);
    return admin;
  }

  async getAdminByUsername(username: string): Promise<AdminAuth | undefined> {
    return Array.from(this.adminAuth.values())
      .find(admin => admin.username === username);
  }

  async getAdminByEmail(email: string): Promise<AdminAuth | undefined> {
    return Array.from(this.adminAuth.values())
      .find(admin => admin.email === email);
  }

  async updateAdminAuth(id: number, updates: Partial<AdminAuth>): Promise<AdminAuth | undefined> {
    const admin = this.adminAuth.get(id);
    if (!admin) return undefined;
    
    const updated = { ...admin, ...updates, updatedAt: new Date() };
    this.adminAuth.set(id, updated);
    return updated;
  }

  async getAllAdmins(): Promise<AdminAuth[]> {
    return Array.from(this.adminAuth.values());
  }

  async generatePasswordResetToken(email: string): Promise<string | null> {
    const admin = await this.getAdminByEmail(email);
    if (!admin || !admin.isActive) return null;
    
    // Generate a secure random token
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour from now
    
    await this.updateAdminAuth(admin.id, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });
    
    return token;
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
    const admin = Array.from(this.adminAuth.values())
      .find(a => a.resetToken === token && a.resetTokenExpiry && a.resetTokenExpiry > new Date());
    
    if (!admin) return false;
    
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await this.updateAdminAuth(admin.id, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    });
    
    return true;
  }
}

export const storage = new MemStorage();

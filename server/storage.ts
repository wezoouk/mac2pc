import { devices, rooms, transfers, type Device, type Room, type Transfer, type InsertDevice, type InsertRoom, type InsertTransfer } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private devices: Map<string, Device>;
  private rooms: Map<string, Room>;
  private transfers: Map<number, Transfer>;
  private currentTransferId: number;

  constructor() {
    this.devices = new Map();
    this.rooms = new Map();
    this.transfers = new Map();
    this.currentTransferId = 1;
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
    const transfer: Transfer = {
      ...insertTransfer,
      id,
      fileName: insertTransfer.fileName || null,
      fileSize: insertTransfer.fileSize || null,
      messageText: insertTransfer.messageText || null,
      progress: 0,
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
}

export const storage = new MemStorage();

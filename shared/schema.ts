import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const devices = pgTable("devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'desktop', 'mobile', 'tablet'
  roomId: text("room_id"),
  isOnline: boolean("is_online").default(true),
  lastSeen: timestamp("last_seen").defaultNow(),
  network: text("network"),
});

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  password: text("password"), // Optional password for room protection
  createdAt: timestamp("created_at").defaultNow(),
});

export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  fromDeviceId: text("from_device_id").notNull(),
  toDeviceId: text("to_device_id").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  messageText: text("message_text"),
  status: text("status").notNull(), // 'pending', 'accepted', 'declined', 'completed', 'failed'
  progress: integer("progress").default(0),
  expiresAt: timestamp("expires_at"), // When the message should self-destruct
  isExpired: boolean("is_expired").default(false),
  selfDestructTimer: integer("self_destruct_timer"), // Timer in seconds (e.g., 30, 300, 3600)
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin settings table
export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: text("value"),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ad placements table
export const adPlacements = pgTable("ad_placements", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  position: varchar("position", { length: 50 }).notNull(), // 'header', 'sidebar', 'footer', 'between-content'
  adClient: varchar("ad_client", { length: 100 }),
  adSlot: varchar("ad_slot", { length: 100 }),
  adFormat: varchar("ad_format", { length: 50 }).default("auto"),
  isEnabled: boolean("is_enabled").default(true),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trusted devices table for auto-accept functionality
export const trustedDevices = pgTable("trusted_devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  trustedDeviceId: text("trusted_device_id").notNull(),
  deviceName: text("device_name").notNull(),
  trustedDeviceName: text("trusted_device_name").notNull(),
  autoAcceptFiles: boolean("auto_accept_files").default(true),
  autoAcceptMessages: boolean("auto_accept_messages").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin authentication table
export const adminAuth = pgTable("admin_auth", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDeviceSchema = createInsertSchema(devices).pick({
  id: true,
  name: true,
  type: true,
  roomId: true,
  network: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  id: true,
  name: true,
  password: true,
});

export const insertTransferSchema = createInsertSchema(transfers).pick({
  fromDeviceId: true,
  toDeviceId: true,
  fileName: true,
  fileSize: true,
  messageText: true,
  status: true,
  selfDestructTimer: true,
});

export const insertAdPlacementSchema = createInsertSchema(adPlacements).pick({
  name: true,
  position: true,
  adClient: true,
  adSlot: true,
  adFormat: true,
  isEnabled: true,
  priority: true,
});

export const insertAdminSettingSchema = createInsertSchema(adminSettings).pick({
  key: true,
  value: true,
  description: true,
  category: true,
});

export const insertTrustedDeviceSchema = createInsertSchema(trustedDevices).pick({
  deviceId: true,
  trustedDeviceId: true,
  deviceName: true,
  trustedDeviceName: true,
  autoAcceptFiles: true,
  autoAcceptMessages: true,
});

export const insertAdminAuthSchema = createInsertSchema(adminAuth).pick({
  username: true,
  passwordHash: true,
  isActive: true,
});

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfers.$inferSelect;
export type InsertAdPlacement = z.infer<typeof insertAdPlacementSchema>;
export type AdPlacement = typeof adPlacements.$inferSelect;
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertTrustedDevice = z.infer<typeof insertTrustedDeviceSchema>;
export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type InsertAdminAuth = z.infer<typeof insertAdminAuthSchema>;
export type AdminAuth = typeof adminAuth.$inferSelect;

import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow(),
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
});

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfers.$inferSelect;

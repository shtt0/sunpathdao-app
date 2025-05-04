import { pgTable, text, serial, decimal, timestamp, boolean, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  submissions: many(submissions),
}));

export const insertUserSchema = createInsertSchema(users, {
  walletAddress: (schema) => schema.min(10, "Wallet address must be at least 10 characters"),
});
export type UserInsert = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  routeData: json("route_data"), // Google Maps route data in JSON format
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("available"), // available, in_progress, judging, completed, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  transactionId: text("transaction_id"), // Solana transaction ID for locking funds
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  submissions: many(submissions),
}));

export const insertTaskSchema = createInsertSchema(tasks, {
  title: (schema) => schema.min(5, "Title must be at least 5 characters"),
  description: (schema) => schema.min(10, "Description must be at least 10 characters"),
  country: (schema) => schema.min(2, "Country must be at least 2 characters"),
  city: (schema) => schema.min(2, "City must be at least 2 characters"),
  startLocation: (schema) => schema.min(3, "Start location must be at least 3 characters"),
  endLocation: (schema) => schema.min(3, "End location must be at least 3 characters"),
  rewardAmount: (schema) => schema.refine(value => parseFloat(value) > 0, "Reward amount must be positive"),
});
export type TaskInsert = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Submissions table
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  taskId: serial("task_id").references(() => tasks.id).notNull(),
  userId: serial("user_id").references(() => users.id).notNull(),
  videoUrl: text("video_url").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  transactionId: text("transaction_id"), // Solana transaction ID for reward payment
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const submissionsRelations = relations(submissions, ({ one }) => ({
  task: one(tasks, {
    fields: [submissions.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
}));

export const insertSubmissionSchema = createInsertSchema(submissions, {
  videoUrl: (schema) => schema.min(5, "Video URL must be at least 5 characters"),
});
export type SubmissionInsert = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

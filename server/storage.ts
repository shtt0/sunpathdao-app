import { db } from "@db";
import {
  tasks,
  users,
  submissions,
  Task,
  User,
  Submission,
  insertTaskSchema,
  insertUserSchema,
  insertSubmissionSchema
} from "@shared/schema";
import { eq, and, desc, asc, like, gte, lt, or } from "drizzle-orm";
import { z } from "zod";
import { TaskFilters } from "@shared/types";
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const storage = {
  // User operations
  async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    const result = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });
    
    return result || null;
  },
  
  async createUser(userData: z.infer<typeof insertUserSchema>): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByWalletAddress(userData.walletAddress);
    
    if (existingUser) {
      return existingUser;
    }
    
    // Create new user
    const [newUser] = await db.insert(users).values(userData).returning();
    return newUser;
  },
  
  // Task operations
  async getTasks(filters: TaskFilters): Promise<{ tasks: Task[], totalCount: number }> {
    const { search, country, status, sortBy, page = 1, limit = 10, userId } = filters;
    
    // Build the WHERE conditions
    const conditions = [];
    
    if (userId !== undefined) {
      conditions.push(eq(tasks.userId, userId));
    }
    
    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    
    if (country) {
      conditions.push(eq(tasks.country, country));
    }
    
    if (search) {
      conditions.push(
        or(
          like(tasks.title, `%${search}%`),
          like(tasks.description, `%${search}%`),
          like(tasks.city, `%${search}%`),
          like(tasks.startLocation, `%${search}%`),
          like(tasks.endLocation, `%${search}%`)
        )
      );
    }
    
    // Prepare order by
    let orderByOption;
    if (sortBy) {
      switch (sortBy) {
        case 'newest':
          orderByOption = desc(tasks.createdAt);
          break;
        case 'oldest':
          orderByOption = asc(tasks.createdAt);
          break;
        case 'reward-high':
          orderByOption = desc(tasks.rewardAmount);
          break;
        case 'reward-low':
          orderByOption = asc(tasks.rewardAmount);
          break;
        case 'expiry':
          orderByOption = asc(tasks.expiresAt);
          break;
        default:
          orderByOption = desc(tasks.createdAt);
      }
    } else {
      orderByOption = desc(tasks.createdAt);
    }
    
    // Get total count first
    let countQuery = db.select().from(tasks);
    for (const condition of conditions) {
      countQuery = countQuery.where(condition);
    }
    const countResult = await countQuery;
    const totalCount = countResult.length;
    
    // Then get paginated results
    let query = db.select().from(tasks);
    for (const condition of conditions) {
      query = query.where(condition);
    }
    query = query.orderBy(orderByOption);
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);
    
    // Get the tasks
    const taskResults = await query;
    
    return {
      tasks: taskResults,
      totalCount,
    };
  },
  
  async getTaskById(id: number): Promise<Task | null> {
    const result = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });
    
    return result || null;
  },
  
  async getTaskWithCommissioner(id: number): Promise<{ task: Task, commissioner: User } | null> {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });
    
    if (!task) return null;
    
    const commissioner = await db.query.users.findFirst({
      where: eq(users.id, task.userId),
    });
    
    if (!commissioner) return null;
    
    return { task, commissioner };
  },
  
  async createTask(taskData: z.infer<typeof insertTaskSchema>): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(taskData).returning();
    return newTask;
  },
  
  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | null> {
    const [updatedTask] = await db.update(tasks)
      .set({
        ...taskData,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    
    return updatedTask || null;
  },
  
  async increaseTaskReward(id: number, additionalAmount: number): Promise<Task | null> {
    const task = await this.getTaskById(id);
    
    if (!task) return null;
    
    const currentReward = Number(task.rewardAmount);
    const newReward = currentReward + additionalAmount;
    
    // Convert back to string since rewardAmount is stored as string
    return this.updateTask(id, { rewardAmount: newReward.toString() });
  },
  
  async updateTaskStatus(id: number, status: string): Promise<Task | null> {
    return this.updateTask(id, { status: status as Task['status'] });
  },
  
  // Submission operations
  async getSubmissions(
    filters: {
      userId?: number;
      taskId?: number;
      status?: string;
      page: number;
      limit: number;
    }
  ): Promise<{ submissions: any[], totalCount: number }> {
    const { userId, taskId, status, page = 1, limit = 10 } = filters;
    
    // Build the WHERE conditions
    const conditions = [];
    
    if (taskId !== undefined) {
      conditions.push(eq(submissions.taskId, taskId));
    }
    
    if (userId !== undefined) {
      conditions.push(eq(submissions.userId, userId));
    }
    
    if (status) {
      conditions.push(eq(submissions.status, status));
    }
    
    // Get total count first
    let countQuery = db.select().from(submissions);
    for (const condition of conditions) {
      countQuery = countQuery.where(condition);
    }
    const countResult = await countQuery;
    const totalCount = countResult.length;
    
    // Then get paginated results
    let query = db.select().from(submissions);
    for (const condition of conditions) {
      query = query.where(condition);
    }
    
    // Apply sort - most recent first
    query = query.orderBy(desc(submissions.createdAt));
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);
    
    // Execute query
    const submissionResults = await query;
    
    // Fetch related tasks for each submission
    const submissionsWithTasks = await Promise.all(
      submissionResults.map(async (submission) => {
        const task = await db.query.tasks.findFirst({
          where: eq(tasks.id, submission.taskId),
        });
        
        return {
          ...submission,
          task,
        };
      })
    );
    
    return {
      submissions: submissionsWithTasks,
      totalCount,
    };
  },
  
  async getSubmissionById(id: number): Promise<Submission | null> {
    const result = await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
    });
    
    return result || null;
  },
  
  async getSubmissionByTaskId(taskId: number): Promise<any | null> {
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.taskId, taskId),
    });
    
    if (!submission) return null;
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, submission.userId),
    });
    
    return {
      ...submission,
      runner: user,
    };
  },
  
  async saveVideoFile(base64Data: string): Promise<string> {
    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:video\/\w+;base64,/, '');
    
    // Generate a unique filename
    const filename = `${crypto.randomUUID()}.webm`;
    const filePath = path.join(uploadsDir, filename);
    
    // Save the file
    fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
    
    // Return the filename (not the full path for security reasons)
    return filename;
  },
  
  async createSubmission(submissionData: any): Promise<Submission> {
    const [newSubmission] = await db.insert(submissions).values(submissionData).returning();
    
    // Update task status to 'judging'
    await this.updateTaskStatus(submissionData.taskId, 'judging');
    
    return newSubmission;
  },
  
  async updateSubmission(id: number, submissionData: Partial<Submission>): Promise<Submission | null> {
    const [updatedSubmission] = await db.update(submissions)
      .set({
        ...submissionData,
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, id))
      .returning();
    
    return updatedSubmission || null;
  },
  
  async acceptSubmission(id: number, transactionId: string): Promise<Submission | null> {
    const submission = await this.getSubmissionById(id);
    
    if (!submission) return null;
    
    // Update submission status and transaction ID
    const updatedSubmission = await this.updateSubmission(id, {
      status: 'accepted',
      transactionId,
    });
    
    if (!updatedSubmission) return null;
    
    // Update task status to 'completed'
    await this.updateTaskStatus(submission.taskId, 'completed');
    
    return updatedSubmission;
  },
  
  async declineSubmission(id: number): Promise<Submission | null> {
    const submission = await this.getSubmissionById(id);
    
    if (!submission) return null;
    
    // Update submission status
    const updatedSubmission = await this.updateSubmission(id, {
      status: 'rejected',
    });
    
    if (!updatedSubmission) return null;
    
    // Update task status back to 'available'
    await this.updateTaskStatus(submission.taskId, 'available');
    
    return updatedSubmission;
  },
};
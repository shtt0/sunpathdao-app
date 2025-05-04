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
    
    let query = db.select().from(tasks);
    let countQuery = db.select({ count: db.count() }).from(tasks);
    
    // Apply filters
    const whereConditions = [];
    
    if (userId !== undefined) {
      whereConditions.push(eq(tasks.userId, userId));
    }
    
    if (status) {
      whereConditions.push(eq(tasks.status, status));
    }
    
    if (country) {
      whereConditions.push(eq(tasks.country, country));
    }
    
    if (search) {
      whereConditions.push(
        or(
          like(tasks.title, `%${search}%`),
          like(tasks.description, `%${search}%`),
          like(tasks.city, `%${search}%`),
          like(tasks.startLocation, `%${search}%`),
          like(tasks.endLocation, `%${search}%`)
        )
      );
    }
    
    if (whereConditions.length > 0) {
      // Apply all conditions with AND
      const condition = whereConditions.reduce((acc, curr) => and(acc, curr));
      query = query.where(condition);
      countQuery = countQuery.where(condition);
    }
    
    // Apply sort
    if (sortBy) {
      switch (sortBy) {
        case 'newest':
          query = query.orderBy(desc(tasks.createdAt));
          break;
        case 'oldest':
          query = query.orderBy(asc(tasks.createdAt));
          break;
        case 'reward-high':
          query = query.orderBy(desc(tasks.rewardAmount));
          break;
        case 'reward-low':
          query = query.orderBy(asc(tasks.rewardAmount));
          break;
        case 'expiry':
          query = query.orderBy(asc(tasks.expiresAt));
          break;
        default:
          query = query.orderBy(desc(tasks.createdAt));
      }
    } else {
      // Default sort by newest
      query = query.orderBy(desc(tasks.createdAt));
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);
    
    // Execute queries
    const [taskResults, countResults] = await Promise.all([
      query,
      countQuery,
    ]);
    
    const totalCount = Number(countResults[0]?.count || 0);
    
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
      with: {
        user: true,
      },
    });
    
    if (!task) return null;
    
    return {
      task,
      commissioner: task.user,
    };
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
    
    if (task.status !== 'available') {
      throw new Error('Only available tasks can have their reward increased');
    }
    
    // Calculate new reward amount
    const currentReward = Number(task.rewardAmount);
    const newReward = currentReward + additionalAmount;
    
    // Update task
    return this.updateTask(id, { rewardAmount: newReward });
  },
  
  async updateTaskStatus(id: number, status: string): Promise<Task | null> {
    return this.updateTask(id, { status });
  },
  
  // Submission operations
  async getSubmissions(
    userId?: number,
    status?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ submissions: any[], totalCount: number }> {
    let query = db.select().from(submissions);
    let countQuery = db.select({ count: db.count() }).from(submissions);
    
    // Apply filters
    const whereConditions = [];
    
    if (userId !== undefined) {
      whereConditions.push(eq(submissions.userId, userId));
    }
    
    if (status) {
      whereConditions.push(eq(submissions.status, status));
    }
    
    if (whereConditions.length > 0) {
      // Apply all conditions with AND
      const condition = whereConditions.reduce((acc, curr) => and(acc, curr));
      query = query.where(condition);
      countQuery = countQuery.where(condition);
    }
    
    // Apply sort - most recent first
    query = query.orderBy(desc(submissions.createdAt));
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);
    
    // Execute queries
    const [submissionResults, countResults] = await Promise.all([
      query,
      countQuery,
    ]);
    
    const totalCount = Number(countResults[0]?.count || 0);
    
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
      orderBy: desc(submissions.createdAt),
    });
    
    if (!submission) return null;
    
    // Get runner information
    const runner = await db.query.users.findFirst({
      where: eq(users.id, submission.userId),
    });
    
    if (!runner) return null;
    
    return {
      submission,
      runner,
    };
  },
  
  async saveVideoFile(base64Data: string): Promise<string> {
    // Generate a random filename
    const fileName = `${crypto.randomUUID()}.webm`;
    const filePath = path.join(uploadsDir, fileName);
    
    // Convert base64 to buffer and save file
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    // Return the file URL
    return `/uploads/${fileName}`;
  },
  
  async createSubmission(submissionData: any): Promise<Submission> {
    // Save video file
    const videoUrl = await this.saveVideoFile(submissionData.videoData);
    
    // Create submission record
    const [newSubmission] = await db.insert(submissions).values({
      taskId: submissionData.taskId,
      userId: submissionData.userId,
      videoUrl,
      startTime: new Date(submissionData.startTime),
      endTime: new Date(submissionData.endTime),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
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

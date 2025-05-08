import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertTaskSchema } from '@shared/schema';
import { z } from 'zod';
import { TaskFilters } from '@shared/types';

export const TaskController = {
  // Get tasks with filtering, sorting, and pagination
  async getTasks(req: Request, res: Response) {
    try {
      const { 
        search, 
        country, 
        status, 
        sortBy, 
        page = '1',
        limit = '10',
        userId
      } = req.query;
      
      const filters: TaskFilters = {
        search: search as string | undefined,
        country: country as string | undefined,
        status: status as any,
        sortBy: sortBy as any,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        userId: userId ? parseInt(userId as string) : undefined
      };
      
      const { tasks, totalCount } = await storage.getTasks(filters);
      
      res.json({ tasks, totalCount });
    } catch (error) {
      console.error('Error getting tasks:', error);
      res.status(500).json({ message: 'Failed to get tasks' });
    }
  },
  
  // Get a task by ID with commissioner (task creator) information
  async getTaskById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const taskWithCommissioner = await storage.getTaskWithCommissioner(parseInt(id));
      
      if (!taskWithCommissioner) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json(taskWithCommissioner);
    } catch (error) {
      console.error('Error getting task:', error);
      res.status(500).json({ message: 'Failed to get task' });
    }
  },
  
  // Create a new task
  async createTask(req: Request, res: Response) {
    try {
      // Pre-process the expiresAt field - convert string to Date object
      const requestData = { 
        ...req.body,
        // If expiresAt is a string that looks like a date, convert it to a Date object
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined
      };
      
      console.log('Processing task data with parsed date:', requestData);
      
      // Parse and validate request body
      const taskData = insertTaskSchema.parse(requestData);
      
      // If Solana transaction related data is provided
      const transactionId = req.body.transactionId;
      
      // Create task
      const newTask = await storage.createTask({
        ...taskData,
        transactionId,
        status: 'available',
      });
      
      res.status(201).json(newTask);
    } catch (error) {
      console.error('Error creating task:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create task' });
    }
  },
  
  // Increase task reward
  async increaseTaskReward(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { additionalAmount } = req.body;
      
      if (!additionalAmount || typeof additionalAmount !== 'number' || additionalAmount <= 0) {
        return res.status(400).json({ message: 'Invalid additional amount' });
      }
      
      const updatedTask = await storage.increaseTaskReward(parseInt(id), additionalAmount);
      
      if (!updatedTask) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error increasing task reward:', error);
      res.status(500).json({ message: 'Failed to increase task reward' });
    }
  }
};

import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertUserSchema } from '@shared/schema';
import { z } from 'zod';

export const UserController = {
  // Get a user by wallet address
  async getUserByWalletAddress(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ user });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  },
  
  // Create a new user or get existing user if wallet address already exists
  async createUser(req: Request, res: Response) {
    try {
      // Parse and validate request body
      const userData = insertUserSchema.parse(req.body);
      
      // Create user (or get existing)
      const user = await storage.createUser(userData);
      
      res.status(201).json({ user });
    } catch (error) {
      console.error('Error creating user:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create user' });
    }
  }
};

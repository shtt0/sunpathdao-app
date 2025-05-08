import { Request, Response } from 'express';
import { storage } from '../storage';

export const SubmissionController = {
  // Get submissions with filtering and pagination
  async getSubmissions(req: Request, res: Response) {
    try {
      const { 
        userId, 
        status,
        page = '1',
        limit = '10'
      } = req.query;
      
      const { submissions, totalCount } = await storage.getSubmissions({
        userId: userId ? parseInt(userId as string) : undefined,
        status: status as string | undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      
      res.json({ submissions, totalCount });
    } catch (error) {
      console.error('Error getting submissions:', error);
      res.status(500).json({ message: 'Failed to get submissions' });
    }
  },
  
  // Get a submission by ID
  async getSubmissionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const submission = await storage.getSubmissionById(parseInt(id));
      
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      
      res.json({ submission });
    } catch (error) {
      console.error('Error getting submission:', error);
      res.status(500).json({ message: 'Failed to get submission' });
    }
  },
  
  // Get submissions for a task
  async getSubmissionsByTaskId(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const submissionData = await storage.getSubmissionByTaskId(parseInt(taskId));
      
      if (!submissionData) {
        return res.status(404).json({ message: 'No submission found for this task' });
      }
      
      res.json(submissionData);
    } catch (error) {
      console.error('Error getting submission by task:', error);
      res.status(500).json({ message: 'Failed to get submission' });
    }
  },
  
  // Create a new submission
  async createSubmission(req: Request, res: Response) {
    try {
      const { taskId, videoData, startTime, endTime } = req.body;
      
      if (!taskId || !videoData || !startTime || !endTime) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // First, get the task to check its status
      const task = await storage.getTaskById(parseInt(taskId));
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      if (task.status !== 'available') {
        return res.status(400).json({ message: 'This task is not available for submission' });
      }
      
      // Ensure user exists
      const walletAddress = req.body.walletAddress;
      let userId = req.body.userId;
      
      if (!userId && walletAddress) {
        // If userId not provided but walletAddress is, get or create user
        const user = await storage.createUser({ walletAddress });
        userId = user.id;
      }
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID or wallet address is required' });
      }
      
      // Save video data to file
      const videoUrl = await storage.saveVideoFile(videoData);
      
      // Parse date strings to actual Date objects
      const parsedStartTime = new Date(startTime);
      const parsedEndTime = new Date(endTime);
      
      // Create submission
      const newSubmission = await storage.createSubmission({
        taskId: parseInt(taskId),
        userId,
        videoUrl, // Use the URL of the saved video file
        startTime: parsedStartTime,
        endTime: parsedEndTime
      });
      
      res.status(201).json({ submission: newSubmission });
    } catch (error) {
      console.error('Error creating submission:', error);
      res.status(500).json({ message: 'Failed to create submission' });
    }
  },
  
  // Accept a submission
  async acceptSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { transactionId } = req.body;
      
      if (!transactionId) {
        return res.status(400).json({ message: 'Transaction ID is required' });
      }
      
      const submission = await storage.acceptSubmission(parseInt(id), transactionId);
      
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      
      res.json({ submission });
    } catch (error) {
      console.error('Error accepting submission:', error);
      res.status(500).json({ message: 'Failed to accept submission' });
    }
  },
  
  // Decline a submission
  async declineSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const submission = await storage.declineSubmission(parseInt(id));
      
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      
      res.json({ submission });
    } catch (error) {
      console.error('Error declining submission:', error);
      res.status(500).json({ message: 'Failed to decline submission' });
    }
  }
};

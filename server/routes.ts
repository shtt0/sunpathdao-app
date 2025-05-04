import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { UserController } from "./controllers/userController";
import { TaskController } from "./controllers/taskController";
import { SubmissionController } from "./controllers/submissionController";

export async function registerRoutes(app: Express): Promise<Server> {
  // API prefix
  const apiPrefix = '/api';
  
  // User routes
  app.post(`${apiPrefix}/users`, UserController.createUser);
  app.get(`${apiPrefix}/users/:walletAddress`, UserController.getUserByWalletAddress);
  
  // Task routes
  app.get(`${apiPrefix}/tasks`, TaskController.getTasks);
  app.get(`${apiPrefix}/tasks/:id`, TaskController.getTaskById);
  app.post(`${apiPrefix}/tasks`, TaskController.createTask);
  app.post(`${apiPrefix}/tasks/:id/increase-reward`, TaskController.increaseTaskReward);
  
  // Submission routes
  app.get(`${apiPrefix}/submissions`, SubmissionController.getSubmissions);
  app.get(`${apiPrefix}/submissions/:id`, SubmissionController.getSubmissionById);
  app.get(`${apiPrefix}/submissions/task/:taskId`, SubmissionController.getSubmissionsByTaskId);
  app.post(`${apiPrefix}/submissions`, SubmissionController.createSubmission);
  app.post(`${apiPrefix}/submissions/:id/accept`, SubmissionController.acceptSubmission);
  app.post(`${apiPrefix}/submissions/:id/decline`, SubmissionController.declineSubmission);
  
  const httpServer = createServer(app);
  
  return httpServer;
}

import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    console.log("🌱 Seeding database...");
    
    // Create sample users
    const sampleUsers = [
      {
        walletAddress: "8qKi3KfzLTcLhJnYnQ9r8s5zCm4eAE3xY7",
        createdAt: new Date(),
      },
      {
        walletAddress: "5xPzHpqscrYaBNq2YcG9tU86k6uTw6KV9qRw",
        createdAt: new Date(),
      },
      {
        walletAddress: "DmgCGGjLy8XTJUBRGfZtPWvHBGQSQQJxZR7kVfLY5vVC",
        createdAt: new Date(),
      }
    ];
    
    // Check if users already exist
    for (const user of sampleUsers) {
      const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.walletAddress, user.walletAddress),
      });
      
      if (!existingUser) {
        await db.insert(schema.users).values(user);
        console.log(`Created user with wallet address: ${user.walletAddress}`);
      } else {
        console.log(`User with wallet address ${user.walletAddress} already exists`);
      }
    }
    
    // Get the created users to get their IDs
    const users = await db.select().from(schema.users);
    
    if (users.length < 2) {
      console.log("Not enough users found, cannot create sample tasks");
      return;
    }
    
    // Create sample tasks
    const sampleTasks = [
      {
        userId: users[0].id,
        title: "Morning Run in Shibuya",
        description: "Looking for someone to run this scenic route through Shibuya and Yoyogi Park. Start at the Hachiko statue outside Shibuya Station and finish at the central fountain in Yoyogi Park. Please capture video of the entire journey.",
        country: "Japan",
        city: "Tokyo",
        startLocation: "Shibuya Station",
        endLocation: "Yoyogi Park",
        routeData: {
          bounds: {
            northeast: { lat: 35.671, lng: 139.705 },
            southwest: { lat: 35.659, lng: 139.685 }
          },
          distance: { text: "1.5 km", value: 1500 },
          duration: { text: "18 mins", value: 1080 },
          polyline: "example_polyline_data",
          startLocation: { lat: 35.6581, lng: 139.7011 },
          endLocation: { lat: 35.6712, lng: 139.6952 }
        },
        rewardAmount: 3.5,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: "available",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: users[0].id,
        title: "Evening Run at Tokyo Tower",
        description: "Capture the beautiful evening lights around Tokyo Tower. Start at Roppongi Hills and end at Tokyo Tower base. The route is scenic and well-lit.",
        country: "Japan",
        city: "Tokyo",
        startLocation: "Roppongi Hills",
        endLocation: "Tokyo Tower",
        routeData: {
          bounds: {
            northeast: { lat: 35.663, lng: 139.751 },
            southwest: { lat: 35.655, lng: 139.729 }
          },
          distance: { text: "1.2 km", value: 1200 },
          duration: { text: "15 mins", value: 900 },
          polyline: "example_polyline_data_2",
          startLocation: { lat: 35.6585, lng: 139.7454 },
          endLocation: { lat: 35.6586, lng: 139.7454 }
        },
        rewardAmount: 2.8,
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        status: "judging",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        userId: users[0].id,
        title: "Temple Visit in Asakusa",
        description: "Capture the vibrant atmosphere around Asakusa's Sensoji Temple. Start at Asakusa Station and end at the temple's main entrance.",
        country: "Japan",
        city: "Tokyo",
        startLocation: "Asakusa Station",
        endLocation: "Sensoji Temple",
        routeData: {
          bounds: {
            northeast: { lat: 35.713, lng: 139.799 },
            southwest: { lat: 35.710, lng: 139.793 }
          },
          distance: { text: "0.5 km", value: 500 },
          duration: { text: "7 mins", value: 420 },
          polyline: "example_polyline_data_3",
          startLocation: { lat: 35.7117, lng: 139.7949 },
          endLocation: { lat: 35.7148, lng: 139.7967 }
        },
        rewardAmount: 1.5,
        expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (expired)
        status: "expired",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        userId: users[1].id,
        title: "Akihabara Electronics Tour",
        description: "Run through the vibrant electronics district of Akihabara. Start at the station and end at the main electronics mall.",
        country: "Japan",
        city: "Tokyo",
        startLocation: "Akihabara Station",
        endLocation: "Main Electronics Mall",
        routeData: {
          bounds: {
            northeast: { lat: 35.702, lng: 139.773 },
            southwest: { lat: 35.697, lng: 139.768 }
          },
          distance: { text: "0.7 km", value: 700 },
          duration: { text: "9 mins", value: 540 },
          polyline: "example_polyline_data_4",
          startLocation: { lat: 35.6984, lng: 139.7731 },
          endLocation: { lat: 35.7001, lng: 139.7711 }
        },
        rewardAmount: 4.2,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        status: "available",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        userId: users[1].id,
        title: "Shinjuku Night Walk",
        description: "Experience the neon lights of Shinjuku at night. Start at Shinjuku Station and end at the famous Golden Gai area.",
        country: "Japan",
        city: "Tokyo",
        startLocation: "Shinjuku Station",
        endLocation: "Golden Gai",
        routeData: {
          bounds: {
            northeast: { lat: 35.694, lng: 139.704 },
            southwest: { lat: 35.691, lng: 139.699 }
          },
          distance: { text: "0.8 km", value: 800 },
          duration: { text: "10 mins", value: 600 },
          polyline: "example_polyline_data_5",
          startLocation: { lat: 35.6919, lng: 139.7035 },
          endLocation: { lat: 35.6938, lng: 139.7007 }
        },
        rewardAmount: 2.8,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        status: "available",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      }
    ];
    
    // Check if tasks already exist and create them if not
    for (const task of sampleTasks) {
      const existingTask = await db.query.tasks.findFirst({
        where: eq(schema.tasks.title, task.title),
      });
      
      if (!existingTask) {
        await db.insert(schema.tasks).values(task);
        console.log(`Created task: ${task.title}`);
      } else {
        console.log(`Task "${task.title}" already exists`);
      }
    }
    
    // Get tasks for creating submissions
    const allTasks = await db.select().from(schema.tasks);
    
    // Create a sample submission for the "judging" task
    const judgingTask = allTasks.find(task => task.status === 'judging');
    
    if (judgingTask) {
      const existingSubmission = await db.query.submissions.findFirst({
        where: eq(schema.submissions.taskId, judgingTask.id),
      });
      
      if (!existingSubmission) {
        await db.insert(schema.submissions).values({
          taskId: judgingTask.id,
          userId: users[2].id,
          videoUrl: "/uploads/sample-video.webm", // Placeholder - this won't actually exist
          startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 15 * 1000), // 15 seconds later
          status: "pending",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 60 * 1000), // 1 minute after recording
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 60 * 1000), // Same as created
        });
        console.log(`Created submission for task: ${judgingTask.title}`);
      } else {
        console.log(`Submission for task "${judgingTask.title}" already exists`);
      }
    }
    
    console.log("✅ Seeding complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();

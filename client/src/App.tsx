import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from "./contexts/WalletContext";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

// Commissioner pages
import CommissionerDashboard from "@/pages/commissioner/Dashboard";
import CreateTask from "@/pages/commissioner/CreateTask";
import ReviewSubmission from "@/pages/commissioner/ReviewSubmission";

// Runner pages
import AvailableTasks from "@/pages/runner/AvailableTasks";
import TaskDetail from "@/pages/runner/TaskDetail";
import MyTasks from "@/pages/runner/MyTasks";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Switch>
          {/* Public routes */}
          <Route path="/" component={Home} />
          
          {/* Commissioner routes */}
          <Route path="/commissioner/dashboard" component={CommissionerDashboard} />
          <Route path="/commissioner/create-task" component={CreateTask} />
          <Route path="/commissioner/review/:id" component={ReviewSubmission} />
          
          {/* Runner routes */}
          <Route path="/runner/tasks" component={AvailableTasks} />
          <Route path="/runner/tasks/:id" component={TaskDetail} />
          <Route path="/runner/my-tasks" component={MyTasks} />
          
          {/* Fallback to 404 */}
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <Router />
        <Toaster />
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;

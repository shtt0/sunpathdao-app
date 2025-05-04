import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="w-full max-w-md mx-4 shadow-lg border-0">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="bg-amber-100 p-3 rounded-full mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
            <div className="h-1 w-16 bg-gradient-to-r from-primary to-primary-light rounded-full mb-4"></div>
            <p className="text-gray-600">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button asChild variant="default">
            <Link href="/">Go to Homepage</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/commissioner/dashboard">Commissioner Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

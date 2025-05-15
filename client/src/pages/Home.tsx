import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';

export default function Home() {
  const { walletStatus } = useWallet();
  const isConnected = walletStatus === 'connected';

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section with Video Background */}
      <div className="max-w-7xl mx-auto relative overflow-hidden bg-neutral-100">
        {/* Video Background with direct testing */}
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            style={{ opacity: '0.5' }}
          >
            <source src="movie1.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-neutral-100 opacity-30 z-10"></div>
        </div>
        
        {/* Content Overlay */}
        <div className="text-center relative z-20 py-20 px-4">
          <h1 className="text-4xl font-display font-bold text-neutral-900 sm:text-5xl md:text-6xl mb-6">
            <span className="block mb-3">Making our roads safer.</span>
            <span className="block text-primary">Safe new roads for the world.</span>
          </h1>
          <div className="mt-8 sm:mt-10">
            {isConnected ? (
              <div className="flex justify-center flex-col sm:flex-row gap-4">
                <Link href="/commissioner/dashboard">
                  <Button className="px-8 py-3 text-base">
                    Commission Tasks
                  </Button>
                </Link>
                <Link href="/driver/tasks">
                  <Button variant="outline" className="px-8 py-3 text-base">
                    Find Tasks to Drive
                  </Button>
                </Link>
              </div>
            ) : (
              <Button className="px-8 py-3 text-base bg-[#309898] hover:bg-[#2a8585]">
                <span className="material-icons mr-2">account_balance_wallet</span>
                Join Our Mission
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="max-w-7xl mx-auto mt-20">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-neutral-900">
            How SUNPATH DAO Works
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-neutral-600">
            A simple process to commission or complete location-based tasks, verified by video, and paid in Solana.
          </p>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {/* For Commissioners */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white mb-4">
              <span className="material-icons">add_task</span>
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Commission Tasks</h3>
            <p className="text-neutral-600">
              Create location-based tasks, set routes, define rewards, and lock SOL as payment.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-500">
              <li className="flex items-start">
                <span className="material-icons text-primary text-sm mr-2">check_circle</span>
                Define start and end points on a map
              </li>
              <li className="flex items-start">
                <span className="material-icons text-primary text-sm mr-2">check_circle</span>
                Set reward amounts in SOL
              </li>
              <li className="flex items-start">
                <span className="material-icons text-primary text-sm mr-2">check_circle</span>
                Review video evidence of completed tasks
              </li>
            </ul>
          </div>

          {/* For Drivers */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-accent text-white mb-4">
              <span className="material-icons">directions_car</span>
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Drive Routes</h3>
            <p className="text-neutral-600">
              Browse available tasks, record videos while completing routes, and earn SOL rewards.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-500">
              <li className="flex items-start">
                <span className="material-icons text-accent text-sm mr-2">check_circle</span>
                Find tasks in your city or while traveling
              </li>
              <li className="flex items-start">
                <span className="material-icons text-accent text-sm mr-2">check_circle</span>
                Record a 15-second video as proof
              </li>
              <li className="flex items-start">
                <span className="material-icons text-accent text-sm mr-2">check_circle</span>
                Submit and receive SOL directly to your wallet
              </li>
            </ul>
          </div>

          {/* Blockchain Benefits */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-secondary text-white mb-4">
              <span className="material-icons">security</span>
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Blockchain Security</h3>
            <p className="text-neutral-600">
              Powered by Solana blockchain for fast, secure, and transparent transactions.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-500">
              <li className="flex items-start">
                <span className="material-icons text-secondary text-sm mr-2">check_circle</span>
                Secure escrow for task payments
              </li>
              <li className="flex items-start">
                <span className="material-icons text-secondary text-sm mr-2">check_circle</span>
                Fast transaction settlement
              </li>
              <li className="flex items-start">
                <span className="material-icons text-secondary text-sm mr-2">check_circle</span>
                Transparent verification process
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto mt-20 bg-primary rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-12 sm:px-12 lg:flex lg:items-center lg:py-16">
          <div className="lg:w-0 lg:flex-1">
            <h2 className="text-3xl font-display font-bold text-white sm:text-4xl">
              Ready to make safer roads?
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-indigo-100">
              Join our community today and become part of the global initiative to improve road safety through blockchain technology.
            </p>
          </div>
          <div className="mt-8 lg:mt-0 lg:ml-8">
            {isConnected ? (
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <Link href="/commissioner/create-task">
                  <Button variant="secondary" size="lg" className="w-full px-8">
                    Get Started Now
                  </Button>
                </Link>
              </div>
            ) : (
              <Button 
                variant="secondary" 
                size="lg"
                className="w-full px-8"
              >
                <span className="material-icons mr-2">account_balance_wallet</span>
                Join Our Mission
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

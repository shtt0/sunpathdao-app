import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import ConnectWalletButton from '@/components/ConnectWalletButton';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const [location] = useLocation();
  const { walletStatus } = useWallet();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if wallet is connected
  const isConnected = walletStatus === 'connected';
  
  // Determine current view (commissioner or driver)
  const isCommissionerView = location.includes('/commissioner');
  const isDriverView = location.includes('/driver');
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center">
                  <span className="material-icons text-white text-sm">directions_car</span>
                </div>
                <span className="ml-2 text-xl font-display font-bold text-neutral-900">SUNPATH DAO</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:ml-6 md:flex md:space-x-8">
              {isConnected && (
                <>
                  {/* View Switch Tabs */}
                  <div className="flex space-x-8">
                    <Link 
                      href="/commissioner/dashboard"
                      className={cn(
                        "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                        isCommissionerView && "border-primary text-neutral-900"
                      )}
                    >
                      Commissioner View
                    </Link>
                    <Link 
                      href="/driver/tasks"
                      className={cn(
                        "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                        isDriverView && "border-primary text-neutral-900"
                      )}
                    >
                      Driver View
                    </Link>
                  </div>
                </>
              )}
            </nav>
          </div>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ConnectWalletButton />
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden ml-2">
              <button
                type="button"
                className="p-2 rounded-md text-neutral-400 hover:text-neutral-500"
                onClick={toggleMobileMenu}
              >
                <span className="material-icons">
                  {isMobileMenuOpen ? 'close' : 'menu'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {isConnected && (
              <>
                <Link 
                  href="/commissioner/dashboard"
                  className={cn(
                    "block pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                    isCommissionerView 
                      ? "bg-primary-light/10 border-primary text-primary" 
                      : "border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700"
                  )}
                >
                  Commissioner View
                </Link>
                <Link 
                  href="/driver/tasks"
                  className={cn(
                    "block pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                    isDriverView 
                      ? "bg-primary-light/10 border-primary text-primary" 
                      : "border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700"
                  )}
                >
                  Driver View
                </Link>
                
                {isCommissionerView && (
                  <>
                    <Link 
                      href="/commissioner/dashboard"
                      className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/commissioner/create-task"
                      className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700"
                    >
                      Create Task
                    </Link>
                  </>
                )}
                
                {isDriverView && (
                  <>
                    <Link 
                      href="/driver/tasks"
                      className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700"
                    >
                      Available Tasks
                    </Link>
                    <Link 
                      href="/driver/my-tasks"
                      className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700"
                    >
                      My Tasks
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

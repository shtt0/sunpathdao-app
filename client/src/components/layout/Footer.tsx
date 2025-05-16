import React from 'react';
import { Link } from 'wouter';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex justify-center md:justify-start space-x-6">
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-500">
              <span className="sr-only">X (Twitter)</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
          <div className="mt-8 md:mt-0">
            <p className="text-center text-sm text-neutral-500 md:text-right">
              &copy; {new Date().getFullYear()} SUNPATH DAO. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

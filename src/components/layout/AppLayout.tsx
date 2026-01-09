import React, { useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * AppLayout component that provides the main application layout structure
 * 
 * Features a top navigation bar and main content area
 * Used for all authenticated pages
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  // Prevent body/html from scrolling - only main element should scroll
  useEffect(() => {
    const preventBodyScroll = () => {
      document.documentElement.style.height = '100vh';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overflowY = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.overflow = 'hidden';
      document.body.style.overflowY = 'hidden';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
    };

    const rafId = requestAnimationFrame(() => {
      setTimeout(preventBodyScroll, 10);
    });

    const timeoutId = setTimeout(preventBodyScroll, 200);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestAnimationFrame(() => {
          setTimeout(preventBodyScroll, 10);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.documentElement.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overflowY = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Navigation */}
      <Navigation />

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

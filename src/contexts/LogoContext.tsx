'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useBusiness } from './BusinessContext';

type LogoContextType = {
  logo: string | null;
  updateLogo: (newLogo: string) => void;
};

const LogoContext = createContext<LogoContextType | undefined>(undefined);

export function LogoProvider({ children }: { children: ReactNode }) {
  const [logo, setLogo] = useState<string | null>(null);
  const { currentBusiness } = useBusiness();

  // Load logo from localStorage on initial render
  useEffect(() => {
    const savedLogo = localStorage.getItem('adminLogo');
    if (savedLogo) {
      // Don't load blob URLs from localStorage as they expire
      if (!savedLogo.startsWith('blob:')) {
        setLogo(savedLogo);
      } else {
        // Clean up any blob URLs in localStorage
        localStorage.removeItem('adminLogo');
      }
    }
  }, []);

  // Load logo from business data when it changes
  useEffect(() => {
    if (currentBusiness?.logo_url && !currentBusiness.logo_url.startsWith('blob:')) {
      setLogo(currentBusiness.logo_url);
      // Also save to localStorage for persistence
      localStorage.setItem('adminLogo', currentBusiness.logo_url);
    }
  }, [currentBusiness?.logo_url]);

  const updateLogo = (newLogo: string) => {
    setLogo(newLogo);
    // Only save non-blob URLs to localStorage
    if (!newLogo.startsWith('blob:')) {
      localStorage.setItem('adminLogo', newLogo);
    }
  };

  return (
    <LogoContext.Provider value={{ logo, updateLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export function useLogo() {
  const context = useContext(LogoContext);
  if (context === undefined) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
}

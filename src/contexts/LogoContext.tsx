'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type LogoContextType = {
  logo: string | null;
  updateLogo: (newLogo: string) => void;
};

const LogoContext = createContext<LogoContextType | undefined>(undefined);

export function LogoProvider({ children }: { children: ReactNode }) {
  const [logo, setLogo] = useState<string | null>(null);

  // Load logo from localStorage on initial render
  useEffect(() => {
    const savedLogo = localStorage.getItem('adminLogo');
    if (savedLogo) {
      setLogo(savedLogo);
    }
  }, []);

  const updateLogo = (newLogo: string) => {
    setLogo(newLogo);
    localStorage.setItem('adminLogo', newLogo);
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

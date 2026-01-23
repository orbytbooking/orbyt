'use client';
import { ReactNode } from 'react';
import { BusinessProvider } from '@/contexts/BusinessContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BusinessProvider>
      {children}
    </BusinessProvider>
  );
}

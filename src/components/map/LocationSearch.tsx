"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SearchResult {
  display_name: string;
  latitude: number;
  longitude: number;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  importance: number;
  type: string;
  class: string;
}

interface LocationSearchProps {
  onLocationSelect: (location: SearchResult & { name: string }) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationSearch({ 
  onLocationSelect, 
  placeholder = "Search for a location...",
  className = ""
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for locations
  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/locations/map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: searchQuery }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
      setIsOpen(true);
    } catch (error) {
      console.error('Error searching locations:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        searchLocations(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectLocation = (result: SearchResult) => {
    // Create a name from the address components
    const name = result.address.road && result.address.house_number
      ? `${result.address.house_number} ${result.address.road}`
      : result.display_name.split(',')[0];

    onLocationSelect({
      ...result,
      name
    });
    
    setQuery(result.display_name);
    setIsOpen(false);
    setResults([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (e.target.value) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (results.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search results dropdown */}
      {isOpen && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto">
          <CardContent className="p-0">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelectLocation(result)}
                className="w-full text-left p-3 hover:bg-muted transition-colors border-b last:border-b-0 flex items-start gap-3"
              >
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {result.address.road && result.address.house_number
                      ? `${result.address.house_number} ${result.address.road}`
                      : result.display_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {result.address.city && result.address.state && (
                      <span>{result.address.city}, {result.address.state}</span>
                    )}
                    {result.address.postalCode && (
                      <span className="ml-1">{result.address.postalCode}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-1">
                    {result.display_name}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {isOpen && !isLoading && query && results.length === 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1">
          <CardContent className="p-3 text-center text-sm text-muted-foreground">
            No locations found for "{query}"
          </CardContent>
        </Card>
      )}
    </div>
  );
}

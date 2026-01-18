"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, MapPin, Plus, Pen, Edit3, Trash2 } from "lucide-react";
import OpenStreetMap from "@/components/map/OpenStreetMap";
import LocationSearch from "@/components/map/LocationSearch";
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

type LocationRow = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  active: boolean;
  business_id?: string;
  created_at?: string;
};

interface DrawnShape {
  id: string;
  type: 'polygon' | 'circle' | 'rectangle' | 'marker';
  coordinates: any;
  properties?: {
    radius?: number;
    area?: number;
    name?: string;
    description?: string;
  };
}

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
  name: string;
}

export default function IndustryFormLocationsPage() {
  const params = useSearchParams();
  const industry = params.get("industry") || "Industry";
  const { toast } = useToast();

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLocation, setNewLocation] = useState({
    name: "",
    city: "",
    state: "",
    postalCode: "",
    address: "",
    latitude: "",
    longitude: "",
  });
  const [currentBusinessId, setCurrentBusinessId] = useState<string>("");
  const [drawnShapes, setDrawnShapes] = useState<DrawnShape[]>([]);
  const [enableDraw, setEnableDraw] = useState(false);

  // Fetch current business and locations
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user and business
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get the user's business
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .single();

        if (businessError || !businessData) {
          console.error('Error fetching business:', businessError);
          // Fallback to localStorage if no business found
          const storageKey = `locations_${industry}`;
          const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
          if (Array.isArray(stored)) {
            setLocations(stored.map((loc: any) => ({
              ...loc,
              id: loc.id.toString(),
              postal_code: loc.postal_code || loc.postalCode || undefined,
              latitude: loc.latitude || undefined,
              longitude: loc.longitude || undefined,
              address: loc.address || undefined,
            })));
          }
          setCurrentBusinessId("");
          setIsLoading(false);
          return;
        }

        const businessId = businessData.id;
        setCurrentBusinessId(businessId);

        // Fetch locations from database
        const { data: locationsData, error } = await supabase
          .from('locations')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching locations:', error);
          // Fallback to localStorage if database fails
          const storageKey = `locations_${industry}`;
          const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
          if (Array.isArray(stored)) {
            setLocations(stored.map((loc: any) => ({
              ...loc,
              id: loc.id.toString(),
              postal_code: loc.postal_code || loc.postalCode || undefined,
              latitude: loc.latitude || undefined,
              longitude: loc.longitude || undefined,
              address: loc.address || undefined,
            })));
          }
        } else {
          setLocations(locationsData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [industry]);

  // Save to localStorage as fallback
  const storageKey = useMemo(() => `locations_${industry}`, [industry]);
  useEffect(() => {
    if (locations.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(locations));
    }
  }, [locations, storageKey]);

  const handleAdd = async () => {
    if (!newLocation.name.trim()) return;

    try {
      const locationData = {
        name: newLocation.name.trim(),
        city: newLocation.city.trim() || undefined,
        state: newLocation.state.trim() || undefined,
        postal_code: newLocation.postalCode.trim() || undefined,
        address: newLocation.address.trim() || undefined,
        latitude: newLocation.latitude ? parseFloat(newLocation.latitude) : undefined,
        longitude: newLocation.longitude ? parseFloat(newLocation.longitude) : undefined,
        active: true,
        business_id: currentBusinessId,
      };

      if (currentBusinessId) {
        // Save to database
        const { data, error } = await supabase
          .from('locations')
          .insert([locationData])
          .select()
          .single();

        if (error) {
          console.error('Error saving location:', error);
          // Fallback to localStorage
          const fallbackLocation = {
            ...locationData,
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
          };
          setLocations((prev) => [fallbackLocation, ...prev]);
        } else {
          setLocations((prev) => [data, ...prev]);
        }
      } else {
        // Fallback to localStorage
        const fallbackLocation = {
          ...locationData,
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
        };
        setLocations((prev) => [fallbackLocation, ...prev]);
      }

      setNewLocation({ 
        name: "", 
        city: "", 
        state: "", 
        postalCode: "", 
        address: "", 
        latitude: "", 
        longitude: "" 
      });
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };

  const handleLocationSearchSelect = (result: SearchResult) => {
    setNewLocation({
      name: result.name,
      city: result.address.city || "",
      state: result.address.state || "",
      postalCode: result.address.postalCode || "",
      address: result.display_name,
      latitude: result.latitude.toString(),
      longitude: result.longitude.toString(),
    });
  };

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      // Use our proxy API to avoid CORS issues
      const response = await fetch(
        `/api/geocoding?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.display_name && data.display_name !== `Location at ${lat}, ${lng}`) {
        setNewLocation({
          name: data.address?.suburb || data.address?.neighbourhood || data.address?.city || 'New Location',
          city: data.address?.city || data.address?.town || data.address?.village || "",
          state: data.address?.state || data.address?.county || "",
          postalCode: data.address?.postcode || "",
          address: data.display_name,
          latitude: lat.toString(),
          longitude: lng.toString(),
        });
      } else {
        // Fallback if geocoding fails or returns generic response
        setNewLocation({
          name: 'New Location',
          city: "",
          state: "",
          postalCode: "",
          address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
          latitude: lat.toString(),
          longitude: lng.toString(),
        });
        
        // Show a toast to inform user they can edit the location details
        toast({
          title: "Location Pinned",
          description: "Click 'Edit Location' to add address details manually.",
        });
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Fallback if geocoding fails
      setNewLocation({
        name: 'New Location',
        city: "",
        state: "",
        postalCode: "",
        address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
        latitude: lat.toString(),
        longitude: lng.toString(),
      });
      
      // Show a toast to inform user they can edit the location details
      toast({
        title: "Location Pinned",
        description: "Click 'Edit Location' to add address details manually.",
      });
    }
  };

  const toggleActive = async (id: string) => {
    try {
      const location = locations.find(loc => loc.id === id);
      if (!location) return;

      if (currentBusinessId) {
        // Update in database
        const { error } = await supabase
          .from('locations')
          .update({ active: !location.active })
          .eq('id', id);

        if (error) {
          console.error('Error updating location:', error);
        }
      }

      // Update local state
      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? { ...loc, active: !loc.active } : loc))
      );
    } catch (error) {
      console.error('Error toggling location:', error);
    }
  };

  const remove = async (id: string) => {
    try {
      if (currentBusinessId) {
        // Delete from database
        const { error } = await supabase
          .from('locations')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting location:', error);
        }
      }

      // Update local state
      setLocations((prev) => prev.filter((loc) => loc.id !== id));
    } catch (error) {
      console.error('Error removing location:', error);
    }
  };

  const move = (id: string, dir: -1 | 1) => {
    setLocations((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(j, 0, item);
      return next;
    });
  };

  // Draw functionality handlers
  const handleShapeCreated = (shape: DrawnShape) => {
    console.log('Shape created:', shape);
    // Here you can save the shape to your database or localStorage
    // For now, we'll just update the local state
  };

  const handleShapeEdited = (shape: DrawnShape) => {
    console.log('Shape edited:', shape);
    // Update shape in your storage
  };

  const handleShapeDeleted = (shapeId: string) => {
    console.log('Shape deleted:', shapeId);
    // Remove shape from your storage
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div>Loading locations...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{industry} - Form 1 / Locations</CardTitle>
          <CardDescription>
            Configure the service areas used to validate bookings for {industry}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Map and Search Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Service Area Map</h3>
                <p className="text-sm text-muted-foreground">
                  {enableDraw 
                    ? "Draw service areas on the map. Pin location is disabled while drawing."
                    : "Visual representation of your service locations. Click anywhere on the map to pin a new location."
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={enableDraw ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEnableDraw(!enableDraw)}
                  className="flex items-center gap-2"
                >
                  <Pen className="h-4 w-4" />
                  {enableDraw ? "Drawing On" : "Drawing Off"}
                </Button>
                <LocationSearch 
                  onLocationSelect={handleLocationSearchSelect}
                  placeholder="Add location by search..."
                  className="w-80"
                />
              </div>
            </div>
            
            <OpenStreetMap
              locations={locations}
              height="400px"
              center={locations.length > 0 && locations.some(loc => loc.latitude && loc.longitude) 
                ? [
                    locations.find(loc => loc.latitude && loc.longitude)?.latitude || 40.7128,
                    locations.find(loc => loc.latitude && loc.longitude)?.longitude || -74.0060
                  ] as [number, number]
                : [40.7128, -74.0060]
              }
              zoom={locations.length > 0 ? 10 : 4}
              allowPinDrop={true}
              enableDraw={enableDraw}
              onMapClick={handleMapClick}
              onShapeCreated={handleShapeCreated}
              onShapeEdited={handleShapeEdited}
              onShapeDeleted={handleShapeDeleted}
              drawnShapes={drawnShapes}
            />
          </div>

          {/* Drawn Shapes Section */}
          {enableDraw && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Drawn Service Areas</h3>
              {drawnShapes.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <Pen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No shapes drawn yet. Use the drawing tools on the map to create service areas.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {drawnShapes.map((shape) => (
                    <Card key={shape.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium capitalize">{shape.type}</h4>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm">
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {shape.properties?.area && (
                            <p className="text-sm text-muted-foreground">
                              Area: {(shape.properties.area / 1000000).toFixed(2)} km²
                            </p>
                          )}
                          {shape.properties?.radius && (
                            <p className="text-sm text-muted-foreground">
                              Radius: {(shape.properties.radius / 1000).toFixed(2)} km
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Location Entry Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Add New Location</h3>
            
            {/* Location search */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Search for location</label>
              <LocationSearch 
                onLocationSelect={handleLocationSearchSelect}
                placeholder="Search address, city, or postal code..."
              />
            </div>

            {/* Manual entry form */}
            <div className="grid gap-3 md:grid-cols-[2fr_1.5fr_0.8fr_1fr_auto]">
              <Input
                placeholder="Area name (e.g. Downtown Chicago)"
                value={newLocation.name}
                onChange={(e) => setNewLocation((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="City"
                value={newLocation.city}
                onChange={(e) => setNewLocation((prev) => ({ ...prev, city: e.target.value }))}
              />
              <Input
                placeholder="State"
                value={newLocation.state}
                onChange={(e) => setNewLocation((prev) => ({ ...prev, state: e.target.value }))}
              />
              <Input
                placeholder="ZIP / Postal code"
                value={newLocation.postalCode}
                onChange={(e) => setNewLocation((prev) => ({ ...prev, postalCode: e.target.value }))}
              />
              <Button onClick={handleAdd} className="whitespace-nowrap">
                <Plus className="h-4 w-4 mr-1" />
                Add location
              </Button>
            </div>

            {/* Coordinates (hidden by default, shown when coordinates are set) */}
            {(newLocation.latitude || newLocation.longitude) && (
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Latitude"
                  value={newLocation.latitude}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, latitude: e.target.value }))}
                  type="number"
                  step="any"
                />
                <Input
                  placeholder="Longitude"
                  value={newLocation.longitude}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, longitude: e.target.value }))}
                  type="number"
                  step="any"
                />
              </div>
            )}

            {/* New location preview */}
            {newLocation.name && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">New Location Preview</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Name</label>
                        <p className="text-sm">{newLocation.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Address</label>
                        <p className="text-sm">{newLocation.address || 'Manual entry'}</p>
                      </div>
                    </div>
                    <Button onClick={handleAdd} className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Add This Location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Locations List Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Service Locations</h3>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Area</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Postal code</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        No locations configured yet. Add the first one above.
                      </TableCell>
                    </TableRow>
                  )}
                  {locations.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {loc.latitude && loc.longitude && (
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                          )}
                          {loc.name}
                        </div>
                      </TableCell>
                      <TableCell>{loc.city || "-"}</TableCell>
                      <TableCell>{loc.state || "-"}</TableCell>
                      <TableCell>{loc.postal_code || "-"}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={loc.active}
                          onCheckedChange={() => toggleActive(loc.id)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                              Options <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => move(loc.id, -1)}>
                              Move up
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => move(loc.id, 1)}>
                              Move down
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => remove(loc.id)}
                              className="text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

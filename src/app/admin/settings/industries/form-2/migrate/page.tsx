"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/components/ui/use-toast";
import MigrationService from "@/lib/migrationService";
import { Loader2, Database, HardDrive } from "lucide-react";

export default function MigrationPage() {
  const params = useSearchParams();
  const industry = params.get("industry") || "Industry";
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [localStorageData, setLocalStorageData] = useState<any>({});
  const [migrationResults, setMigrationResults] = useState<any>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIndustryId = async () => {
      if (!currentBusiness?.id || !industry) return;

      try {
        const response = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const data = await response.json();
        const currentIndustry = data.industries?.find((ind: any) => ind.name === industry);
        
        if (currentIndustry) {
          setIndustryId(currentIndustry.id);
        }
      } catch (error) {
        console.error('Error fetching industry ID:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIndustryId();
  }, [currentBusiness, industry]);

  useEffect(() => {
    if (industry) {
      const summary = MigrationService.getLocalStorageSummary(industry);
      setLocalStorageData(summary);
    }
  }, [industry]);

  const handleMigration = async () => {
    if (!industryId) {
      toast({
        title: "Error",
        description: "Industry ID not found. Cannot migrate data.",
        variant: "destructive",
      });
      return;
    }

    setIsMigrating(true);
    
    try {
      const results = await MigrationService.migrateAllLocalStorageData(industryId, industry);
      setMigrationResults(results);

      const successCount = Object.values(results).filter((r: any) => r.success).length;
      const totalCount = Object.keys(results).length;

      toast({
        title: "Migration Complete",
        description: `Successfully migrated ${successCount}/${totalCount} modules from localStorage to database.`,
        variant: successCount === totalCount ? "default" : "destructive",
      });

      // Refresh localStorage data after migration
      const summary = MigrationService.getLocalStorageSummary(industry);
      setLocalStorageData(summary);
      
    } catch (error) {
      console.error('Migration failed:', error);
      toast({
        title: "Migration Failed",
        description: "An error occurred during migration. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearLocalStorage = () => {
    MigrationService.clearAllLocalStorageData(industry);
    const summary = MigrationService.getLocalStorageSummary(industry);
    setLocalStorageData(summary);
    
    toast({
      title: "LocalStorage Cleared",
      description: "All localStorage data has been cleared for this industry.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const hasLocalStorageData = Object.values(localStorageData).some((count: any) => count > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Migration: {industry}
          </CardTitle>
          <CardDescription>
            Migrate your industry form data from localStorage to the database for better data persistence and multi-device sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current localStorage Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Current LocalStorage Data
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold text-blue-600">{localStorageData.serviceCategories}</div>
                <div className="text-sm text-muted-foreground">Service Categories</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-green-600">{localStorageData.frequencies}</div>
                <div className="text-sm text-muted-foreground">Frequencies</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-purple-600">{localStorageData.locations}</div>
                <div className="text-sm text-muted-foreground">Locations</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-orange-600">{localStorageData.pricingParameters}</div>
                <div className="text-sm text-muted-foreground">Pricing Parameters</div>
              </Card>
            </div>
          </div>

          {/* Migration Results */}
          {migrationResults && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Migration Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(migrationResults).map(([module, result]: [string, any]) => (
                  <Card key={module} className={`p-4 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-2xl font-bold">{result.count}</div>
                    <div className="text-sm capitalize">{module.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      {result.success ? '✓ Success' : `✗ Error: ${result.error}`}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={handleMigration} 
              disabled={!hasLocalStorageData || isMigrating}
              className="flex items-center gap-2"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Migrate to Database
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleClearLocalStorage}
              disabled={!hasLocalStorageData}
            >
              Clear LocalStorage
            </Button>
          </div>

          {!hasLocalStorageData && !migrationResults && (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No localStorage data found for this industry.</p>
              <p className="text-sm">Your data is already stored in the database.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

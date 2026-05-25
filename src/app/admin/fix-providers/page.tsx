"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2, Users, Wrench } from "lucide-react";

interface FixResult {
  success: boolean;
  message: string;
  fixedCount: number;
  failedCount: number;
  fixedProviders: Array<{
    providerId: string;
    email: string;
    name: string;
    userId: string;
  }>;
  failedProviders: Array<{
    providerId: string;
    email: string;
    error: string;
  }>;
}

export default function FixProvidersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);

  const handleFixProviders = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/fix-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix providers');
      }

      setResult(data);
      
      toast({
        title: "Fix Complete",
        description: `Fixed ${data.fixedCount} provider accounts. ${data.failedCount > 0 ? `${data.failedCount} failed.` : ''}`,
        variant: data.failedCount > 0 ? "destructive" : "default",
      });

    } catch (error: any) {
      console.error('Fix providers error:', error);
      toast({
        title: "Fix Failed",
        description: error.message || "An error occurred while fixing provider accounts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg bg-orange-100">
          <Wrench className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Fix Provider User IDs</h1>
          <p className="text-sm text-white/70">
            Fix provider accounts that have NULL user_id values
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Card className="w-full bg-gray-900/60 backdrop-blur-xl border-cyan-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            Provider Account Repair
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">What this fixes:</h3>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                  <li>• Providers with NULL user_id values</li>
                  <li>• Links provider records to their auth accounts</li>
                  <li>• Fixes "Provider not found" errors</li>
                  <li>• Enables provider login functionality</li>
                </ul>
              </div>
            </div>
          </div>

          {!result ? (
            <div className="text-center space-y-4">
              <p className="text-gray-400">
                This tool will scan for provider accounts that have NULL user_id values 
                and automatically link them to their corresponding auth accounts.
              </p>
              <Button
                onClick={handleFixProviders}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Fixing Providers...
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4 mr-2" />
                    Fix Provider Accounts
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Success Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  <h3 className="font-medium">Fix Complete</h3>
                </div>
                <p className="text-sm text-green-700 mt-2">{result.message}</p>
              </div>

              {/* Fixed Providers */}
              {result.fixedProviders.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-600 mb-2">
                    Fixed Providers ({result.fixedProviders.length})
                  </h4>
                  <div className="space-y-2">
                    {result.fixedProviders.map((provider, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="text-sm">
                          <span className="font-medium">{provider.name}</span>
                          <span className="text-gray-600 ml-2">({provider.email})</span>
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          User ID: {provider.userId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Providers */}
              {result.failedProviders.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-2">
                    Failed Providers ({result.failedProviders.length})
                  </h4>
                  <div className="space-y-2">
                    {result.failedProviders.map((provider, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                        <div className="text-sm">
                          <span className="font-medium">{provider.email}</span>
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Error: {provider.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset Button */}
              <div className="text-center">
                <Button
                  onClick={() => setResult(null)}
                  variant="outline"
                  className="mt-4"
                >
                  Run Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

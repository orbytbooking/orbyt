"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  Download,
  FileText,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Video,
} from "lucide-react";

import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";
import { getSupabaseCustomerClient } from "@/lib/supabaseCustomerClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

type DriveFile = {
  id: string;
  name: string;
  fileType?: string;
  size?: string;
  uploadedAt: string;
  url?: string;
};

export default function CustomerDrivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("business") ?? "";
  const { toast } = useToast();
  const { customerName, customerEmail, customerAccount, accountLoading, handleLogout } = useCustomerAccount();

  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [preview, setPreview] = useState<DriveFile | null>(null);

  const initials =
    customerAccount?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "PP";

  const authHeaders = useCallback(async () => {
    const {
      data: { session },
    } = await getSupabaseCustomerClient().auth.getSession();
    if (!session?.access_token) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  useEffect(() => {
    if (!businessId || accountLoading) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/customer/my-drive-settings?business=${encodeURIComponent(businessId)}`);
      const data = await res.json();
      if (cancelled) return;
      const enabled = data?.customer_my_drive_enabled === true;
      setFeatureEnabled(enabled);
      if (!enabled) {
        setListLoading(false);
        router.replace(`/customer/dashboard${businessId ? `?business=${businessId}` : ""}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, accountLoading, router]);

  const loadFiles = useCallback(async () => {
    if (!businessId || featureEnabled !== true) return;
    setListLoading(true);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setFiles([]);
        return;
      }
      const res = await fetch(`/api/customer/drive?business=${encodeURIComponent(businessId)}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load files");
      }
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (e) {
      toast({
        title: "Could not load files",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      });
      setFiles([]);
    } finally {
      setListLoading(false);
    }
  }, [authHeaders, businessId, featureEnabled, toast]);

  useEffect(() => {
    if (featureEnabled === true) void loadFiles();
  }, [featureEnabled, loadFiles]);

  const getFileIcon = (f: DriveFile) => {
    const t = f.fileType || "";
    if (t === "image") return <ImageIcon className="h-10 w-10 text-primary" />;
    if (t === "video") return <Video className="h-10 w-10 text-primary" />;
    if (t === "document") return <FileText className="h-10 w-10 text-primary" />;
    return <FileText className="h-10 w-10 text-muted-foreground" />;
  };

  const handleOpen = (f: DriveFile) => {
    if (f.url) window.open(f.url, "_blank", "noopener,noreferrer");
    else toast({ title: "Link unavailable", variant: "destructive" });
  };

  if (accountLoading || featureEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (featureEnabled === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[280px_1fr]">
        <CustomerSidebar
          customerName={customerName}
          customerEmail={customerEmail}
          initials={initials}
          businessName={customerAccount?.businessName || ""}
          onLogout={handleLogout}
        />
        <div className="order-1 flex flex-col lg:order-2">
          <header className="bg-background border-b border-border shadow-sm">
            <div className="flex flex-col px-6 py-5">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <HardDrive className="h-8 w-8 text-amber-600" />
                My Drive
              </h1>
              <p className="text-sm text-muted-foreground">
                Documents your business has shared with you. View or download only—uploads are managed from your account on our side.
              </p>
            </div>
          </header>
          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <Card>
              <CardHeader>
                <CardTitle>Your files</CardTitle>
              </CardHeader>
              <CardContent>
                {listLoading ? (
                  <div className="flex justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      When your business adds files to your profile, they will show up here for you to view or download.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {files.map((file) => (
                      <Card
                        key={file.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() =>
                              file.fileType === "image" && file.url ? setPreview(file) : handleOpen(file)
                            }
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">{getFileIcon(file)}</div>
                            </div>
                            <p className="font-medium text-sm truncate mb-1">{file.name}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{file.size}</span>
                              <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                            </div>
                          </button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => handleOpen(file)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>
              {preview?.size} · {preview && new Date(preview.uploadedAt).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          {preview?.url && (
            <div className="w-full max-h-[70vh] overflow-auto rounded-lg bg-muted flex items-center justify-center p-2">
              <img src={preview.url} alt={preview.name} className="max-w-full h-auto" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
            {preview?.url && (
              <Button onClick={() => handleOpen(preview)}>
                <Download className="h-4 w-4 mr-2" />
                Open / download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

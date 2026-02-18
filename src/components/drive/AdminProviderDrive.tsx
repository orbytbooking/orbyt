"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FolderOpen,
  File,
  Upload,
  Download,
  Trash2,
  Search,
  Grid3x3,
  List,
  FileText,
  Image as ImageIcon,
  FileVideo,
  MoreVertical,
  Plus,
  ChevronRight,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

type FileItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  fileType?: "document" | "image" | "video" | "other";
  size?: string;
  uploadedAt: string;
  url?: string;
  parentId?: string | null;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export function AdminProviderDrive({
  providerId,
  businessId,
}: {
  providerId: string;
  businessId: string;
}) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchFiles = async (parentId: string | null = null) => {
    try {
      setLoading(true);
      const parentIdParam = parentId === null ? "null" : parentId;
      const res = await fetch(
        `/api/admin/providers/${providerId}/drive?businessId=${encodeURIComponent(businessId)}&parentId=${encodeURIComponent(parentIdParam)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch files");
      const data = await res.json().catch(() => ({}));
      setFiles(data.files || []);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to load files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, providerId, businessId]);

  const getFileIcon = (item: FileItem) => {
    if (item.type === "folder") {
      return <FolderOpen className="h-8 w-8 text-blue-500" />;
    }
    if (item.fileType === "image" && item.url) {
      return (
        <div className="w-full h-24 rounded-md overflow-hidden bg-muted flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
        </div>
      );
    }
    switch (item.fileType) {
      case "document":
        return <FileText className="h-8 w-8 text-orange-500" />;
      case "image":
        return <ImageIcon className="h-8 w-8 text-green-500" />;
      case "video":
        return <FileVideo className="h-8 w-8 text-purple-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({ title: "Error", description: "Please enter a folder name", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/drive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name: newFolderName,
          type: "folder",
          parentId: currentFolderId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create folder");

      const folderName = newFolderName;
      setFiles((prev) => [...prev, data.file]);
      setNewFolderName("");
      setIsCreateFolderDialogOpen(false);
      toast({ title: "Folder Created", description: `"${folderName}" has been created successfully` });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file to upload", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("businessId", businessId);
      formData.append("parentId", currentFolderId ? currentFolderId : "null");

      const res = await fetch(`/api/admin/providers/${providerId}/drive/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to upload file");

      const fileName = selectedFile.name;
      setFiles((prev) => [...prev, data.file]);
      setSelectedFile(null);
      setIsUploadDialogOpen(false);
      toast({ title: "File Uploaded", description: `"${fileName}" has been uploaded successfully` });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (id: string, name: string) => {
    try {
      const res = await fetch(
        `/api/admin/providers/${providerId}/drive?businessId=${encodeURIComponent(businessId)}&fileId=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete file");
      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "Deleted", description: `"${name}" has been deleted` });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = (file: FileItem) => {
    if (file.url) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      link.click();
      toast({ title: "Download Started", description: `Downloading \"${file.name}\"` });
    }
  };

  const getCurrentPath = (): FileItem[] => {
    const path: FileItem[] = [];
    let folderId = currentFolderId;
    while (folderId) {
      const folder = files.find((f) => f.id === folderId);
      if (!folder) break;
      path.unshift(folder);
      folderId = folder.parentId || null;
    }
    return path;
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery("");
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === "folder") handleFolderClick(file.id);
    else if (file.fileType === "image") setPreviewImage(file);
  };

  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSearchQuery("");
  };

  const filteredFiles = files.filter((file) => {
    const isInCurrentFolder = file.parentId === currentFolderId;
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    return isInCurrentFolder && matchesSearch;
  });

  const currentPath = getCurrentPath();

  const stats = {
    totalFiles: files.filter((f) => f.type === "file").length,
    totalFolders: files.filter((f) => f.type === "folder").length,
    totalSize: files
      .filter((f) => f.size)
      .reduce((acc, f) => {
        const sizeStr = f.size || "0 KB";
        const value = parseFloat(sizeStr);
        const unit = sizeStr.split(" ")[1];
        if (unit === "MB") return acc + value;
        if (unit === "KB") return acc + value / 1024;
        return acc;
      }, 0)
      .toFixed(2),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Drive</h1>
        <p className="text-muted-foreground">Store and manage your files and documents</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <File className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalFiles}</p>
                <p className="text-sm text-muted-foreground">Total Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalFolders}</p>
                <p className="text-sm text-muted-foreground">Total Folders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSize} MB</p>
                <p className="text-sm text-muted-foreground">Storage Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breadcrumb Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => handleBreadcrumbClick(null)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>My Drive</span>
            </button>
            {currentPath.map((folder) => (
              <div key={folder.id} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <button onClick={() => handleBreadcrumbClick(folder.id)} className="hover:text-primary transition-colors">
                  {folder.name}
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
              <Button variant="outline" onClick={() => setIsCreateFolderDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid/List */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading files...</p>
          </CardContent>
        </Card>
      ) : filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No files found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Upload your first file to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleFileClick(file)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">{getFileIcon(file)}</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      {file.type === "file" && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.id, file.name);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <p className="font-medium text-sm truncate mb-1">{file.name}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{file.type === "folder" ? "Folder" : file.size}</span>
                    <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleFileClick(file)}
                >
                  <div className="flex-shrink-0">{getFileIcon(file)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {file.type === "folder" ? "Folder" : file.size} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.type === "file" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFile(file);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id, file.name);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload File Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              {currentFolderId ? `Upload file to \"${currentPath[currentPath.length - 1]?.name}\"` : "Upload file to My Drive"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Choose File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              {currentFolderId ? `Create folder in \"${currentPath[currentPath.length - 1]?.name}\"` : "Create folder in My Drive"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="Enter folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateFolderDialogOpen(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>
              <Plus className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.name}</DialogTitle>
            <DialogDescription>
              {previewImage?.size} • Uploaded on {previewImage && new Date(previewImage.uploadedAt).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          {previewImage?.url && (
            <div className="w-full max-h-[70vh] overflow-auto rounded-lg bg-muted flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImage.url} alt={previewImage.name} className="max-w-full h-auto" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewImage(null)}>
              Close
            </Button>
            {previewImage && (
              <Button onClick={() => handleDownloadFile(previewImage)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  X,
  ChevronRight,
  Home
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
import { getSupabaseProviderClient } from "@/lib/supabaseProviderClient";

type FileItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  fileType?: "document" | "image" | "video" | "other";
  size?: string;
  uploadedAt: string;
  url?: string;
  parentId?: string | null; // null means root folder
};

const ProviderDrive = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null); // null = root
  const [previewImage, setPreviewImage] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Fetch files from API
  const fetchFiles = async (parentId: string | null = null) => {
    try {
      setLoading(true);
      
      // Get the current session token
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to access your drive",
          variant: "destructive",
        });
        return;
      }

      const parentIdParam = parentId === null ? 'null' : parentId;
      const response = await fetch(`/api/provider/drive?parentId=${parentIdParam}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to load files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load files when component mounts or folder changes
  useEffect(() => {
    fetchFiles(currentFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId]);

  const getFileIcon = (item: FileItem) => {
    if (item.type === "folder") {
      return <FolderOpen className="h-8 w-8 text-blue-500" />;
    }
    
    // Show image thumbnail if it's an image file
    if (item.fileType === "image" && item.url) {
      return (
        <div className="w-full h-24 rounded-md overflow-hidden bg-muted flex items-center justify-center">
          <img 
            src={item.url} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
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

  const getFileType = (fileName: string): "document" | "image" | "video" | "other" => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) {
      return "image";
    }
    if (["mp4", "avi", "mov", "wmv"].includes(extension || "")) {
      return "video";
    }
    if (["pdf", "doc", "docx", "txt", "xls", "xlsx"].includes(extension || "")) {
      return "document";
    }
    return "other";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a folder name",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the current session token
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to create folders",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/provider/drive', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          type: 'folder',
          parentId: currentFolderId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const data = await response.json();
      const folderName = newFolderName; // Save name before clearing
      setFiles([...files, data.file]);
      setNewFolderName("");
      setIsCreateFolderDialogOpen(false);
      
      toast({
        title: "Folder Created",
        description: `"${folderName}" has been created successfully`,
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      
      // Get the current session token
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to upload files",
          variant: "destructive",
        });
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (currentFolderId) {
        formData.append('parentId', currentFolderId);
      } else {
        formData.append('parentId', 'null');
      }

      const response = await fetch('/api/provider/drive/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const data = await response.json();
      const fileName = selectedFile.name; // Save name before clearing
      setFiles([...files, data.file]);
      setSelectedFile(null);
      setIsUploadDialogOpen(false);
      
      toast({
        title: "File Uploaded",
        description: `"${fileName}" has been uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (id: string, name: string) => {
    try {
      // Get the current session token
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to delete files",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/provider/drive?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }

      setFiles(files.filter(f => f.id !== id));
      toast({
        title: "Deleted",
        description: `"${name}" has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete file",
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
      
      toast({
        title: "Download Started",
        description: `Downloading "${file.name}"`,
      });
    }
  };

  // Get current folder path for breadcrumb
  const getCurrentPath = (): FileItem[] => {
    const path: FileItem[] = [];
    let folderId = currentFolderId;
    
    while (folderId) {
      const folder = files.find(f => f.id === folderId);
      if (folder) {
        path.unshift(folder);
        folderId = folder.parentId || null;
      } else {
        break;
      }
    }
    
    return path;
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery(""); // Clear search when navigating
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === "folder") {
      handleFolderClick(file.id);
    } else if (file.fileType === "image") {
      setPreviewImage(file);
    }
  };

  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSearchQuery("");
  };

  // Filter files by current folder and search query
  const filteredFiles = files.filter(file => {
    // Check if file is in current folder
    const isInCurrentFolder = file.parentId === currentFolderId;
    
    // Check if file matches search query
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return isInCurrentFolder && matchesSearch;
  });

  const currentPath = getCurrentPath();

  const stats = {
    totalFiles: files.filter(f => f.type === "file").length,
    totalFolders: files.filter(f => f.type === "folder").length,
    totalSize: files
      .filter(f => f.size)
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
                <button
                  onClick={() => handleBreadcrumbClick(folder.id)}
                  className="hover:text-primary transition-colors"
                >
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
                  <div className="flex-1">
                    {getFileIcon(file)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      {file.type === "file" && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFile(file);
                        }}>
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
                  <div className="flex-shrink-0">
                    {getFileIcon(file)}
                  </div>
                  
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
              {currentFolderId 
                ? `Upload file to "${currentPath[currentPath.length - 1]?.name}"` 
                : "Upload file to My Drive"}
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
            <Button variant="outline" onClick={() => {
              setIsUploadDialogOpen(false);
              setSelectedFile(null);
            }}>
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
              {currentFolderId 
                ? `Create folder in "${currentPath[currentPath.length - 1]?.name}"` 
                : "Create folder in My Drive"}
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
            <Button variant="outline" onClick={() => {
              setIsCreateFolderDialogOpen(false);
              setNewFolderName("");
            }}>
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
              <img 
                src={previewImage.url} 
                alt={previewImage.name}
                className="max-w-full h-auto"
              />
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
};

export default ProviderDrive;

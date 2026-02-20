"use client";

import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, Tag, MailX, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface AdminTag {
  id: string;
  name: string;
  display_order: number;
}

export default function GeneralSettingsPage() {
  const { currentBusiness } = useBusiness();
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<AdminTag | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalDisplayOrder, setModalDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteTag, setDeleteTag] = useState<AdminTag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTags = async () => {
    if (!currentBusiness?.id) return;
    setTagsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/tags?businessId=${encodeURIComponent(currentBusiness.id)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tags');
      setTags(data.tags ?? []);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to load tags');
      setTags([]);
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => {
    if (currentBusiness?.id) fetchTags();
  }, [currentBusiness?.id]);

  const openAddModal = () => {
    setEditingTag(null);
    setModalName('');
    setModalDisplayOrder(tags.length > 0 ? Math.max(...tags.map((t) => t.display_order), 0) + 1 : 0);
    setModalOpen(true);
  };

  const openEditModal = (tag: AdminTag) => {
    setEditingTag(tag);
    setModalName(tag.name);
    setModalDisplayOrder(tag.display_order);
    setModalOpen(true);
  };

  const handleSaveTag = async () => {
    const name = modalName.trim();
    if (!name || !currentBusiness?.id) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingTag) {
        const res = await fetch(`/api/admin/tags/${encodeURIComponent(editingTag.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, display_order: modalDisplayOrder }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update tag');
        setModalOpen(false);
        await fetchTags();
        toast.success('Tag updated successfully');
      } else {
        const res = await fetch('/api/admin/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: currentBusiness.id,
            name,
            display_order: modalDisplayOrder,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create tag');
        setModalOpen(false);
        await fetchTags();
        toast.success('Tag created successfully');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTag) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(deleteTag.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete tag');
      }
      setDeleteTag(null);
      await fetchTags();
      toast.success('Tag deleted successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete tag');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">General</h3>
        <p className="text-sm text-muted-foreground">
          Manage your general account settings and preferences.
        </p>
      </div>
      <Separator />
      <Tabs defaultValue="store-options" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="store-options" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span>Store options</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>Tags</span>
          </TabsTrigger>
          <TabsTrigger value="undelivered-emails" className="flex items-center gap-2">
            <MailX className="h-4 w-4" />
            <span>Undelivered emails</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="store-options" className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Store options settings will be implemented here.
          </p>
        </TabsContent>
        <TabsContent value="tags" className="pt-6 space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={openAddModal} disabled={!currentBusiness?.id}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {tagsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tags.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  There are no tags at this time.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Display Order</TableHead>
                      <TableHead className="w-[100px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell className="font-mono text-muted-foreground">
                          {tag.id}
                        </TableCell>
                        <TableCell>{tag.name}</TableCell>
                        <TableCell>{tag.display_order}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(tag)}
                              title="Edit tag"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTag(tag)}
                              title="Delete tag"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTag ? 'Edit tag' : 'Add new tag'}</DialogTitle>
                <DialogDescription>
                  {editingTag
                    ? 'Update the tag name and display order.'
                    : 'Create a tag to use for customers and providers. Name and display order are required.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="tag-name">Name</Label>
                  <Input
                    id="tag-name"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    placeholder="e.g. VIP, New Customer"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tag-display-order">Display Order</Label>
                  <Input
                    id="tag-display-order"
                    type="number"
                    min={0}
                    value={modalDisplayOrder}
                    onChange={(e) => setModalDisplayOrder(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTag} disabled={saving || !modalName.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : editingTag ? (
                    'Save changes'
                  ) : (
                    'Create tag'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!deleteTag} onOpenChange={(open) => !open && setDeleteTag(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete tag</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{deleteTag?.name}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    confirmDelete();
                  }}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
        <TabsContent value="undelivered-emails" className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Undelivered emails settings will be implemented here.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

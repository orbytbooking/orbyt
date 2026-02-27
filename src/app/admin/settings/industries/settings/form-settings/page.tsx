'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Edit, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Form {
  id: string;
  name: string;
  status: 'live' | 'disabled';
}

export default function FormSettingsPage() {
  const searchParams = useSearchParams();
  const industry = searchParams.get('industry');
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([
    { id: '1', name: 'Form 1', status: 'live' }
  ]);

  const handleEdit = (formId: string) => {
    toast({
      title: 'Edit Form',
      description: `Editing form ${formId}`,
    });
  };

  const handleToggleStatus = (formId: string) => {
    setForms(prevForms =>
      prevForms.map(form =>
        form.id === formId
          ? { ...form, status: form.status === 'live' ? 'disabled' : 'live' }
          : form
      )
    );
    
    const form = forms.find(f => f.id === formId);
    toast({
      title: form?.status === 'live' ? 'Form Disabled' : 'Form Enabled',
      description: `Form has been ${form?.status === 'live' ? 'disabled' : 'enabled'} successfully.`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Form Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage forms for {industry || 'your industry'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forms</CardTitle>
          <CardDescription>
            View and manage all forms for this industry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={form.status === 'live' ? 'default' : 'secondary'}
                      className={
                        form.status === 'live'
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : 'bg-gray-500 hover:bg-gray-600'
                      }
                    >
                      {form.status === 'live' ? 'Live' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                          <span className="ml-2">Options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(form.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(form.id)}>
                          <Ban className="mr-2 h-4 w-4" />
                          {form.status === 'live' ? 'Disable' : 'Enable'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

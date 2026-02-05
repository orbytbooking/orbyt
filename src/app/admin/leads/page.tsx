'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, ChevronDown, Plus, X, Trash2, Edit, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { useLeads } from '@/hooks/useLeads';
import { Lead, LeadStatus } from '@/hooks/useLeads';
import { useBusiness } from '@/contexts/BusinessContext';
import { useLogo } from '@/contexts/LogoContext';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/modal';
import { LeadForm } from '@/components/leads/LeadForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import Image from "next/image";

type Column = {
  id: string;
  header: string;
  accessor: string;
  type: 'text' | 'date' | 'tags' | 'status';
};

const defaultColumns: Column[] = [
  { id: 'name', header: 'Name', accessor: 'name', type: 'text' },
  { id: 'phone', header: 'Phone', accessor: 'phone', type: 'text' },
  { id: 'email', header: 'Email', accessor: 'email', type: 'text' },
  { id: 'created_at', header: 'Created At', accessor: 'created_at', type: 'date' },
  { id: 'tags', header: 'Tags', accessor: 'tags', type: 'tags' },
  { id: 'status', header: 'Status', accessor: 'status', type: 'status' },
];

// Static columns - no dynamic column management
const columns = defaultColumns;

export default function LeadsPage() {
  const { leads, loading, error, createLead, deleteLead, updateLead, refetch, addTag, updateTag, removeTag } = useLeads();
  const { businesses, currentBusiness, loading: businessLoading, switchBusiness } = useBusiness();
  const { logo } = useLogo();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  const [customStatuses, setCustomStatuses] = useState<LeadStatus[]>([]);
  const [newStatus, setNewStatus] = useState('');
  const [showStatusInput, setShowStatusInput] = useState(false);
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');

  // Load custom statuses from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStatuses = localStorage.getItem('customStatuses');
      if (savedStatuses) {
        setCustomStatuses(JSON.parse(savedStatuses));
      }
    }
  }, []);

  // Remove localStorage useEffect since we're using API now

  const updateLeadField = async (leadId: string, field: string, value: any) => {
    setLoadingStates(prev => ({ ...prev, [leadId]: true }));
    try {
      await updateLead(leadId, { [field]: value });
    } catch (err) {
      console.error('Failed to update lead field:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, [leadId]: false }));
    }
  };

  // Modal handlers
  const handleAddLead = async (leadData: any) => {
    setModalLoading(true);
    try {
      await createLead(leadData);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to create lead:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditLead = async (leadData: any) => {
    if (!editingLead) return;
    
    setModalLoading(true);
    try {
      await updateLead(editingLead.id, leadData);
      setIsEditModalOpen(false);
      setEditingLead(null);
    } catch (err) {
      console.error('Failed to update lead:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      setLoadingStates(prev => ({ ...prev, [leadId]: true }));
      try {
        await deleteLead(leadId);
      } catch (err) {
        console.error('Failed to delete lead:', err);
      } finally {
        setLoadingStates(prev => ({ ...prev, [leadId]: false }));
      }
    }
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setIsEditModalOpen(true);
  };

  const handleAddTag = async (leadId: string, newTag: string) => {
    if (!newTag.trim()) return;

    try {
      await addTag(leadId, newTag.trim());
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleUpdateTag = async (leadId: string, tagIndex: number, newValue: string) => {
    try {
      await updateTag(leadId, tagIndex, newValue);
    } catch (err) {
      console.error('Failed to update tag:', err);
    }
  };

  const handleRemoveTag = async (leadId: string, tagIndex: number) => {
    try {
      await removeTag(leadId, tagIndex);
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  const updateLeadStatus = (leadId: string, status: LeadStatus) => {
    updateLeadField(leadId, 'status', status);
  };

  const addStatus = () => {
    if (newStatus.trim() && !['new', 'contacted', 'qualified', 'lost', ...customStatuses].includes(newStatus.trim().toLowerCase() as LeadStatus)) {
      const status = newStatus.trim().toLowerCase() as LeadStatus;
      setCustomStatuses(prev => [...prev, status]);
      setNewStatus('');
      setShowStatusInput(false);
    }
  };

  const createBusiness = async () => {
    if (!newBusinessName.trim()) return;
    
    setCreatingBusiness(true);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication token available');
        return;
      }

      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          name: newBusinessName.trim(),
          category: 'general'
        }),
      });

      if (response.ok) {
        setNewBusinessName('');
        window.location.reload(); // Reload to refresh business context
      } else {
        const error = await response.json();
        console.error('Failed to create business:', error);
      }
    } catch (err) {
      console.error('Failed to create business:', err);
    } finally {
      setCreatingBusiness(false);
    }
  };

  const removeStatus = (statusToRemove: LeadStatus) => {
    // Don't allow removing the 'new' status as it's our fallback
    if (statusToRemove === 'new') {
      return;
    }
    
    // Remove from custom statuses if it's a custom status
    if (customStatuses.includes(statusToRemove)) {
      setCustomStatuses(prev => prev.filter(s => s !== statusToRemove));
    }
    
    // Update any leads with the removed status to 'new'
    // This would require updating all leads with that status
    // For now, we'll just remove it from the custom statuses list
    leads.forEach(lead => {
      if (lead.status === statusToRemove) {
        updateLeadField(lead.id, 'status', 'new');
      }
    });
  };

  const allStatuses = useMemo(() => {
    const defaultStatuses = ['new', 'contacted', 'qualified', 'lost'] as LeadStatus[];
    
    // Combine default statuses with custom ones, removing any duplicates
    return Array.from(new Set([
      ...defaultStatuses,
      ...customStatuses
    ] as LeadStatus[]));
  }, [customStatuses]);

  const filteredLeads = useMemo(() => {
    // If a status is selected, only filter by status
    if (leadStatusFilter !== 'all') {
      return leads.filter(lead => lead.status === leadStatusFilter);
    }
    
    // Otherwise, apply all other filters
    return leads.filter(lead => {
      const matchesSearch = 
        searchTerm === '' ||
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesTag = tagFilter === 'all' || lead.tags.includes(tagFilter);
      
      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [leads, searchTerm, statusFilter, tagFilter, leadStatusFilter]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    leads.forEach(lead => {
      lead.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [leads]);

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Email', 'Created At', 'Tags', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredLeads.map(lead => 
        [
          `"${lead.name}"`,
          `"${lead.phone}"`,
          `"${lead.email}"`,
          `"${format(new Date(lead.created_at), 'yyyy-MM-dd')}"`,
          `"${lead.tags.join(', ')}"`,
          `"${lead.status}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  
  return (
    <div className="p-6">
      {/* Business Header */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {logo && !logo.startsWith('blob:') ? (
              <Image 
                src={logo} 
                alt="Business Logo" 
                width={60} 
                height={60} 
                className="rounded-lg object-cover border-2 border-cyan-500/30" 
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-cyan-500/20 border-2 border-cyan-500/30 flex items-center justify-center">
                <span className="text-cyan-400 text-2xl font-bold">
                  {currentBusiness?.name?.charAt(0) || 'L'}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {currentBusiness?.name || 'Business'} Leads
              </h1>
              <p className="text-white/70">
                Track and manage your sales leads and conversion pipeline
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {businessLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400">Loading business information...</div>
        </div>
      ) : !currentBusiness ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-6">
          <div className="text-yellow-300 mb-4">
            <h3 className="text-lg font-semibold mb-2">No Business Selected</h3>
            <p className="text-sm opacity-90">
              {businesses.length === 0 
                ? "You need to create a business first to manage leads."
                : "Please select a business to view and manage leads."
              }
            </p>
          </div>
          {businesses.length === 0 ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Enter business name..."
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createBusiness()}
                  className="flex-1"
                />
                <Button 
                  onClick={createBusiness}
                  disabled={!newBusinessName.trim() || creatingBusiness}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  {creatingBusiness ? 'Creating...' : 'Create Business'}
                </Button>
              </div>
              <p className="text-xs text-yellow-200/70">
                Create your first business to start managing leads
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
                    Select Business
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {businesses.map((business) => (
                    <DropdownMenuItem
                      key={business.id}
                      onClick={() => switchBusiness(business.id)}
                    >
                      {business.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      ) : (
        <>
          {loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading leads...</span>
                </div>
              </div>
              
              {/* Table skeleton */}
              <div className="glass-card border-cyan-500/20 rounded-lg overflow-hidden">
                <div className="glass px-6 py-3 border-b border-cyan-500/20">
                  <Skeleton className="h-4 w-20 bg-cyan-500/20" />
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {/* Header skeleton */}
                    <div className="bg-white/5 border-b border-cyan-500/20">
                      <div className="grid grid-cols-6 gap-4 px-6 py-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-4 bg-cyan-500/20" />
                        ))}
                      </div>
                    </div>
                    {/* Row skeletons */}
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                      <div key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white/5' : 'bg-white/10'} border-b border-cyan-500/10`}>
                        <div className="grid grid-cols-6 gap-4 px-6 py-3">
                          {Array.from({ length: 6 }).map((_, colIndex) => (
                            <Skeleton key={colIndex} className="h-4 bg-gray-600/20" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="text-red-400">{error}</div>
            </div>
          )}
          
          {!loading && !error && (
        <>
          <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="text"
                placeholder="Search leads..."
                className="pl-10 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative w-full sm:w-48">
              <select
                className="flex h-10 w-full rounded-md border border-cyan-500/20 bg-white/5 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            
            <div className="relative w-full sm:w-48">
              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-cyan-500/20 bg-white/5 text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
              >
                <option value="all">All Statuses</option>
                {allStatuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 text-white">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
            
            <Button onClick={exportToCSV} variant="outline" className="ml-2 text-white">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card border-cyan-500/20 rounded-lg overflow-hidden">
        <div className="glass px-6 py-3 border-b border-cyan-500/20">
          <h3 className="text-sm font-medium text-cyan-300">Leads</h3>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-white/5">
              <TableRow className="border-b border-cyan-500/20">
                {columns.map((column) => (
                  <TableHead 
                    key={column.id}
                    className="text-xs font-medium text-cyan-400 uppercase tracking-wider"
                  >
                    <span className="font-bold text-cyan-300">{column.header}</span>
                  </TableHead>
                ))}
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead, index) => (
                  <TableRow 
                    key={lead.id} 
                    className={`${index % 2 === 0 ? 'bg-white/5' : 'bg-white/10'} hover:bg-white/15 border-b border-cyan-500/10`}
                  >
                    {columns.map((column) => {
                      const value = lead[column.accessor];
                      
                      return (
                        <TableCell 
                          key={`${lead.id}-${column.id}`}
                          className="px-4 py-3 text-sm text-gray-200 align-top"
                        >
                          {column.type === 'status' ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="focus:outline-none w-full text-left">
                                <div 
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer border ${
                                    value === 'new' 
                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30' 
                                      : value === 'contacted' 
                                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30' 
                                        : value === 'qualified' 
                                          ? 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30' 
                                          : value === 'lost'
                                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/30 hover:bg-pink-500/30'
                                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30'
                                  }`}
                                >
                                  {loadingStates[lead.id] ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : null}
                                  <span>{String(value).charAt(0).toUpperCase() + String(value).slice(1)}</span>
                                  <ChevronDown className="ml-1 h-3 w-3" />
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48">
                                {allStatuses.map((status) => (
                                  <div key={status} className="flex items-center group">
                                    <DropdownMenuItem 
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        updateLeadField(lead.id, column.accessor, status);
                                      }}
                                      className="flex-1 cursor-pointer"
                                    >
                                      <span className="capitalize">{status}</span>
                                    </DropdownMenuItem>
                                    {status !== 'new' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeStatus(status);
                                        }}
                                        className="mr-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-pink-400"
                                        title="Remove status"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <div className="border-t border-gray-100 my-1"></div>
                                {showStatusInput ? (
                                  <div className="px-2 py-1 flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={newStatus}
                                      onChange={(e) => setNewStatus(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          addStatus();
                                        } else if (e.key === 'Escape') {
                                          setShowStatusInput(false);
                                          setNewStatus('');
                                        }
                                      }}
                                      className="text-sm px-2 py-1 border border-cyan-500/30 bg-white/5 text-gray-200 rounded flex-1 min-w-0"
                                      placeholder="New status"
                                      autoFocus
                                    />
                                    <button
                                      onClick={addStatus}
                                      className="text-cyan-400 hover:text-cyan-300 p-1"
                                      title="Add status"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <DropdownMenuItem 
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setShowStatusInput(true);
                                    }}
                                    className="text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Add Status
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : column.type === 'tags' ? (
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(value) ? value : []).map((tag: string, tagIndex: number) => (
                                <span 
                                  key={`${lead.id}-${tagIndex}`}
                                  className="px-2 py-1 text-xs rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : column.type === 'date' ? (
                            <div className="whitespace-nowrap">
                              {value ? format(new Date(value), 'MMM d, yyyy') : ''}
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <input
                                type={column.accessor === 'email' ? 'email' : column.accessor === 'phone' ? 'tel' : 'text'}
                                className="w-full px-3 py-2 bg-white/10 border border-cyan-500/20 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:border-cyan-500/40 focus:bg-white/15 transition-all duration-200 text-sm"
                                value={value || ''}
                                readOnly
                                placeholder={`Enter ${column.header.toLowerCase()}`}
                              />
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(lead)}
                          className="p-1 hover:bg-gray-100 rounded relative text-gray-400 hover:text-cyan-400"
                          title="Edit lead"
                          disabled={loadingStates[lead.id]}
                        >
                          {loadingStates[lead.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Edit className="h-4 w-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this row?')) {
                              try {
                                handleDeleteLead(lead.id);
                              } catch (err) {
                                console.error('Failed to delete lead:', err);
                              }
                            }
                          }}
                          className="p-1 hover:bg-gray-100 rounded relative text-gray-400 hover:text-pink-400"
                          title="Delete row"
                          disabled={loadingStates[lead.id]}
                        >
                          {loadingStates[lead.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="px-6 py-8 text-center text-sm text-gray-400">
                    No leads found. Click "Add Lead" to create a new one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
        </>
          )}
        </>
      )}
      
      {/* Add Lead Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Lead"
      >
        <LeadForm
          onSubmit={handleAddLead}
          onCancel={() => setIsAddModalOpen(false)}
          loading={modalLoading}
        />
      </Modal>
      
      {/* Edit Lead Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingLead(null);
        }}
        title="Edit Lead"
      >
        <LeadForm
          lead={editingLead || undefined}
          onSubmit={handleEditLead}
          onCancel={() => {
            setIsEditModalOpen(false);
            setEditingLead(null);
          }}
          loading={modalLoading}
        />
      </Modal>
    </div>
  );
}

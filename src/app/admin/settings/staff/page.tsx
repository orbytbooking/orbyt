'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTenantQueries } from '@/lib/multiTenantSupabase';

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  gender: 'male' | 'female' | 'other' | '';
  phone: string;
  alternatePhone: string;
  address: string;
  apartment: string;
  sendInvitation: boolean;
  image?: string;
  [key: string]: any; // Add index signature to allow any string key
  status: 'active' | 'inactive';
  lastActive?: string;
};

const StaffManagement = () => {
  // State variables
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);
  
  // Business context and tenant queries
  const { currentBusiness } = useBusiness();
  const tenantQueries = currentBusiness ? useTenantQueries(currentBusiness.id) : null;
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: 'admin' | 'manager' | 'staff';
    gender: 'male' | 'female' | 'other' | '';
    phone: string;
    alternatePhone: string;
    address: string;
    apartment: string;
    sendInvitation: boolean;
    image?: string;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'staff',
    gender: '',
    phone: '',
    alternatePhone: '',
    address: '',
    apartment: '',
    sendInvitation: true,
    image: undefined
  });


  // Load staff data from database
  useEffect(() => {
    const fetchStaff = async () => {
      if (!currentBusiness || !tenantQueries) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: staffData, error } = await tenantQueries.staff.select('*');
        
        if (error) {
          console.error('Error fetching staff:', error);
          toast({
            title: 'Error',
            description: 'Failed to load staff members.',
            variant: 'destructive',
          });
          return;
        }

        // Convert snake_case from database to camelCase for frontend
        const formattedStaff: StaffMember[] = (staffData || []).map((member: any) => ({
          id: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          role: member.role,
          gender: member.gender || '',
          phone: member.phone || '',
          alternatePhone: member.alternate_phone || '',
          address: member.address || '',
          apartment: member.apartment || '',
          sendInvitation: member.send_invitation,
          image: member.image,
          status: member.status,
          lastActive: member.last_active,
        }));

        setStaff(formattedStaff);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast({
          title: 'Error',
          description: 'Failed to load staff members.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, [currentBusiness, tenantQueries, toast]);

  const filteredStaff = staff.filter(
    (member) =>
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Form handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, type } = target;
    const value = type === 'checkbox' 
      ? (target as HTMLInputElement).checked 
      : target.value;
      
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentBusiness || !tenantQueries) {
      toast({
        title: 'Error',
        description: 'Business context not available.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert camelCase to snake_case for database
      const staffData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        role: formData.role,
        gender: formData.gender || null,
        phone: formData.phone,
        alternate_phone: formData.alternatePhone,
        address: formData.address,
        apartment: formData.apartment,
        send_invitation: formData.sendInvitation,
        image: formData.image,
        status: 'active',
        last_active: new Date().toISOString(),
      };

      const { data, error } = await tenantQueries.staff.insert(staffData).select();
      
      if (error) {
        console.error('Error adding staff:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to add staff member.',
          variant: 'destructive',
        });
        return;
      }

      // Convert back to camelCase for frontend state
      const newStaff: StaffMember = {
        id: data[0].id,
        firstName: data[0].first_name,
        lastName: data[0].last_name,
        email: data[0].email,
        role: data[0].role,
        gender: data[0].gender || '',
        phone: data[0].phone || '',
        alternatePhone: data[0].alternate_phone || '',
        address: data[0].address || '',
        apartment: data[0].apartment || '',
        sendInvitation: data[0].send_invitation,
        image: data[0].image,
        status: data[0].status,
        lastActive: data[0].last_active,
      };

      setStaff([...staff, newStaff]);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'staff',
        gender: '',
        phone: '',
        alternatePhone: '',
        address: '',
        apartment: '',
        sendInvitation: true,
        image: undefined
      });
      setIsAddDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Staff member added successfully!',
      });
    } catch (error) {
      console.error('Error adding staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to add staff member.',
        variant: 'destructive',
      });
    }
  };

  // Handle edit staff submission
  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff || !currentBusiness || !tenantQueries) return;

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert camelCase to snake_case for database
      const updateData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        role: formData.role,
        gender: formData.gender || null,
        phone: formData.phone,
        alternate_phone: formData.alternatePhone,
        address: formData.address,
        apartment: formData.apartment,
        send_invitation: formData.sendInvitation,
        image: formData.image || currentStaff.image,
      };

      const { data, error } = await tenantQueries.staff
        .update(updateData)
        .eq('id', currentStaff.id)
        .select();
      
      if (error) {
        console.error('Error updating staff:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to update staff member.',
          variant: 'destructive',
        });
        return;
      }

      // Update local state with returned data
      const updatedStaffList = staff.map((member) =>
        member.id === currentStaff.id
          ? {
              ...member,
              firstName: data[0].first_name,
              lastName: data[0].last_name,
              email: data[0].email,
              role: data[0].role,
              gender: data[0].gender || '',
              phone: data[0].phone || '',
              alternatePhone: data[0].alternate_phone || '',
              address: data[0].address || '',
              apartment: data[0].apartment || '',
              sendInvitation: data[0].send_invitation,
              image: data[0].image,
              status: data[0].status,
              lastActive: data[0].last_active,
            }
          : member
      );

      setStaff(updatedStaffList);
      setIsEditDialogOpen(false);
      setCurrentStaff(null);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'staff',
        gender: '',
        phone: '',
        alternatePhone: '',
        address: '',
        apartment: '',
        sendInvitation: true,
        image: undefined
      });
      
      const successMessage = `${formData.firstName} ${formData.lastName}'s details have been updated.`;
      
      toast({
        title: 'Success',
        description: successMessage,
      });
    } catch (error) {
      console.error('Error updating staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to update staff member.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!currentBusiness || !tenantQueries) {
      toast({
        title: 'Error',
        description: 'Business context not available.',
        variant: 'destructive',
      });
      return;
    }

    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        const { error } = await tenantQueries.staff.delete().eq('id', id);
        
        if (error) {
          console.error('Error deleting staff:', error);
          toast({
            title: 'Error',
            description: error.message || 'Failed to delete staff member.',
            variant: 'destructive',
          });
          return;
        }

        const updatedStaff = staff.filter((member) => member.id !== id);
        setStaff(updatedStaff);
        
        toast({
          title: 'Success',
          description: 'Staff member deleted successfully!',
        });
      } catch (error) {
        console.error('Error deleting staff:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete staff member.',
          variant: 'destructive',
        });
      }
    }
  };

  const openEditDialog = (member: StaffMember) => {
    setCurrentStaff(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role,
      gender: member.gender || '',
      phone: member.phone || '',
      alternatePhone: member.alternatePhone || '',
      address: member.address || '',
      apartment: member.apartment || '',
      sendInvitation: member.sendInvitation !== undefined ? member.sendInvitation : true,
      image: member.image,
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: 'active' | 'inactive') => {
    return status === 'active' ? (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
        Active
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
        Inactive
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleStyles = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      manager: 'bg-blue-100 text-blue-800 border-blue-200',
      staff: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
      <Badge variant="outline" className={roleStyles[role as keyof typeof roleStyles]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage your team members and their permissions
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full md:w-1/3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{`${member.firstName} ${member.lastName}`}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell>
                        {member.lastActive
                          ? new Date(member.lastActive).toLocaleString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(member)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStaff(member.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No staff members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/10 dark:bg-gray-800/80 dark:border-gray-700">
            <CardHeader className="sticky top-0 bg-white/60 backdrop-blur-xl z-10 border-b border-white/20 p-6 dark:bg-gray-700/60 dark:border-gray-600">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:!text-white" style={{ color: 'white' }}>Add New Staff Member</CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:!text-white" style={{ color: 'white' }}>
                Fill in the details below to add a new staff member.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 bg-white/40 backdrop-blur-lg dark:bg-gray-700/40">
              <form onSubmit={handleAddStaff} className="space-y-6 w-full">
                {/* Profile Image */}
                <div className="flex flex-col items-center">
                  <label className="cursor-pointer mb-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <div className="w-32 h-32 rounded-full bg-white/30 backdrop-blur-md border-2 border-white/40 shadow-lg flex items-center justify-center overflow-hidden hover:bg-white/40 transition-all duration-300 dark:bg-gray-600/30 dark:border-gray-500/40 dark:hover:bg-gray-600/40">
                      {formData.image ? (
                        <img src={formData.image} alt="Staff" className="w-full h-full object-cover" />
                      ) : (
                        <Plus className="w-10 h-10 text-gray-600 dark:!text-white" style={{ color: 'white' }} />
                      )}
                    </div>
                  </label>
                  <p className="text-sm text-gray-500 mt-1 dark:!text-white" style={{ color: 'white' }}>Click to upload photo</p>
                </div>

                {/* First Name and Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-gray-700 font-medium dark:!text-white" style={{ color: 'white' }}>First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="John"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/30 focus:bg-white/60 focus:border-white/50 transition-all duration-200 dark:bg-gray-600/50 dark:border-gray-500/30 dark:focus:bg-gray-600/60 dark:focus:border-gray-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-gray-700 font-medium dark:!text-white" style={{ color: 'white' }}>Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/30 focus:bg-white/60 focus:border-white/50 transition-all duration-200 dark:bg-gray-600/50 dark:border-gray-500/30 dark:focus:bg-gray-600/60 dark:focus:border-gray-500/50"
                    />
                  </div>
                </div>
                
                {/* Gender */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium dark:!text-white" style={{ color: 'white' }}>Gender</Label>
                  <div className="flex gap-4 p-3 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20 dark:bg-gray-600/30 dark:border-gray-500/20">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={formData.gender === 'male'}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            gender: 'male' as const
                          }));
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary bg-white/50 dark:bg-gray-500/50"
                      />
                      <span className="text-gray-700 dark:!text-white" style={{ color: 'white' }}>Male</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={formData.gender === 'female'}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            gender: 'female' as const
                          }));
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary bg-white/50 dark:bg-gray-500/50"
                      />
                      <span className="text-gray-700 dark:!text-white" style={{ color: 'white' }}>Female</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="other"
                        checked={formData.gender === 'other'}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            gender: 'other' as const
                          }));
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary bg-white/50 dark:bg-gray-500/50"
                      />
                      <span className="text-gray-700 dark:!text-white" style={{ color: 'white' }}>Other</span>
                    </label>
                  </div>
                </div>
                
                {/* Email */}
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-gray-700 font-medium dark:!text-white" style={{ color: 'white' }}>Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    required
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:bg-white/60 focus:border-white/50 transition-all duration-200 dark:bg-gray-600/50 dark:border-gray-500/30 dark:focus:bg-gray-600/60 dark:focus:border-gray-500/50"
                  />
                </div>
                
                {/* Send Invitation */}
                <div className="flex items-center space-x-3 py-3 px-4 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20 dark:bg-gray-600/30 dark:border-gray-500/20">
                  <input
                    type="checkbox"
                    id="sendInvitation"
                    name="sendInvitation"
                    checked={formData.sendInvitation}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-white/30 bg-white/50 text-primary focus:ring-primary dark:border-gray-500/30 dark:bg-gray-500/50"
                  />
                  <Label htmlFor="sendInvitation" className="text-sm font-medium leading-none text-gray-700 cursor-pointer dark:!text-white" style={{ color: 'white' }}>
                    Send invitation email to this staff member
                  </Label>
                </div>
                
                {/* Phone Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-gray-700 font-medium dark:!text-white" style={{ color: 'white' }}>Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      required
                      className="bg-white/50 backdrop-blur-sm border-white/30 focus:bg-white/60 focus:border-white/50 transition-all duration-200 dark:bg-gray-600/50 dark:border-gray-500/30 dark:focus:bg-gray-600/60 dark:focus:border-gray-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="alternatePhone" className="text-gray-700 font-medium dark:!text-white" style={{ color: 'white' }}>Alternate Phone</Label>
                    <Input
                      id="alternatePhone"
                      name="alternatePhone"
                      type="tel"
                      value={formData.alternatePhone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 987-6543"
                      className="bg-white/50 backdrop-blur-sm border-white/30 focus:bg-white/60 focus:border-white/50 transition-all duration-200 dark:bg-gray-600/50 dark:border-gray-500/30 dark:focus:bg-gray-600/60 dark:focus:border-gray-500/50"
                    />
                  </div>
                </div>
                
                {/* Address and Apartment */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="address" className="text-gray-700 font-medium dark:!text-white" style={{ color: 'white' }}>Address</Label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="flex h-20 w-full rounded-md border border-white/30 bg-white/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:bg-white/60 focus:border-white/50 transition-all duration-200 dark:border-gray-500/30 dark:bg-gray-600/50 dark:focus:bg-gray-600/60 dark:focus:border-gray-500/50"
                      placeholder="123 Main St, City, State, ZIP"
                      required
                    />
                  </div>
                  
                  <div className="w-1/2">
                    <Label htmlFor="apartment" className="text-gray-700 font-medium dark:!text-white" style={{ color: 'white' }}>Apartment/Unit #</Label>
                    <Input
                      id="apartment"
                      name="apartment"
                      value={formData.apartment}
                      onChange={handleInputChange}
                      placeholder="Apt 4B"
                      className="bg-white/50 backdrop-blur-sm border-white/30 focus:bg-white/60 focus:border-white/50 transition-all duration-200 dark:bg-gray-600/50 dark:border-gray-500/30 dark:focus:bg-gray-600/60 dark:focus:border-gray-500/50"
                    />
                  </div>
                </div>
                
                {/* Role */}
                  <div className="space-y-1 pt-2">
                    <Label htmlFor="role" className="text-gray-700 font-medium dark:!text-white" style={{ color: 'white' }}>Role</Label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-white/30 bg-white/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:bg-white/60 focus:border-white/50 transition-all duration-200 dark:border-gray-500/30 dark:bg-gray-600/50 dark:focus:bg-gray-600/60 dark:focus:border-gray-500/50"
                      required
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      className="bg-white/30 backdrop-blur-sm border-white/30 hover:bg-white/40 transition-all duration-200 dark:bg-gray-600/30 dark:border-gray-500/30 dark:hover:bg-gray-600/40"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-200 text-gray-800 font-medium dark:bg-gray-600/20 dark:border-gray-500/30 dark:hover:bg-gray-600/30 dark:text-white">
                      Add Staff
                    </Button>
                  </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Staff Dialog */}
      {isEditDialogOpen && currentStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl max-h-[90vh] flex flex-col">
            <CardHeader className="sticky top-0 bg-background z-10 border-b p-4">
              <CardTitle className="text-lg">Edit Staff Member</CardTitle>
              <CardDescription className="text-sm">
                Update the details for {currentStaff.firstName} {currentStaff.lastName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              <form onSubmit={handleEditStaff} className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-firstName">First Name</Label>
                      <Input
                        id="edit-firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-lastName">Last Name</Label>
                      <Input
                        id="edit-lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email Address</Label>
                      <Input
                        id="edit-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone Number</Label>
                      <Input
                        id="edit-phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+1 (555) 123-4567"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-alternatePhone">Alternate Phone</Label>
                      <Input
                        id="edit-alternatePhone"
                        name="alternatePhone"
                        type="tel"
                        value={formData.alternatePhone}
                        onChange={handleInputChange}
                        placeholder="+1 (555) 987-6543"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-apartment">Apartment/Unit #</Label>
                      <Input
                        id="edit-apartment"
                        name="apartment"
                        value={formData.apartment}
                        onChange={handleInputChange}
                        placeholder="Apt 4B"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={formData.gender === 'male'}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary focus:ring-primary"
                        />
                        <span>Male</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={formData.gender === 'female'}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary focus:ring-primary"
                        />
                        <span>Female</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="gender"
                          value="other"
                          checked={formData.gender === 'other'}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-primary focus:ring-primary"
                        />
                        <span>Other</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="edit-address">Address</Label>
                    <textarea
                      id="edit-address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="123 Main St, City, State, ZIP"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="edit-sendInvitation"
                      name="sendInvitation"
                      checked={formData.sendInvitation}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="edit-sendInvitation" className="text-sm font-medium leading-none">
                      Send invitation email to this staff member
                    </Label>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="edit-role">Role</Label>
                    <select
                      id="edit-role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditDialogOpen(false);
                        setCurrentStaff(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;

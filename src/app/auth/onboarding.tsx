'use client';
import { useState } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { FiUser, FiMail, FiPhone, FiBriefcase, FiMapPin, FiCheck, FiArrowRight, FiArrowLeft, FiStar, FiCheckCircle } from 'react-icons/fi';
import { FaBusinessTime, FaClipboardList, FaCrown } from 'react-icons/fa';
import { GiCommercialAirplane } from 'react-icons/gi';
import Image from 'next/image';

const steps = [
  { title: 'Personal Info', icon: <FiUser className="w-5 h-5" /> },
  { title: 'Role Selection', icon: <FiUser className="w-5 h-5" /> },
  { title: 'Business Info', icon: <FaBusinessTime className="w-5 h-5" /> },
  { title: 'Industry', icon: <GiCommercialAirplane className="w-5 h-5" /> },
  { title: 'Plan Selection', icon: <FaClipboardList className="w-5 h-5" /> },
  { title: 'Review', icon: <FiCheck className="w-5 h-5" /> },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'owner', // Add role field with default
    businessName: '',
    businessAddress: '',
    businessCategory: '',
    plan: 'starter',
  });

  // Check authentication on component mount
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        
        // Check if user has already completed onboarding by looking for their business
        const { data: existingBusiness, error: businessError } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        
        // If there's an error getting the business, it might not exist yet
        // That's expected for new users who haven't completed onboarding
        if (businessError && businessError.code !== 'PGRST116') {
          console.error('Business check error:', businessError);
          // Don't redirect to login on business error, let them continue with onboarding
        }
        
        if (existingBusiness?.id) {
          // User already completed onboarding, redirect to dashboard
          router.push('/admin/dashboard');
          return;
        }
        
        // Load user data from metadata
        setForm(prev => ({
          ...prev,
          email: user.email || '',
          fullName: user.user_metadata?.full_name || ''
        }));
        setAuthChecked(true);
      } catch (error) {
        console.error('Auth check error:', error);
        // Only redirect to login if it's a critical auth error
        if (error.message?.includes('auth')) {
          router.push('/auth/login');
        } else {
          // For other errors, continue with onboarding
          setAuthChecked(true);
        }
      }
    };

    checkAuth();
  }, [router]);

  // Don't render until auth is checked
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handleNext = async () => {
    setDirection(1);
    if (step === steps.length - 1) {
      await handleSubmit();
      return;
    }
    setStep(s => Math.min(s + 1, steps.length - 1));
  };

  const handlePrev = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Validate required fields
      if (!form.fullName || !form.businessName || !form.businessCategory) {
        throw new Error('Please fill in all required fields');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      console.log('Creating business with data:', {
        name: form.businessName,
        address: form.businessAddress || null,
        category: form.businessCategory,
        owner_id: user.id,
        plan: form.plan,
        is_active: true
      });
      
      // Create business first
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert([{
          name: form.businessName,
          address: form.businessAddress || null,
          category: form.businessCategory,
          owner_id: user.id,
          plan: form.plan
        }])
        .select()
        .single();
      
      if (businessError) {
        console.error('Business creation error:', businessError);
        console.error('Full error object:', JSON.stringify(businessError, null, 2));
        throw new Error(`Failed to create business: ${businessError.message || JSON.stringify(businessError)}`);
      }
      
      console.log('Business created successfully:', businessData);
      
      // Update user metadata to mark onboarding complete
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          signup_stage: 'completed',
          business_id: businessData.id,
          full_name: form.fullName,
          role: form.role // Save user role
        }
      });
      
      if (metadataError) {
        console.error('Metadata update error:', metadataError);
        // Don't throw error for metadata update, just log it
        console.warn('Could not update user metadata, but continuing...');
      }
      
      // Store current business in localStorage for context
      localStorage.setItem('currentBusinessId', businessData.id);
      
      console.log('Onboarding completed successfully, redirecting to dashboard');
      
      // Success - account is now fully created in database
      // Redirect based on user role
      const redirectPath = form.role === 'provider' ? '/provider/dashboard' : '/admin/dashboard';
      router.push(redirectPath);
      
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'An error occurred during onboarding');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    const inputClasses = "w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-white shadow-sm";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-2 ml-1";
    const buttonClasses = "px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2";
    const iconWrapperClasses = "p-2 rounded-full bg-blue-50 text-blue-600";
    
    switch (step) {
      case 0: // Personal Info
        return (
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-1"
            >
              <h3 className="text-xl font-semibold text-gray-900">Tell us about yourself</h3>
              <p className="text-gray-500 text-sm">We'll use this information to personalize your experience.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative group"
            >
              <label className={labelClasses}>Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" />
                </div>
                <input
                  type="text"
                  className={`${inputClasses} pl-10`}
                  value={form.fullName}
                  onChange={e => setForm({...form, fullName: e.target.value})}
                  required
                  placeholder="John Doe"
                />
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative group"
            >
              <label className={labelClasses}>Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" />
                </div>
                <input
                  type="email"
                  className={`${inputClasses} pl-10 bg-gray-50 cursor-not-allowed`}
                  value={form.email}
                  readOnly
                  placeholder="john@example.com"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative group"
            >
              <label className={labelClasses}>Phone Number <span className="text-gray-400">(Optional)</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiPhone className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" />
                </div>
                <input
                  type="tel"
                  className={`${inputClasses} pl-10`}
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="(123) 456-7890"
                />
              </div>
            </motion.div>
          </div>
        );

      case 1: // Role Selection
        return (
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-1"
            >
              <h3 className="text-xl font-semibold text-gray-900">Select Your Role</h3>
              <p className="text-gray-500 text-sm">Choose how you'll be using the platform.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => setForm({...form, role: 'owner'})}
                  className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    form.role === 'owner' 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                      <FaCrown className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold text-lg ${
                        form.role === 'owner' ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        Business Owner
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Full access to manage your business, team, and all operations
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-gray-600">
                        <li>• Manage bookings and customers</li>
                        <li>• View analytics and reports</li>
                        <li>• Add and manage providers</li>
                        <li>• Full business settings</li>
                      </ul>
                    </div>
                    {form.role === 'owner' && (
                      <div className="flex-shrink-0">
                        <FiCheck className="w-6 h-6 text-blue-500" />
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => setForm({...form, role: 'provider'})}
                  className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    form.role === 'provider' 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-full bg-green-100 text-green-600">
                      <FiUser className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold text-lg ${
                        form.role === 'provider' ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        Service Provider
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Access to manage your schedule, bookings, and earnings
                      </p>
                      <ul className="mt-3 space-y-1 text-gray-600">
                        <li>• View your assigned bookings</li>
                        <li>• Manage your availability</li>
                        <li>• Track your earnings</li>
                        <li>• Update your profile</li>
                      </ul>
                    </div>
                    {form.role === 'provider' && (
                      <div className="flex-shrink-0">
                        <FiCheck className="w-6 h-6 text-blue-500" />
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        );

      case 2: // Business Info
        return (
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-1"
            >
              <h3 className="text-xl font-semibold text-gray-900">Business Information</h3>
              <p className="text-gray-500 text-sm">Tell us about your business.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative group"
            >
              <label className={labelClasses}>Business Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiBriefcase className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" />
                </div>
                <input
                  type="text"
                  className={`${inputClasses} pl-10`}
                  value={form.businessName}
                  onChange={e => setForm({...form, businessName: e.target.value})}
                  required
                  placeholder="Acme Inc."
                />
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative group"
            >
              <label className={labelClasses}>Business Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMapPin className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" />
                </div>
                <input
                  type="text"
                  className={`${inputClasses} pl-10`}
                  value={form.businessAddress}
                  onChange={e => setForm({...form, businessAddress: e.target.value})}
                  required
                  placeholder="123 Business St, City, Country"
                />
              </div>
            </motion.div>
          </div>
        );

      case 3: // Industry Selection
        return (
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-1"
            >
              <h3 className="text-xl font-semibold text-gray-900">Industry</h3>
              <p className="text-gray-500 text-sm">Select the industry that best describes your business</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'carpet-cleaning', name: 'Carpet Cleaning', icon: '🧽', description: 'Services for cleaning and maintaining carpets.' },
                  { id: 'spa', name: 'Spa', icon: '🧘', description: 'Relaxation and wellness services.' },
                  { id: 'lawn-care', name: 'Lawn Care', icon: '🌳', description: 'Services for maintaining lawns and gardens.' },
                  { id: 'gutter-cleaning', name: 'Gutter Cleaning', icon: '💧', description: 'Services for cleaning and maintaining gutters.' },
                  { id: 'home-cleaning', name: 'Home Cleaning', icon: '🏠', description: 'Residential cleaning services.' },
                  { id: 'financial-advisor', name: 'Financial Advisor', icon: '💰', description: 'Professional financial guidance and planning.' },
                  { id: 'car-wash', name: 'Car Wash', icon: '🚗', description: 'Services for washing and detailing vehicles.' },
                  { id: 'dog-walker', name: 'Dog Walker', icon: '🐕', description: 'Professional dog walking and pet care services.' },
                  { id: 'esthetician', name: 'Esthetician', icon: '💆', description: 'Skincare and beauty treatments.' },
                  { id: 'pool-cleaning', name: 'Pool Cleaning', icon: '🏊', description: 'Services for cleaning and maintaining swimming pools.' },
                  { id: 'nail-salon', name: 'Nail Salon', icon: '💅', description: 'Manicures, pedicures, and nail treatments.' },
                  { id: 'hair-salon', name: 'Hair Salon', icon: '💇', description: 'Hair cutting, styling, and coloring services.' },
                  { id: 'accountant', name: 'Accountant', icon: '📊', description: 'Financial record-keeping and tax preparation.' },
                  { id: 'lawyer', name: 'Lawyer', icon: '⚖️', description: 'Legal advice and representation.' },
                  { id: 'personal-trainer', name: 'Personal Trainer', icon: '💪', description: 'Individualized fitness coaching and exercise plans.' },
                  { id: 'window-cleaning', name: 'Window Cleaning', icon: '🪟', description: 'Services for cleaning windows in residential and commercial buildings.' },
                  { id: 'office-cleaning', name: 'Office Cleaning', icon: '🏢', description: 'Commercial office cleaning and maintenance.' },
                  { id: 'barber', name: 'Barber', icon: '💈', description: 'Haircutting and grooming services for men.' },
                  { id: 'moving-service', name: 'Moving Service', icon: '🚚', description: 'Relocation and transportation of goods.' },
                  { id: 'pet-groomer', name: 'Pet Groomer', icon: '🐾', description: 'Professional pet grooming and care.' },
                  { id: 'massage', name: 'Massage', icon: '👐', description: 'Therapeutic body massage and relaxation.' },
                  { id: 'post-construction', name: 'Post Construction', icon: '🚧', description: 'Cleaning and preparation after construction.' },
                  { id: 'photographer', name: 'Photographer', icon: '📸', description: 'Professional photography services for events and portraits.' },
                  { id: 'education-tutor', name: 'Education/Tutor', icon: '📚', description: 'Educational support and private tutoring.' },
                  { id: 'chiropractor', name: 'Chiropractor', icon: '🦴', description: 'Diagnosis and treatment of musculoskeletal disorders.' },
                  { id: 'customize-your-own', name: 'Customize Your Own', icon: '✏️', description: 'Create your own custom industry.' }
                ].map((industry, index) => (
                  <motion.div
                    key={industry.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + (index * 0.05) }}
                    onClick={() => setForm({...form, businessCategory: industry.id})}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      form.businessCategory === industry.id 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl flex-shrink-0">{industry.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm ${
                          form.businessCategory === industry.id ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {industry.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">{industry.description}</p>
                      </div>
                      {form.businessCategory === industry.id && (
                        <div className="flex-shrink-0">
                          <FiCheck className="w-5 h-5 text-blue-500" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {form.businessCategory && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-blue-50 rounded-lg border border-blue-100"
                >
                  <p className="text-sm text-blue-700">
                    {form.businessCategory === 'carpet-cleaning' && 'Carpet cleaning businesses can manage appointments, scheduling, and customer communications effectively.'}
                    {form.businessCategory === 'spa' && 'Spa businesses can manage appointments, client preferences, and wellness services seamlessly.'}
                    {form.businessCategory === 'lawn-care' && 'Lawn care businesses can manage seasonal services, client schedules, and route planning.'}
                    {form.businessCategory === 'gutter-cleaning' && 'Gutter cleaning services can manage appointments, seasonal scheduling, and maintenance tracking.'}
                    {form.businessCategory === 'home-cleaning' && 'Home cleaning businesses can manage recurring appointments, client preferences, and service schedules.'}
                    {form.businessCategory === 'financial-advisor' && 'Financial advisors can manage client appointments, consultations, and financial planning sessions.'}
                    {form.businessCategory === 'car-wash' && 'Car wash businesses can manage appointments, service packages, and customer loyalty programs.'}
                    {form.businessCategory === 'dog-walker' && 'Dog walkers can manage pet schedules, client communications, and service routes efficiently.'}
                    {form.businessCategory === 'esthetician' && 'Estheticians can manage client appointments, treatment records, and skincare services.'}
                    {form.businessCategory === 'pool-cleaning' && 'Pool cleaning businesses can manage maintenance schedules, client accounts, and service tracking.'}
                    {form.businessCategory === 'nail-salon' && 'Nail salons can manage appointments, client preferences, and service bookings.'}
                    {form.businessCategory === 'hair-salon' && 'Hair salons can manage stylist schedules, client appointments, and service inventory.'}
                    {form.businessCategory === 'accountant' && 'Accountants can manage client meetings, tax deadlines, and financial document organization.'}
                    {form.businessCategory === 'lawyer' && 'Law firms can manage client consultations, case schedules, and legal document tracking.'}
                    {form.businessCategory === 'personal-trainer' && 'Personal trainers can manage client sessions, workout plans, and fitness progress tracking.'}
                    {form.businessCategory === 'window-cleaning' && 'Window cleaning businesses can manage appointments, service routes, and commercial contracts.'}
                    {form.businessCategory === 'office-cleaning' && 'Office cleaning businesses can manage commercial contracts, cleaning schedules, and staff coordination.'}
                    {form.businessCategory === 'barber' && 'Barbers can manage client appointments, service preferences, and loyalty programs.'}
                    {form.businessCategory === 'moving-service' && 'Moving services can manage job scheduling, crew coordination, and client communications.'}
                    {form.businessCategory === 'pet-groomer' && 'Pet groomers can manage grooming appointments, client preferences, and pet care records.'}
                    {form.businessCategory === 'massage' && 'Massage therapists can manage client appointments, treatment preferences, and wellness programs.'}
                    {form.businessCategory === 'post-construction' && 'Post-construction cleaning businesses can manage project schedules, crew coordination, and client handovers.'}
                    {form.businessCategory === 'photographer' && 'Photographers can manage photoshoots, client consultations, and digital asset delivery.'}
                    {form.businessCategory === 'education-tutor' && 'Tutors can manage student sessions, lesson plans, and academic progress tracking.'}
                    {form.businessCategory === 'chiropractor' && 'Chiropractors can manage patient appointments, treatment records, and wellness care plans.'}
                    {form.businessCategory === 'customize-your-own' && 'Our platform can be fully customized to fit your unique service business needs.'}
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>
        );

      case 4: // Plan Selection
        return (
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-1 text-center"
            >
              <h3 className="text-2xl font-bold text-gray-900">Choose Your Plan</h3>
              <p className="text-gray-500">Select the plan that fits your business needs</p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {[
                { 
                  id: 'starter', 
                  name: 'Starter', 
                  price: 0, 
                  popular: false,
                  description: 'Perfect for small businesses getting started',
                  features: [
                    'Up to 100 bookings/month',
                    'Basic features',
                    'Email support',
                    '1 user account',
                    'Basic reporting'
                  ] 
                },
                { 
                  id: 'pro', 
                  name: 'Professional', 
                  price: 29, 
                  popular: true,
                  description: 'For growing businesses with more needs',
                  features: [
                    'Unlimited bookings',
                    'All starter features',
                    'Priority support',
                    'Up to 5 user accounts',
                    'Advanced reporting',
                    'Email & phone support'
                  ] 
                },
                { 
                  id: 'enterprise', 
                  name: 'Enterprise', 
                  price: 99, 
                  popular: false,
                  description: 'For large businesses with custom needs',
                  features: [
                    'All professional features',
                    '24/7 priority support',
                    'Unlimited user accounts',
                    'Custom solutions',
                    'Dedicated account manager',
                    'API access',
                    'Custom integrations'
                  ] 
                },
              ].map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + (0.1 * ['starter', 'pro', 'enterprise'].indexOf(plan.id)) }}
                  className={`relative rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                    form.plan === plan.id 
                      ? 'border-blue-500 shadow-lg scale-[1.02]' 
                      : plan.popular 
                        ? 'border-indigo-500 hover:shadow-lg hover:border-indigo-600' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                  onClick={() => setForm({...form, plan: plan.id})}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      POPULAR
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`text-lg font-bold ${
                          form.plan === plan.id ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {plan.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                      </div>
                      {form.plan === plan.id && (
                        <div className="bg-blue-100 text-blue-600 p-1 rounded-full">
                          <FiCheck className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-extrabold text-gray-900">
                          {plan.price === 0 ? 'Free' : `$${plan.price}`}
                        </span>
                        {plan.price > 0 && <span className="ml-1 text-gray-500">/month</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Billed annually or ${plan.price * 1.2} month-to-month</p>
                    </div>
                    
                    <ul className="mt-6 space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <svg 
                            className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${
                              form.plan === plan.id ? 'text-blue-500' : 'text-gray-400'
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 5: // Review
        return (
          <div className="space-y-6 max-h-screen overflow-y-auto px-2">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Review Your Information</h2>
              <p className="text-gray-600 text-sm">Please review your details before completing the setup.</p>
            </motion.div>

            {/* Summary Cards Grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              {/* Personal Info Card */}
              <motion.div
                whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
                <div className="relative z-10">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2">
                    <FiUser className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Personal Info</h3>
                  <div className="space-y-1 text-xs">
                    <div className="opacity-90">
                      <p className="font-medium truncate">{form.fullName || 'Not provided'}</p>
                    </div>
                    <div className="opacity-75 text-xs">
                      <p className="truncate">{form.email || 'No email'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Business Info Card */}
              <motion.div
                whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}
                className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl text-white relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
                <div className="relative z-10">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2">
                    <FiBriefcase className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Business Info</h3>
                  <div className="space-y-1 text-xs">
                    <div className="opacity-90">
                      <p className="font-medium truncate">{form.businessName || 'Not provided'}</p>
                    </div>
                    <div className="opacity-75 text-xs">
                      <p className="truncate">{form.businessAddress || 'No address'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Industry Card */}
              <motion.div
                whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}
                className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
                <div className="relative z-10">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2">
                    <GiCommercialAirplane className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Industry</h3>
                  <div className="space-y-1 text-xs">
                    <div className="opacity-90">
                      <p className="font-medium capitalize truncate">
                        {form.businessCategory ? 
                          form.businessCategory.replace(/-/g, ' ') : 'Not selected'
                        }
                      </p>
                    </div>
                    <div className="opacity-75 text-xs">
                      <p>1-10 employees</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Plan Card */}
              <motion.div
                whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}
                className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl text-white relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
                <div className="relative z-10">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-2">
                    <FaClipboardList className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Plan</h3>
                  <div className="space-y-1 text-xs">
                    <div className="opacity-90">
                      <p className="font-medium capitalize">
                        {form.plan === 'starter' ? 'Starter' : 
                         form.plan === 'pro' ? 'Professional' : 'Enterprise'}
                      </p>
                    </div>
                    <div className="opacity-75 text-xs">
                      <p>
                        {form.plan === 'starter' ? 'Free' : 
                         form.plan === 'pro' ? '$29/mo' : '$99/mo'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Compact Detailed Information */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Complete Details</h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Personal & Industry */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                          <FiUser className="w-3 h-3 text-blue-600" />
                        </div>
                        Personal Details
                      </h4>
                      <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 font-medium">Name</span>
                          <span className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">{form.fullName || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 font-medium">Email</span>
                          <span className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">{form.email || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 font-medium">Phone</span>
                          <span className="text-xs font-semibold text-gray-900">{form.phone || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center mr-2">
                          <GiCommercialAirplane className="w-3 h-3 text-purple-600" />
                        </div>
                        Industry Details
                      </h4>
                      <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 font-medium">Service Type</span>
                          <span className="text-xs font-semibold text-gray-900 capitalize truncate max-w-[120px]">
                            {form.businessCategory ? 
                              form.businessCategory.replace(/-/g, ' ') : 'Not provided'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 font-medium">Team Size</span>
                          <span className="text-xs font-semibold text-gray-900">1-10 employees</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Business & Plan */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center mr-2">
                          <FiBriefcase className="w-3 h-3 text-emerald-600" />
                        </div>
                        Business Details
                      </h4>
                      <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 font-medium">Business Name</span>
                          <span className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">{form.businessName || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 font-medium">Address</span>
                          <span className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">{form.businessAddress || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center mr-2">
                          <FaClipboardList className="w-3 h-3 text-orange-600" />
                        </div>
                        Plan Details
                      </h4>
                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-3 rounded-lg border border-orange-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-bold text-sm text-gray-900 capitalize">
                              {form.plan === 'starter' ? 'Starter' : 
                               form.plan === 'pro' ? 'Professional' : 'Enterprise'}
                            </h5>
                            <p className="text-base font-bold text-orange-600">
                              {form.plan === 'starter' ? 'Free' : 
                               form.plan === 'pro' ? '$29' : '$99'}
                              <span className="text-xs font-normal text-gray-500">/month</span>
                            </p>
                          </div>
                          {form.plan === 'pro' && (
                            <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-medium">
                              POPULAR
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-700 mb-1">Key Features:</p>
                          <div className="text-xs text-gray-600 space-y-1">
                            {form.plan === 'starter' && (
                              <>
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Up to 100 bookings/mo
                                </div>
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Basic features
                                </div>
                              </>
                            )}
                            {form.plan === 'pro' && (
                              <>
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Unlimited bookings
                                </div>
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Priority support
                                </div>
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Up to 5 users
                                </div>
                              </>
                            )}
                            {form.plan === 'enterprise' && (
                              <>
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  All features
                                </div>
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  24/7 support
                                </div>
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Custom solutions
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Compact CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-xl text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ready to Get Started!</h3>
                <p className="text-white/90 mb-6 text-sm">
                  You're all set to start using Orbyt CRM. Click below to complete your setup.
                </p>
                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 bg-white text-green-600 font-bold rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-70"
                >
                  {loading ? 'Completing Setup...' : 'Complete Setup'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <motion.div 
              className="flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src="/images/orbit.png"
                alt="Orbyt Logo"
                width={80}
                height={80}
                className="object-contain drop-shadow-lg"
              />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Welcome to Orbyt
            </h1>
          </div>
          <p className="mt-3 text-lg text-gray-600">Let's set up your business account in just a few steps</p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-12 relative">
          <div className="absolute top-5 left-0 right-0 h-1.5 bg-gray-100 -z-10 rounded-full">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(step / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center z-10">
                <motion.div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${i <= step ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md' : 'bg-white border-2 border-gray-200 text-gray-400'}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {i < step ? <FiCheck className="w-5 h-5" /> : s.icon}
                </motion.div>
                <span className={`text-xs mt-2 font-medium ${i <= step ? 'text-blue-600' : 'text-gray-400'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <motion.div 
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
            </div>
          </div>
          
          <div className="p-6 sm:p-8 md:p-10">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
                transition={{ duration: 0.3 }}
                className="min-h-[300px]"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
            
            <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between">
              <motion.button
                onClick={handlePrev}
                disabled={step === 0}
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.98 }}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${step === 0 ? 'invisible' : 'visible'} text-gray-600 hover:text-gray-800`}
              >
                <FiArrowLeft className="w-4 h-4 mr-1" /> Back
              </motion.button>
              
              <motion.button
                onClick={handleNext}
                disabled={loading}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-100`}
              >
                {loading ? (
                  <span>Processing...</span>
                ) : step === steps.length - 1 ? (
                  <span>Complete Setup</span>
                ) : (
                  <span>Continue <FiArrowRight className="w-4 h-4 ml-1 inline" /></span>
                )}
              </motion.button>
            </div>
            
            {error && (
              <motion.div 
                className="mt-4 p-3 text-sm text-red-600 bg-red-50 rounded-lg"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">Step {step + 1} of {steps.length}</p>
            </div>
          </div>
        </motion.div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}

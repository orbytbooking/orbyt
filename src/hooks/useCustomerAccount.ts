"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseCustomerClient } from "@/lib/supabaseCustomerClient";

export type CustomerAccount = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  businessName: string;
  notifications: {
    emailUpdates: boolean;
    smsUpdates: boolean;
    pushUpdates: boolean;
  };
};

export const useCustomerAccount = (requireAuth: boolean = true) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams?.get('business');
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const supabase = getSupabaseCustomerClient();

  useEffect(() => {
    const loadCustomerAccount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (requireAuth) {
            // Redirect to customer-auth with business context if available
            const redirectUrl = businessId 
              ? `/customer-auth?business=${businessId}` 
              : "/login";
            router.replace(redirectUrl);
          } else {
            // Don't redirect if auth is not required, just set account to null
            setAccount(null);
          }
          setAccountLoading(false);
          return;
        }

        // Require business context for customer account loading
        if (!businessId) {
          if (requireAuth) {
            console.error('Business context required for customer account');
            router.replace("/login");
          } else {
            setAccount(null);
          }
          setAccountLoading(false);
          return;
        }

        // Only try to fetch customer data if we have a session and business context
        const { data: customer, error } = await supabase
          .from('customers')
          .select('id, name, email, phone, address, avatar, email_notifications, sms_notifications, push_notifications, businesses(name)')
          .eq('auth_user_id', session.user.id)
          .eq('business_id', businessId)
          .single();

        if (error || !customer) {
          // Only log error if we expect to find customer data (when user is logged in)
          if (requireAuth) {
            console.error('Error loading customer account:', error);
            await supabase.auth.signOut();
            const redirectUrl = businessId 
              ? `/customer-auth?business=${businessId}` 
              : "/login";
            router.replace(redirectUrl);
          } else {
            // For booking page, user might not be a customer yet, so don't log error
            setAccount(null);
          }
          setAccountLoading(false);
          return;
        }

        setAccount({
          id: customer.id,
          name: customer.name || '',
          email: customer.email || '',
          phone: customer.phone || '',
          address: customer.address || '',
          avatar: customer.avatar || '',
          businessName: (customer.businesses as any)?.name || '',
          notifications: {
            emailUpdates: customer.email_notifications ?? true,
            smsUpdates: customer.sms_notifications ?? false,
            pushUpdates: customer.push_notifications ?? true,
          },
        });
      } catch (error) {
        console.error('Error in loadCustomerAccount:', error);
        if (requireAuth) {
          const redirectUrl = businessId 
            ? `/customer-auth?business=${businessId}` 
            : "/login";
          router.replace(redirectUrl);
        } else {
          // Don't redirect if auth is not required, just set account to null
          setAccount(null);
        }
      } finally {
        setAccountLoading(false);
      }
    };

    loadCustomerAccount();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAccount(null);
        if (requireAuth) {
          const redirectUrl = businessId 
            ? `/customer-auth?business=${businessId}` 
            : "/login";
          router.replace(redirectUrl);
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadCustomerAccount();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, requireAuth, businessId]);

  const updateAccount = useCallback(async (updates: Partial<CustomerAccount>) => {
    if (!account) return;

    try {
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
      if (updates.notifications?.emailUpdates !== undefined) dbUpdates.email_notifications = updates.notifications.emailUpdates;
      if (updates.notifications?.smsUpdates !== undefined) dbUpdates.sms_notifications = updates.notifications.smsUpdates;
      if (updates.notifications?.pushUpdates !== undefined) dbUpdates.push_notifications = updates.notifications.pushUpdates;

      const { error } = await supabase
        .from('customers')
        .update(dbUpdates)
        .eq('id', account.id);

      if (error) {
        console.error('Error updating customer account:', error);
        throw error;
      }

      setAccount((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...updates,
          notifications: {
            ...prev.notifications,
            ...(updates.notifications ?? {}),
          },
        };
      });
    } catch (error) {
      console.error('Failed to update account:', error);
      throw error;
    }
  }, [account]);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Error updating password:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update password:', error);
      throw error;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setAccount(null);
      const redirectUrl = businessId 
        ? `/customer-auth?business=${businessId}` 
        : "/login";
      router.replace(redirectUrl);
    } catch (error) {
      console.error('Error logging out:', error);
      const redirectUrl = businessId 
        ? `/customer-auth?business=${businessId}` 
        : "/login";
      router.replace(redirectUrl);
    }
  }, [router, businessId]);

  const customerName = account?.name || '';
  const customerEmail = account?.email || '';
  const customerPhone = account?.phone || '';
  const customerAddress = account?.address || '';
  const customerAvatar = account?.avatar || '';

  return {
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    customerAvatar,
    customerAccount: account,
    accountLoading,
    handleLogout,
    updateAccount,
    updatePassword,
  };
};

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);

  useEffect(() => {
    const loadCustomerAccount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (requireAuth) {
            router.replace("/login");
          } else {
            // Don't redirect if auth is not required, just set account to null
            setAccount(null);
          }
          setAccountLoading(false);
          return;
        }

        // Only try to fetch customer data if we have a session
        const { data: customer, error } = await supabase
          .from('customers')
          .select('id, name, email, phone, address, avatar, email_notifications, sms_notifications, push_notifications, businesses(name)')
          .eq('auth_user_id', session.user.id)
          .single();

        if (error || !customer) {
          // Only log error if we expect to find customer data (when user is logged in)
          if (requireAuth) {
            console.error('Error loading customer account:', error);
            await supabase.auth.signOut();
            router.replace("/login");
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
          router.replace("/login");
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
          router.replace("/login");
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadCustomerAccount();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, requireAuth]);

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
      router.replace("/login");
    } catch (error) {
      console.error('Error logging out:', error);
      router.replace("/login");
    }
  }, [router]);

  const customerName = account?.name || '';
  const customerEmail = account?.email || '';
  const customerAvatar = account?.avatar || '';

  return {
    customerName,
    customerEmail,
    customerAvatar,
    customerAccount: account,
    accountLoading,
    handleLogout,
    updateAccount,
    updatePassword,
  };
};

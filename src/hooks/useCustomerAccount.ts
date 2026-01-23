"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_EMAIL = "customer@premierpro.com";

export type CustomerAccount = {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  avatar: string;
  notifications: {
    emailUpdates: boolean;
    smsUpdates: boolean;
  };
};

const DEFAULT_ACCOUNT: CustomerAccount = {
  name: "Customer",
  email: DEFAULT_EMAIL,
  phone: "(555) 123-4567",
  address: "123 Main St, Chicago, IL",
  password: "premier123",
  avatar: "",
  notifications: {
    emailUpdates: true,
    smsUpdates: false,
  },
};

const mergeAccount = (partial?: Partial<CustomerAccount>): CustomerAccount => ({
  ...DEFAULT_ACCOUNT,
  ...partial,
  notifications: {
    ...DEFAULT_ACCOUNT.notifications,
    ...(partial?.notifications ?? {}),
  },
});

export const useCustomerAccount = () => {
  const router = useRouter();
  const [account, setAccount] = useState<CustomerAccount>(DEFAULT_ACCOUNT);
  const [accountLoading, setAccountLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isAuthenticated = localStorage.getItem("customerAuth") === "true";
    if (!isAuthenticated) {
      router.replace("/login");
      setAccountLoading(false);
      return;
    }

    const accountRaw = localStorage.getItem("customerAccount");

    if (!accountRaw) {
      localStorage.setItem("customerAccount", JSON.stringify(DEFAULT_ACCOUNT));
      setAccount(DEFAULT_ACCOUNT);
      setAccountLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(accountRaw) as Partial<CustomerAccount>;
      setAccount(mergeAccount(parsed));
    } catch {
      setAccount(DEFAULT_ACCOUNT);
    } finally {
      setAccountLoading(false);
    }
  }, [router]);

  const persistAccount = useCallback((next: CustomerAccount) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("customerAccount", JSON.stringify(next));
    }
  }, []);

  const updateAccount = useCallback((updates: Partial<CustomerAccount>) => {
    setAccount((prev) => {
      const next = mergeAccount({ ...prev, ...updates, notifications: { ...prev.notifications, ...(updates.notifications ?? {}) } });
      persistAccount(next);
      return next;
    });
  }, [persistAccount]);

  const updatePassword = useCallback((nextPassword: string) => {
    updateAccount({ password: nextPassword });
  }, [updateAccount]);

  const handleLogout = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("customerAuth", "false");
    router.replace("/login");
  }, [router]);

  const customerName = account.name;
  const customerEmail = account.email;
  const customerAvatar = account.avatar;

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

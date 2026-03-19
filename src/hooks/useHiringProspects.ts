import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";

export type HiringStage = "new" | "screening" | "interview" | "hired" | "rejected";

export type HiringProspect = {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  source: string;
  stage: HiringStage;
  createdAt: string;
  note?: string;
  stepIndex?: number;
  image?: string;
};

type ApiProspect = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  source: string;
  stage: HiringStage;
  created_at: string;
  note: string | null;
  step_index: number | null;
  image: string | null;
};

const toProspect = (row: ApiProspect): HiringProspect => ({
  id: row.id,
  firstName: row.first_name ?? undefined,
  lastName: row.last_name ?? undefined,
  name: row.name,
  email: row.email,
  phone: row.phone ?? undefined,
  role: row.role,
  source: row.source,
  stage: row.stage,
  createdAt: row.created_at,
  note: row.note ?? undefined,
  stepIndex: typeof row.step_index === "number" ? row.step_index : 0,
  image: row.image ?? undefined,
});

export function useHiringProspects() {
  const { currentBusiness } = useBusiness();
  const [prospects, setProspects] = useState<HiringProspect[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (path: string, options?: RequestInit) => {
      if (!currentBusiness?.id) {
        throw new Error("No business selected");
      }
      const response = await fetch(path, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": currentBusiness.id,
          ...(options?.headers || {}),
        },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Request failed");
      }
      return response.json();
    },
    [currentBusiness?.id]
  );

  const fetchProspects = useCallback(async () => {
    if (!currentBusiness?.id) {
      setProspects([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await request("/api/admin/hiring/prospects");
      const rows = Array.isArray(data.prospects) ? (data.prospects as ApiProspect[]) : [];
      setProspects(rows.map(toProspect));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load prospects");
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, request]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const createProspect = async (payload: Partial<HiringProspect>) => {
    const data = await request("/api/admin/hiring/prospects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const prospect = toProspect(data.prospect as ApiProspect);
    setProspects((prev) => [prospect, ...prev]);
    return prospect;
  };

  const updateProspect = async (id: string, payload: Partial<HiringProspect>) => {
    const data = await request(`/api/admin/hiring/prospects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const updated = toProspect(data.prospect as ApiProspect);
    setProspects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const deleteProspect = async (id: string) => {
    await request(`/api/admin/hiring/prospects/${id}`, { method: "DELETE" });
    setProspects((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    prospects,
    loading,
    error,
    refetch: fetchProspects,
    createProspect,
    updateProspect,
    deleteProspect,
  };
}

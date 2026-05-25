import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function assertProviderInBusiness(
  supabaseAdmin: ReturnType<typeof createClient>,
  providerId: string,
  businessId: string
) {
  const { data: provider, error } = await supabaseAdmin
    .from("service_providers")
    .select("id, business_id")
    .eq("id", providerId)
    .single();

  if (error || !provider) {
    return { ok: false as const, status: 404, error: "Provider not found" };
  }
  if (provider.business_id !== businessId) {
    return { ok: false as const, status: 403, error: "Provider does not belong to this business" };
  }
  return { ok: true as const };
}

/** GET - List provider drive files (same data as provider portal My Drive) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params;
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId") || request.headers.get("x-business-id");
    const parentId = searchParams.get("parentId");
    const parentIdValue = parentId === "null" || !parentId ? null : parentId;

    if (!providerId)
      return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });
    if (!businessId)
      return NextResponse.json({ error: "Business ID is required" }, { status: 400 });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const check = await assertProviderInBusiness(supabaseAdmin, providerId, businessId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    let query = supabaseAdmin
      .from("provider_drive_files")
      .select("*")
      .eq("provider_id", providerId)
      .eq("business_id", businessId);

    if (parentIdValue === null) {
      query = query.is("parent_id", null);
    } else {
      query = query.eq("parent_id", parentIdValue);
    }

    const { data: files, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
    }

    const transformed = (files || []).map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type,
      fileType: file.file_type || undefined,
      size: file.size_bytes != null ? formatFileSize(file.size_bytes) : undefined,
      sizeBytes: file.size_bytes,
      uploadedAt: file.created_at,
      url: file.storage_url || undefined,
      parentId: file.parent_id || null,
    }));

    return NextResponse.json({ files: transformed });
  } catch (e) {
    console.error("Admin provider drive GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST - Create folder (and optionally file record) in provider drive */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params;
    const body = await request.json().catch(() => ({}));
    const businessId = body?.businessId || request.headers.get("x-business-id");
    const { name, type, parentId, fileType, sizeBytes, storagePath, storageUrl } = body || {};

    if (!providerId) return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });
    if (!businessId) return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    if (!name || !type) return NextResponse.json({ error: "Name and type are required" }, { status: 400 });

    if (type !== "folder" && type !== "file") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const check = await assertProviderInBusiness(supabaseAdmin, providerId, businessId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const parentIdValue = parentId === "null" || parentId == null ? null : String(parentId);

    // Validate parent folder belongs to same provider + business
    if (parentIdValue) {
      const { data: parentFile, error: parentError } = await supabaseAdmin
        .from("provider_drive_files")
        .select("business_id, provider_id, type")
        .eq("id", parentIdValue)
        .single();

      if (parentError || !parentFile) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
      if (parentFile.type !== "folder") {
        return NextResponse.json({ error: "Parent must be a folder" }, { status: 400 });
      }
      if (parentFile.business_id !== businessId || parentFile.provider_id !== providerId) {
        return NextResponse.json({ error: "Cannot access folder from another provider/business" }, { status: 403 });
      }
    }

    const { data: newItem, error: insertError } = await supabaseAdmin
      .from("provider_drive_files")
      .insert({
        provider_id: providerId,
        business_id: businessId,
        name,
        type,
        file_type: fileType || null,
        size_bytes: sizeBytes || null,
        storage_path: storagePath || null,
        storage_url: storageUrl || null,
        parent_id: parentIdValue,
      })
      .select()
      .single();

    if (insertError || !newItem) {
      return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
    }

    const transformed = {
      id: newItem.id,
      name: newItem.name,
      type: newItem.type,
      fileType: newItem.file_type || undefined,
      size: newItem.size_bytes != null ? formatFileSize(newItem.size_bytes) : undefined,
      uploadedAt: newItem.created_at,
      url: newItem.storage_url || undefined,
      parentId: newItem.parent_id || null,
    };

    return NextResponse.json({ file: transformed }, { status: 201 });
  } catch (e) {
    console.error("Admin provider drive POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE - Delete a file from provider drive */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params;
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId") || request.headers.get("x-business-id");
    const fileId = searchParams.get("fileId");

    if (!providerId)
      return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });
    if (!businessId)
      return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    if (!fileId) return NextResponse.json({ error: "fileId is required" }, { status: 400 });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const check = await assertProviderInBusiness(supabaseAdmin, providerId, businessId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { data: file, error: fileError } = await supabaseAdmin
      .from("provider_drive_files")
      .select("*")
      .eq("id", fileId)
      .eq("provider_id", providerId)
      .eq("business_id", businessId)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: "File not found or access denied" }, { status: 404 });
    }

    if (file.type === "folder") {
      const { data: children } = await supabaseAdmin
        .from("provider_drive_files")
        .select("id")
        .eq("parent_id", fileId)
        .eq("business_id", businessId)
        .limit(1);
      if (children && children.length > 0) {
        return NextResponse.json(
          { error: "Cannot delete folder with files inside. Delete files first." },
          { status: 400 }
        );
      }
    }

    if (file.storage_path) {
      await supabaseAdmin.storage.from("provider-drive-files").remove([file.storage_path]);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("provider_drive_files")
      .delete()
      .eq("id", fileId)
      .eq("provider_id", providerId)
      .eq("business_id", businessId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin provider drive DELETE error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

function getFileType(fileName: string): "document" | "image" | "video" | "other" {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return "image";
  if (["mp4", "avi", "mov", "wmv"].includes(ext || "")) return "video";
  if (["pdf", "doc", "docx", "txt", "xls", "xlsx"].includes(ext || "")) return "document";
  return "other";
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

/** POST - Upload a file to provider drive (same storage as provider portal) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const businessId = (formData.get("businessId") as string) || request.headers.get("x-business-id");
    const parentId = formData.get("parentId") as string | null;
    const parentIdValue = parentId === "null" || !parentId ? null : parentId;

    if (!providerId)
      return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });
    if (!businessId)
      return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    if (!file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const check = await assertProviderInBusiness(supabaseAdmin, providerId, businessId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${businessId}/${providerId}/${Date.now()}-${sanitized}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("provider-drive-files")
      .upload(filePath, fileBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }

    let finalUrl: string;
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from("provider-drive-files")
      .createSignedUrl(filePath, 31536000);

    if (urlError || !urlData) {
      const { data: publicData } = supabaseAdmin.storage
        .from("provider-drive-files")
        .getPublicUrl(filePath);
      finalUrl = publicData.publicUrl;
    } else {
      finalUrl = urlData.signedUrl;
    }

    const { data: newFile, error: insertError } = await supabaseAdmin
      .from("provider_drive_files")
      .insert({
        provider_id: providerId,
        business_id: businessId,
        name: file.name,
        type: "file",
        file_type: getFileType(file.name),
        size_bytes: file.size,
        storage_path: filePath,
        storage_url: finalUrl,
        parent_id: parentIdValue,
      })
      .select()
      .single();

    if (insertError) {
      await supabaseAdmin.storage.from("provider-drive-files").remove([filePath]);
      return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });
    }

    const transformed = {
      id: newFile.id,
      name: newFile.name,
      type: newFile.type,
      fileType: newFile.file_type || undefined,
      size: formatFileSize(newFile.size_bytes || 0),
      sizeBytes: newFile.size_bytes,
      uploadedAt: newFile.created_at,
      url: newFile.storage_url || undefined,
      parentId: newFile.parent_id || null,
    };

    return NextResponse.json({ file: transformed }, { status: 201 });
  } catch (e) {
    console.error("Admin provider drive upload error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";

const RESTAURANT_ID = "0a8fb8bb-b4c8-4f05-9874-929637521f58";
const ALLOWED_TYPES = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"]]);

export async function POST(request) {
  try {
    const authorization = await requireAdministrator(request);
    if (authorization.error) return NextResponse.json({ error: authorization.error.message }, { status: authorization.error.status });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "A logo file is required." }, { status: 400 });
    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) return NextResponse.json({ error: "Only PNG, JPG or WebP images are allowed." }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Logo must be 2 MB or smaller." }, { status: 400 });
    const path = `restaurant-${RESTAURANT_ID}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await authorization.admin.storage.from("restaurant-logos").upload(path, Buffer.from(await file.arrayBuffer()), { cacheControl: "3600", contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: "Logo upload failed." }, { status: 500 });
    const { data: publicData } = authorization.admin.storage.from("restaurant-logos").getPublicUrl(path);
    const { data, error } = await authorization.admin.from("restaurants").update({ logo_url: publicData.publicUrl, theme_logo_url: publicData.publicUrl }).eq("id", RESTAURANT_ID).select("id,logo_url").maybeSingle();
    if (error || !data) {
      await authorization.admin.storage.from("restaurant-logos").remove([path]);
      return NextResponse.json({ error: error?.message || "Vaxeron organisation was not found." }, { status: error ? 500 : 404 });
    }
    return NextResponse.json({ success: true, logo_url: data.logo_url });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Unexpected logo upload error." }, { status: 500 });
  }
}

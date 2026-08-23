import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";

const RESTAURANT_ID = "0a8fb8bb-b4c8-4f05-9874-929637521f58";
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(request) {
  const authorization = await requireAdministrator(request);
  if (authorization.error) return NextResponse.json({ error: authorization.error.message }, { status: authorization.error.status });
  const body = await request.json();
  if (!HEX_COLOR.test(body.primaryColor || "")) return NextResponse.json({ error: "A valid six-digit hex colour is required." }, { status: 400 });
  if (!["light", "dark"].includes(body.backgroundStyle) || !["solid", "glass"].includes(body.cardStyle) || !["cozy", "compact"].includes(body.density)) return NextResponse.json({ error: "One or more appearance options are invalid." }, { status: 400 });
  const { data, error } = await authorization.admin.from("restaurants").update({ theme_primary_color: body.primaryColor, theme_background_style: body.backgroundStyle, theme_card_style: body.cardStyle, theme_density: body.density }).eq("id", RESTAURANT_ID).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Vaxeron organisation was not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}

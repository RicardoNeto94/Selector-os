import "server-only";
import { handleContact } from "@/lib/site/contactHandler.mjs";

export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request) { return handleContact(request); }

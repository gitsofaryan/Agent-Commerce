import { NextRequest, NextResponse } from "next/server";
import {
  armorIqHealth,
  listArmorIqAudit,
  listArmorIqProfiles,
} from "@/lib/integrations/armoriq";

export async function GET(request: NextRequest) {
  const limitParam = Number(request.nextUrl.searchParams.get("limit") || "100");
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(500, limitParam))
    : 100;

  return NextResponse.json({
    ok: true,
    integration: "armoriq",
    status: armorIqHealth(),
    profiles: listArmorIqProfiles(),
    audit: listArmorIqAudit(limit),
  });
}

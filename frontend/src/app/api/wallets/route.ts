import { NextResponse } from "next/server";
import { getWallets } from "@/lib/mock-runtime";

export async function GET() {
  return NextResponse.json({ wallets: getWallets() });
}

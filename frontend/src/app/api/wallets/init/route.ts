import { NextResponse } from "next/server";
import { initWallets } from "@/lib/mock-runtime";

export async function POST() {
  return NextResponse.json({ wallets: initWallets() });
}

import { NextResponse } from "next/server";
import { getPlatformWallet, initWallets } from "@/lib/mock-runtime";

export async function POST() {
  try {
    return NextResponse.json({
      success: true,
      wallets: await initWallets(),
      platform: await getPlatformWallet(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

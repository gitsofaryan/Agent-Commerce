import { NextResponse } from "next/server";
import { getPlatformWallet, getWallets } from "@/lib/mock-runtime";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      wallets: await getWallets(),
      platform: await getPlatformWallet(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: message,
        wallets: [],
        platform: { wallet_address: null, balance: 0, network: "devnet" },
      },
      { status: 500 },
    );
  }
}

"use client";

import AppNavbar from "@/components/AppNavbar";
import { SolanaWalletProvider } from "@/context/SolanaWalletProvider";
import { SimulationEngine } from "@/components/SimulationEngine";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hasSidebar = pathname !== "/";
  const contentOffsetClass = hasSidebar
    ? "h-[calc(100vh-var(--app-header-h,80px))] overflow-y-auto pl-55"
    : "h-[calc(100vh-var(--app-header-h,80px))] overflow-y-auto";

  return (
    <SolanaWalletProvider>
      <SimulationEngine />
      <div className="h-screen overflow-hidden">
        <AppNavbar />
        <main className={contentOffsetClass} style={{ marginTop: "var(--app-header-h, 80px)" }}>
          {children}
        </main>
      </div>
    </SolanaWalletProvider>
  );
}

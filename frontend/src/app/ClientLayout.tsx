"use client";

import AppNavbar from "@/components/AppNavbar";
import { SolanaWalletProvider } from "@/context/SolanaWalletProvider";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const contentOffsetClass = pathname === "/" ? "" : "md:pl-[120px]";

  return (
    <SolanaWalletProvider>
      <AppNavbar />
      <div className={contentOffsetClass}>{children}</div>
    </SolanaWalletProvider>
  );
}

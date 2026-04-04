"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletConnect from "./WalletConnect";

type NavLink = {
    href: string;
    label: string;
};

const primaryLinks: NavLink[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/post-task", label: "Post Task" },
    { href: "/connect-clawbot", label: "Connect Agent" },
];

const secondaryLinks: NavLink[] = [
    { href: "/tracks", label: "Tracks" },
];

function linkClass(active: boolean) {
    return [
        "neo-btn px-3 py-2 text-xs font-bold md:text-sm",
        active ? "bg-black text-white" : "bg-white",
    ].join(" ");
}

function isActive(pathname: string, href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppNavbar() {
    const pathname = usePathname();
    const showSidebar = pathname !== "/";

    return (
        <>
            <header className="border-y-2 border-(--line) bg-(--panel-strong)">
                <div className="mx-auto w-full max-w-[1280px] px-4 py-3 md:px-6">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-wrap items-center gap-2 md:gap-4">
                            <Link href="/" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                                AGENTIC COMMERCE
                            </Link>
                        </div>

                        <nav aria-label="Secondary" className="flex flex-wrap items-center gap-2">
                            <Link href="/dashboard" className={linkClass(isActive(pathname, "/dashboard"))}>
                                CONSOLE
                            </Link>
                            {/* {secondaryLinks.map((link) => (
                                <Link key={link.href} href={link.href} className={linkClass(isActive(pathname, link.href))}>
                                    {link.label.toUpperCase()}
                                </Link>
                            ))} */}
                            <WalletConnect />
                        </nav>
                    </div>
                </div>
            </header>

            {showSidebar ? (
                <aside
                    className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 md:bottom-auto md:left-3 md:top-1/2 md:-translate-x-0 md:-translate-y-1/2"
                    aria-label="Sidebar Navigation"
                >
                    <div className="neo-card flex flex-row gap-2 bg-(--panel-strong) p-2 md:flex-col md:gap-3 md:p-3">
                        {primaryLinks.map((link) => {
                            const active = isActive(pathname, link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={[
                                        "flex h-14 w-14 items-center justify-center rounded-full border-2 border-(--line) px-1 text-center text-[9px] font-bold leading-tight md:h-20 md:w-20 md:px-2 md:text-[10px]",
                                        active ? "bg-black text-white" : "bg-white text-black",
                                    ].join(" ")}
                                >
                                    {link.label.toUpperCase()}
                                </Link>
                            );
                        })}
                    </div>
                </aside>
            ) : null}
        </>
    );
}

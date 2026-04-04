"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import WalletConnect from "./WalletConnect";

type NavLink = {
    href: string;
    label: string;
};

const primaryLinks: NavLink[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/tasks", label: "Tasks" },
    { href: "/my-agents", label: "My Agents" },
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
    const headerRef = useRef<HTMLElement | null>(null);
    const [headerHeight, setHeaderHeight] = useState(88);

    useEffect(() => {
        const updateHeaderHeight = () => {
            const nextHeight = headerRef.current?.offsetHeight ?? 88;
            setHeaderHeight(nextHeight);
            document.documentElement.style.setProperty("--app-header-h", `${nextHeight}px`);
        };

        updateHeaderHeight();
        window.addEventListener("resize", updateHeaderHeight);

        if (typeof ResizeObserver === "undefined") {
            return () => {
                window.removeEventListener("resize", updateHeaderHeight);
            };
        }

        const observer = new ResizeObserver(updateHeaderHeight);
        if (headerRef.current) {
            observer.observe(headerRef.current);
        }

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateHeaderHeight);
        };
    }, []);

    return (
        <div style={{ "--app-header-h": `${headerHeight}px` } as React.CSSProperties}>
            <header ref={headerRef} className="fixed top-0 left-0 right-0 z-40 border-y-2 border-(--line) bg-(--panel-strong)">
                <div className="mx-auto w-full max-w-7xl px-4 py-3 md:px-6">
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
                <section
                    className="fixed left-0 z-30 w-55 overflow-hidden border-r-2 border-(--line) bg-(--panel)"
                    style={{ top: headerHeight, bottom: 0 }}
                >
                    <div className="h-full w-full px-4 py-3 md:px-3 md:py-4">
                        <aside aria-label="Sidebar Navigation" className="h-full">
                            <div className="neo-card flex flex-wrap gap-2 bg-(--panel-strong) p-2 md:h-full md:flex-col md:flex-nowrap md:items-stretch md:gap-3 md:p-3">
                                {primaryLinks.map((link) => {
                                    const active = isActive(pathname, link.href);
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={[
                                                "flex min-h-10 min-w-23 items-center justify-center rounded-full border-2 border-(--line) px-3 text-center text-[10px] font-bold leading-tight md:min-h-11 md:w-full md:justify-start md:px-4 md:text-sm",
                                                active ? "bg-black text-white" : "bg-white text-black",
                                            ].join(" ")}
                                        >
                                            {link.label.toUpperCase()}
                                        </Link>
                                    );
                                })}
                            </div>
                        </aside>
                    </div>
                </section>
            ) : null}
        </div>
    );
}

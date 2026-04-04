"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
    href: string;
    label: string;
};

const primaryLinks: NavLink[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/post-task", label: "Post Task" },
    { href: "/create-agent", label: "Create Agent" },
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

    return (
        <header className="border-y-2 border-(--line) bg-(--panel-strong)">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-3 md:px-6">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        <Link href="/" className="text-2xl font-extrabold tracking-tight md:text-3xl">
                            AGENT COMMERCE
                        </Link>
                        <span className="mono text-[11px] text-(--muted)">Mock Frontend Runtime</span>
                    </div>

                    <nav aria-label="Primary" className="flex flex-wrap items-center gap-2">
                        {primaryLinks.map((link) => (
                            <Link key={link.href} href={link.href} className={linkClass(isActive(pathname, link.href))}>
                                {link.label.toUpperCase()}
                            </Link>
                        ))}
                    </nav>

                    <nav aria-label="Secondary" className="flex flex-wrap items-center gap-2">
                        {secondaryLinks.map((link) => (
                            <Link key={link.href} href={link.href} className={linkClass(isActive(pathname, link.href))}>
                                {link.label.toUpperCase()}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
        </header>
    );
}

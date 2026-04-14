"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface AdminNavProps {
  unverifiedCount: number;
  pendingSubmissions: number;
  userName: string | null;
  userEmail: string | null;
}

const icons: Record<string, ReactNode> = {
  dashboard: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  ),
  layoffs: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="10" y2="12" />
    </svg>
  ),
  companies: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="13" rx="1" />
      <line x1="5" y1="5" x2="6" y2="5" />
      <line x1="10" y1="5" x2="11" y2="5" />
      <line x1="5" y1="8" x2="6" y2="8" />
      <line x1="10" y1="8" x2="11" y2="8" />
      <line x1="7" y1="15" x2="7" y2="12" />
      <line x1="9" y1="15" x2="9" y2="12" />
    </svg>
  ),
  submissions: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M2 9l2-6h8l2 6" />
      <path d="M2 9v4a1 1 0 001 1h10a1 1 0 001-1V9" />
      <path d="M2 9h3l1 2h4l1-2h3" />
    </svg>
  ),
  rss: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 3a10 10 0 0110 10" />
      <path d="M3 8a5 5 0 015 5" />
      <circle cx="3.5" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  ),
  queue: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <line x1="2" y1="6" x2="14" y2="6" />
      <line x1="2" y1="10" x2="14" y2="10" />
      <line x1="6" y1="2" x2="6" y2="14" />
    </svg>
  ),
  newsletter: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <rect x="1.5" y="3" width="13" height="10" rx="1" />
      <path d="M1.5 4l6.5 5 6.5-5" />
    </svg>
  ),
  subscribers: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 14c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
    </svg>
  ),
  social: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,11 6,7 9,10 14,4" />
      <polyline points="10,4 14,4 14,8" />
    </svg>
  ),
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: { count: number; tone: "red" | "amber" };
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export function AdminNav({
  unverifiedCount,
  pendingSubmissions,
  userName,
  userEmail,
}: AdminNavProps) {
  const pathname = usePathname();

  const groups: NavGroup[] = [
    {
      label: "Main",
      items: [
        { href: "/admin", label: "Dashboard", icon: icons.dashboard },
        {
          href: "/admin/layoffs",
          label: "Layoffs",
          icon: icons.layoffs,
          badge: unverifiedCount > 0 ? { count: unverifiedCount, tone: "red" } : undefined,
        },
        { href: "/admin/companies", label: "Companies", icon: icons.companies },
        {
          href: "/admin/submissions",
          label: "Submissions",
          icon: icons.submissions,
          badge:
            pendingSubmissions > 0 ? { count: pendingSubmissions, tone: "amber" } : undefined,
        },
      ],
    },
    {
      label: "Pipeline",
      items: [
        { href: "/admin/feeds", label: "RSS Feeds", icon: icons.rss },
        { href: "/admin/queue", label: "Queue", icon: icons.queue },
      ],
    },
    {
      label: "Distribution",
      items: [
        { href: "/admin/newsletter", label: "Newsletter", icon: icons.newsletter },
        { href: "/admin/subscribers", label: "Subscribers", icon: icons.subscribers },
        { href: "/admin/social", label: "Social", icon: icons.social },
      ],
    },
  ];

  const isActive = (href: string): boolean => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 px-2">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] tracking-[1px] uppercase text-neutral-500 px-3 pt-5 pb-1.5 font-medium">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] bg-blue-500/10 text-blue-400 transition-colors"
                        : "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-neutral-400 transition-colors hover:bg-neutral-800/50 hover:text-neutral-200"
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span
                        className={
                          item.badge.tone === "red"
                            ? "ml-auto text-[11px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400"
                            : "ml-auto text-[11px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400"
                        }
                      >
                        {item.badge.count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[11px] font-medium text-neutral-400">
            {userName?.charAt(0)?.toUpperCase() ||
              userEmail?.charAt(0)?.toUpperCase() ||
              "?"}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-white truncate">
              {userName || "Admin"}
            </p>
            <p className="text-[11px] text-neutral-500 truncate">{userEmail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

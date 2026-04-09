import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import SignOutButton from "@/components/layout/sign-out-button";
import "@/app/globals.css";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/layoffs", label: "Layoffs" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/feeds", label: "RSS Feeds" },
  { href: "/admin/newsletter", label: "Newsletter" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/social", label: "Social" },
  { href: "/admin/queue", label: "Queue" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // No session: render without sidebar (for login page)
  if (!session) {
    return (
      <html lang="en">
        <body className="bg-neutral-950 text-white">{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="bg-neutral-950 text-white">
        <div className="flex min-h-screen">
          <aside className="flex w-64 flex-col border-r border-neutral-800 bg-neutral-900">
            <div className="border-b border-neutral-800 px-6 py-5">
              <h2 className="text-lg font-bold tracking-tight">Layoff Tracker</h2>
              <p className="text-xs text-neutral-400">Admin Panel</p>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-neutral-800 px-4 py-4">
              <p className="mb-3 truncate text-xs text-neutral-400">{session.user?.email ?? "Admin"}</p>
              <SignOutButton />
            </div>
          </aside>
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

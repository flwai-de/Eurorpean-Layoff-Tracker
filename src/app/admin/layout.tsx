import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { layoffs, submissions } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { AdminNav } from "@/components/admin/admin-nav";
import "@/app/globals.css";

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

  const [unverifiedResult, pendingResult] = await Promise.all([
    db.select({ count: count() }).from(layoffs).where(eq(layoffs.status, "unverified")),
    db.select({ count: count() }).from(submissions).where(eq(submissions.status, "pending")),
  ]);

  const unverifiedCount = Number(unverifiedResult[0]?.count ?? 0);
  const pendingSubmissions = Number(pendingResult[0]?.count ?? 0);

  return (
    <html lang="en">
      <body className="bg-neutral-950 text-white">
        <div className="flex min-h-screen">
          <aside className="flex w-56 flex-col border-r border-neutral-800/50 bg-neutral-900/50">
            <div className="px-4 py-5">
              <p className="text-[16px] font-medium tracking-tight">dimissio</p>
              <p className="text-[11px] text-neutral-500">Admin Panel</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <AdminNav
                unverifiedCount={unverifiedCount}
                pendingSubmissions={pendingSubmissions}
                userName={session.user?.name ?? null}
                userEmail={session.user?.email ?? null}
              />
            </div>

            <div className="border-t border-neutral-800/50 px-3 py-3">
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/admin/login" });
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-lg px-3 py-1.5 text-[12px] text-neutral-500 transition hover:bg-neutral-800/50 hover:text-neutral-300"
                >
                  Sign out
                </button>
              </form>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

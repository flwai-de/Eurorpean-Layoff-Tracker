import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;
      const [admin] = await db
        .select()
        .from(admins)
        .where(eq(admins.email, profile.email))
        .limit(1);
      if (!admin) return false;
      // Link GitHub ID on first login
      if (!admin.githubId && profile.id) {
        await db
          .update(admins)
          .set({ githubId: String(profile.id) })
          .where(eq(admins.id, admin.id));
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const [admin] = await db
          .select()
          .from(admins)
          .where(eq(admins.email, session.user.email))
          .limit(1);
        if (admin) {
          session.user.id = admin.id;
          (session.user as typeof session.user & { role: string }).role = admin.role;
        }
      }
      return session;
    },
  },
});

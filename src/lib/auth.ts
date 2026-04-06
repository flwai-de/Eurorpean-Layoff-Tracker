import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;

      const admin = await db
        .select()
        .from(admins)
        .where(eq(admins.email, profile.email))
        .limit(1);

      return admin.length > 0;
    },
    async session({ session }) {
      if (session.user?.email) {
        const admin = await db
          .select()
          .from(admins)
          .where(eq(admins.email, session.user.email))
          .limit(1);

        if (admin[0]) {
          session.user.id = admin[0].id;
          (session.user as Record<string, unknown>).role = admin[0].role;
        }
      }
      return session;
    },
  },
});

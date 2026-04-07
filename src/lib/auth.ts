import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
      if (!admin.githubId && profile.id) {
        await db
          .update(admins)
          .set({ githubId: String(profile.id) })
          .where(eq(admins.id, admin.id));
      }
      return true;
    },
    async jwt({ token, profile }) {
      // Only runs on initial sign-in when profile is present
      if (profile?.email) {
        try {
          const [admin] = await db
            .select()
            .from(admins)
            .where(eq(admins.email, profile.email))
            .limit(1);
          if (admin) {
            token.adminId = admin.id;
            token.adminRole = admin.role;
          }
        } catch {
          // DB error during token creation — don't block auth
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.adminId) {
        session.user.id = token.adminId as string;
        (session.user as typeof session.user & { role: string }).role = token.adminRole as string;
      }
      return session;
    },
  },
});

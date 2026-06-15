import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username as string },
          });

          // For testing, if user doesn't exist, we create one automatically so you can login!
          if (!user) {
            const newUser = await prisma.user.create({
              data: {
                username: credentials.username as string,
                password: credentials.password as string, // WARNING: In production, hash this!
                name: "Test Salesman",
              },
            });
            return { id: newUser.id, name: newUser.name, email: newUser.username };
          }

          // WARNING: In production, use bcrypt.compare
          if (user.password === credentials.password) {
            return { id: user.id, name: user.name, email: user.username };
          }

          return null;
        } catch (error) {
          console.error("[Auth] Database error during authorize:", error);
          return null;
        }
      },
    }),
  ],
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fresh login — store role from DB
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
        token.role = dbUser?.role || "SALESMAN";
      } else if (token?.sub) {
        // Existing session — validate user still exists in DB (guards against reseed)
        const stillExists = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, role: true },
        });
        if (!stillExists) {
          // User was deleted / DB was reseeded — invalidate the token
          return {} as typeof token;
        }
        // Keep role in sync in case it changed
        token.role = stillExists.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      if (token?.role) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

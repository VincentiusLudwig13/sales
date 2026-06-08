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
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

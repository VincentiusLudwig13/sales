import { auth } from "@/lib/auth";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const { nextUrl } = req;
  
  const isAuthRoute = nextUrl.pathname === "/login";
  
  // Protect salesman routes
  const isSalesmanRoute = ["/dashboard", "/activity", "/visit"].some((path) =>
    nextUrl.pathname.startsWith(path)
  );
  
  // Protect admin routes
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return Response.redirect(new URL("/login", nextUrl));
    }
    if (userRole !== "ADMIN") {
      return Response.redirect(new URL("/dashboard", nextUrl));
    }
  }

  if (isSalesmanRoute) {
    if (!isLoggedIn) {
      return Response.redirect(new URL("/login", nextUrl));
    }
    if (userRole === "ADMIN") {
      // Admins are redirected to the admin workspace
      return Response.redirect(new URL("/admin/dashboard", nextUrl));
    }
  }

  if (isAuthRoute && isLoggedIn) {
    if (userRole === "ADMIN") {
      return Response.redirect(new URL("/admin/dashboard", nextUrl));
    } else {
      return Response.redirect(new URL("/dashboard", nextUrl));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

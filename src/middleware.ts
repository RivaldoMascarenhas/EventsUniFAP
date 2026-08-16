import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Force password reset before accessing any admin features
    if (token?.mustChangePassword) {
      if (!pathname.startsWith("/change-password") && !pathname.startsWith("/api/auth")) {
        return NextResponse.redirect(new URL("/change-password", req.url));
      }
    }

    // Admin only routes
    if (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/audit")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname, searchParams } = req.nextUrl;

        // Public routes
        if (
          pathname.startsWith("/public") ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/branding") ||
          pathname.startsWith("/sponsors") ||
          pathname.startsWith("/uploads") ||
          pathname.startsWith("/api/public") ||
          (pathname.startsWith("/api/events") && pathname.includes("/public-registration")) ||
          (pathname.startsWith("/api/events") && pathname.includes("/realtime"))
        ) {
          return true;
        }

        // Presentation mode with dedicated event presentation token bypasses full NextAuth login
        if (pathname.startsWith("/presentation") && searchParams.has("token")) {
          return true;
        }

        // Require authentication for other admin routes and change-password
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/presentation/:path*",
    "/change-password",
  ],
};

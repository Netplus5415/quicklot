import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = { matcher: ["/admin/:path*"] };

export default async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  const adminCookie = request.cookies.get("__admin_check");
  if (adminCookie?.value === session.user.id) {
    return response;
  }

  try {
    const checkUrl = new URL("/api/admin/check", request.url);
    const res = await fetch(checkUrl.toString(), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = (await res.json()) as { isAdmin?: boolean };
    if (!data.isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    response.cookies.set("__admin_check", session.user.id, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60,
      path: "/admin",
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

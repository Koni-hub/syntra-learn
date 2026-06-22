import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); supabaseResponse = NextResponse.next({ request }); cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/register") && !request.nextUrl.pathname.startsWith("/forgot-password") && !request.nextUrl.pathname.startsWith("/reset-password") && !request.nextUrl.pathname.startsWith("/api/auth") && request.nextUrl.pathname !== "/" && !request.nextUrl.pathname.startsWith("/docs") && !request.nextUrl.pathname.startsWith("/about") && !request.nextUrl.pathname.startsWith("/privacy") && !request.nextUrl.pathname.startsWith("/terms")) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)"],
}

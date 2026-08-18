import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 로그인 후 돌아갈 곳. 검증 없이 쓰면 외부로 튕길 수 있으므로 내부 경로만 허용.
  const next = safeInternalPath(searchParams.get("next"));
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=oauth_denied`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_no_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession error:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  // 신규 OAuth 사용자 프로필 생성
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    const meta = data.user.user_metadata ?? {};
    const displayName =
      meta.name ||
      meta.full_name ||
      meta.preferred_username ||
      data.user.email?.split("@")[0] ||
      "카카오 사용자";

    await supabase.from("profiles").insert({
      id: data.user.id,
      name: displayName,
      email: data.user.email ?? null,
      role: "user",
    });
  }

  return NextResponse.redirect(`${origin}${next}`);
}

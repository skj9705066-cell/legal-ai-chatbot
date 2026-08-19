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

  // 가입 집계용. 이번 왕복에서 프로필이 새로 만들어졌을 때만 표식을 단다.
  let signedUpWith: string | null = null;

  if (!profile) {
    const meta = data.user.user_metadata ?? {};
    const displayName =
      meta.name ||
      meta.full_name ||
      meta.preferred_username ||
      data.user.email?.split("@")[0] ||
      "회원";

    const { error: insertError } = await supabase.from("profiles").insert({
      id: data.user.id,
      name: displayName,
      email: data.user.email ?? null,
      role: "user",
    });

    // ⚠️ 여기가 실패하면 auth.users에는 계정이 남지만 profiles에는 안 남는다.
    // 그 계정은 앱에서 "가입 안 된 사람"처럼 보이고 관리자 회원 목록에도 안 뜬다.
    // 조용히 새어나가면 원인을 못 찾으므로 반드시 남긴다.
    if (insertError) {
      console.error(
        `[auth/callback] profile insert failed userId=${data.user.id} msg=${insertError.message}`,
      );
    } else {
      signedUpWith = String(data.user.app_metadata?.provider ?? "oauth");
    }
  }

  // 가입 완료는 서버에서 일어나므로 클라이언트가 알 수 없다.
  // SignupTracker가 이 표식을 보고 한 번만 집계한 뒤 쿼리를 지운다.
  const target = new URL(`${origin}${next}`);
  if (signedUpWith) target.searchParams.set("signup", signedUpWith);

  return NextResponse.redirect(target);
}

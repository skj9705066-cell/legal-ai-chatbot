import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KAKAO_ERROR_MAP: Record<string, string> = {
  "KOE101": "카카오 앱 키가 올바르지 않습니다.",
  "KOE303": "redirect_uri가 카카오 개발자 콘솔에 등록되지 않았습니다.",
  "KOE320": "인증 코드가 만료됐습니다. 다시 로그인해주세요.",
  "KOE322": "이미 사용된 인증 코드입니다. 다시 로그인해주세요.",
  "KOE400": "잘못된 요청입니다.",
  "Bad client credentials": "카카오 앱 인증에 실패했습니다. 잠시 후 다시 시도해주세요.",
};

function localizeKakaoError(code?: string, description?: string): string {
  if (code && KAKAO_ERROR_MAP[code]) return KAKAO_ERROR_MAP[code];
  if (description && KAKAO_ERROR_MAP[description]) return KAKAO_ERROR_MAP[description];
  return description || code || "카카오 로그인에 실패했습니다.";
}

export async function POST(req: NextRequest) {
  const { code, redirectUri } = await req.json();

  if (!code || !redirectUri) {
    return NextResponse.json({ error: "code와 redirectUri가 필요합니다." }, { status: 400 });
  }

  // 1. 카카오 access token 발급
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_REST_API_KEY!,  // 서버 토큰 교환은 REST API 키
      redirect_uri: redirectUri,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || tokenData.error) {
    return NextResponse.json(
      { error: localizeKakaoError(tokenData.error, tokenData.error_description) },
      { status: 400 },
    );
  }

  // 2. 카카오 사용자 정보 조회
  const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  });
  const userData = await userRes.json();

  if (!userRes.ok || userData.code) {
    return NextResponse.json(
      { error: localizeKakaoError(String(userData.code), userData.msg) },
      { status: 400 },
    );
  }

  const kakaoId = String(userData.id);
  const kakaoAccount = userData.kakao_account ?? {};

  // 이메일 동의·유효성 확인
  const email: string | undefined = kakaoAccount.email;
  const emailNeedsAgreement: boolean = kakaoAccount.email_needs_agreement === true;

  if (!email || emailNeedsAgreement) {
    return NextResponse.json(
      {
        error:
          "카카오 계정의 이메일 제공에 동의가 필요합니다. 카카오 로그인 시 이메일 제공에 동의해주세요.",
      },
      { status: 400 },
    );
  }

  const name: string =
    kakaoAccount.profile?.nickname ||
    userData.properties?.nickname ||
    "카카오 사용자";

  return NextResponse.json({ email, name, kakaoId });
}

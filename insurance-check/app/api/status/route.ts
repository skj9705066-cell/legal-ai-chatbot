import { NextResponse } from "next/server";
import { getDeployEnv, getPublicConfig, type SubmissionStatus } from "@/lib/config";
import { getDbCheck } from "@/lib/server/db-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 신청 폼이 화면을 띄운 뒤 다시 묻는 "지금 실제로 접수가 되는지". 페이지(5분 캐시)와 달리 매번 서버에서 확인한다 */
export async function GET() {
  const config = getPublicConfig();
  let enabled = config.submissionEnabled;
  let dbFailures: string[] = [];
  // 실제 DB를 쓰는 모드는 접수 API와 같은 DB 자동 점검(통과 5분·실패 30초 캐시)을 미리 확인한다
  if (enabled && config.mode !== "demo") {
    const db = await getDbCheck();
    if (db && !db.ok) {
      enabled = false;
      dbFailures = db.items.filter((i) => !i.ok).map((i) => `${i.label} — ${i.detail}`);
    }
  }

  const body: SubmissionStatus = {
    submissionEnabled: enabled,
    diagnostics:
      getDeployEnv() === "production" || enabled
        ? null
        : {
            lockedBy: config.lockedBy ?? [],
            dbFailures,
            deployment: {
              env: getDeployEnv(),
              url: process.env.VERCEL_URL ?? null,
              branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
              commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
            },
          },
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

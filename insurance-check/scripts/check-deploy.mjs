#!/usr/bin/env node
/**
 * 배포 게이트. `npm run build` 전에 자동 실행된다.
 *  - 운영 모드(APP_MODE=production 또는 Vercel Production 배포):
 *      Vercel Production 배포는 항목이 비어 있어도 '접수 잠금' 상태로 빌드한다(경고 출력). 빌드를 실패시키면
 *      실제 고객 주소에 이전 배포(데모 화면 등)가 그대로 남기 때문이다. 접수·광고 태그는 앱이 잠근다.
 *      그 밖(로컬 등)에서 운영 모드로 빌드하면 하나라도 없을 때 실패한다.
 *  - 데모 모드면: 경고만 출력하고 통과
 *  - --strict: 모드와 무관하게 운영 기준으로 검사 (배포 전 수동 점검용)
 *  - 테스트(staging) 모드면: 인프라 항목 + 운영 DB 점검 확인일이 비어 있으면 경고(접수는 앱이 잠근다)
 *  - 모든 모드: 비밀키가 브라우저로 나갈 수 있는 설정(NEXT_PUBLIC_ 변수)이나 키 뒤바뀜이 있으면 빌드 실패
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.production.local", ".env.local", ".env.production", ".env"]) {
  const p = join(root, f);
  if (existsSync(p)) {
    try {
      process.loadEnvFile(p); // 이미 설정된 값은 덮어쓰지 않음
    } catch {
      /* ignore */
    }
  }
}

const req = JSON.parse(readFileSync(join(root, "config/requirements.json"), "utf8"));
const strict = process.argv.includes("--strict");
// 모드 규칙은 lib/config.ts getAppMode()와 같다:
//  Vercel Preview + PREVIEW_TEST_SUBMISSIONS=1 → staging / Vercel Production 배포는 APP_MODE와 관계없이 production
const deployEnv = process.env.VERCEL_ENV;
const mode =
  deployEnv === "preview" && process.env.PREVIEW_TEST_SUBMISSIONS === "1"
    ? "staging"
    : process.env.APP_MODE === "production" || deployEnv === "production"
      ? "production"
      : process.env.APP_MODE === "staging"
        ? "staging"
        : "demo";

/* ── 비밀키 노출 방지 (모든 모드) ──
 * NEXT_PUBLIC_ 변수는 빌드 시 브라우저 번들에 그대로 들어간다. 비밀키를 여기에 두면 누구나 볼 수 있다.
 * 키 종류 판별 규칙은 lib/supabase-keys.ts와 같다(값은 출력하지 않는다). */
function keyKind(k) {
  k = (k ?? "").trim();
  if (k.startsWith("sb_secret_")) return "secret";
  if (k.startsWith("sb_publishable_")) return "publishable";
  const parts = k.split(".");
  if (parts.length === 3) {
    try {
      const role = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")).role;
      if (role === "service_role") return "secret";
      if (role === "anon") return "publishable";
    } catch {
      /* unknown */
    }
  }
  return k ? "unknown" : "empty";
}
const exposure = [];
const SECRET_NAMES = ["SUPABASE_SERVICE_ROLE_KEY", "APP_SECRET", "PII_ENCRYPTION_KEY", "DEMO_ADMIN_PASSWORD"];
const secretValues = SECRET_NAMES.map((n) => (process.env[n] ?? "").trim()).filter((v) => v.length >= 8);
for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith("NEXT_PUBLIC_")) continue;
  if (/SERVICE_ROLE|SECRET|PRIVATE|PASSWORD|ENCRYPTION|PII/i.test(name)) exposure.push(`  - ${name}: 비밀값으로 보이는 이름의 변수를 NEXT_PUBLIC_으로 두면 브라우저에 노출됩니다`);
  else if (secretValues.includes((value ?? "").trim())) exposure.push(`  - ${name}: 비밀키와 같은 값이 공개 변수에 들어 있습니다`);
  else if (keyKind(value) === "secret") exposure.push(`  - ${name}: Supabase 비밀키(secret/service_role)가 공개 변수에 들어 있습니다`);
}
if (keyKind(process.env.SUPABASE_SERVICE_ROLE_KEY) === "publishable") exposure.push("  - SUPABASE_SERVICE_ROLE_KEY: 공개 키(publishable/anon)가 들어 있습니다 — secret 키를 넣으세요");
if (keyKind(process.env.SUPABASE_ANON_KEY) === "secret") exposure.push("  - SUPABASE_ANON_KEY: 비밀키가 들어 있습니다 — publishable(공개) 키를 넣으세요");
if (exposure.length) {
  console.error(`\n[check-deploy] 비밀키 노출 위험 — 빌드를 중단합니다:\n${exposure.join("\n")}\n`);
  process.exit(1);
}
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function check(key, group) {
  const v = (process.env[key] ?? "").trim();
  if (!v) return "미설정";
  if ((group === "approvals" || key === "PRIVACY_POLICY_EFFECTIVE_DATE") && !DATE.test(v)) return "YYYY-MM-DD 형식 아님";
  if (key === "APP_SECRET" && v.length < 32) return "32자 미만";
  if (key === "PII_ENCRYPTION_KEY" && Buffer.from(v, "base64").length !== 32) return "base64 32바이트 아님";
  if (key === "NEXT_PUBLIC_SITE_URL" && !v.startsWith("https://")) return "https 아님";
  return null;
}

const failures = [];
for (const group of ["approvals", "operator", "infra"]) {
  for (const { key, label } of req[group]) {
    const problem = check(key, group);
    if (problem) failures.push(`  - [${group}] ${label} (${key}): ${problem}`);
  }
}

if (mode === "staging" && !strict) {
  const STAGING = new Set([...req.infra.map((r) => r.key), "APPROVAL_DB_VERIFIED"]);
  const missing = failures.filter((f) => [...STAGING].some((k) => f.includes(`(${k})`)));
  console.log("[check-deploy] 테스트(staging) 모드 빌드입니다. 실제 DB에 '테스트 신청'으로 저장하며 광고 태그는 꺼집니다.");
  if (missing.length) console.warn(`[check-deploy] 테스트 모드 필수 항목 미완료 — 신청 접수가 잠깁니다:\n${missing.join("\n")}`);
  process.exit(0);
}

if (mode === "demo" && !strict) {
  console.log("[check-deploy] 데모 모드 빌드입니다. 실제 신청을 받지 않습니다. 운영 배포 전 `npm run check:deploy`로 점검하세요.");
  process.exit(0);
}

if (failures.length && deployEnv === "production" && !strict) {
  console.warn(`\n[check-deploy] 운영 준비 미완료 — ${failures.length}개 항목. 신청 접수·광고 태그가 잠긴 상태로 빌드합니다:\n${failures.join("\n")}\n`);
  console.warn("광고 집행 전 모든 항목을 채우고 `npm run check:deploy`가 통과하는지 확인하세요. (docs/DEPLOY_CHECKLIST.md)\n");
  process.exit(0);
}

if (failures.length) {
  console.error(`\n[check-deploy] 운영 배포 불가 — ${failures.length}개 항목 미완료:\n${failures.join("\n")}\n`);
  console.error("소속 GA의 보험 모집 광고 및 개인정보 처리 사전 승인 전에는 운영 배포를 하지 마세요. (docs/DEPLOY_CHECKLIST.md)\n");
  process.exit(1);
}
console.log("[check-deploy] 운영 배포 필수 항목이 모두 설정되었습니다. 체크리스트의 수동 확인 항목도 점검하세요.");

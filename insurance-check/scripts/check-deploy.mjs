#!/usr/bin/env node
/**
 * 배포 게이트. `npm run build` 전에 자동 실행된다.
 *  - APP_MODE=production 이면: 운영 정보·인프라·GA 승인 기록이 전부 있어야 빌드 진행 (하나라도 없으면 실패)
 *  - 데모 모드면: 경고만 출력하고 통과
 *  - --strict: 모드와 무관하게 운영 기준으로 검사 (배포 전 수동 점검용)
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
const mode = process.env.APP_MODE === "production" ? "production" : "demo";
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

if (mode === "demo" && !strict) {
  console.log("[check-deploy] 데모 모드 빌드입니다. 실제 신청을 받지 않습니다. 운영 배포 전 `npm run check:deploy`로 점검하세요.");
  process.exit(0);
}

if (failures.length) {
  console.error(`\n[check-deploy] 운영 배포 불가 — ${failures.length}개 항목 미완료:\n${failures.join("\n")}\n`);
  console.error("소속 GA의 보험 모집 광고 및 개인정보 처리 사전 승인 전에는 운영 배포를 하지 마세요. (docs/DEPLOY_CHECKLIST.md)\n");
  process.exit(1);
}
console.log("[check-deploy] 운영 배포 필수 항목이 모두 설정되었습니다. 체크리스트의 수동 확인 항목도 점검하세요.");

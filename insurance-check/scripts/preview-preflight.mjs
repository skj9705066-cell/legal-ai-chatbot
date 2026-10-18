#!/usr/bin/env node
/**
 * Preview 사전 점검 — 배포 화면을 한 번 받아 현재 상태를 요약한다(값·비밀은 출력하지 않음).
 *   node scripts/preview-preflight.mjs <Preview URL>
 * 보호 우회: VERCEL_AUTOMATION_BYPASS_SECRET이 있으면 공식 우회 헤더를 붙인다.
 * 출력: HTTP 상태, 모드 배너(데모/테스트/없음), 신청 잠김 여부, 잠김 원인(미완료 설정 변수 이름 — 화면의 진단 줄)
 * 종료 코드: 테스트 신청이 가능한 상태면 0, Vercel 배포 보호로 화면을 못 받으면 3, 그 밖에 1
 */
const url = process.argv[2] || process.env.E2E_BASE_URL;
if (!url) {
  console.error("사용법: node scripts/preview-preflight.mjs <Preview URL>");
  process.exit(2);
}
const headers = {};
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const res = await fetch(url, { headers, redirect: "manual" });
const html = await res.text();
const text = html
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<!-- -->/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ");

const out = [];
out.push(`HTTP 상태: ${res.status}`);
if (res.status === 401 || res.status === 403 || (res.status >= 300 && res.status < 400)) {
  out.push(
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? "→ Vercel 배포 보호(로그인 요구)로 막혔습니다. 우회 비밀값이 이 프로젝트의 Protection Bypass for Automation 값과 다릅니다."
      : "→ Vercel 배포 보호(로그인 요구)로 막혔습니다. VERCEL_AUTOMATION_BYPASS_SECRET(Protection Bypass for Automation)이 필요합니다.",
  );
  console.log(out.join("\n"));
  process.exit(3);
}
const mode = text.includes("테스트 모드") ? "테스트(staging)" : text.includes("데모 모드") ? "데모(demo)" : "배너 없음(운영 모드 또는 구버전)";
const locked = text.includes("현재 신청 접수를 준비하고 있어요");
const diag = text.match(/\[테스트 환경 진단 · (\w+)\] 미완료 설정: ([A-Z0-9_(),\s.가-힣]+?)(?=\s{2,}|\s*점검 유형|$)/);
out.push(`모드 배너: ${mode}`);
out.push(`신청 접수: ${locked ? "잠김" : "열림"}`);
if (diag) out.push(`잠김 원인(미완료 설정, ${diag[1]}): ${diag[2].trim()}`);
if (mode.startsWith("데모")) out.push("→ Preview가 데모 모드입니다. 신청이 Supabase가 아니라 서버 메모리에 저장됩니다. PREVIEW_TEST_SUBMISSIONS=1(Preview 전용)이 필요합니다.");
console.log(out.join("\n"));
process.exit(mode.startsWith("테스트") && !locked ? 0 : 1);

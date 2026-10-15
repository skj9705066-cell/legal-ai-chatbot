#!/usr/bin/env node
/**
 * 로컬 데모 실행용 .env.local 생성 (Windows/macOS/Linux 공통).
 * - APP_MODE=demo 고정: 실제 접수·DB 저장·문자 발송 없음
 * - APP_SECRET, DEMO_ADMIN_PASSWORD를 랜덤 생성해 화면에 한 번 출력
 * 이미 .env.local이 있으면 덮어쓰지 않는다.
 */
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const file = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
if (existsSync(file)) {
  console.log(`[setup-demo-env] ${file} 이 이미 있습니다. 관리자 비밀번호는 그 파일의 DEMO_ADMIN_PASSWORD 값입니다.`);
  process.exit(0);
}
const password = `demo-${randomBytes(4).toString("hex")}`;
writeFileSync(
  file,
  [
    "# 로컬 데모 전용 — git에 올라가지 않음",
    "APP_MODE=demo",
    `APP_SECRET=${randomBytes(32).toString("hex")}`,
    `DEMO_ADMIN_PASSWORD=${password}`,
    "",
  ].join("\n"),
);
console.log(`[setup-demo-env] .env.local 생성 완료 (데모 모드)\n  관리자 비밀번호: ${password}\n  관리자 주소:     http://localhost:3100/admin/login`);

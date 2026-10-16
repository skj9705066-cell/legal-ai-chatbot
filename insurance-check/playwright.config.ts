import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// 사전 설치된 Chromium 사용 (PLAYWRIGHT_CHROMIUM_PATH로 덮어쓰기 가능). 없으면(예: GitHub Actions) Playwright 기본 브라우저.
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const launchOptions = existsSync(chromiumPath) ? { executablePath: chromiumPath } : {};
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3100";

// Vercel Preview 보호(로그인 요구)를 자동 테스트에서 통과시키는 공식 우회 헤더. 값은 CI 비밀값으로만 받는다.
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHTTPHeaders = bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL, launchOptions, extraHTTPHeaders, trace: "off", locale: "ko-KR", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 }, launchOptions, extraHTTPHeaders } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 780 }, launchOptions, extraHTTPHeaders } },
  ],
});

import { defineConfig, devices } from "@playwright/test";

// 사전 설치된 Chromium 사용 (PLAYWRIGHT_CHROMIUM_PATH로 덮어쓰기 가능).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3100";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL, launchOptions: { executablePath }, trace: "off", locale: "ko-KR" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 }, launchOptions: { executablePath } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 780 }, launchOptions: { executablePath } } },
  ],
});

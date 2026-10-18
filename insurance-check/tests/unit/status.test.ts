import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/status/route";
import type { SubmissionStatus } from "@/lib/config";

const status = async () => (await (await GET()).json()) as SubmissionStatus;

afterEach(() => {
  process.env.APP_MODE = "demo";
  delete process.env.VERCEL_ENV;
  delete process.env.PREVIEW_TEST_SUBMISSIONS;
  delete process.env.VERCEL_URL;
});

describe("GET /api/status (신청 폼의 실제 접수 가능 여부)", () => {
  it("demo: always open, no diagnostics", async () => {
    process.env.APP_MODE = "demo";
    expect(await status()).toEqual({ submissionEnabled: true, diagnostics: null });
  });
  it("locked Preview test mode: names the missing settings and the deployment, never values", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.PREVIEW_TEST_SUBMISSIONS = "1";
    process.env.VERCEL_URL = "ic-abc.vercel.app";
    const s = await status();
    expect(s.submissionEnabled).toBe(false);
    expect(s.diagnostics?.lockedBy).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(s.diagnostics?.deployment?.url).toBe("ic-abc.vercel.app");
  });
  it("Production deployment: locked without any diagnostics", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.APP_MODE = "production";
    expect(await status()).toEqual({ submissionEnabled: false, diagnostics: null });
  });
});

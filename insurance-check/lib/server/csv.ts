import {
  CLAIM_STATUS_LABEL,
  COVERAGE_STATUS_LABEL,
  PREFERRED_TIME_LABEL,
  PRIVACY_STATUS_LABEL,
  type Lead,
} from "@/lib/types";
import { SERVICE_CONTENT } from "@/lib/content";

/** 스프레드시트 수식 주입(CSV injection) 방지 + 따옴표 이스케이프. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** CSV에는 마스킹 연락처만 들어간다. 원문 연락처·메모는 내보내지 않는다. */
export function leadsToCsv(leads: Lead[]): string {
  const header = [
    "신청번호",
    "접수일시",
    "유입(utm_source)",
    "매체(utm_medium)",
    "캠페인(utm_campaign)",
    "점검 유형",
    "고객명",
    "연락처(마스킹)",
    "상담 희망 시간",
    "보험금 점검 상태",
    "보장 분석 별도 동의",
    "보장 분석 상태",
    "다음 연락 일정",
    "담당자",
    "개인정보 요청 상태",
    "중복(최초 신청번호)",
    "테스트 신청",
  ];
  const rows = leads.map((l) => [
    l.refNo,
    l.createdAt,
    l.attribution.utmSource,
    l.attribution.utmMedium,
    l.attribution.utmCampaign,
    SERVICE_CONTENT[l.serviceType].shortTitle,
    l.name,
    l.phoneMasked,
    PREFERRED_TIME_LABEL[l.preferredTime],
    CLAIM_STATUS_LABEL[l.claimStatus],
    l.coverageConsent ? "동의" : "미동의",
    COVERAGE_STATUS_LABEL[l.coverageStatus],
    l.nextContactAt,
    l.assignee,
    PRIVACY_STATUS_LABEL[l.privacyStatus],
    l.duplicateOf,
    l.isTest ? "테스트(지표 제외)" : "",
  ]);
  // Excel 한글 깨짐 방지 BOM
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

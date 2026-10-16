import type { OperatorInfo } from "./config";
import { orSetting, thirdPartyText } from "./display";

export interface ConsentRow {
  label: string;
  value: string;
}

// 동의 문구. 버전이 바뀌면 lib/config.ts의 *_CONSENT_VERSION도 올려 기록과 대응시킨다.

export function claimConsentRows(o: OperatorInfo): ConsentRow[] {
  return [
    { label: "수집 목적", value: "보험금 점검(청구 방법) 안내를 위한 상담 연락 및 신청 이력 관리" },
    {
      label: "수집 항목",
      value: "이름, 휴대전화번호, 점검 유형, 유입 경로(광고 캠페인 정보)",
    },
    { label: "보유 기간", value: orSetting(o.retentionClaim, "보유기간") + " (기간 경과 또는 삭제 요청 시 지체 없이 파기)" },
    { label: "처리 주체", value: orSetting(o.privacyController, "개인정보 처리 주체") },
    { label: "제3자 제공", value: thirdPartyText(o.thirdPartyProvision) },
    { label: "거부 권리", value: "동의를 거부할 수 있으며, 거부 시 상담 신청이 제한됩니다. 공식 조회는 동의 없이 이용할 수 있습니다." },
  ];
}

export const CLAIM_CONSENT_FOOTNOTE =
  "주민등록번호, 상세 병력 등 건강정보, 보험증권 원본은 수집하지 않습니다. 이 동의에는 보험 상품 권유가 포함되지 않습니다.";

/** 제3자 제공이 실제로 있는 경우에만 쓰는 별도 동의 문구 */
export function thirdPartyConsentRows(o: OperatorInfo): ConsentRow[] {
  return [
    { label: "제공 내용", value: thirdPartyText(o.thirdPartyProvision) },
    { label: "제공 항목", value: "이름, 휴대전화번호, 점검 유형" },
    { label: "거부 권리", value: "동의를 거부할 수 있으며, 거부 시 제3자 제공이 필요한 상담 신청이 제한됩니다." },
  ];
}

export function marketingConsentRows(o: OperatorInfo): ConsentRow[] {
  return [
    { label: "목적", value: "보험금 청구 관련 정보성 소식 및 서비스 안내 등 광고성 정보 문자 발송" },
    { label: "항목", value: "이름, 휴대전화번호" },
    { label: "보유 기간", value: "동의 철회 시까지 (철회 즉시 발송 중단)" },
    { label: "처리 주체", value: orSetting(o.privacyController, "개인정보 처리 주체") },
    { label: "거부 권리", value: "동의하지 않아도 보험금 점검 신청과 상담에 아무런 영향이 없습니다." },
  ];
}

export function coverageConsentRows(o: OperatorInfo): ConsentRow[] {
  return [
    {
      label: "상담 목적",
      value: "가입 중인 보험의 중복·부족 보장 및 갱신 조건 점검(보장 분석) 상담, 그 과정에서의 보험상품 안내",
    },
    { label: "이용 항목", value: "이름, 휴대전화번호, 상담 희망 시간, 연락 방법 (보험금 점검 신청 시 입력한 정보 이용)" },
    { label: "연락 방법", value: "선택하신 방법(전화 또는 문자 일정 조율 후 전화)으로 담당 설계사가 연락" },
    { label: "처리 주체", value: orSetting(o.coverageProcessor, "보장 분석 처리 주체") },
    { label: "제3자 제공", value: thirdPartyText(o.thirdPartyProvision) },
    { label: "보유 기간", value: orSetting(o.retentionCoverage, "보장 분석 보유기간") + " (동의 철회 시 즉시 연락 중단)" },
    { label: "거부 권리", value: "동의하지 않아도 보험금 점검 안내는 그대로 받으실 수 있습니다." },
  ];
}

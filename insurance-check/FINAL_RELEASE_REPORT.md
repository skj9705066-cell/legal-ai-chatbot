# 내보험 통합 점검 — 최종 출시 점검 보고서

- 작성: 2026-10-17 (KST) · 브랜치 `claude/eloquent-pasteur-pxrggq` (main 미병합, Production 미변경)
- 배포 커밋: `fa5f921` (코드 기준. 이 보고서 커밋은 문서만 추가)
- 실제 Preview URL(이 커밋): https://insurance-check-demo-7k5zyv2fo-skj9705066-1485s-projects.vercel.app
- 브랜치 고정 Preview URL: https://insurance-check-demo-git-claud-3e1493-skj9705066-1485s-projects.vercel.app

## 출시 판정: **PREVIEW BLOCKED**

실제 Vercel Preview에서 신청 → Supabase 저장 → CRM 조회를 **직접 확인하지 못했다.**
Preview에 Vercel 배포 보호(로그인 요구)가 켜져 있고 자동 테스트용 우회 비밀값이 등록되지 않아,
GitHub Actions의 브라우저가 매번 Vercel 로그인 화면(HTTP 302)에서 멈췄다(실행 #2~#6, 아래 증거).
이 작업 환경(클라우드 컨테이너)은 vercel.app·supabase.co·api.vercel.com 접속이 프록시에서 거부되어 직접 확인도 불가했다.

같은 코드·같은 DB 구조(01-schema + 02-hardening)·같은 Preview 설정 조합으로 만든 **로컬 재현 환경**에서는 전체 흐름이 통과했다.
막힌 것은 접근 권한뿐이며, 아래 「사용자 작업 A」(약 10분)를 마치면 Preview 배포마다 같은 검증이 실제 주소에서 자동으로 돈다.

> PRODUCTION READY / PENDING APPROVAL로 판정하지 않은 이유: 실제 Preview·실제 Supabase 증거가 없고,
> 운영 정보 16항목·승인 5항목이 비어 있어 운영 빌드가 스스로 배포를 거부한다(재현 환경에서 `check-deploy`: "운영 배포 불가 — 21개 항목 미완료").

---

## 1. 최종 결과 (실제로 실행한 것만)

| 대상 | 전체 | 성공 | 실패 | 건너뜀 | 비고 |
|---|---:|---:|---:|---:|---|
| 단위 테스트 (vitest) | 55 | 55 | 0 | 0 | 검증·암호화·세션 만료·CSV 수식 차단 등 |
| E2E 전체 — 데모 모드 (PC 1280 + 모바일 375) | 130 | 94 | 0 | 36 | 건너뜀은 모두 의도(아래) |
| E2E — Preview 재현 + 로컬 DB, 실제 DB 모드(`E2E_STAGING=1`) | 62 | 42 | 0 | 20 | CI가 실제 Preview에서 돌릴 구성과 동일 |
| E2E — 같은 환경, 기존 신청 수정·화면별 신청 포함 | 13 | 13 | 0 | 0 | 상태·메모 저장, 5개 화면 크기에서 실제 저장 |
| E2E — Production 재현(운영 모드, Preview 스위치를 일부러 켬) | 18 | 17 | 0 | 1 | 잠김·안내·권한 |
| 실제 DB 장애 스크립트(게이트웨이 중단 → 복구) | 1 | 1 | 0 | 0 | |
| 보안 점검(번들 비밀값·속도 제한·HTML 삽입·데모 로그인·운영 503) | 5 | 5 | 0 | 0 | |
| DB 권한 점검표(03-verify 1~14번) — 로컬 DB | 14 | 14 | 0 | 0 | |
| **실제 Preview 대상 CI 테스트** | 28 | 0 | 0 | 0 | **검증 불가 28건** — Vercel 보호(302)로 미실행 |

건너뜀(전부 의도): 접수가 열린 화면에서의 '잠김 전용' 테스트, 실제 DB에서 기존 신청을 고치거나 추가 신청을 보내는 테스트(로컬 DB에서는 별도로 실행해 통과),
데스크톱 전용(키보드·관리자), 화면 크기를 직접 지정해 한 프로젝트에서만 도는 테스트의 중복분.

### 수정한 주요 오류

| # | 오류 | 실제 원인 | 수정 | 커밋 |
|---|---|---|---|---|
| 1 | Preview에서 점검 유형 카드 3개가 눌리지 않음 | 접수 잠금이 신청서 단계 전체 `<fieldset disabled>`에 연결 | 잠금을 화면 조작에서 분리 | `9fe751d` |
| 2 | 이름·전화번호 입력 불가 | 1번 수정 때 연락처 영역에 잠금용 `disabled`를 다시 걸었음(제 실수) | 잠금은 **실제 전송만** 막도록 근본 분리. 입력·동의·이전/다음·신청 버튼은 항상 동작 | `5799028` |
| 3 | 잠긴 상태에서 신청 버튼이 반응 없음 | 버튼 비활성 | 올바르게 입력하고 누르면 "지금은 신청을 접수할 수 없어요" 안내, 전송 0건(서버도 503) | `5799028` |
| 4 | 관리자 편집 중 세션 만료 시 화면에 `unauthorized` 원문 노출 | API가 내부 코드 문자열을 그대로 반환 | 401/403/출처 오류를 이해 가능한 한국어 + 기계용 code로 통일 | `10b6245` |
| 5 | 신청 버튼 연타 시 요청 3건 | 상태 반영 전 중복 실행 | 즉시 잠기는 전송 중 표시(ref) | `0290810` |
| 6 | 전체 테스트 실행 시 관리자 테스트 7건 실패 | 테스트들이 같은 로컬 IP 키를 써서 **보안용 로그인 제한(15분 10회)**에 걸림 — 제품 문제 아님 | 테스트마다 로컬 IP 키 분리(제한 자체는 그대로) | `fa5f921` |
| 7 | 자동 검증이 Preview 이벤트를 건너뜀 / 보호 화면에서 시간 초과만 남김 | 환경 이름이 `Preview`뿐 / 302를 구분하지 않음 | 조건 수정, 보호 차단 시 원인 한 줄 보고 | `8e6bf32`, `77c5995` |

재발 방지: `apply-flow`의 '입력'·'잠김' 테스트(실제 클릭·탭 → 포커스 → 키보드 입력 → 수정)와 README의 「접수 잠금 원칙」.
잠김 화면과 열린 화면 양쪽에서 매번 돈다.

---

## 2. 실제 연결 검증

| 항목 | 실제 Preview + 실제 Supabase | 로컬 재현(같은 스키마·같은 설정 조합) |
|---|---|---|
| Preview 신청 성공 | **미검증 (BLOCKED: Vercel 보호 302)** | 성공 — 3개 유형 모두, PC·모바일, 5개 화면 크기 |
| Supabase INSERT 확인(SELECT) | **미검증** | 확인 — 아래 SELECT 결과 |
| 저장된 테스트 신청번호 | **없음** | 예: `IC-261017-JVAW2`(모바일 390, 병원비·수술비), `IC-261017-8BAFH`(장애 복구 후), `IC-261017-PXG4U`(선택 동의 포함) |
| CRM 조회 | **미검증** | 성공 — 목록·검색·필터·정렬·상세·상태/메모 저장·CSV·테스트 구분·로그아웃 |
| PC 결과 | 미검증 | 1280×800, 1440×900 통과 |
| 모바일 결과 | 미검증 | 390×844, 430×932, 768×1024 통과(터치 탭) |

실제 Preview 차단 증거(GitHub Actions `insurance-check Preview E2E` 실행 #6, 커밋 `fa5f921`):
```
HTTP 상태: 302
→ Vercel 배포 보호(로그인 요구)로 막혔습니다. VERCEL_AUTOMATION_BYPASS_SECRET(Protection Bypass for Automation)이 필요합니다.
STAGING_ADMIN_EMAIL: (없음)  STAGING_ADMIN_PASSWORD: (없음)  VERCEL_AUTOMATION_BYPASS_SECRET: (없음)
```

### 로컬 재현 DB의 실제 SELECT 결과 (가상 데이터)
`ic_leads` 24건 중 일부 — 이름은 가상, 번호는 가입자에게 배정되지 않는 010-0000-xxxx:

| ref_no | 유형 | 표시번호 | 암호문 | 해시 | is_test | 필수동의 버전·시각 | 선택동의 | 보장분석동의 | utm_source |
|---|---|---|---|---|---|---|---|---|---|
| IC-261017-PXG4U | unclaimed | 010-\*\*\*\*-0491 | ✓ | ✓ | true | claim-2026-10-16.v2 · ✓ | **true** | false | staging_check |
| IC-261017-HPPT7 | unclaimed | 010-\*\*\*\*-4050 | ✓ | ✓ | true | claim-2026-10-16.v2 · ✓ | false | **true** | — |
| IC-261017-SZZEF | refund | 010-\*\*\*\*-4202 | ✓ | ✓ | true | claim-2026-10-16.v2 · ✓ | false | false | — |
| IC-261017-KCL49 | hidden | 010-\*\*\*\*-4126 | ✓ | ✓ | true | claim-2026-10-16.v2 · ✓ | false | false | — |
| IC-261017-JVAW2 | unclaimed | 010-\*\*\*\*-0460 | ✓ | ✓ | true | claim-2026-10-16.v2 · ✓ | false | false | evidence |

집계(SELECT): is_test 전부 true · 평문 전화번호 0건 · 같은 제출 키 중복 0건 · 3개 유형 모두 저장 · 접수 시각 기록.
CRM 상세 화면이 같은 행을 표시(유형·마스킹 번호·동의 버전/시각·UTM·테스트 배지·접근 이력) — `docs/release-evidence/3-crm-detail-1280.png`.

### 장애·오류 처리 (실제 동작 확인)
- **실제 DB 장애**: 게이트웨이를 내린 채 신청 → 500 + "일시적인 오류로 신청을 저장하지 못했습니다…" 안내, 완료 화면 없음, 저장 0건 → 복구 후 같은 화면에서 다시 누르면 접수 1건(중복 없음).
- 이름·전화번호 미입력, 잘못된 번호, 필수 동의 누락: 안내 + 해당 칸 포커스, 전송 0건.
- 빠른 연속 클릭: 요청 1건. 네트워크 끊김: 안내 후 같은 제출 키로 재시도 → 1건.
- 서버 오류(500/503): 완료 화면 없음, 실패 이벤트만 기록.
- 세션 만료: 저장 시 "로그인이 만료되었어요. 다시 로그인해 주세요.", 저장 안 됨, 목록은 로그인 화면으로.
- 위조 세션 쿠키·로그인 없는 관리자 API: 401(내부 정보 없음). 다른 출처의 관리자 변경 요청: 403.
- 새로고침·뒤로가기: 완료 화면 유지, 재제출 없음.

---

## 3. 보안·출시 준비 점검

| 항목 | 결과 | 근거 |
|---|---|---|
| Supabase RLS·권한 | 통과(로컬 DB) / 실제 DB는 사용자가 03-verify 실행(이전 보고: 실행 완료) | 점검표 1~14 전부 true: RLS 6/6, 공개 정책 0, anon 권한 0, service_role 최소 권한, 감사로그 수정·삭제 차단 |
| 서버 키 브라우저 노출 | 없음 | 빌드 산출물(`.next/static`)에서 비밀값·변수명 검색 0건, `server-only`, check-deploy가 `NEXT_PUBLIC_` 비밀값 차단 |
| 개인정보 암호화 | 통과 | AES-256-GCM `phone_enc` + HMAC `phone_hash` + 마스킹, 원문 칼럼 없음, 원문 열람은 권한자·감사로그 |
| 관리자 인증·권한 | 통과 | HttpOnly·SameSite=Strict 서명 쿠키 8시간, 미들웨어 + 라우트 재검증, 상담사 CSV 불가·열람자 읽기 전용 |
| 데모 계정 | 운영 모드에서 불가 | Production 재현에서 데모 비밀번호 로그인 → 401 |
| 입력값 검증 | 통과 | 서버·클라이언트 동일 규칙, `<img onerror>` 이름 → 422 |
| 속도 제한 | 동작 / **위험 있음** | 신청 IP당 10분 5회(6번째 429). 단, **인스턴스별 메모리 방식**이라 Vercel 다중 인스턴스에서 약함 → Vercel WAF 규칙 권장 |
| CSRF / XSS | 통과 | 공개·관리자 변경 요청 모두 Origin 검사(403), React 이스케이프·`dangerouslySetInnerHTML` 없음, CSP·X-Frame-Options DENY·HSTS |
| 로그의 개인정보 | 통과 | 서버 로그는 오류 메시지·점검 항목 ID만(이름·번호·DB 상세값 미기록) |
| 오류 메시지 내부 정보 | 통과 | API 오류는 사용자 문구만 |
| 보관·파기 | **부분** | 삭제 요청 → 관리자 확인 후 익명화 파기 구현. **보유기간 경과 자동 파기는 없음**(보유기간 미정) |
| 개인정보 처리방침 | 화면 있음 / **운영 정보 미입력** | 처리 주체·보호책임자·보유기간·시행일이 '설정 필요'로 표시됨 |
| 운영 주체·연락처·GA·설계사 표시 | **미등록** | 16개 운영 항목 비어 있음(임의 입력하지 않음) |
| 지급 보장·자동 조회 오인 표현 | 문제 표현 없음 | 문구 검사: 관련 문장은 모두 "보장하지 않습니다 / 자동으로 조회하지 않습니다" 고지 |
| 보험 광고 심의·승인 | **코드로 확정 불가** | 소속 GA 광고 심의필 번호·승인일 미등록 → 별도 확인 필요 |
| Production 잠금 | 통과(재현) | Preview 스위치를 켜도 운영 배포에서는 무시, 테스트 배너·진단 0, 신청 API 503, `npm run build` 자체가 배포 거부 |

---

## 4. 미해결 사항

| 오류/항목 | 재현 방법 | 실제 원인 | 수정 여부 | 남은 위험 | 사용자 작업 |
|---|---|---|---|---|---|
| 실제 Preview 자동 검증 불가 | Actions 실행 로그: HTTP 302 | Vercel Deployment Protection + 우회 비밀값·관리자 계정 Secrets 미등록 | 코드로 해결 불가(BLOCKED) | 실제 Preview·실제 Supabase 동작이 증명되지 않음 | A-1~A-3 |
| Preview 환경변수 일치 여부 | Preview 화면의 '[테스트 환경 진단]' 줄 | 값 확인 권한 없음 | 미확인 | 잠김 상태면 신청 불가(안내만 뜸) | A-3 |
| 운영 정보 16항목 | `npm run build`(운영) → 21개 미완료 | 미등록 | 임의 입력 금지 | 운영 배포 불가(의도된 차단) | B-1 |
| 승인 5항목(광고·개인정보·보장분석·제3자·통계) | 동일 | 미등록 | 해당 없음 | 광고 집행 불가 | B-2 |
| 속도 제한이 인스턴스별 | 코드 검토 | 메모리 방식 | 미수정(외부 설정 필요) | 대량 스팸 시 우회 가능 | B-4 |
| 보유기간 경과 자동 파기 없음 | 코드 검토 | 보유기간 미정 | 미수정(운영 결정 필요) | 보유기간 초과 보관 | B-5 |
| Production 현재 상태 | — | 접근 불가 | 변경하지 않음 | 현 운영 주소가 어떤 모드인지 미확인 | B-6 |

---

## 5. 사용자 작업

### A. 실제 Preview 검증을 열기 (약 10분, 비밀값은 채팅에 붙이지 말 것)
1. **Vercel** → `insurance-check-demo` → Settings → **Deployment Protection** → **Protection Bypass for Automation** → 비밀값 생성·복사.
2. **GitHub** 저장소 → Settings → **Secrets and variables → Actions** → New repository secret 3개:
   `VERCEL_AUTOMATION_BYPASS_SECRET`(1번 값), `STAGING_ADMIN_EMAIL`, `STAGING_ADMIN_PASSWORD`(ic_staff에 등록한 관리자).
3. **Vercel** → Settings → **Environment Variables**에서 **Preview**에 아래 이름이 있는지 확인(값은 확인만, 공유 금지):
   `PREVIEW_TEST_SUBMISSIONS`=`1`, `NEXT_PUBLIC_SITE_URL`(https), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `APP_SECRET`(32자 이상), `PII_ENCRYPTION_KEY`(base64 32바이트), `APPROVAL_DB_VERIFIED`(verify.sql 1~14 확인일).
   - Preview와 Production이 같은 DB를 쓸 예정이면 `PII_ENCRYPTION_KEY`·`APP_SECRET`은 나중에 Production에도 **같은 값**을 써야 CRM이 기존 번호를 복호화할 수 있다.
4. Vercel → Deployments → 이 브랜치 최신 Preview → ⋯ → **Redeploy**.
   배포가 끝나면 Actions가 자동으로 사전 점검 → 실제 신청·DB·CRM → 클릭·입력 → 화면 크기·오류를 실행한다.
   결과는 GitHub → Actions → `insurance-check Preview E2E` 실행 요약에 표시된다. 다시 돌릴 때는 신청 제한 때문에 10분 간격.

### B. 광고 시작 전 반드시
1. 운영 정보 16항목 입력(운영 주체, GA 명칭·등록번호, 설계사 성명·등록번호, 대표 연락처·이메일, 사업장 주소, 개인정보 보호책임자,
   처리 주체 2종, 제3자 제공 여부, 보유기간 2종, 광고 심의필 번호, 처리방침 시행일).
2. 승인일 5항목: 소속 GA 광고 사전 심의, 개인정보 문구·흐름, 보장 분석 제안 화면, 처리 주체·제3자 확정, 통계 원문 대조.
3. 법률·광고 적합성 확인(코드 테스트로 확정 불가): 보험업법상 모집 광고 심의, 개인정보보호법상 고지·동의 문구.
4. Vercel **Firewall(WAF)** 에 `/api/leads` 등 IP별 요청 제한 규칙 추가(인스턴스별 메모리 제한 보완).
5. 보유기간 확정 후 정기 파기 절차(월 1회 관리자 확인 또는 예약 작업) 결정.
6. Production 환경변수(Supabase·암호화 키·GA/Meta ID: `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`) 등록 → 운영 빌드가 통과하는지 확인 → main 병합·Production 배포(사용자 확인 후).
7. 운영 첫날: 실제 가상 신청 1건으로 저장·CRM·알림 확인 후 광고 시작.

---

## 6. 증거 파일
- `docs/release-evidence/1-mobile-390-complete.png` — 390×844 실제 탭으로 신청 → 완료(테스트 표시)
- `docs/release-evidence/2-crm-list-1280.png` — CRM 목록, 테스트 신청만 보기
- `docs/release-evidence/3-crm-detail-1280.png` — CRM 상세(마스킹·동의 버전/시각·UTM·접근 이력)
- `docs/release-evidence/4-production-locked-390.png` — 운영 모드 재현: 입력은 되고, 신청 시 접수 불가 안내

모두 로컬 재현 환경 화면이며 가상 데이터만 포함한다. **실제 Preview 화면이 아니다.**

# 내보험 통합 점검 (가칭) — 광고 랜딩 + 상담 CRM MVP

미청구·숨은 보험금, 과오납 보험료·해지환급금 **확인 방법 안내** 랜딩과, 신청 접수·별도 동의 기반 보장 분석 상담을 관리하는 CRM입니다.

> ⚠️ 이 디렉터리는 상위 저장소(lawsel.kr 법률 AI)와 **독립된 Next.js 앱**입니다. 상위 앱의 빌드·배포·`/admin`과 섞이지 않도록
> 상위 `tsconfig.json`과 `.vercelignore`에서 제외되어 있습니다. 실제 운영 시에는 별도 저장소/Vercel 프로젝트로 분리하는 것을 권장합니다.

## 스택

상위 저장소 스택을 그대로 따릅니다 — Next.js 15 (App Router) · React 19 · TypeScript 5.7 · Tailwind CSS 3.4 · Supabase.
UI는 shadcn/ui 규칙(cva + `cn`, 소스 복사 방식)으로 작성한 `components/ui/*` 와 lucide-react 아이콘을 씁니다.
(shadcn CLI 최신판은 Tailwind v4 기준이라, 기존 3.4 스택과 맞추기 위해 컴포넌트를 소스로 포함)

## 실행

```bash
cd insurance-check
npm install
npm run setup:demo              # 데모용 .env.local 생성 + 관리자 비밀번호 출력 (이미 있으면 유지)
npm run dev                     # http://localhost:3100  ·  관리자: http://localhost:3100/admin/login
```

| 명령 | 내용 |
|---|---|
| `npm run setup:demo` | 데모 모드 `.env.local` 생성 (APP_SECRET·관리자 비밀번호 랜덤) |
| `npm run dev` / `build` / `start` | 개발 / 빌드(배포 게이트 포함) / 실행 (포트 3100) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | 단위 테스트 (vitest) — 검증·마스킹·암호화·세션·CSV·영업대상 규칙 |
| `npm run test:e2e` | E2E (Playwright, 서버 실행 중이어야 함) — 사용자 여정·관리자 권한·axe 접근성·반응형 |
| `npm run check:deploy` | 운영 배포 필수 항목·승인 기록 점검 |

E2E는 레이트리밋(IP당 10분 5건)에 걸리지 않도록 **서버를 새로 띄운 뒤** 실행하세요.

## 모드

| | 데모 (`APP_MODE=demo`, 기본) | 운영 (`APP_MODE=production`) |
|---|---|---|
| 저장소 | 서버 메모리 (재시작 시 초기화) + **가짜 시드 데이터**(데모고객NN / 010-0000-NNNN) | Supabase Postgres (service role, 서버 전용) |
| 표시 | 상단 '데모 모드' 배너, 폼·관리자·레코드에 '데모' 배지 | 없음 |
| 신청 폼 | 시연용으로 동작 (실제 개인정보 입력 금지 안내) | 운영 정보·인프라·**GA 승인 기록이 모두 있어야** 열림. 하나라도 비면 잠김 |
| 관리자 로그인 | `DEMO_ADMIN_PASSWORD` + 역할 선택(관리자/상담사/열람) | Supabase Auth 이메일·비밀번호 + `ic_staff` 역할 |
| 운영 주체 정보 | 미설정 값은 `[설정 필요: …]`로 표시 (가짜 값 생성 안 함) | 필수 |
| 분석 태그(GA4) | 로드 안 함 | 측정 ID + 방문자 동의 시에만 로드 |
| 검색엔진 | noindex | index (`/admin`, `/api`, `/apply` 제외) |

## 디자인 시스템

| 토큰 | 값 | 용도 |
|---|---|---|
| `navy` | #102B4E | 브랜드·제목·관리자 사이드바 |
| `blue` | #1463D9 | 주요 액션·강조 |
| `ink` | #172B45 | 본문 |
| `navy-500` | #64748B | 보조 글씨 (흰 배경 전용 — 보조 배경 위에서는 대비 4.42:1이라 `navy-600` 사용) |
| `navy-50` | #F4F7FB | 보조 배경 |
| `mint` | #16A085 | 성공 상태 (아이콘·도형 전용, 텍스트는 `mint-700`) |

- 글꼴: Pretendard Variable(OFL)을 `pretendard` npm 패키지로 **자체 호스팅**(동적 서브셋). 외부 CDN 의존이 없고, 로드 전·실패 시 시스템 글꼴로 대체(`font-display: swap`)
- 크기: 제목 모바일 34px / 데스크톱 58px, 본문 16~18px, 보조 설명 14px 이상, 입력창 높이 56px, 카드 모서리 16~28px
- 공통 조각: `components/ui/*`(고객용), `components/admin/ui.tsx`(관리자 KPI·패널·배지)

## 사용자 여정

1. `/` 랜딩 — 히어로 → 공식 통계(발표 기관·발표일·원문 링크) → 점검 유형 3종(+체크리스트) → 유형별 절차 → **단일 신청 폼** → 신뢰 요소(운영 주체·설계사) → FAQ → 하단 CTA → 푸터
   - CTA(히어로/통계 뒤/유형 카드/절차/하단/모바일 고정)는 모두 같은 폼으로 이동. 유형 카드에서 들어오면 유형 단계를 건너뛰고 연락처 단계로
   - 신청 폼은 4단계 마법사(점검 유형 → 연락처 → 상담 시간·메모 → 확인·동의). 단계별 검증, 단계 이동 시 질문 제목으로 포커스
   - 모바일 하단 고정 CTA는 히어로 CTA·신청 폼·하단 CTA가 보이는 동안 숨김. 팝업 없음
2. 신청 → `/apply/complete` 신청 완료 + **보장 분석 별도 제안** (신청 완료 후에만 노출)
3. A: `/apply/coverage` 목적·항목·연락 방법·처리 주체 명시 + 미체크 선택 동의 → `/apply/coverage/complete`
4. B: `/apply/done` — 서버 호출 없이 종료, 추가 신청 토큰 폐기 (영업 DB로 넘어가지 않음)
5. `/privacy` 처리방침, `/privacy/withdraw` 동의 철회·삭제 요청

## 관리자 (`/admin`)

- 미들웨어(서명 쿠키 검증) + 각 페이지·API에서 역할 재검증 (심층 방어). 세션은 HttpOnly·SameSite=Strict 쿠키, 8시간
- **상담 DB**: 신청번호·접수일·UTM·유형·고객명·마스킹 연락처·희망 시간·보험금 점검 상태·보장 분석 동의·보장 분석 상태·다음 연락·담당자·메모 / 필터·검색(이름·신청번호·전화번호 해시)·정렬·인라인 상태 변경
- **보장 분석 영업 대상**: 별도 동의 O + 철회·삭제 요청 없음만. 미동의 고객은 영업 상태로 변경 불가(서버 규칙 + DB CHECK 제약)
- 보험금 점검 상태와 보장 분석 상태는 독립 필드. 계약 단계는 관리자만 입력
- **중복 신청 감지**: 30일 내 같은 연락처(HMAC 해시) → 최초 신청번호 표시, 유효 제출 집계에서 제외
- **연락처 원문 열람**: 상담사·관리자만, 매 열람 감사로그
- **CSV 내보내기**: 관리자만, 마스킹 연락처만, 수식 주입 방지, 감사로그
- **광고 성과**: UTM별 방문 → 유형 선택 → 신청 시작 → 유효 제출 → 별도 상담 동의 → 상담 완료 → 계약
- **철회·삭제 요청**: 마케팅/보장 분석 철회는 즉시 반영, 삭제는 본인 확인 후 완료 시 식별정보 파기
- **감사로그 / 환경설정·배포 체크리스트**(관리자 전용, 값은 노출하지 않고 설정 여부만)

## 관리자 화면 구현 주의

- **관리자 화면의 `<Link>`는 모두 `prefetch={false}`.** 프로덕션 프리페치가 상세·감사·성과 페이지를 서버 렌더하면 실제로 열지 않은 화면이 '열람'으로 감사로그에 남는다 (E2E로 회귀 검사)
- **콘솔 레이아웃을 `<Suspense>`로 감싸지 말 것.** 감싸 두었을 때 같은 경로의 쿼리 이동(고객 상세 패널, 상태 칩)이 로그인 직후 몇 초간 중단(RSC 요청 ERR_ABORTED)되는 문제가 있었다 (E2E로 회귀 검사)
- 로그인·로그아웃 후에는 `window.location.assign`으로 전체 이동한다 (세션 쿠키가 바뀌므로 라우터 캐시를 쓰지 않음)

## 보안·개인정보 설계

- 브라우저에는 관리자 키·연락처 원문·인증 토큰이 내려가지 않음 (service role 키는 서버 전용, `server-only` 가드)
- 연락처: AES-256-GCM 암호화 저장 + HMAC 해시(중복·철회 매칭) + 마스킹 표시
- 수집 최소화: 이름·연락처·유형·희망 시간·선택 메모·UTM. 주민등록번호 패턴은 메모에서도 거절, 병력·증권 미수집
- 공개 API: 동일 출처 검사, IP 레이트리밋, 입력 크기 제한, 허니팟·최소 체류시간, 멱등 키(중복 제출 방지)
- 보장 분석 동의는 신청 직후 발급된 **서명된 영수증 토큰**(2시간)으로만 가능 — 타인 신청에 동의를 붙일 수 없음
- 철회 요청 응답은 일치 여부와 무관하게 동일 (타인 신청 여부 탐색 방지)
- 보안 헤더: CSP(프로덕션 `unsafe-eval` 제거), HSTS, frame-ancestors none, nosniff
- RLS: 모든 `ic_*` 테이블 RLS ON + 공개 정책 없음 (`supabase/schema.sql`), 감사로그는 append-only 트리거

## 이벤트 측정

`page_view, hero_cta_click, service_type_select, form_start, form_submit_success, official_lookup_click, coverage_offer_view, coverage_opt_in, coverage_decline, consultation_booked`

- 1st-party `/api/events`: 이벤트명·탭 단위 랜덤 세션 id·UTM·점검 유형만 (화이트리스트). `consultation_booked`는 관리자가 '상담 예약'으로 바꿀 때 서버가 기록
- GA4: 운영 모드 + 측정 ID + 방문자 동의 후에만 로드, `allow_google_signals: false`
- **광고 전환은 `form_submit_success`만** (`is_conversion: true`). 클릭은 전환이 아님
- 개인정보·건강정보는 어떤 이벤트 파라미터에도 넣지 않음 (E2E에서 페이로드 검사)
- UTM은 세션 첫 진입 값만 보존, referrer는 origin만 저장

## 구조

```
app/                      page.tsx(랜딩) · apply/* · privacy/* · admin/login · admin/(console)/* · api/*
components/ui             shadcn/ui 스타일 기본 컴포넌트
components/landing        히어로·통계·유형·절차·사례·FAQ·신청 폼·고정 CTA
components/apply          완료·제안·보장 분석 동의·철회 요청 화면
components/admin          CRM UI
lib/content.ts            모든 랜딩 문구 (준법 검토 대상)
lib/config.ts             모드·운영 정보·운영 준비 상태 (서버 전용)
lib/server/*              저장소(demo/supabase)·서비스 규칙·암호화·인증·CSV·퍼널·알림(미연결)
config/requirements.json  운영 필수 환경변수 목록 (앱·배포 스크립트 공용)
supabase/schema.sql       운영 DB 스키마 + RLS
docs/DEPLOY_CHECKLIST.md  운영 전 승인·설정 체크리스트
```

## 운영 전 필수

`docs/DEPLOY_CHECKLIST.md`를 따르세요. 요약: 소속 GA의 광고 심의·개인정보 승인 → 운영 정보 설정 → Supabase 스키마 적용·RLS 검증 → 통계 원문 대조 → `npm run check:deploy` 통과 → 배포.

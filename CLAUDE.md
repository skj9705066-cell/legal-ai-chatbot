# 법률AI / 로셀 (legal-ai-chatbot)

AI 법률 상담 + 변호사 매칭 PWA. Heydealer 톤의 모바일 우선 UI. **Supabase(Auth + Postgres + RLS) 백엔드** 위에서 동작하며, localStorage는 클라이언트 캐시로만 쓰인다. 프로덕션: **https://lawsel.kr**

> ⚠️ 이 저장소는 한때 "localStorage 전용 데모"였으나, 현재는 실제 Supabase 인증·DB를 쓰는 서비스로 진화했다. (과거 문서의 `seedDemoLawyer` / `lawyer@demo.com` / 평문 비밀번호 언급은 모두 폐기됨)

## 스택

- Next.js 15 (App Router, RSC + "use client") · React 19 · TypeScript 5.7
- Tailwind CSS 3.4 (커스텀 팔레트: `primary` 네이비 / `brand` 틸 / `accent` 골드 / `cta` 그린)
- **Supabase** — `@supabase/supabase-js` + `@supabase/ssr`. 이메일/비밀번호 + 카카오·구글 **실제 OAuth**, Postgres, Row Level Security
- Anthropic SDK 0.65 (`@anthropic-ai/sdk`) — 모델 **`claude-opus-4-7`**, 일부 라우트에서 `web_search` 도구 활용
- puppeteer-core + playwright (devDependencies — 아이콘 PNG 생성 + 스크린샷 스크립트)
- 별도 상태 라이브러리 없음 — React state + Supabase + localStorage 캐시

`package.json` scripts: `dev` / `build` / `start` / `lint` (모두 표준 Next.js).

## 디렉터리

```
app/
  api/
    chat/route.ts             # 스트리밍 채팅, web_search 도구 포함 (변호사법 경계: 판단 금지·일반화)
    case-summary/route.ts     # 사건 요약 JSON 생성 (변호사 매칭용, 내부)
    suggest-questions/route.ts# 의뢰인이 탭 한 번으로 보낼 예시 답변 3개 생성
    auth/kakao/route.ts       # 카카오 OAuth 보조 라우트
  auth/
    callback/route.ts         # OAuth 코드 교환 → 세션 + 신규 프로필 생성
    kakao/callback/page.tsx   # 카카오 콜백(client)
  chat/
    [id]/page.tsx             # AI 상담 채팅 화면 (seed·quick 쿼리로 첫 메시지 시드)
    rooms/page.tsx            # 상담방 목록 (매칭 후 변호사↔의뢰인 메시징)
    rooms/[roomId]/page.tsx   # 상담방 대화 (첨부 포함)
  matching/[id]/page.tsx      # 매칭(요약 → 매칭 중 → 제안 수신 → 선택)
  ai-consultation/page.tsx    # 새 상담 id 생성 후 /chat/[id]로 리다이렉트하는 진입점
  lawyers/page.tsx            # 변호사 목록(공개 탐색)
  lawyers/[id]/page.tsx       # 변호사 상세
  mypage/page.tsx             # 일반회원 마이페이지(상담/매칭 탭)
  lawyer/register/page.tsx    # 파트너 변호사 등록 (Step 0 히어로 → 1~3 폼 → 완료)
  lawyer/dashboard/page.tsx   # 변호사 대시보드(신규 사건 + 제안 모달)
  admin/
    page.tsx                  # 관리자 대시보드
    consultations/page.tsx    # 상담 원문 열람
    lawyers/page.tsx          # 변호사 승인/반려/관리
    matchings/page.tsx        # 매칭 현황
    users/page.tsx            # 회원 관리
    settings/page.tsx         # 설정
    login/page.tsx            # 관리자 로그인
    layout.tsx                # AdminSidebar + (middleware가 인증 게이트)
  blog/page.tsx               # 블로그 목록 (SEO 콘텐츠)
  blog/[slug]/page.tsx        # 블로그 글 + opengraph-image.tsx
  login/·signup/·terms/·privacy/·offline/ page.tsx
  layout.tsx                  # PWA 메타데이터, AppShell 마운트
  page.tsx                    # 홈(히어로 + 최근 상담 + 변호사 캐러셀 + How it works)
  globals.css · robots.ts · sitemap.ts

components/
  AppShell.tsx              # AuthProvider + (조건부)TopNav/BottomNav + ConsultationBackfill
  AuthProvider.tsx          # Supabase Auth 컨텍스트(세션/계정). 이메일·카카오·구글·변호사가입
  ConsultationBackfill.tsx  # 로그인 시 localStorage 상담을 Supabase로 백필 업로드
  AuthButtons/AuthForm/AuthModal/LoginPromptModal.tsx  # 로그인·가입 UI
  TopNav.tsx · BottomNav.tsx # 데스크톱 상단 / 모바일 하단 네비
  admin/AdminSidebar.tsx · admin/Toast.tsx             # 관리자 UI
  RobotMascot/SplashScreen/ScrollReveal/Sparkline/LawselLogo/BlogCTA/Footer.tsx
  ServiceWorkerRegister.tsx # production에서만 /sw.js 등록

lib/
  types.ts                  # 도메인 타입 (Account 디스크리미네이티드 유니온 등)
  supabase.ts               # 브라우저 Supabase 클라이언트 (anon 키)
  supabase-types.ts         # DB Row/Insert 타입 (schema.sql과 함께 갱신)
  consultation-sync.ts      # Consultation → Supabase upsert (첨부 base64 strip)
  storage.ts                # 상담 localStorage 캐시 CRUD + generateId/buildTitle
  matching-storage.ts       # 매칭 세션 localStorage 캐시
  analysis-detection.ts     # assistant 메시지가 "종합 분석 완료"인지 키워드로 감지
  admin-auth.ts · admin-data.ts  # 관리자 세션/포맷 유틸
  rate-limit.ts             # API 라우트 IP 기반 레이트리밋
  lawyers.ts                # DEMO_LAWYERS(홈 캐러셀 표시용) + generateProposals 더미
  quick-consultations.ts · markdown.ts · blog-data.ts
  auth-storage.ts           # ⚠️ 레거시(미사용). Supabase Auth로 대체됨 — 임포트 없음

middleware.ts               # /admin/* 접근을 Supabase 세션 + role='admin'으로 게이트

supabase/                   # SQL은 Supabase 대시보드 SQL Editor에서 수동 실행
  schema.sql                # 기본 5테이블(profiles/lawyers/consultations/matchings/proposals) + RLS
  schema-additions.sql      # 컬럼 추가 + chat_rooms/messages 테이블(상담방 메시징)
  matching-select.sql       # 의뢰인의 제안 선택 RLS
  lawyer-dashboard.sql      # 변호사 대시보드 RLS(매칭 연결분 상담만 열람)
  fix-rls-exposure.sql      # 🔴 상담 원문 무단열람 구멍 차단 패치 (적용 완료)

scripts/
  generate-icons.cjs        # icon.svg → 5종 PNG 렌더 (Chrome 경로 자동 탐색)
  drive.cjs / drive-auth.cjs# 데모 데이터 시드 + 인증 시나리오 스크린샷
```

## 라우팅 요약

| URL | 화면 | 비고 |
|---|---|---|
| `/` | 홈 (히어로 + 캐러셀) | 모바일 헤더에는 로고만, 하단 네비 노출 |
| `/ai-consultation` | 상담 진입 리다이렉트 | 새 상담 id 생성 → `/chat/[id]` (seed 전달 가능) |
| `/chat/[id]` | AI 상담 채팅 | `seed`·`quick` 쿼리로 첫 메시지 시드 |
| `/chat/rooms`, `/chat/rooms/[roomId]` | 상담방(메시징) | 매칭 후 변호사↔의뢰인 대화 (chat_rooms/messages) |
| `/matching/[id]` | 매칭 진행/결과 | 비로그인 시 `AuthModal`/`LoginPromptModal`로 가입 유도 |
| `/lawyers`, `/lawyers/[id]` | 변호사 목록/상세 | 공개 탐색 |
| `/login`, `/signup` | 인증 | 변호사 로그인 시 `/lawyer/dashboard`로 분기 |
| `/mypage` | 일반회원 마이페이지 | `?tab=matching`로 매칭 탭 |
| `/lawyer/register` | 파트너 등록 (4단계) | Supabase에 profiles+lawyers(status=pending) 생성 |
| `/lawyer/dashboard` | 변호사 대시보드 | 비변호사 접근 시 리다이렉트 |
| `/admin/*` | 관리자 패널 | `middleware.ts`가 role='admin' 세션만 허용 |
| `/blog`, `/blog/[slug]` | 블로그 | SEO 콘텐츠 (sitemap/robots/OG 이미지) |
| `/terms`, `/privacy` | 약관/개인정보처리방침 | |
| `/offline` | 오프라인 폴백 | `online` 이벤트로 자동 새로고침 |

## 인증 모델 (Supabase Auth)

- **모든 인증은 Supabase Auth로 처리**된다 (`components/AuthProvider.tsx`). 세션은 Supabase가 쿠키/스토리지로 관리.
- 계정 타입: `profiles.role` = `user` | `lawyer` | `admin` (+ `lib/types.ts`의 `Account` 유니온)
- **이메일/비밀번호**: `supabase.auth.signUp` / `signInWithPassword` → 성공 시 `profiles` insert
- **카카오·구글**: `supabase.auth.signInWithOAuth` (실제 연동). `redirectTo`는 `NEXT_PUBLIC_SITE_URL/auth/callback`
  - `app/auth/callback/route.ts`가 `exchangeCodeForSession` 후 신규 사용자 `profiles` 자동 생성
- **변호사 가입**(`registerLawyer`): `profiles(role=lawyer)` + `lawyers(status=pending)` 동시 insert → 관리자 승인 대기
- **관리자**: `middleware.ts`가 `/admin/*`를 세션 + `role='admin'`으로 게이트. 최초 admin은 `schema.sql` 하단 안내대로 `update profiles set role='admin'`으로 승격.

## 데이터 모델 · 영속성

**Supabase Postgres (7 테이블)** — `lib/supabase-types.ts` = `supabase/schema.sql`(+`schema-additions.sql`) 미러:

| 테이블 | 용도 |
|---|---|
| `profiles` | 회원(id=auth.users, name/email/phone/role) |
| `lawyers` | 변호사 상세(specialty/status/bar_number/fee 등) |
| `consultations` | 상담 본문(`messages` jsonb, `analysis_complete`, `analysis_summary`) |
| `matchings` | 매칭 세션(`case_summary`, fee_min/max, consultation_method, status) |
| `proposals` | 변호사 제안(fee/message/selected) |
| `chat_rooms` | 상담방(matching↔user↔lawyer) |
| `messages` | 상담방 메시지(content + file_* 첨부) |

**localStorage (클라이언트 캐시)** — 로그인 전/오프라인 우선 동작용:

| 키 | 모듈 | 비고 |
|---|---|---|
| `legaladvisor.consultations.v1` | `lib/storage.ts` | 상담 캐시. `upsertConsultation`이 첨부 `data`를 strip |
| `legaladvisor.matching.v1` | `lib/matching-storage.ts` | 매칭 세션 캐시 |

**동기화 흐름**: 채팅 중 `persistConsultation` → localStorage 저장 + (로그인 시)`syncConsultationToSupabase`. 게스트가 로그인하면 `ConsultationBackfill`이 그동안의 로컬 상담을 Supabase로 일괄 업로드.

## API 라우트

- `POST /api/chat` — Claude 스트리밍, `web_search` 활성화. 시스템 프롬프트가 **변호사법 제109조 경계**를 강제(개별 사건 "판단" 금지 → 일반화, 유무죄·금액 예측·법률문서 작성 금지). 종합분석 라벨(`적용 법령`/`관련 판례`/`핵심 쟁점`)은 유지 → `analysis-detection.ts`가 이를 감지해 매칭 CTA 노출.
- `POST /api/case-summary` — 채팅 전문 → `CaseSummary` JSON. 변호사 매칭용 **내부** 요약(이용자 노출 아님).
- `POST /api/suggest-questions` — 최근 대화 기반, 의뢰인이 탭 한 번으로 보낼 **예시 답변 3개**(질문 아님).
- `POST /api/auth/kakao` — 카카오 OAuth 보조.

AI 라우트 모두 `runtime="nodejs"`, `dynamic="force-dynamic"`, 모델 `claude-opus-4-7`, `lib/rate-limit.ts`로 IP 레이트리밋. `ANTHROPIC_API_KEY` 필요.

## RLS (Row Level Security) — 중요

- 모든 테이블에 RLS가 켜져 있고, 브라우저는 **공개 anon 키**로만 접근한다. 즉 **RLS가 곧 접근제어의 전부**다.
- 정책은 `supabase/*.sql`을 대시보드 SQL Editor에서 수동 실행해 관리(마이그레이션 자동화 없음).
- 🔴 **함정**: `for all using (true)` 처럼 역할(TO) 제한 없는 정책은 anon 전체에 적용되어 **누구나 공개 키로 전 데이터를 읽을 수 있는 구멍**이 된다. (과거 `Service role full access` 정책이 상담 원문을 노출 → `fix-rls-exposure.sql`로 제거·검증 완료.) **새 정책 추가 시 소유자/`is_admin()`/명시 조건으로 반드시 스코프를 좁힐 것.**

## PWA

- `viewportFit:"cover"` + `themeColor:"#0f172a"` (layout.tsx), `appleWebApp.statusBarStyle:"black-translucent"`
- `public/sw.js`: install 시 `/offline`+아이콘 precache / navigation network-first→`/offline` 폴백 / 정적 자산 stale-while-revalidate / `/api/*`·비-GET 우회
- iOS 안전영역: `globals.css`의 `.pt-safe-top { padding-top: env(safe-area-inset-top); }`를 모든 상단 헤더에 적용. 하단 네비는 `env(safe-area-inset-bottom)` 스페이서 보유.
- `ServiceWorkerRegister`는 `NODE_ENV==="production"`에서만 등록.
- `AppShell`: `/admin/*`는 TopNav/BottomNav 없이 렌더. 하단 네비는 `BOTTOM_NAV_ROUTES`(홈·mypage·lawyer/dashboard·lawyers·chat/rooms·blog)에서만 노출.

## 디자인 시스템 (`tailwind.config.ts` + `globals.css`)

- 폰트: Nanum Square Neo CDN → Apple SD Gothic Neo / Noto Sans KR 폴백
- 컬러 의미:
  - `primary` 네이비 — 텍스트/뉴트럴 UI
  - `brand` 틸 — 신뢰/아이덴티티 (CTA 아님)
  - `accent` 골드 — 강조/뱃지
  - `cta` 그린 — **버튼 전용** (다른 곳에 쓰지 말 것)
- 주요 키프레임(`globals.css`): `page-enter`·`fade-up`·`fade-in`·`banner-slide-up`, 히어로 `hero-slide-left/right`·`hero-rise`, 캐러셀 `carousel-card-in`, 매칭 `pulse-ring`·`pulse-hub`·`proposal-enter`·`counter-pop`·`cta-pulse`

## 홈 페이지 애니메이션

1. **히어로 등장**: "AI가 분석하고," 좌→ / "변호사가 해결합니다" 0.3s 후 우→ / 설명 0.6s / 검색창 0.9s, 모두 800/700ms ease-out + 약간의 scale
2. **카운트업**: 6,000+ / 40,000+ / 4분, IntersectionObserver(threshold 0.3) 한 번만, `1-(1-t)^3` ease-out, 200ms stagger, `+`는 done 후 페이드인
3. **변호사 캐러셀**: 데스크톱 4 / 모바일 2 노출, 3초 자동 슬라이드 + 좌우 버튼 + 도트, 양 끝 clone 무한 루프, 호버 시 정지

## 빌드/배포

- 프로덕션: **https://lawsel.kr** (Vercel)
- 배포: `vercel --prod --yes` (CLI 설치됨). **git push는 자동 배포되지 않음** — 배포는 항상 CLI로.
- 빌드 검증: `npx tsc --noEmit && npx next build`
- 환경 변수(`.env.local`): `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`(OAuth 리다이렉트 기준), `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`

## 주의 사항

- **RLS가 접근제어의 전부**다. 새 테이블/정책 추가 시 anon 전체 노출 구멍(`using(true)`)을 만들지 말 것. (위 RLS 섹션 참고)
- **첨부 base64 쿼터**: localStorage(~5MB)와 Supabase row 용량 보호를 위해 저장 시 첨부 `data`를 떼낸다. `lib/storage.ts`(localStorage)와 `lib/consultation-sync.ts`(Supabase) **둘 다** strip한다. 새 필드/저장 경로 추가 시 동일 패턴 유지. `messages.file_data`(상담방 첨부)도 base64라 남용 주의.
- **`supabase-types.ts` ↔ `schema.sql` 동기화**: DB 스키마 바꾸면 두 파일을 함께 갱신.
- **SQL은 수동 적용**: `supabase/*.sql`은 대시보드 SQL Editor에서 직접 실행해야 반영된다(자동 마이그레이션 없음).
- **AI 응답의 변호사법 경계**: `/api/chat` 시스템 프롬프트는 개별 사건 단정("판단")을 금지하고 일반화·정보제공형으로만 답하도록 강제한다. 이 톤/포맷을 바꿀 때 `analysis-detection.ts`의 감지 키워드(`적용 법령`·`관련 판례`·`핵심 쟁점`)를 깨뜨리면 매칭 CTA가 안 뜬다.
- `lib/auth-storage.ts`는 **레거시(미사용)**. 인증은 전부 Supabase Auth. 참고하지 말 것.
- 아이콘 수정: `public/icon.svg`를 먼저 고친 뒤 `node scripts/generate-icons.cjs`로 PNG 재생성(윈도우 Chrome/Edge 경로 자동 탐색).

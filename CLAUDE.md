# 법률AI (legal-ai-chatbot)

AI 법률 상담 + 변호사 매칭 PWA. Heydealer 톤의 모바일 우선 UI, localStorage 기반 데모.

## 스택

- Next.js 15 (App Router, RSC + "use client") · React 19 · TypeScript 5.7
- Tailwind CSS 3.4 (커스텀 팔레트: `primary` 네이비 / `brand` 틸 / `accent` 골드 / `cta` 그린)
- Anthropic SDK 0.65 (`@anthropic-ai/sdk`) — Claude 사용, 일부 라우트에서 `web_search` 도구 활용
- puppeteer-core (개발 의존성, 아이콘 PNG 생성 + 스크린샷 스크립트)
- 외부 상태 라이브러리 없음 — 전 상태는 React state + localStorage

`package.json`의 scripts: `dev` / `build` / `start` / `lint` (모두 표준 Next.js).

## 디렉터리

```
app/
  api/
    chat/route.ts          # 스트리밍 채팅, web_search 도구 포함
    case-summary/route.ts  # 사건 요약 JSON 생성
  chat/[id]/page.tsx       # AI 상담 채팅 화면
  matching/[id]/page.tsx   # 변호사 매칭(요약 → 매칭 중 → 제안 수신)
  login/page.tsx           # 카카오/구글/이메일 로그인 + 파트너 배너
  signup/page.tsx          # 일반 회원가입 + 환영 모달
  mypage/page.tsx          # 일반회원 마이페이지(상담/매칭 탭)
  lawyer/register/page.tsx # 파트너 변호사 등록 (Step 0 히어로 → 1~3 폼 → 완료)
  lawyer/dashboard/page.tsx# 변호사 대시보드(신규 사건 + 제안 모달)
  offline/page.tsx         # PWA 오프라인 폴백
  layout.tsx               # PWA 메타데이터, ServiceWorkerRegister 마운트
  page.tsx                 # 홈(히어로 + 최근 상담 + 변호사 캐러셀 + How it works)
  globals.css              # 폰트, 키프레임, safe-area 유틸리티

components/
  AppShell.tsx              # AuthProvider + TopNav + 조건부 BottomNav
  AuthProvider.tsx          # 세션/계정 컨텍스트, 데모 변호사 시드
  AuthButtons.tsx           # 헤더 우측 로그인/회원가입 또는 아바타 드롭다운
  AuthForm.tsx              # 공용 로그인/가입 폼 (모달 등에서 사용)
  AuthModal.tsx             # 매칭 페이지 등에서 인라인 가입 유도용 모달
  TopNav.tsx                # 데스크톱(lg+) 상단 헤더
  BottomNav.tsx             # 모바일 하단 4탭(홈/AI상담/매칭/마이)
  ServiceWorkerRegister.tsx # production에서만 /sw.js 등록
  Footer.tsx

lib/
  types.ts                  # Consultation, Lawyer, Account, MatchingSession 등 도메인 타입
  storage.ts                # 상담 localStorage CRUD + generateId/buildTitle
  matching-storage.ts       # 매칭 세션 localStorage CRUD
  auth-storage.ts           # 계정/세션 localStorage CRUD (데모 평문 비밀번호)
  lawyers.ts                # DEMO_LAWYERS 5명 + generateProposals 더미
  quick-consultations.ts    # 히어로 카테고리 칩 6개(형사/이혼/부동산/노동/계약/손해배상)
  markdown.ts               # assistant 메시지 마크다운 렌더 + 시간 포맷

public/
  manifest.json             # PWA 매니페스트
  sw.js                     # 직접 작성한 서비스워커
  icon.svg                  # 마스터 벡터(법 + 골드 도트)
  icon-{192,512}.png        # PWA 아이콘
  icon-maskable-512.png     # Android 마스커블(22% safe zone)
  apple-touch-icon.png      # iOS 180x180
  favicon-32.png

scripts/
  generate-icons.cjs        # icon.svg → 5종 PNG 렌더 (Chrome 경로 자동 탐색)
  drive.cjs / drive-auth.cjs# 데모 데이터 시드 + 인증 시나리오 스크린샷
```

## 라우팅 요약

| URL | 화면 | 비고 |
|---|---|---|
| `/` | 홈 (히어로 + 캐러셀) | 모바일 헤더에는 로고만, 하단 4탭 노출 |
| `/chat/[id]` | AI 상담 채팅 | `seed`·`quick` 쿼리로 첫 메시지 시드 가능 |
| `/matching/[id]` | 매칭 진행/결과 | 비로그인 시 `AuthModal`로 가입 유도 |
| `/login`, `/signup` | 인증 | 변호사 로그인 시 `/lawyer/dashboard`로 분기 |
| `/mypage` | 일반회원 마이페이지 | `?tab=matching`로 매칭 탭 |
| `/lawyer/register` | 파트너 등록 (4단계) | Step 0 히어로 → 1~3 폼 → 완료 |
| `/lawyer/dashboard` | 변호사 대시보드 | 비변호사 접근 시 `/login`으로 강제 리다이렉트 |
| `/offline` | 오프라인 폴백 | `online` 이벤트로 자동 새로고침 |

## 상태 영속성 (localStorage 키)

| 키 | 모듈 | 비고 |
|---|---|---|
| `legaladvisor.consultations.v1` | `lib/storage.ts` | 상담 본문. `upsertConsultation`이 첨부파일 `data`를 strip해서 저장 (5~10MB 쿼터 보호) |
| `legaladvisor.matching.v1` | `lib/matching-storage.ts` | 매칭 세션. consultationId 키 |
| `legaladvisor.accounts.v1` | `lib/auth-storage.ts` | 계정 목록(데모, 비밀번호 평문) |
| `legaladvisor.session.v1` | `lib/auth-storage.ts` | 현재 로그인 세션 |

백엔드 영속화 없음. 새로고침해도 같은 브라우저에서만 유지됨.

## 인증 모델

- 두 가지 계정 타입: `UserAccount` / `LawyerAccount` (`lib/types.ts` 디스크리미네이티드 유니온, `type: "user" | "lawyer"`)
- `AuthProvider`가 마운트 시 `seedDemoLawyer()`로 데모 변호사 자동 주입:
  - 이메일: `lawyer@demo.com` / 비밀번호: `1234`
  - 이름: 김민준 · 승인됨 · 형사/민사/기업법무
- 카카오/구글은 OAuth 미연동 — `findUserByProvider`로 동일 provider 계정 재사용하는 시뮬레이션
- `signInEmail`은 두 타입 모두 처리, `signInWith{Kakao,Google}`은 일반 사용자만, `registerLawyer`는 변호사만 생성

## API 라우트

- `POST /api/chat` — Claude 스트리밍, `web_search` 도구 활성화. 시스템 프롬프트는 한국 법령/판례 검색 가이드라인 포함
- `POST /api/case-summary` — 채팅 전문 → `CaseSummary` JSON (caseType/keyIssues/relevantLaws/urgency/summary). 코드블록·잡음 제거 후 파싱

둘 다 `runtime = "nodejs"`, `dynamic = "force-dynamic"`. `ANTHROPIC_API_KEY` 필요(.env.local).

## PWA

- `viewportFit: "cover"` + `themeColor: "#0f172a"` (layout.tsx)
- `appleWebApp.statusBarStyle: "black-translucent"`
- `public/sw.js`:
  - install: `/offline` + 매니페스트/아이콘 precache
  - navigation: network-first → 실패 시 `/offline` 폴백
  - `_next/static`, `_next/image`, 아이콘 등 정적 자산: stale-while-revalidate
  - `/api/*`와 비-GET은 우회
- iOS 상태바 안전 영역: `globals.css`의 `.pt-safe-top { padding-top: env(safe-area-inset-top); }` 유틸리티를 모든 상단 헤더에 적용
- 하단 네비는 `h-[env(safe-area-inset-bottom)]` 스페이서 보유
- `ServiceWorkerRegister` 컴포넌트는 `process.env.NODE_ENV === "production"`에서만 등록

## 디자인 시스템 (`tailwind.config.ts` + `globals.css`)

- 폰트: Nanum Square Neo CDN → Apple SD Gothic Neo / Noto Sans KR 폴백
- 컬러 의미:
  - `primary` 네이비 — 텍스트/뉴트럴 UI
  - `brand` 틸 — 신뢰/아이덴티티 (CTA 아님)
  - `accent` 골드 — 강조/뱃지
  - `cta` 그린 — **버튼 전용** (다른 곳에 쓰지 말 것)
- 주요 키프레임 (`globals.css`):
  - `page-enter` (모든 페이지 진입), `fade-up`, `fade-in`, `banner-slide-up`
  - 홈 히어로: `hero-slide-left/right`, `hero-rise`
  - 캐러셀: `carousel-card-in` (초기 진입 시 fade + scale 0.9→1)
  - 매칭: `pulse-ring`, `pulse-hub`, `proposal-enter`, `counter-pop`, `cta-pulse`

## 홈 페이지 애니메이션

1. **히어로 등장**: "AI가 분석하고," 좌→ / "변호사가 해결합니다" 0.3s 후 우→ / 설명 0.6s / 검색창 0.9s, 모두 800/700ms ease-out + 약간의 scale
2. **카운트업**: 6,000+ / 40,000+ / 4분, IntersectionObserver(threshold 0.3) 한 번만 트리거, `1 - (1 - t)^3` cubic ease-out, 200ms씩 stagger, `+`는 done 후 페이드인
3. **변호사 캐러셀**: 데스크톱 4 / 모바일 2 노출, 3초 자동 슬라이드 + 좌우 버튼 + 도트, 양 끝 clone으로 무이음 무한 루프, 호버 시 정지

## 빌드/배포

- Vercel 프로덕션 alias: **https://legal-ai-chatbot-five.vercel.app**
- 배포: `vercel --prod --yes`
- 빌드 검증: `npx tsc --noEmit && npx next build`
- 환경 변수: `ANTHROPIC_API_KEY`만 필요. `.env.local.example` 참고

## 주의 사항

- localStorage 쿼터(~5MB)가 빠듯하므로 `ChatMessage.attachments`에 base64 데이터를 저장하면 빠르게 터진다. `upsertConsultation`은 `stripAttachmentPayloads`로 `data` 필드를 떼고 저장한다. **새 필드를 추가할 때 동일 패턴 유지.**
- 데모 인증은 평문 비밀번호 + localStorage. 실제 백엔드 붙일 때는 `lib/auth-storage.ts` 인터페이스를 유지하면서 구현체만 갈아끼울 수 있도록 설계함.
- 변호사 모바일 UX는 미완성 — `BOTTOM_NAV_ROUTES`(`components/AppShell.tsx`)에 `/lawyer/dashboard`가 포함돼 있지 않아 변호사 로그인 시 모바일 하단 네비가 보이지 않음. 향후 별도 변호사용 모바일 네비를 만들지, 공통 네비를 확장할지 결정 필요.
- 아이콘을 수정하면 `public/icon.svg`를 먼저 고친 뒤 `node scripts/generate-icons.cjs`로 PNG 재생성. 윈도우 Chrome/Edge 경로를 자동 탐색하며, 없으면 종료.

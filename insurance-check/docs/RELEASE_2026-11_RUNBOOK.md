# 2026-11 무료 방문 점검 개편 — 운영 적용 안내서 (Runbook)

> 이 문서는 **운영 DB 변경과 운영 배포를 사람이 직접, 승인한 뒤에** 하기 위한 순서표입니다.
> Claude(개발 도구)는 운영 DB·운영 배포에 손대지 않았습니다. 아래 ⛔ 표시 단계는 운영자가 명시적으로 승인한 뒤에만 진행합니다.

---

## 1. 마이그레이션(`supabase/03-visit-checkup.sql`) 영향 분석

| 대상 | 영향 | 근거 |
|---|---|---|
| **기존 고객 신청 데이터** (`ic_leads`) | **바뀌지 않음.** 칸(칼럼) 4개만 추가되고, 기존 행의 값은 그대로 | 로컬 재현 DB에서 실행 전후 '기존 신청 내용 지문(md5)'·행 수가 완전히 같음 |
| 새 칸의 기존 행 값 | `region`·`visit_at`·`visit_place` = 비어 있음(null), `interests` = 빈 목록 | 기존 신청은 "개편 이전 신청"으로 표시됨 |
| **관리자 계정** (`ic_staff`, Supabase Auth) | **영향 없음** | 이 파일은 `ic_staff`·`auth.users`를 읽지도 쓰지도 않음 |
| **RLS(접근 제어)** | 기존 6개 테이블의 RLS·정책·권한 **변경 없음**. 새 테이블 `ic_lead_activities`만 RLS 켜짐 + 공개 정책 없음 + 공개 역할 권한 회수 | `verify-summary.sql` 9개 항목 모두 통과(로컬) |
| 허용 값 규칙(CHECK) | `service_type`·`claim_status` 규칙을 **넓힘**(기존 값은 전부 계속 허용) | 기존 규칙을 지우고 더 넓은 규칙을 같은 트랜잭션에서 다시 만듦 |
| 감사로그·후기·개인정보 요청·이벤트 | 영향 없음 | 해당 테이블 미변경 |

## 2. 위험 검토

| 위험 | 결론 | 설명 |
|---|---|---|
| 기존 데이터 삭제 | **없음** | `delete`·`truncate`·`drop table`·`drop column` 문장이 없음 |
| 테이블 초기화 | **없음** | 기존 테이블을 새로 만들지 않음(`create table if not exists`는 새 테이블 하나에만) |
| 중간 실패 시 반쯤 적용 | **없음** | 전체가 한 트랜잭션(`begin`~`commit`) — 오류가 나면 아무것도 반영되지 않음 |
| 두 번 실행 | 안전 | 이미 있으면 건너뜀(로컬에서 2회 실행 확인) |
| 현재 운영 중인(이전) 코드 | 그대로 동작 | 새 칸은 비어 있어도 되고, 넓어진 규칙은 이전 값을 모두 허용(로컬에서 이전 방식 저장·파기 확인) |
| 잠깐의 잠금 | 매우 짧음 | 규칙 확인을 위해 `ic_leads`를 잠깐 잠그지만, 행이 수천 건 이하면 1초 미만. 손님이 적은 시간대 권장 |
| ⚠️ 이전 규칙의 모양이 예상과 다름 | **사전 점검으로 확인** | 03은 "유형·상태 값 목록만 검사하는 규칙"을 찾아 바꾼다. 다른 조건이 섞인 규칙이 있으면 사전 점검 12번이 **STOP** |
| ⚠️ 코드 되돌리기(롤백) | **조건부 위험** | 아래 6-3 참고 — 새 형식 신청이 생긴 뒤 이전 코드로 되돌리면 관리자 목록이 오류 |

## 3. 적용 순서와 검증 방법

준비물: Supabase 대시보드 접속(소유자 계정), 이 저장소의 `supabase/` 폴더 파일 3개.

| 순서 | 할 일 | 통과 기준 |
|---|---|---|
| 3-1 | Supabase → **Database → Backups**에서 오늘 날짜 백업이 있는지 확인(없으면 수동 백업 또는 PITR 확인) | 백업 시각 확인 |
| 3-2 | SQL Editor에 `03-precheck.sql` 전체 붙여넣기 → Run → **결과 표를 저장**(캡처·복사) | `verdict`에 **STOP이 하나도 없음** |
| 3-3 ⛔ | **운영자 승인 후** SQL Editor에 `03-visit-checkup.sql` 전체 붙여넣기 → Run | "Success. No rows returned" |
| 3-4 | `03-precheck.sql` 다시 실행 → 3-2 결과와 비교 | 01~10번 값이 **3-2와 같음**(특히 08 지문), 11번이 `_v3` 2개, 13번 칼럼 4개, 14번 '있음' |
| 3-5 | `verify-summary.sql` 실행 | 9행 모두 `ok = true` |
| 3-6 | 확인일을 Vercel 환경변수 `APPROVAL_DB_VERIFIED`(예: 2026-11-21)에 기록 | — |

문제가 생기면: 3-3에서 오류가 나면 아무것도 바뀌지 않은 상태입니다. 오류 문구를 그대로 개발자에게 전달하세요.
3-4에서 08 지문이 다르면(예상되지 않음) 신청 접수를 멈추고 백업 시점과 비교합니다.

## 4. 승인 원칙

- 3-3(운영 DB 변경), 6-1(운영 배포), 6-3-B(긴급 SQL)는 **운영자가 명시적으로 승인한 뒤에만** 실행합니다.
- 나머지(사전·사후 점검 SQL)는 읽기 전용이라 언제 실행해도 데이터가 바뀌지 않습니다.

## 5. DB 적용 후 실제 동작 검증 계획

**테스트 데이터 원칙**: 이름은 `테스트검증`, 번호는 `010-0000-04xx`. Preview(테스트 모드)에서 넣은 신청은 자동으로 '테스트 신청'(운영 지표 제외)이 됩니다.

### 5-A. Preview(테스트 모드)에서 — 운영 배포 전
자동: GitHub Actions의 `insurance-check Preview E2E`가 Preview 배포마다 실행(Secrets 필요: `VERCEL_AUTOMATION_BYPASS_SECRET`, `STAGING_ADMIN_EMAIL`, `STAGING_ADMIN_PASSWORD`).
수동 체크리스트(브랜치 Preview 주소에서):

| # | 무엇을 | 어떻게 | 기대 결과 |
|---|---|---|---|
| 1 | DB 자동 점검 | 관리자 → 환경설정 → '다시 점검' | 새 항목(03 칼럼·상담 이력 테이블·공개 키 차단) 포함 **모두 통과** |
| 2 | 고객 신청 | 랜딩 → '쓰지 않고 잠든 카드포인트' 카드 → 성함·번호·지역(경기)·시간(오후)·동의 → 신청 | 완료 화면 + 신청번호 |
| 3 | CRM 저장 | 관리자 → 상담 DB에서 신청번호 검색 | 관심 서비스 '카드포인트', 지역 '경기', 연락 희망 시간 '오후', 연락처 마스킹 |
| 4 | 동의 기록 | 신청 상세 → 동의 내역 | `동의 · visit-2026-11-20.v4 · (시각)`, 광고성 정보는 미동의 |
| 5 | 방문 예약 | 상세 → 방문 일시(미래)·장소 저장 → 새로고침 | 진행 상태 '방문 예약', 상담 이력에 '방문 예약: …' |
| 6 | 상담 이력 | 상세 → 종류 '전화' + 내용 → 기록 추가 | 이력 맨 위에 표시, 감사로그 `lead.activity` |
| 7 | 방문 안내 문자 | 상세 → 문구 확인 후 보내기 → 이대로 보내기 | 테스트 모드라 **실제 발송 안 됨**, 이력에 '(발송 안 함)' |
| 8 | 방문 일정 화면 | 관리자 → 방문 일정 | 5번 예약이 날짜별 목록에 보임 |
| 9 | CSV | 상담 DB → CSV 내보내기 | 관심 서비스·지역·방문 일시 열, 마스킹 연락처만, 방문 장소 없음 |
| 10 | 철회·삭제 | `/privacy/withdraw`에서 같은 이름·번호로 삭제 요청 → 관리자 '처리 완료' | 이름 '(삭제됨)', 방문 일시·장소 비움, 상담 이력 사라짐 |

DB에서 직접 확인(읽기 전용, 개인정보 출력 없음):
```sql
select ref_no, created_at, service_type, region, interests, preferred_time, claim_status,
       privacy_consent_version, privacy_consent_at is not null as consent_time_saved,
       visit_at is not null as visit_saved, is_test
from public.ic_leads order by created_at desc limit 5;

select l.ref_no, a.kind, a.at, a.actor
from public.ic_lead_activities a join public.ic_leads l on l.id = a.lead_id
order by a.at desc limit 10;
```

### 5-B. 운영(Production) 배포 직후 — 실제 1건 확인
1. 운영 주소에서 **운영자 본인 휴대폰 번호**로 신청 1건 → 운영자에게 '신규 신청' 알림 문자가 오는지(솔라피 설정 시)
2. CRM에서 그 신청에 방문 일시(내일)·장소 저장 → '방문 안내 문자' 보내기 → **본인 휴대폰에 실제 문자 수신** 확인
3. 확인 후 상세에서 '내부 테스트 신청'으로 표시(운영 지표 제외)
4. `npm run verify:deployed`(배포 사이트 자동 점검, 운영 모드면 신청 테스트는 자동으로 건너뜀)

## 6. Vercel Production 배포와 롤백

### 6-1. 배포 ⛔(승인 후)
순서가 중요합니다: **① DB(3단계) → ② Preview 검증(5-A) → ③ 운영 배포**.

1. Vercel → 프로젝트(insurance-check) → **Settings → Git → Production Branch**가 무엇인지 확인(보통 `main`)
2. 이 브랜치(`claude/upbeat-darwin-cbdxhr`)로 PR을 만들고 → 변경 확인 → **Production Branch로 병합**
   (병합하면 Vercel이 자동으로 운영 배포를 만듭니다. Git 연결이 없다면 `insurance-check` 폴더에서 `vercel --prod`)
3. Vercel → Deployments에서 새 Production 배포가 **Ready**인지 확인
4. 5-B 실행

DB보다 코드가 먼저 배포되면: DB 자동 점검이 실패해 신청이 **503으로 잠깁니다**(데이터 손상 없음). 3단계를 실행하면 30초 안에 자동 재개.

### 6-2. 코드 롤백 방법
Vercel → Deployments → 직전 Production 배포의 `⋯` → **Instant Rollback**(또는 Promote to Production). 1~2분 안에 이전 화면으로 돌아갑니다.
DB는 되돌리지 않습니다 — 추가만 한 변경이라 이전 코드도 그대로 동작합니다.

### 6-3. ⚠️ 롤백할 때 꼭 알아야 할 점
이전(개편 전) 코드는 **새 형식 신청**(유형 `card_points`·`general`, 상태 `visit_booked`·`visited`)을 모릅니다.
- 고객 랜딩·신청은 문제없이 동작합니다.
- 하지만 **관리자 상담 DB 목록·상세·CSV가 오류 화면**이 됩니다(새 유형 이름을 찾지 못함).
- 방문 정보가 있는 고객의 '삭제 요청 처리 완료'가 DB 규칙(`ic_leads_deleted_visit_scrubbed`) 때문에 실패합니다.

그래서 순서를 이렇게 권장합니다.
- **A. 배포 후 새 형식 신청이 아직 없을 때**: 6-2 롤백만 하면 됩니다.
- **B. 새 형식 신청이 이미 있을 때**: 가능하면 롤백 대신 **고쳐서 다시 배포**(roll-forward). 꼭 롤백해야 하면 ⛔ 승인 후 아래 SQL을 먼저 실행해 관리자 화면이 열리게 합니다(로컬에서 검증).
  관심 서비스·방문 일시·장소는 지워지지 않아, 다시 새 버전을 배포하면 그대로 다시 보입니다.
  ```sql
  begin;
  update public.ic_leads
     set service_type = case when 'unclaimed' = any(interests) then 'unclaimed'
                             when 'hidden' = any(interests) then 'hidden' else 'unclaimed' end
   where service_type in ('card_points', 'general');
  update public.ic_leads
     set claim_status = case claim_status when 'visit_booked' then 'contacting' else 'guided' end
   where claim_status in ('visit_booked', 'visited');
  commit;
  ```
  이 상태에서 방문 정보가 있는 고객의 삭제 요청은 새 버전을 다시 배포한 뒤 처리합니다.

## 7. 구현된 것 / 안 된 것

| 기능 | 상태 | 비고 |
|---|---|---|
| 새 랜딩 8개 섹션·팔레트·큰 글씨 | ✅ 구현 | |
| 한 화면 신청서(성함·휴대전화·지역·연락 시간·관심 서비스·동의) | ✅ 구현 | |
| 보장분석 별도 동의(신청 후) | ✅ 기존 기능 유지 | |
| CRM: 광고 출처(UTM)·지역·관심 서비스·연락 상태·방문 예약·상담 이력 | ✅ 구현 | |
| 방문 일정 화면(`/admin/visits`) | ✅ 구현(목록형) | 달력 보기는 없음 |
| 신규 신청 → **운영자** 알림 문자 | ✅ 기존 기능 + 지역·관심 서비스 추가 | 운영 모드 + 솔라피 환경변수 필요 |
| 방문 일정 → **고객** 안내 문자(상담사가 버튼으로) | ✅ 구현 | 운영 모드에서만 실제 발송. 솔라피 설정은 관리자 → 환경설정에서 확인 |
| 방문 **전날 자동** 알림 문자 | ❌ 미구현 | 예약 작업(Cron) 필요 |
| 신청 접수 직후 **고객에게** 확인 문자 | ❌ 미구현 | |
| 카카오 알림톡 | ❌ 미구현 | |
| **지역별 광고 성과 분석** | ❌ 미구현 | 광고 성과 화면은 UTM 기준. 지역은 CRM 필터로만 볼 수 있음 |
| 상담사 여러 명 일정 충돌 확인·배정 | ❌ 미구현 | 담당자 이름 입력만 |
| 상담사 실제 사진·인사말 | ⏳ 설정만 준비 | `COUNSELOR_PHOTO`·`COUNSELOR_INTRO`(본인 확인 후) |
| 당근 광고 전환 추적 | ❌ 미구현(기존과 같음) | |
| 운영 DB 적용·운영 배포 | ⏳ 승인 대기 | 이 문서 3·6단계 |
| 광고 심의·외부 링크 원문 확인 | ⏳ 운영자 확인 필요 | `docs/DEPLOY_CHECKLIST.md` 0단계 |

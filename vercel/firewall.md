# Vercel WAF (방화벽) 설정

> `supabase/*.sql`과 같은 성격의 파일이다. **자동 적용되지 않는다.**
> Vercel 계정에만 존재하는 설정이라, 여기 기록해두지 않으면 저장소만 봐서는 알 수 없다.

애플리케이션 방어막(`lib/api-guard.ts`)이 뚫렸을 때를 대비한 **엣지 레벨 방어선**이다.
WAF에서 막힌 요청은 **함수 실행 자체가 일어나지 않아** Anthropic 호출도, Vercel 함수 과금도 없다.

## 플랜 제약 (Hobby)

`vercel firewall overview`가 `IP Bypass is unavailable for this plan`을 반환 → **Hobby**.

| 항목 | Hobby 한도 |
|---|---|
| 레이트리밋 규칙 | **1개/프로젝트** (커스텀 룰은 총 3개) |
| 카운팅 키 | IP, JA4 Digest |
| 알고리즘 | fixed_window만 |
| 창(window) | 10초 ~ 10분 |
| System Bypass | ❌ Pro 이상 |
| BotID Deep Analysis | ❌ Pro 이상 (Basic은 전 플랜 무료) |

규칙을 1개밖에 못 쓰므로 `/api/` 전체를 하나로 덮는다.

## 현재 규칙

### `AI API rate limit` (ID: `rule_ai_api_rate_limit_IbxAx1`)

- **조건**: `path` starts with `/api/` **AND** `method` equals `POST`
- **동작**: Rate Limit — 60초 창 / 30 요청 / 키 `ip` / fixed_window
- **초과 시**: `log` (⚠️ 아직 **차단 아님** — 관측 단계)

재생성이 필요할 때:

```bash
vercel firewall rules add "AI API rate limit" --condition '{"type":"path","op":"pre","value":"/api/"}' --condition '{"type":"method","op":"eq","value":"POST"}' --action rate_limit --rate-limit-window 60 --rate-limit-requests 30 --rate-limit-keys ip --rate-limit-action log --yes
```

**30 req/min 근거**: 정상 상담 1턴이 POST 2건(`/api/chat` + `/api/suggest-questions`)이라
실사용 피크가 분당 4건 수준. 30이면 약 7배 여유라 정상 이용자는 걸리지 않는다.

## 적용 절차

`rules add/edit`는 **draft로만 쌓인다.** 반드시 검토 후 publish:

```bash
vercel firewall diff
```

```bash
vercel firewall publish --yes
```

## 단계적 롤아웃 (중요)

방화벽은 모든 요청 앞단에 있어서, 잘못 걸면 실이용자·검색봇을 통째로 막는다.
**절대 처음부터 `deny`로 올리지 말 것.**

1. **`log`로 관측** ← 현재 여기
2. 대시보드에서 실제로 뭐가 걸리는지 확인
   `https://vercel.com/<team>/legal-ai-chatbot/firewall/traffic?filter=rule_ai_api_rate_limit_IbxAx1`
   정상 이용자·크롤러가 안 잡히는지 확인
3. 이상 없으면 차단으로 전환:
   ```bash
   vercel firewall rules edit "AI API rate limit" --rate-limit-action deny --yes
   ```
   (publish 필요) 이후 24시간은 주시하고, 문제 시 `--rate-limit-action log`로 즉시 되돌린다.

## 한계

- **카운터는 리전별로 따로 센다.** N개 리전에서 오는 분산 공격은 설정값의 최대 N배까지 통과할 수 있다.
  → 레이트리밋만 믿지 말고 `lib/api-guard.ts`의 Origin 검사 + BotID와 함께 가야 한다.
- Hobby는 규칙 1개뿐이라 경로별로 다른 한도를 줄 수 없다. 세분화가 필요해지면 Pro(40개) 필요.

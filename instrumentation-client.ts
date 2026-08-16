import { initBotId } from "botid/client/core";

/**
 * BotID 클라이언트 챌린지.
 *
 * 여기 등록된 경로로 나가는 요청에만 검증용 헤더가 붙는다. 즉 이 목록에 없는
 * 경로에서 서버가 `checkBotId()`를 부르면 **정상 이용자도 봇으로 분류**되므로,
 * 라우트를 추가할 때 이 목록도 반드시 함께 갱신할 것.
 */
initBotId({
  protect: [
    { path: "/api/chat", method: "POST" },
    { path: "/api/suggest-questions", method: "POST" },
    { path: "/api/case-summary", method: "POST" },
  ],
});

/**
 * 이상한영어 AI 튜터 — Cloudflare Worker (클로드 API 중계)
 * 클로드 API 키를 안전하게 숨기고, 숙제방에서 호출하면 클로드 응답을 돌려줍니다.
 *
 * [설치]
 * 1) dash.cloudflare.com 가입(무료) → Workers & Pages → Create → Worker → 이름 예: weird-ai → Deploy
 * 2) 그 워커 열기 → "Edit code" → 이 파일 내용 전체를 붙여넣고 → Deploy
 * 3) 워커 → Settings → Variables and Secrets → Add →
 *      이름: ANTHROPIC_API_KEY   값: (본인 클로드 API 키)   타입: Secret(Encrypt) → Save/Deploy
 * 4) 워커 주소(예: https://weird-ai.<계정>.workers.dev)를 복사해서 알려주세요.
 */

const ALLOW = ["https://weirdenglish.co.kr", "http://localhost", "http://127.0.0.1"];
const MODEL = "claude-haiku-4-5-20251001"; // 저렴하고 빠른 모델

function corsHeaders(origin) {
  const ok = ALLOW.some(a => origin && origin.startsWith(a));
  return {
    "Access-Control-Allow-Origin": ok ? origin : "https://weirdenglish.co.kr",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = corsHeaders(origin);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("ok", { headers: cors });

    // 우리 사이트에서 온 요청만 허용 (키 남용 방지)
    if (!ALLOW.some(a => origin && origin.startsWith(a))) {
      return new Response(JSON.stringify({ reply: "(허용되지 않은 접근)" }),
        { status: 403, headers: { ...cors, "content-type": "application/json" } });
    }

    try {
      if (!env.ANTHROPIC_API_KEY) {
        return new Response(JSON.stringify({ reply: "(설정 오류) ANTHROPIC_API_KEY 시크릿이 비어 있어요." }),
          { headers: { ...cors, "content-type": "application/json" } });
      }
      // 진단: 이 워커가 어느 지역/IP에서 나가는지
      let geo = "";
      try { const t = await (await fetch("https://cloudflare.com/cdn-cgi/trace")).text();
        const loc = (t.match(/loc=(\w+)/) || [])[1]; const ip = (t.match(/ip=([\d.:a-f]+)/) || [])[1];
        geo = " [egress loc=" + loc + " ip=" + ip + "]"; } catch (e) {}
      const { system, messages } = await req.json();
      const safeMsgs = (Array.isArray(messages) ? messages : []).slice(-16); // 길이 제한(비용 보호)
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 300,
          system: String(system || "You are a friendly English tutor.").slice(0, 4000),
          messages: safeMsgs,
        }),
      });
      const raw = await r.text();
      let j = null; try { j = JSON.parse(raw); } catch (e) {}
      const reply = (j && j.content && j.content[0] && j.content[0].text)
        ? j.content[0].text
        : "(오류 " + r.status + geo + ": " + raw.slice(0, 400) + ")";  // 진단용: 원본 응답 노출
      return new Response(JSON.stringify({ reply }),
        { headers: { ...cors, "content-type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ reply: "(연결 오류) " + (e && e.message ? e.message : "") }),
        { headers: { ...cors, "content-type": "application/json" } });
    }
  },
};

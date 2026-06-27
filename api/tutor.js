/**
 * 이상한영어 AI 튜터 — Vercel 서버리스 함수 (미국 지역에서 클로드 호출)
 * 경로: /api/tutor   (예: https://<프로젝트>.vercel.app/api/tutor)
 *
 * [설치]
 * 1) vercel.com 가입(깃허브로 로그인) → Add New… → Project → weirdenglish 저장소 Import
 * 2) 배포 전 Environment Variables 에 추가:  Name= ANTHROPIC_API_KEY  Value=(클로드 키)
 * 3) Deploy → 나온 주소(https://xxxx.vercel.app)를 알려주세요.
 *
 * 클로드 키는 Vercel 환경변수에만 들어가고 코드/사이트에는 노출되지 않습니다.
 */
const ALLOW = ["https://weirdenglish.co.kr", "http://localhost", "http://127.0.0.1"];
const MODEL = "claude-haiku-4-5";

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  const ok = ALLOW.some((a) => origin.startsWith(a));
  res.setHeader("Access-Control-Allow-Origin", ok ? origin : "https://weirdenglish.co.kr");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(200).json({ reply: "ok" });
  if (!ok) return res.status(403).json({ reply: "(허용되지 않은 접근)" });

  try {
    if (!process.env.ANTHROPIC_API_KEY)
      return res.status(200).json({ reply: "(설정 오류) ANTHROPIC_API_KEY 환경변수가 없어요." });

    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    const system = String(body.system || "You are a friendly English tutor.").slice(0, 4000);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 300, system, messages }),
    });
    const raw = await r.text();
    let j = null;
    try { j = JSON.parse(raw); } catch (e) {}
    const reply =
      j && j.content && j.content[0] && j.content[0].text
        ? j.content[0].text
        : "(오류 " + r.status + ": " + raw.slice(0, 300) + ")";
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(200).json({ reply: "(연결 오류) " + (e && e.message ? e.message : "") });
  }
};

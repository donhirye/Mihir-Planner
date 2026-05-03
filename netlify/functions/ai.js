const https = require("https");
exports.handler = async function(event) {
  const headers = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "No API key" }) };
  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }
  const { prompt } = body || {};
  if (!prompt) return { statusCode: 400, headers, body: JSON.stringify({ error: "No prompt" }) };
  const payload = JSON.stringify({ model: "gpt-4o-mini", max_tokens: 1500, messages: [{ role: "user", content: prompt }] });
  return new Promise((resolve) => {
    const req = https.request({ hostname: "api.openai.com", path: "/v1/chat/completions", method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "Content-Length": Buffer.byteLength(payload) } }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => { try { const json = JSON.parse(data); const text = json.choices?.[0]?.message?.content || ""; resolve({ statusCode: 200, headers, body: JSON.stringify({ text }) }); } catch(e) { resolve({ statusCode: 500, headers, body: JSON.stringify({ error: "Parse error" }) }); } });
    });
    req.on("error", e => resolve({ statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }));
    req.write(payload);
    req.end();
  });
};

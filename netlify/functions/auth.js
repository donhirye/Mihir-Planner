const PASSWORD  = "133799";
const TOKEN     = "mp_auth_v1_witronix";
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {}
  }

  const password = body?.password;

  if (password === PASSWORD) {
    const expires = Date.now() + EXPIRY_MS;
    return res.status(200).json({ token: TOKEN, expires });
  }

  return res.status(401).json({ error: "Invalid password" });
};

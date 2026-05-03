const PASSWORD  = "133799";
const TOKEN     = "mp_auth_v1_witronix";
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { password } = body || {};

  if (password === PASSWORD) {
    const expires = Date.now() + EXPIRY_MS;
    return { statusCode: 200, headers, body: JSON.stringify({ token: TOKEN, expires }) };
  }

  return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid password" }) };
};

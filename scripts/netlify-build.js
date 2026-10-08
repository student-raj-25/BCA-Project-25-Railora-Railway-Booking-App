const fs = require("node:fs");
const path = require("node:path");

const apiBase = (process.env.RAILORA_API_BASE || "").trim().replace(/\/+$/, "");
if (process.env.NETLIFY === "true" && !apiBase) {
  throw new Error("Set the RAILORA_API_BASE environment variable to the deployed Render API origin.");
}

if (apiBase) {
  let parsed;
  try {
    parsed = new URL(apiBase);
  } catch {
    throw new Error("RAILORA_API_BASE must be a valid HTTPS origin.");
  }
  if (parsed.protocol !== "https:" || parsed.origin !== apiBase) {
    throw new Error("RAILORA_API_BASE must be an HTTPS origin without a path or trailing slash.");
  }
}

const configPath = path.join(__dirname, "..", "public", "js", "runtime-config.json");
fs.writeFileSync(configPath, `${JSON.stringify({ apiBase }, null, 2)}\n`);
console.log(`Netlify frontend configured for ${apiBase || "same-origin local development"}.`);

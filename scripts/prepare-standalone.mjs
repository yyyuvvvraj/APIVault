import { cpSync, existsSync, mkdirSync } from "node:fs";

const standalone = ".next/standalone";
if (!existsSync(`${standalone}/server.js`)) {
  throw new Error("Next.js standalone server was not generated at .next/standalone/server.js");
}

mkdirSync(`${standalone}/.next`, { recursive: true });
if (existsSync(".next/static")) {
  cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
}
if (existsSync("public")) {
  cpSync("public", `${standalone}/public`, { recursive: true });
}

console.log("Prepared Next.js standalone runtime assets.");

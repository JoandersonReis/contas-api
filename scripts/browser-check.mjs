// Optional UI smoke check using an existing Chromium with --remote-debugging-port=9222.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(new URL("../package.json", import.meta.url));
require("dotenv").config({
  path: new URL("../.env", import.meta.url).pathname,
  quiet: true,
});

const { db } = require("./dist/prisma/db.js");
let testEmail;
const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = pages.find((p) => p.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();

ws.addEventListener("message", (event) => {
  const m = JSON.parse(event.data);
  if (m.id) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(m.error) : p.resolve(m.result);
  }
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function until(expression) {
  for (let i = 0; i < 60; i++) {
    if (await evaluate(expression)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("UI timeout: " + expression);
}
const click = (label) =>
  evaluate(
    `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b)throw Error('button missing');b.click();})()`,
  );
async function fill(selector, value) {
  await evaluate(
    `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('input missing');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
}
async function checkThemes(screen) {
  for (const theme of ["light", "dark"]) {
    if (
      await evaluate(`document.documentElement.dataset.theme !== "${theme}"`)
    ) {
      await evaluate(`document.querySelector('.theme-toggle').click()`);
    }
    await until(`document.documentElement.dataset.theme === "${theme}"`);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(
      `/tmp/contas-${screen}-${theme}.png`,
      Buffer.from(screenshot.data, "base64"),
    );
    assert.ok(
      await evaluate(
        `document.documentElement.scrollWidth <= window.innerWidth`,
      ),
      `${screen} ${theme}: horizontal overflow`,
    );
    assert.equal(
      await evaluate(`getComputedStyle(document.documentElement).colorScheme`),
      theme,
    );
  }
}
try {
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: "http://localhost:5173" });
  await until(`document.body.innerText.includes('Que bom ter você aqui.')`);
  await checkThemes("login");
  await send("Page.reload");
  await until(`!!document.querySelector('.theme-toggle')`);
  assert.equal(
    await evaluate(`document.documentElement.dataset.theme`),
    "dark",
    "Theme survives reload",
  );
  await click("Criar conta");
  await until(`!!document.querySelector('input[name="name"]')`);
  const email = `browser-${Date.now()}@example.com`;
  testEmail = email;
  await fill('input[name="name"]', "Teste Interface");
  await fill('input[name="email"]', email);
  await fill('input[name="password"]', "Senha-interface-1234");
  await click("Criar minha conta");
  await until(`document.body.innerText.includes('Suas contas, em ordem.')`);
  assert.equal(
    await evaluate(`document.documentElement.dataset.theme`),
    "dark",
    "Theme survives login",
  );
  await checkThemes("dashboard-empty");
  await click("Nova pasta");
  await until(`!!document.querySelector('dialog[open]')`);
  await checkThemes("modal");
  await fill("dialog input", "Mercado");
  await fill('dialog input[type="number"]', "600");
  await click("Salvar");
  await until(`!!document.querySelector('.folder-card')`);
  await evaluate(`document.querySelector('.folder-card').click()`);
  await until(`document.body.innerText.includes("Novo lançamento")`);
  for (const amount of ["100", "200", "300"]) {
    await click("Novo lançamento");
    await until(`!!document.querySelector('dialog[open]')`);
    await fill("dialog input", "Compra de teste");
    await fill('dialog input[type="number"]', amount);
    await click("Salvar");
    await until(`!document.querySelector('dialog[open]')`);
  }
  await until(`document.querySelectorAll('tbody tr').length===3`);
  assert.ok(
    await evaluate(`document.body.innerText.includes('Valor atingido')`),
  );
  await send("Page.reload");
  await until(`document.body.innerText.includes('Mercado')`);
  await until(`document.querySelectorAll("tbody tr").length === 3`);
  assert.ok(
    await evaluate(`location.pathname.startsWith("/contas/")`),
    "Detail route survives reload",
  );
  await checkThemes("entries-desktop");
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(
    "/tmp/contas-desktop.png",
    Buffer.from(screenshot.data, "base64"),
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.ok(
    await evaluate(`document.documentElement.scrollWidth<=window.innerWidth`),
    "Mobile page overflow",
  );
  await checkThemes("entries-mobile");
  const mobile = await send("Page.captureScreenshot", { format: "png" });
  await writeFile("/tmp/contas-mobile.png", Buffer.from(mobile.data, "base64"));
  await evaluate(
    `document.querySelector('button[aria-label="Excluir pasta"]').click()`,
  );
  await click("Sim, excluir");
  await until(
    `document.body.innerText.includes('Vamos organizar sua primeira conta?')`,
  );
  await evaluate(`document.querySelector('button[aria-label="Sair"]').click()`);
  await until(`document.body.innerText.includes('Que bom ter você aqui.')`);
  console.log(
    JSON.stringify({
      ok: true,
      email,
      screenshots: ["/tmp/contas-desktop.png", "/tmp/contas-mobile.png"],
    }),
  );
} finally {
  ws.close();
  if (testEmail) await db.orm.public.User.where({ email: testEmail }).delete();
  await db.close();
}

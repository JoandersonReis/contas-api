import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../dist/prisma/db.js";
const base = process.env.TEST_API_URL || "http://127.0.0.1:3000/api";
const origin = process.env.WEB_ORIGIN || "http://localhost:5173";
function client() {
  let cookie = "";
  return async (path, method = "GET", body) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.headers.get("set-cookie"))
      cookie = res.headers.get("set-cookie").split(";")[0];
    return {
      status: res.status,
      body: await res.json(),
      cookie: res.headers.get("set-cookie"),
    };
  };
}
test("autenticação, Argon2d, isolamento, centavos e CRUD completo", async () => {
  const a = client(),
    b = client(),
    anonymous = client();
  const email = `test-${randomUUID()}@example.com`;
  const password = "Teste-seguro-12345";
  const ids = [];
  try {
    assert.equal((await anonymous("/folders")).status, 401);
    const register = await a("/auth/register", "POST", {
      name: "Teste A",
      email,
      password,
    });
    assert.equal(register.status, 201);
    ids.push(register.body.id);
    assert.ok(!("passwordHash" in register.body));
    assert.match(register.cookie, /HttpOnly/i);
    assert.match(
      register.cookie,
      process.env.NODE_ENV === "production"
        ? /SameSite=None/i
        : /SameSite=Lax/i,
    );
    const stored = await db.orm.public.User.where({ email }).first();
    assert.match(stored.passwordHash, /^\$argon2d\$/);
    assert.equal(
      (
        await anonymous("/auth/login", "POST", {
          email,
          password: "senha-incorreta",
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await anonymous("/auth/register", "POST", {
          name: "Duplicado",
          email,
          password,
        })
      ).status,
      409,
    );
    const userB = await b("/auth/register", "POST", {
      name: "Teste B",
      email: `b-${email}`,
      password,
    });
    assert.equal(userB.status, 201);
    ids.push(userB.body.id);
    assert.equal(
      (await a("/folders", "POST", { name: "Inválida", budgetCents: -1 }))
        .status,
      400,
    );
    const f = await a("/folders", "POST", {
      name: "Mercado",
      budgetCents: 60000,
    });
    assert.equal(f.status, 201);
    const id = f.body.id;
    assert.equal(
      (await b(`/folders/${id}`, "PUT", { name: "Invasão", budgetCents: 1 }))
        .status,
      404,
    );
    assert.equal(
      (
        await b(`/folders/${id}/entries`, "POST", {
          description: "Invasão",
          amountCents: 1,
          date: "2026-11-11",
        })
      ).status,
      404,
    );
    assert.equal((await b(`/folders/${id}`, "DELETE")).status, 404);
    assert.deepEqual((await b("/folders")).body, []);
    const entries = [];
    for (const amountCents of [10010, 20020, 29970]) {
      const e = await a(`/folders/${id}/entries`, "POST", {
        description: "Compra",
        amountCents,
        date: "2026-11-11",
      });
      assert.equal(e.status, 201);
      entries.push(e.body.id);
    }
    let list = (await a("/folders")).body;
    assert.equal(list[0].spentCents, 60000);
    assert.equal(list[0].entries.length, 3);
    assert.equal(
      (
        await a(`/folders/${id}/entries`, "POST", {
          description: "Inválida",
          amountCents: 1.5,
          date: "2026-11-11",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await a(`/folders/${id}/entries`, "POST", {
          description: "Inválida",
          amountCents: 10,
          date: "2026-02-30",
        })
      ).status,
      400,
    );
    assert.equal(
      (await b(`/folders/${id}/entries/${entries[0]}`, "DELETE")).status,
      404,
    );
    assert.equal(
      (
        await a(`/folders/${id}/entries/${entries[0]}`, "PUT", {
          description: "Corrigida",
          amountCents: 11010,
          date: "2026-11-10",
        })
      ).status,
      200,
    );
    assert.equal((await a("/folders")).body[0].spentCents, 61000);
    assert.equal(
      (await a(`/folders/${id}/entries/${entries[1]}`, "DELETE")).status,
      200,
    );
    assert.equal((await a("/folders")).body[0].spentCents, 40980);
    assert.equal(
      (
        await a(`/folders/${id}`, "PUT", {
          name: "Mercado mensal",
          budgetCents: 70000,
        })
      ).status,
      200,
    );
    assert.equal((await a(`/folders/${id}`, "DELETE")).status, 200);
    assert.deepEqual((await a("/folders")).body, []);
    assert.equal(
      await db.orm.public.Entry.where({ folderId: id }).first(),
      null,
    );
    const forbidden = await fetch(base + "/auth/login", {
      method: "POST",
      headers: {
        Origin: "https://other.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(forbidden.status, 403);
    await a("/auth/logout", "POST");
    assert.equal((await a("/auth/me")).status, 401);
    assert.equal(
      (await a("/auth/login", "POST", { email, password })).status,
      201,
    );
    assert.equal((await a("/auth/me")).body.email, email);
  } finally {
    for (const id of ids) await db.orm.public.User.where({ id }).delete();
    await db.close();
  }
});

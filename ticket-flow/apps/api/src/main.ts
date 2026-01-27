import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

// ----------------------
// Minimal JWT (HS256) without extra deps
// ----------------------
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@demo.local").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signHS256(data: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(data).digest());
}

function createToken(payload: Record<string, any>, expiresInSec = 60 * 60 * 24) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSec };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(fullPayload));
  const data = `${h}.${p}`;
  const sig = signHS256(data, JWT_SECRET);
  return `${data}.${sig}`;
}

function verifyToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const data = `${h}.${p}`;
  const expected = signHS256(data, JWT_SECRET);

  // constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  try {
    const payloadJson = Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8"
    );
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload?.exp === "number" && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(req: any) {
  const h = req.headers?.authorization;
  if (!h || typeof h !== "string") return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// ----------------------
// Auth guard for API
// ----------------------
app.addHook("preHandler", async (req, reply) => {
  // Public endpoints
  if (req.url.startsWith("/v1/health")) return;
  if (req.url.startsWith("/v1/auth/login")) return;

  const token = getBearerToken(req);
  if (!token) {
    reply.code(401).send({ error: "UNAUTHORIZED" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    reply.code(401).send({ error: "UNAUTHORIZED" });
    return;
  }

  // attach to request
  // @ts-ignore
  req.auth = payload;
});

// ---- tenant middleware ----
app.addHook("preHandler", async (req, reply) => {
  // do not require tenant for health (and keep login working even without header)
  if (req.url.startsWith("/v1/health")) return;

  const slugHeader = req.headers["x-tenant-slug"];
  const tenantSlug = (Array.isArray(slugHeader) ? slugHeader[0] : slugHeader) || "demo-org";

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    reply.code(401).send({ error: "TENANT_NOT_FOUND", tenantSlug });
    return;
  }

  // @ts-ignore
  req.tenantId = tenant.id;
});

// ---- routes ----
app.get("/v1/health", async () => ({ ok: true }));

// Minimal auth (MVP): one admin user from env vars
app.post("/v1/auth/login", async (req, reply) => {
  const body = (req.body || {}) as { email?: string; password?: string };
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  // Avoid user enumeration: same generic error
  if (!email || !password) {
    reply.code(400).send({ message: "Invalid credentials" });
    return;
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    reply.code(401).send({ message: "Invalid credentials" });
    return;
  }

  const token = createToken({ sub: email, role: "admin" });
  reply.send({ accessToken: token, user: { email, role: "admin" } });
});

app.get("/v1/dashboard/kpi", async (req: any) => {
  const tenantId = req.tenantId as string;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [eventsTotal, eventsActive, ordersToday, revenueTodayAgg, revenueTotalAgg, pendingOrders] =
    await Promise.all([
      prisma.event.count({ where: { tenantId } }),
      prisma.event.count({ where: { tenantId, status: "ACTIVE" } }),
      prisma.order.count({ where: { tenantId, createdAt: { gte: startOfToday } } }),
      prisma.order.aggregate({
        where: { tenantId, status: "PAID", createdAt: { gte: startOfToday } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { tenantId, status: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({ where: { tenantId, status: "PENDING" } }),
    ]);

  return {
    eventsTotal,
    eventsActive,
    ordersToday,
    revenueToday: revenueTodayAgg._sum.totalAmount ?? 0,
    revenueTotal: revenueTotalAgg._sum.totalAmount ?? 0,
    pendingOrders,
  };
});

app.get("/v1/bots", async (req: any) => {
  const tenantId = req.tenantId as string;
  return prisma.bot.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, username: true, slug: true, status: true, createdAt: true },
  });
});

app.post("/v1/bots", async (req: any, reply) => {
  const tenantId = req.tenantId as string;
  const body = req.body as { name: string; slug: string; username?: string; token: string };

  if (!body?.name || !body?.slug || !body?.token) {
    reply.code(400).send({ error: "VALIDATION_ERROR" });
    return;
  }

  // MVP: tokenEncrypted пока как есть (позже шифруем)
  const bot = await prisma.bot.create({
    data: {
      tenantId,
      name: body.name,
      slug: body.slug,
      username: body.username ?? null,
      status: "OFFLINE",
      tokenEncrypted: body.token,
    },
    select: { id: true, name: true, username: true, slug: true, status: true, createdAt: true },
  });

  return bot;
});

app.get("/v1/events", async (req: any) => {
  const tenantId = req.tenantId as string;
  return prisma.event.findMany({
    where: { tenantId },
    orderBy: { startsAt: "asc" },
    include: { ticketTypes: true },
  });
});

app.post("/v1/events", async (req: any, reply) => {
  const tenantId = req.tenantId as string;
  const body = req.body as {
    title: string;
    startsAt: string;
    venue?: string;
    botId?: string;
  };

  if (!body?.title || !body?.startsAt) {
    reply.code(400).send({ error: "VALIDATION_ERROR" });
    return;
  }

  return prisma.event.create({
    data: {
      tenantId,
      title: body.title,
      startsAt: new Date(body.startsAt),
      venue: body.venue ?? null,
      botId: body.botId ?? null,
      status: "DRAFT",
    },
  });
});

app.get("/v1/orders", async (req: any) => {
  const tenantId = req.tenantId as string;
  const { limit = "20", cursor } = (req.query ?? {}) as any;
  const take = Math.min(Number(limit) || 20, 50);

  const items = await prisma.order.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { event: true, items: { include: { ticketType: true } }, payment: true },
  });

  const nextCursor = items.length > take ? items[take].id : null;
  return { items: items.slice(0, take), nextCursor };
});

const port = Number(process.env.PORT || 8000);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
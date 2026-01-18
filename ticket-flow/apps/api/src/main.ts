import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

// ---- tenant middleware ----
app.addHook("preHandler", async (req, reply) => {
  // не трогаем health
  if (req.url.startsWith("/v1/health")) return;

  const slugHeader = req.headers["x-tenant-slug"];
  const tenantSlug = (Array.isArray(slugHeader) ? slugHeader[0] : slugHeader) || "demo-org";

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    reply.code(401).send({ error: "TENANT_NOT_FOUND", tenantSlug });
    return;
  }

  // @ts-ignore — лучше потом расширим типы Fastify Request
  req.tenantId = tenant.id;
});

// ---- routes ----
app.get("/v1/health", async () => ({ ok: true }));

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
      username: body.username,
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
      venue: body.venue,
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
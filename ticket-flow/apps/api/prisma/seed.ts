import {
  BotStatus,
  EventStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: { name: "Demo Organizer", slug: "demo-org" },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@ticket-flow.local" },
    update: {},
    create: { email: "demo@ticket-flow.local", name: "Demo User" },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { role: "OWNER" },
    create: { tenantId: tenant.id, userId: user.id, role: "OWNER" },
  });

  const bot = await prisma.bot.upsert({
    where: { slug: "demo-bot" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Demo Tickets Bot",
      username: "demo_tickets_bot",
      slug: "demo-bot",
      status: BotStatus.ONLINE,
      telegramBotId: "123456789",
      tokenEncrypted: "ENCRYPTED_DEMO_TOKEN",
    },
  });

  const event = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      botId: bot.id,
      title: "Demo Event",
      description: "Test event for dashboard",
      startsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      status: EventStatus.ACTIVE,
      venue: "Moscow",
      ticketTypes: {
        create: [
          {
            tenantId: tenant.id,
            name: "Standard",
            price: 150000,
            currency: "RUB",
            capacity: 200,
          },
          {
            tenantId: tenant.id,
            name: "VIP",
            price: 350000,
            currency: "RUB",
            capacity: 50,
          },
        ],
      },
    },
    include: { ticketTypes: true },
  });

  const paidOrder = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      eventId: event.id,
      status: OrderStatus.PAID,
      buyerTelegramId: "777001",
      buyerName: "Ivan",
      buyerUsername: "ivan",
      totalAmount: 150000,
      currency: "RUB",
      items: {
        create: [
          {
            ticketTypeId: event.ticketTypes[0].id,
            quantity: 1,
            unitPrice: 150000,
          },
        ],
      },
      payment: {
        create: {
          tenantId: tenant.id,
          provider: PaymentProvider.TELEGRAM,
          status: PaymentStatus.SUCCEEDED,
          amount: 150000,
          currency: "RUB",
          providerPaymentId: "tg_pay_1",
          raw: { demo: true },
        },
      },
    },
  });

  await prisma.order.create({
    data: {
      tenantId: tenant.id,
      eventId: event.id,
      status: OrderStatus.PENDING,
      buyerTelegramId: "777002",
      buyerName: "Petr",
      buyerUsername: "petr",
      totalAmount: 350000,
      currency: "RUB",
      items: {
        create: [
          {
            ticketTypeId: event.ticketTypes[1].id,
            quantity: 1,
            unitPrice: 350000,
          },
        ],
      },
    },
  });

  await prisma.payout.create({
    data: {
      tenantId: tenant.id,
      amount: 500000,
      currency: "RUB",
      status: "SENT",
    },
  });

  console.log("Seed done. Paid order:", paidOrder.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
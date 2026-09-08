import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { recordAudit } from "../audit/audit.service.js";
import { queueCommunication } from "../communications/communication.service.js";
import {
  createTicketSchema,
  replySchema,
  updateTicketSchema,
} from "./support.validation.js";

function actor(request: Request) {
  if (!request.user)
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  return request.user;
}

const include = {
  customer: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  product: { select: { id: true, name: true, sku: true } },
  replies: {
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

function serialize(
  ticket: {
    id: string;
    replies: Array<{
      id: string;
      internal: boolean;
      author: { id: string };
    }>;
  },
  admin: boolean,
) {
  const { id, replies, ...fields } = ticket;
  return {
    _id: id,
    ...fields,
    replies: replies
      .filter((reply) => admin || !reply.internal)
      .map(({ id: replyId, author, ...reply }) => ({
        _id: replyId,
        ...reply,
        author: { _id: author.id, ...author },
      })),
  };
}

export async function create(request: Request, response: Response) {
  const user = actor(request);
  const input = createTicketSchema.parse(request.body);
  if (
    input.orderId &&
    !(await prisma.order.findFirst({
      where: { id: input.orderId, userId: user.id },
    }))
  )
    throw new AppError(404, "ORDER_NOT_FOUND", "Linked order was not found");
  if (
    input.bookingId &&
    !(await prisma.serviceBooking.findFirst({
      where: { id: input.bookingId, userId: user.id },
    }))
  )
    throw new AppError(404, "BOOKING_NOT_FOUND", "Linked booking was not found");
  if (
    input.productId &&
    !(await prisma.product.findFirst({
      where: { id: input.productId, status: "active" },
    }))
  )
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Linked product was not found");
  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        ticketNumber: `SUP-${randomUUID().slice(0, 8).toUpperCase()}`,
        customerId: user.id,
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        orderId: input.orderId ?? null,
        bookingId: input.bookingId ?? null,
        productId: input.productId ?? null,
      },
      include,
    });
    await recordAudit(tx, {
      actorId: user.id,
      action: "support.created",
      resourceType: "support_ticket",
      resourceId: created.id,
      requestId: request.requestId,
    });
    return created;
  });
  response
    .status(201)
    .json({ success: true, data: { ticket: serialize(ticket, false) } });
}

export async function list(request: Request, response: Response) {
  const user = actor(request);
  const admin = user.role === "admin";
  const tickets = await prisma.supportTicket.findMany({
    where: admin ? {} : { customerId: user.id },
    include,
    orderBy: { updatedAt: "desc" },
  });
  response.json({
    success: true,
    data: { tickets: tickets.map((ticket) => serialize(ticket, admin)) },
  });
}

export async function detail(request: Request, response: Response) {
  const user = actor(request);
  const admin = user.role === "admin";
  const id = objectIdSchema.parse(request.params.ticketId);
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, ...(admin ? {} : { customerId: user.id }) },
    include,
  });
  if (!ticket)
    throw new AppError(404, "TICKET_NOT_FOUND", "Support ticket was not found");
  response.json({
    success: true,
    data: { ticket: serialize(ticket, admin) },
  });
}

export async function update(request: Request, response: Response) {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.ticketId);
  const input = updateTicketSchema.parse(request.body);
  if (
    input.assigneeId &&
    !(await prisma.user.findFirst({
      where: { id: input.assigneeId, role: { in: ["admin", "technician"] }, isActive: true },
    }))
  )
    throw new AppError(422, "INVALID_ASSIGNEE", "Assignee must be active staff");
  const existing = await prisma.supportTicket.findUnique({ where: { id } });
  if (!existing)
    throw new AppError(404, "TICKET_NOT_FOUND", "Support ticket was not found");
  const now = new Date();
  const ticket = await prisma.$transaction(async (tx) => {
    const updated = await tx.supportTicket.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.assigneeId
          ? { assigneeId: input.assigneeId }
          : input.assigneeId === null
            ? { assigneeId: null }
            : {}),
        ...(input.status === "resolved" ? { resolvedAt: now } : {}),
        ...(input.status === "closed" ? { closedAt: now } : {}),
      },
      include,
    });
    await recordAudit(tx, {
      actorId: user.id,
      action: "support.updated",
      resourceType: "support_ticket",
      resourceId: id,
      requestId: request.requestId,
      metadata: input,
    });
    await queueCommunication(tx, {
      recipientId: existing.customerId,
      type: "support.updated",
      title: `Support ticket ${existing.ticketNumber} updated`,
      message: `Your ticket is now ${updated.status.replace("_", " ")}.`,
      resourceType: "support_ticket",
      resourceId: id,
    });
    return updated;
  });
  response.json({
    success: true,
    data: { ticket: serialize(ticket, true) },
  });
}

export async function reply(request: Request, response: Response) {
  const user = actor(request);
  const admin = user.role === "admin";
  const id = objectIdSchema.parse(request.params.ticketId);
  const input = replySchema.parse(request.body);
  if (!admin && input.internal)
    throw new AppError(403, "FORBIDDEN", "Customers cannot create internal notes");
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, ...(admin ? {} : { customerId: user.id }) },
  });
  if (!ticket)
    throw new AppError(404, "TICKET_NOT_FOUND", "Support ticket was not found");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.supportReply.create({
      data: { ticketId: id, authorId: user.id, ...input },
    });
    await tx.supportTicket.update({
      where: { id },
      data: {
        ...(admin && !ticket.firstResponseAt && !input.internal
          ? { firstResponseAt: new Date() }
          : {}),
        ...(!admin && ticket.status === "waiting_customer"
          ? { status: "in_progress" }
          : {}),
      },
    });
    await recordAudit(tx, {
      actorId: user.id,
      action: input.internal ? "support.internal_note" : "support.replied",
      resourceType: "support_ticket",
      resourceId: id,
      requestId: request.requestId,
    });
    if (admin && !input.internal)
      await queueCommunication(tx, {
        recipientId: ticket.customerId,
        type: "support.reply",
        title: `New reply on ${ticket.ticketNumber}`,
        message: "The support team replied to your ticket.",
        resourceType: "support_ticket",
        resourceId: id,
      });
    return tx.supportTicket.findUniqueOrThrow({ where: { id }, include });
  });
  response
    .status(201)
    .json({ success: true, data: { ticket: serialize(updated, admin) } });
}
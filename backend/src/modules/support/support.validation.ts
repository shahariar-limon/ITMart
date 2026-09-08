import { z } from "zod";
import { objectIdSchema } from "../../shared/object-id.js";
export const createTicketSchema = z.object({ subject: z.string().trim().min(5).max(160), description: z.string().trim().min(10).max(5000), priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"), orderId: objectIdSchema.optional(), bookingId: objectIdSchema.optional(), productId: objectIdSchema.optional() }).strict();
export const updateTicketSchema = z.object({ status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]).optional(), priority: z.enum(["low", "normal", "high", "urgent"]).optional(), assigneeId: objectIdSchema.nullable().optional() }).strict().refine(value => Object.keys(value).length > 0, "At least one change is required");
export const replySchema = z.object({ message: z.string().trim().min(2).max(5000), internal: z.boolean().default(false) }).strict();

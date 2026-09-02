import { z } from "zod";

// Historical export name retained while routes move from ObjectIds to UUIDs.
export const objectIdSchema = z.string().uuid("Invalid identifier");

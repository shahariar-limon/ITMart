import type { UserRole } from "../modules/users/user.model.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: { id: string; role: UserRole };
    }
  }
}

export {};

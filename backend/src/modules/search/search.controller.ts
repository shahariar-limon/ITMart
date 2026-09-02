import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { ProductModel } from "../products/product.model.js";
export async function assist(
  request: Request,
  response: Response,
): Promise<void> {
  const { query } = z
    .object({ query: z.string().trim().min(2).max(200) })
    .strict()
    .parse(request.body);
  let terms = query;
  let source: "ai" | "fallback" = "fallback";
  if (env.AI_API_URL && env.AI_API_KEY) {
    try {
      const result = await fetch(env.AI_API_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.AI_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(3000),
      });
      if (result.ok) {
        const data = z
          .object({ terms: z.string().min(1).max(200) })
          .parse(await result.json());
        terms = data.terms;
        source = "ai";
      }
    } catch {
      source = "fallback";
    }
  }
  const products = await ProductModel.find({
    status: "active",
    $text: { $search: terms },
  })
    .limit(20)
    .lean();
  response.json({ success: true, data: { products, source } });
}

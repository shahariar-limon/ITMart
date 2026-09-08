export const PRICE_MODELS = ["fixed", "starting_at", "quote"] as const;
export type PriceModel = (typeof PRICE_MODELS)[number];
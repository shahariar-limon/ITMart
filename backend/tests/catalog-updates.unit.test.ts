import { describe, expect, it } from "vitest";
import {
  createProductSchema,
  updateProductSchema,
} from "../src/modules/products/product.validation.js";
import { updateBundleSchema } from "../src/modules/bundles/bundle.validation.js";
import { updateCategorySchema } from "../src/modules/categories/category.validation.js";
import { updateServiceSchema } from "../src/modules/services/service.validation.js";

describe("Admin partial edits preserve omitted fields", () => {
  it("does not clear product specifications, tags, discount, or warranty", () => {
    expect(
      updateProductSchema.parse({ name: "New product name", price: 15000 }),
    ).toEqual({ name: "New product name", price: 15000 });
  });
  it("does not erase bundle components when editing its price", () => {
    expect(updateBundleSchema.parse({ bundlePrice: 20000 })).toEqual({
      bundlePrice: 20000,
    });
  });
  it("does not reactivate a service while editing its duration", () => {
    expect(updateServiceSchema.parse({ durationMinutes: 90 })).toEqual({
      durationMinutes: 90,
    });
  });
  it("does not clear category descriptions when editing its name", () => {
    expect(updateCategorySchema.parse({ name: "New category" })).toEqual({
      name: "New category",
    });
  });
  it("still accepts explicitly clearing optional product fields", () => {
    expect(
      updateProductSchema.parse({
        tags: [],
        imageUrls: [],
        specs: {},
        warranty: "",
        discount: 0,
      }),
    ).toEqual({
      tags: [],
      imageUrls: [],
      specs: {},
      warranty: "",
      discount: 0,
    });
  });
  it("rejects empty changes in each editor", () => {
    for (const schema of [
      updateProductSchema,
      updateBundleSchema,
      updateServiceSchema,
      updateCategorySchema,
    ]) {
      expect(schema.safeParse({}).success).toBe(false);
    }
  });
  it("keeps creation defaults", () => {
    expect(
      createProductSchema.parse({
        name: "Laptop",
        sku: "LAP",
        brand: "Nova",
        categoryId: "10000000-0000-4000-8000-000000000001",
        description: "Demo laptop",
        price: 10000,
        stock: 5,
      }),
    ).toMatchObject({
      tags: [],
      imageUrls: [],
      discount: 0,
      specs: {},
      warranty: "",
      status: "active",
    });
  });
});

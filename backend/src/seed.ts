import bcrypt from "bcryptjs";
import { prisma } from "./config/prisma.js";

const demoPassword = "Demo@12345";

async function seed() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const users = [
    { name: "Ayesha Rahman", email: "customer@itmart.test", role: "customer" as const },
    { name: "Tanvir Hasan", email: "technician@itmart.test", role: "technician" as const },
    { name: "ITMart Admin", email: "admin@itmart.test", role: "admin" as const },
  ];
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, isActive: true, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  const categoryData = [
    ["Laptops", "laptops", "Portable computers for work, study, and creative projects."],
    ["Desktops", "desktops", "Powerful desktop systems and professional workstations."],
    ["Networking", "networking", "Routers, switches, and equipment for reliable connectivity."],
    ["Displays", "displays", "Monitors for productivity, design, and gaming."],
    ["Accessories", "accessories", "Keyboards, mice, storage, power, and everyday essentials."],
  ] as const;
  const categories = new Map<string, string>();
  for (const [name, slug, description] of categoryData) {
    const category = await prisma.category.upsert({ where: { slug }, update: { name, description, isActive: true }, create: { name, slug, description } });
    categories.set(slug, category.id);
  }

  const products = [
    { sku: "LAP-PRO-14", name: "ProBook Studio 14", category: "laptops", brand: "Nova", price: 124900, discount: 7000, stock: 18, tags: ["business", "portable"], specs: { CPU: "Core i7", RAM: "16 GB", Storage: "512 GB SSD" }, warranty: "2 years", imageUrls: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "LAP-AIR-13", name: "FeatherBook Air 13", category: "laptops", brand: "Nova", price: 89900, discount: 4000, stock: 24, tags: ["student", "lightweight"], specs: { CPU: "Core i5", RAM: "16 GB", Weight: "1.2 kg" }, warranty: "1 year", imageUrls: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "LAP-GAME-16", name: "Forge Gaming 16", category: "laptops", brand: "Vertex", price: 169900, discount: 10000, stock: 9, tags: ["gaming", "performance"], specs: { CPU: "Ryzen 9", GPU: "RTX 4070", RAM: "32 GB" }, warranty: "2 years", imageUrls: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "DSK-CREATOR-X", name: "Creator Station X", category: "desktops", brand: "Vertex", price: 215000, discount: 15000, stock: 6, tags: ["workstation", "creator"], specs: { CPU: "Ryzen 9", GPU: "RTX 4080", RAM: "64 GB" }, warranty: "3 years", imageUrls: ["https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "DSK-OFFICE-MINI", name: "Office Mini PC", category: "desktops", brand: "CoreBox", price: 54900, discount: 0, stock: 31, tags: ["office", "compact"], specs: { CPU: "Core i5", RAM: "16 GB", Storage: "512 GB SSD" }, warranty: "2 years", imageUrls: ["https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "NET-MESH-6", name: "Mesh Router AX6000", category: "networking", brand: "Linkora", price: 32900, discount: 2500, stock: 22, tags: ["wifi-6", "mesh"], specs: { Standard: "Wi-Fi 6", Bands: "Tri-band", Coverage: "5500 sq ft" }, warranty: "2 years", imageUrls: ["https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "NET-SWITCH-24", name: "Managed Switch 24 Pro", category: "networking", brand: "Linkora", price: 24500, discount: 1000, stock: 15, tags: ["business", "gigabit"], specs: { Ports: "24 Gigabit", Uplink: "4 SFP", Managed: "Yes" }, warranty: "3 years", imageUrls: ["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "MON-UW-34", name: "UltraWide Pro 34", category: "displays", brand: "PixelWorks", price: 69900, discount: 5000, stock: 12, tags: ["ultrawide", "creator"], specs: { Resolution: "3440×1440", Refresh: "165 Hz", Panel: "IPS" }, warranty: "3 years", imageUrls: ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "MON-4K-27", name: "Vision 4K 27", category: "displays", brand: "PixelWorks", price: 48500, discount: 3000, stock: 20, tags: ["4k", "productivity"], specs: { Resolution: "3840×2160", Panel: "IPS", Color: "100% sRGB" }, warranty: "3 years", imageUrls: ["https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "ACC-KEY-MECH", name: "TypePro Mechanical Keyboard", category: "accessories", brand: "Keysmith", price: 8900, discount: 800, stock: 45, tags: ["keyboard", "mechanical"], specs: { Layout: "75%", Switch: "Tactile", Connection: "Tri-mode" }, warranty: "1 year", imageUrls: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "ACC-MOUSE-PRO", name: "Flow Wireless Mouse", category: "accessories", brand: "Keysmith", price: 5900, discount: 500, stock: 63, tags: ["mouse", "wireless"], specs: { Sensor: "26000 DPI", Weight: "72 g", Battery: "90 hours" }, warranty: "1 year", imageUrls: ["https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=80"] },
    { sku: "ACC-SSD-2TB", name: "Pocket SSD 2TB", category: "accessories", brand: "DataCore", price: 17900, discount: 1200, stock: 28, tags: ["storage", "portable"], specs: { Capacity: "2 TB", Speed: "1050 MB/s", Interface: "USB-C" }, warranty: "3 years", imageUrls: ["https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1200&q=80"] },
  ];
  const productIds = new Map<string, string>();
  for (const item of products) {
    const { category, ...data } = item;
    const product = await prisma.product.upsert({ where: { sku: data.sku }, update: { ...data, categoryId: categories.get(category)!, description: `${data.name} is selected by ITMart for dependable everyday performance.`, status: "active" }, create: { ...data, categoryId: categories.get(category)!, description: `${data.name} is selected by ITMart for dependable everyday performance.` } });
    productIds.set(item.sku, product.id);
  }

  const services = [
    ["Laptop & Desktop Diagnostic", "Repair", "Complete hardware and software health check with a clear repair recommendation.", "fixed", 2500, 60],
    ["Operating System Setup", "Setup", "Secure OS installation, drivers, updates, and essential software configuration.", "fixed", 3500, 90],
    ["Home Wi-Fi Optimization", "Networking", "Router placement, security, channel tuning, and whole-home coverage review.", "fixed", 4500, 120],
    ["Office Network Installation", "Networking", "Structured small-office network planning, installation, and testing.", "starting_at", 15000, 240],
    ["Data Recovery Assessment", "Recovery", "Non-destructive inspection and recovery feasibility report.", "starting_at", 5000, 120],
    ["Cybersecurity Health Check", "Security", "Account, endpoint, router, backup, and access-control review.", "fixed", 8500, 180],
    ["Business IT Consultation", "Consulting", "Technology roadmap and purchasing guidance for growing teams.", "quote", 0, 90],
    ["Annual Device Maintenance", "Maintenance", "Cleaning, performance tuning, updates, and preventive checks.", "fixed", 4000, 90],
  ] as const;
  const serviceIds = new Map<string, string>();
  for (const [name, category, description, priceModel, basePrice, durationMinutes] of services) {
    const existing = await prisma.service.findFirst({ where: { name } });
    const service = existing ? await prisma.service.update({ where: { id: existing.id }, data: { category, description, priceModel, basePrice, durationMinutes, isActive: true } }) : await prisma.service.create({ data: { name, category, description, priceModel, basePrice, durationMinutes } });
    serviceIds.set(name, service.id);
  }

  const bundles = [
    { name: "Remote Work Ready", description: "A capable laptop, wireless mouse, and complete operating-system setup.", price: 126900, products: [["LAP-PRO-14", 1], ["ACC-MOUSE-PRO", 1]], services: ["Operating System Setup"] },
    { name: "Creator Desk Upgrade", description: "An ultrawide display, mechanical keyboard, and portable high-speed storage.", price: 89900, products: [["MON-UW-34", 1], ["ACC-KEY-MECH", 1], ["ACC-SSD-2TB", 1]], services: [] },
    { name: "Connected Home", description: "Whole-home mesh Wi-Fi hardware plus professional optimization.", price: 34900, products: [["NET-MESH-6", 1]], services: ["Home Wi-Fi Optimization"] },
    { name: "Small Office Launch", description: "Compact office computers, managed networking, and installation support.", price: 178000, products: [["DSK-OFFICE-MINI", 3], ["NET-SWITCH-24", 1]], services: ["Office Network Installation"] },
    { name: "Device Care Pack", description: "Diagnostics and annual preventive maintenance for a dependable computer.", price: 5500, products: [], services: ["Laptop & Desktop Diagnostic", "Annual Device Maintenance"] },
  ];
  for (const data of bundles) {
    const existing = await prisma.bundle.findFirst({ where: { name: data.name } });
    if (existing) await prisma.$transaction([prisma.bundleProduct.deleteMany({ where: { bundleId: existing.id } }), prisma.bundleService.deleteMany({ where: { bundleId: existing.id } }), prisma.bundle.update({ where: { id: existing.id }, data: { description: data.description, bundlePrice: data.price, isActive: true, productItems: { create: data.products.map(([sku, quantity]) => ({ productId: productIds.get(String(sku))!, quantity: Number(quantity) })) }, services: { create: data.services.map((name) => ({ serviceId: serviceIds.get(name)! })) } } })]);
    else await prisma.bundle.create({ data: { name: data.name, description: data.description, bundlePrice: data.price, productItems: { create: data.products.map(([sku, quantity]) => ({ productId: productIds.get(String(sku))!, quantity: Number(quantity) })) }, services: { create: data.services.map((name) => ({ serviceId: serviceIds.get(name)! })) } } });
  }
  console.log(`Seeded ${users.length} users, ${categoryData.length} categories, ${products.length} products, ${services.length} services, and ${bundles.length} bundles.`);
}

seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());

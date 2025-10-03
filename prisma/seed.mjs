import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Vêtements" },
    { name: "Chaussures" },
    { name: "Accessoires" },
  ];

  // Ensure categories (find or create)
  const catMap = {};
  for (const c of categories) {
    const existing = await prisma.category.findFirst({
      where: { name: c.name },
    });
    const created = existing ?? (await prisma.category.create({ data: c }));
    catMap[c.name] = created.id;
  }

  const products = [
    {
      sku: "P-TSHIRT-001",
      name: "T-Shirt Optima",
      price: 4990.0,
      unitCost: 3000.0,
      categoryName: "Vêtements",
    },
    {
      sku: "P-SNEAK-001",
      name: "Sneakers Delta",
      price: 24990.0,
      unitCost: 15000.0,
      categoryName: "Chaussures",
    },
    {
      sku: "P-CAP-001",
      name: "Casquette Noir",
      price: 9990.0,
      unitCost: 5000.0,
      categoryName: "Accessoires",
    },
    {
      sku: "P-TSHIRT-002",
      name: "T-Shirt Blanc",
      price: 5990.0,
      unitCost: 3200.0,
      categoryName: "Vêtements",
    },
    {
      sku: "P-BAG-001",
      name: "Sac à dos City",
      price: 19990.0,
      unitCost: 12000.0,
      categoryName: "Accessoires",
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        sku: p.sku,
        name: p.name,
        price: p.price,
        unitCost: p.unitCost ?? 0,
        categoryId: catMap[p.categoryName] ?? null,
      },
      update: {
        name: p.name,
        price: p.price,
        unitCost: p.unitCost ?? 0,
        categoryId: catMap[p.categoryName] ?? null,
      },
    });
  }

  console.log("Seed completed ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

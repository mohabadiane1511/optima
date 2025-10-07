#!/usr/bin/env node

const BASE = "http://localhost:3000";
const TENANT_HOST = process.env.TENANT_HOST || "synaptik.localhost:3000";
const TENANT_SLUG = process.env.TENANT_SLUG || "synaptik";

const c = {
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

async function jfetch(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: {
      "Content-Type": "application/json",
      Host: TENANT_HOST,
      "x-tenant-slug": TENANT_SLUG,
      ...(opts.headers || {}),
    },
    ...opts,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
}

async function run() {
  console.log(c.blue("🚀 Test API Produits & Catégories (tenant)"));

  // 1) Créer catégorie
  const catName = `Cat-${Date.now()}`;
  const { res: r1, data: d1 } = await jfetch("/api/tenant/categories", {
    method: "POST",
    body: JSON.stringify({ name: catName }),
  });
  if (!r1.ok) throw new Error("Create category failed: " + JSON.stringify(d1));
  console.log(c.green("✓ Catégorie créée:"), d1);

  // 2) Créer produit
  const sku =
    "PRD-" +
    Math.floor(Math.random() * 1e6)
      .toString()
      .padStart(6, "0");
  const body = {
    sku,
    name: `Produit ${sku}`,
    salePrice: 1500,
    purchasePrice: 1200,
    unit: "unité",
    active: true,
    categoryId: d1.id,
  };
  const { res: r2, data: d2 } = await jfetch("/api/tenant/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r2.ok) throw new Error("Create product failed: " + JSON.stringify(d2));
  console.log(c.green("✓ Produit créé:"), { id: d2.id, sku: d2.sku });

  // 3) Vérifier via GET
  const { res: r3, data: d3 } = await jfetch("/api/tenant/products");
  if (!r3.ok) throw new Error("List products failed: " + JSON.stringify(d3));
  const found = (d3 || []).find((p) => p.sku === sku);
  if (!found) throw new Error("Produit non trouvé dans la liste");
  console.log(c.green("✓ Produit trouvé dans la liste"));

  console.log(c.blue("✅ Tous les tests produits ont réussi"));
}

run().catch((e) => {
  console.error(c.red("✗ Échec tests produits:"), e.message);
  process.exit(1);
});

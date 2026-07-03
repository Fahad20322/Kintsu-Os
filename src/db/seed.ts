/**
 * Demo/reference data seeder. Attaches sample categories, tiers, tailors,
 * a vendor, and a couple of products to the FIRST store found in the
 * database. It does not create user accounts — sign up through the app
 * first (that flow creates the store, its default warehouse, and your
 * Owner account via Better Auth), then run `npm run db:seed`.
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  brand,
  category,
  collection,
  inventory,
  loyaltyTier,
  product,
  productVariant,
  store,
  tailor,
  vendor,
  warehouse,
} from "./schema";
import { generateBarcodeValue, generateSku } from "@/lib/barcode";

async function main() {
  const [firstStore] = await db.select().from(store).limit(1);
  if (!firstStore) {
    console.log(
      "No store found. Sign up through the app first (creates your store + Owner account), then re-run `npm run db:seed`."
    );
    return;
  }

  const [defaultWarehouse] = await db
    .select()
    .from(warehouse)
    .where(eq(warehouse.storeId, firstStore.id))
    .limit(1);

  console.log(`Seeding demo data into store "${firstStore.name}"...`);

  async function findOrCreateCategory(name: string) {
    const [existing] = await db.select().from(category).where(eq(category.name, name));
    if (existing) return existing;
    const [created] = await db.insert(category).values({ name }).returning();
    return created;
  }

  async function findOrCreateBrand(name: string) {
    const [existing] = await db.select().from(brand).where(eq(brand.name, name));
    if (existing) return existing;
    const [created] = await db.insert(brand).values({ name }).returning();
    return created;
  }

  const lehenga = await findOrCreateCategory("Lehenga");
  const saree = await findOrCreateCategory("Saree");
  await findOrCreateCategory("Sherwani");
  await findOrCreateCategory("Suit");

  const houseBrand = await findOrCreateBrand("Kintsu House Label");

  const [bridalCollection] = await db
    .insert(collection)
    .values({ name: "Bridal Collection 2026", season: "Wedding", year: "2026" })
    .returning();

  await db
    .insert(loyaltyTier)
    .values([
      { name: "Silver", minSpend: "0", pointsMultiplier: "1.00", benefits: "Standard earning rate" },
      { name: "Gold", minSpend: "50000", pointsMultiplier: "1.25", benefits: "25% bonus points, priority alterations" },
      { name: "Platinum", minSpend: "150000", pointsMultiplier: "1.5", benefits: "50% bonus points, free alterations, private trial slots" },
    ])
    .onConflictDoNothing();

  const [existingTailor] = await db.select().from(tailor).where(eq(tailor.storeId, firstStore.id));
  if (!existingTailor) {
    await db.insert(tailor).values([
      { storeId: firstStore.id, name: "Ramesh Kumar", mobile: "9876500001", specialization: "Bridal embroidery" },
      { storeId: firstStore.id, name: "Suresh Tailors", mobile: "9876500002", specialization: "Alterations & fitting" },
    ]);
  }

  const [existingVendor] = await db.select().from(vendor).where(eq(vendor.mobile, "9876500010"));
  if (!existingVendor) {
    await db.insert(vendor).values({
      name: "Surat Textiles Pvt Ltd",
      contactPerson: "Amit Shah",
      mobile: "9876500010",
      email: "sales@surattextiles.example",
      gstin: "24AAAAA0000A1Z5",
      openingBalance: "0",
    });
  }

  if (defaultWarehouse && lehenga && saree && houseBrand) {
    const demoProducts = [
      {
        articleCode: "LEH-DEMO-01",
        name: "Emerald Green Bridal Lehenga",
        categoryId: lehenga.id,
        brandId: houseBrand.id,
        collectionId: bridalCollection?.id,
        gender: "WOMEN" as const,
        fabric: "Silk",
        pattern: "Zari embroidery",
        occasion: "Bridal",
        mrp: "65000",
        sellingPrice: "58500",
        purchaseCost: "32000",
        gstRate: "5",
        variants: [
          { size: "S", color: "Emerald Green", qty: 3 },
          { size: "M", color: "Emerald Green", qty: 5 },
          { size: "L", color: "Emerald Green", qty: 2 },
        ],
      },
      {
        articleCode: "SAR-DEMO-01",
        name: "Banarasi Silk Saree",
        categoryId: saree.id,
        brandId: houseBrand.id,
        gender: "WOMEN" as const,
        fabric: "Banarasi Silk",
        pattern: "Woven brocade",
        occasion: "Festive",
        mrp: "18000",
        sellingPrice: "15999",
        purchaseCost: "8500",
        gstRate: "5",
        variants: [
          { size: "Free Size", color: "Maroon", qty: 8 },
          { size: "Free Size", color: "Royal Blue", qty: 4 },
        ],
      },
    ];

    for (const p of demoProducts) {
      const [createdProduct] = await db
        .insert(product)
        .values({
          articleCode: p.articleCode,
          name: p.name,
          categoryId: p.categoryId,
          brandId: p.brandId,
          collectionId: p.collectionId,
          gender: p.gender,
          fabric: p.fabric,
          pattern: p.pattern,
          occasion: p.occasion,
          mrp: p.mrp,
          sellingPrice: p.sellingPrice,
          purchaseCost: p.purchaseCost,
          gstRate: p.gstRate,
        })
        .onConflictDoNothing()
        .returning();

      if (!createdProduct) continue;

      for (const v of p.variants) {
        const [createdVariant] = await db
          .insert(productVariant)
          .values({
            productId: createdProduct.id,
            size: v.size,
            color: v.color,
            sku: generateSku(p.articleCode, v.size, v.color),
            barcode: generateBarcodeValue(),
          })
          .returning();

        await db.insert(inventory).values({
          variantId: createdVariant.id,
          storeId: firstStore.id,
          warehouseId: defaultWarehouse.id,
          quantity: v.qty,
        });
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

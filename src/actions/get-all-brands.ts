"use server";
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { brand } from "@/db/schema";

export async function getAllBrands() {
  const brands = await db.select().from(brand).orderBy(desc(brand.createdAt));
  // Mapeia para o formato que o Header espera
  return brands.map((b) => ({
    label: b.name,
    href: `/marcas/${b.name.toLowerCase().trim().replace(/\s+/g, "-")}`,
  }));
}

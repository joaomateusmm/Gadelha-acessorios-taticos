"use server";
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { brand } from "@/db/schema";

export async function getAllBrands() {
  try {
    const brands = await db.select().from(brand).orderBy(desc(brand.createdAt));
    return brands.map((b) => ({
      label: b.name,
      href: `/marcas/${b.name.toLowerCase().trim().replace(/\s+/g, "-")}`,
    }));
  } catch (error) {
    console.error("Erro ao buscar marcas:", error);
    return [];
  }
}

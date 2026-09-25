"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { category, product } from "@/db/schema";

export interface JsonProductItem {
  codigo?: string;
  nome: string;
  descricao?: string;
  preco: number; // Ex: 70 significa R$ 70.00
  categoria?: string;
  tamanhos?: string[];
  cores?: string[];
  estoque?: number;
  observacao?: string | null;
  ativo?: boolean;
}

function generateProductCode(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${slug}--${randomNum}`;
}

export async function importProductsFromJson(items: JsonProductItem[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, message: "O arquivo JSON está vazio ou é inválido." };
  }

  try {
    // 1. Carregar categorias existentes no banco para mapeamento automático por nome/slug
    const existingCategories = await db.select().from(category);
    const categoryMap = new Map<string, string>(); // Key: lowercase name/slug -> Value: category id

    existingCategories.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    });

    let importedCount = 0;

    for (const item of items) {
      if (!item.nome || typeof item.preco !== "number") {
        continue;
      }

      // Se informou categoria no JSON e ela não existir no banco, cria automaticamente
      const catName = item.categoria ? item.categoria.trim() : null;
      let catId: string | null = null;

      if (catName) {
        const catKey = catName.toLowerCase();
        if (categoryMap.has(catKey)) {
          catId = categoryMap.get(catKey)!;
        } else {
          // Criar nova categoria se não existir
          const [newCat] = await db
            .insert(category)
            .values({
              name: catName.charAt(0).toUpperCase() + catName.slice(1),
            })
            .returning({ id: category.id });

          catId = newCat.id;
          categoryMap.set(catKey, catId);
        }
      }

      const priceInCents = Math.round(item.preco * 100);
      const code = item.codigo && item.codigo.trim().length > 0
        ? item.codigo.trim()
        : generateProductCode(item.nome);
      const status = item.ativo === false ? "inactive" : "active";
      const stock = typeof item.estoque === "number" ? item.estoque : 0;
      const categoriesArray = catId ? [catId] : [];

      await db.insert(product).values({
        name: item.nome,
        code,
        description: item.descricao || null,
        price: priceInCents,
        categories: categoriesArray,
        tamanhos: item.tamanhos || [],
        cores: item.cores || [],
        stock,
        isStockUnlimited: false,
        status,
        paymentLink: "#",
        deliveryMode: "email",
        paymentMethods: ["Pix", "Cartão de Crédito", "Cartão de Débito", "Boleto"],
      });

      importedCount++;
    }

    revalidatePath("/admin/produtos");
    revalidatePath("/");

    return {
      success: true,
      message: `${importedCount} produtos importados com sucesso!`,
    };
  } catch (error) {
    console.error("Erro na importação JSON:", error);
    return {
      success: false,
      message: "Erro ao importar produtos do arquivo JSON.",
    };
  }
}

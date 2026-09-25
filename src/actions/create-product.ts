"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { product } from "@/db/schema";

// --- SCHEMA ---
// Nota: O schema valida 'number'. Se o front manda centavos (inteiro), passa aqui.
const productSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  code: z.string().optional(),
  description: z.string().optional(),
  paymentLink: z.string().url("URL inválida").optional().or(z.literal("")),
  downloadUrl: z.string().optional().or(z.literal("")),
  price: z.number().min(0),
  discountPrice: z.number().optional(),
  images: z.array(z.string()).optional(),
  categories: z.array(z.string()).default([]),
  tamanhos: z.array(z.string()).default([]),
  cores: z.array(z.string()).default([]),
  brandId: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "draft"]).default("active"),
  deliveryMode: z.enum(["email", "none"]).default("email"),
  paymentMethods: z.array(z.string()).default([]),
  stock: z.number().default(0),
  isStockUnlimited: z.boolean().default(false),
});

export type ProductServerPayload = z.infer<typeof productSchema>;

export async function updateProduct(id: string, rawData: ProductServerPayload) {
  // 1. Validar
  const result = productSchema.safeParse(rawData);

  if (!result.success) {
    console.error("Erro de validação (Update):", result.error.flatten());
    return { success: false, message: "Dados inválidos para atualização." };
  }

  const data = result.data;
  const finalPaymentLink =
    data.paymentLink && data.paymentLink.length > 0 ? data.paymentLink : "#";

  try {
    await db
      .update(product)
      .set({
        name: data.name,
        description: data.description,
        // CORREÇÃO: Removemos a multiplicação por 100.
        // Assumimos que o formulário (ProductForm) já envia em centavos (inteiro).
        // Se o form manda 1000 (R$10), salvamos 1000.
        price: data.price,
        discountPrice: data.discountPrice, // Mesma coisa para o desconto
        images: data.images,
        categories: data.categories,
        tamanhos: data.tamanhos,
        cores: data.cores,
        brandId: data.brandId && data.brandId.length > 0 ? data.brandId : null,
        stock: data.stock,
        isStockUnlimited: data.isStockUnlimited,
        deliveryMode: data.deliveryMode,
        paymentMethods: data.paymentMethods,
        paymentLink: finalPaymentLink,
        downloadUrl: data.downloadUrl,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(product.id, id));

    revalidatePath("/admin/produtos");
    revalidatePath(`/produto/${id}`);

    return { success: true, message: "Produto atualizado com sucesso!" };
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return { success: false, message: "Erro ao atualizar produto." };
  }
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

export async function createProduct(rawData: ProductServerPayload) {
  // 1. Validar
  const result = productSchema.safeParse(rawData);

  if (!result.success) {
    console.error("Erro de validação:", result.error.flatten());
    throw new Error(
      `Dados inválidos: ${JSON.stringify(result.error.flatten().fieldErrors)}`,
    );
  }

  const data = result.data;
  const finalPaymentLink =
    data.paymentLink && data.paymentLink.length > 0 ? data.paymentLink : "#";

  try {
    const generatedCode = data.code || generateProductCode(data.name);

    // 2. Inserir no Banco
    await db.insert(product).values({
      name: data.name,
      code: generatedCode,
      description: data.description,
      paymentLink: finalPaymentLink,
      downloadUrl: data.downloadUrl,
      // CORREÇÃO: Removemos a multiplicação por 100 aqui também para manter consistência.
      // O formulário ProductForm JÁ faz Math.round(data.price * 100) antes de chamar esta action.
      price: data.price,
      discountPrice: data.discountPrice,
      images: data.images || [],
      categories: data.categories,
      tamanhos: data.tamanhos,
      cores: data.cores,
      brandId: data.brandId && data.brandId.length > 0 ? data.brandId : null,
      status: data.status,
      deliveryMode: data.deliveryMode,
      paymentMethods: data.paymentMethods,
      stock: data.stock,
      isStockUnlimited: data.isStockUnlimited,
    });

    revalidatePath("/admin/produtos");
    revalidatePath("/");
  } catch (error) {
    console.error("Erro ao criar produto no banco:", error);
    throw new Error("Erro interno ao salvar produto.");
  }

  redirect("/admin/produtos");
}

// ... Resto das funções (deleteProduct, archiveProduct, deleteProducts) mantém igual ...
// =========================================================
// --- TENTATIVA DE DELEÇÃO (HARD DELETE) ---
// =========================================================

export async function deleteProduct(id: string) {
  console.log(`[DELETE TRY] ID: ${id}`);

  try {
    await db.delete(product).where(eq(product.id, id));

    revalidatePath("/admin/produtos");
    revalidatePath("/");

    return {
      success: true,
      code: "DELETED",
      message: "Produto excluído com sucesso.",
    };
  } catch (err) {
    const error = err as { code?: string; message: string };
    console.error("[DELETE ERROR]", error);

    if (error.code === "23503" || error.message.includes("delete from")) {
      return {
        success: false,
        code: "CONSTRAINT_VIOLATION",
        message: "Produto em uso.",
      };
    }

    return {
      success: false,
      code: "ERROR",
      message: `Erro do Banco: ${error.message}`,
    };
  }
}

export async function archiveProduct(id: string) {
  console.log(`[ARCHIVE] Inativando ID: ${id}`);
  try {
    await db
      .update(product)
      .set({ status: "inactive" })
      .where(eq(product.id, id));

    revalidatePath("/admin/produtos");
    revalidatePath("/");

    return { success: true, message: "Produto inativado com sucesso." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao inativar produto." };
  }
}

export async function deleteProducts(ids: string[]) {
  try {
    await db.delete(product).where(inArray(product.id, ids));
    revalidatePath("/admin/produtos");
    revalidatePath("/");
    return { success: true, message: "Produtos excluídos." };
  } catch {
    return {
      success: false,
      message: "Erro ao excluir (provavelmente produtos em uso).",
    };
  }
}

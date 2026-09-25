"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { Resend } from "resend";

import { db } from "@/db";
import {
  coupon,
  order,
  orderItem,
  product,
  user,
} from "@/db/schema";
import { auth } from "@/lib/auth";

const resend = new Resend(process.env.RESEND_API_KEY);

type CartItemInput = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

// --- FUNÇÃO AUXILIAR PARA CALCULAR TUDO COM CUPOM ---
async function calculateOrderTotals(
  items: CartItemInput[],
  couponCode?: string,
) {
  const subtotal = Math.round(
    items.reduce((acc, item) => acc + item.price * item.quantity, 0),
  );

  let discountAmount = 0;
  let activeCouponId: string | null = null;

  if (couponCode) {
    const foundCoupon = await db.query.coupon.findFirst({
      where: eq(coupon.code, couponCode.toUpperCase()),
    });

    if (
      foundCoupon &&
      foundCoupon.isActive &&
      (!foundCoupon.expiresAt || new Date() < foundCoupon.expiresAt) &&
      (foundCoupon.maxUses === null ||
        foundCoupon.usedCount < foundCoupon.maxUses) &&
      (foundCoupon.minValue === null || subtotal >= foundCoupon.minValue)
    ) {
      if (foundCoupon.type === "percent") {
        discountAmount = Math.round(subtotal * (foundCoupon.value / 100));
      } else {
        discountAmount = foundCoupon.value;
      }

      if (discountAmount > subtotal) discountAmount = subtotal;

      activeCouponId = foundCoupon.id;
    }
  }

  const finalTotal = subtotal - discountAmount;

  return { subtotal, discountAmount, finalTotal, activeCouponId };
}

// --- FUNÇÃO DE EMAIL ---
async function sendProductEmail(
  to: string,
  name: string,
  items: CartItemInput[],
) {
  const productsWithLinks = await Promise.all(
    items.map(async (item) => {
      const prod = await db.query.product.findFirst({
        where: eq(product.id, item.id),
        columns: { downloadUrl: true },
      });
      return {
        name: item.name,
        url: prod?.downloadUrl || "#",
      };
    }),
  );

  const productsHtml = productsWithLinks
    .map(
      (p) => `
      <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ddd;">
        <h3 style="margin: 0 0 5px; color: #333;">${p.name}</h3>
        ${
          p.url && p.url !== "#"
            ? `<a href="${p.url}" style="background-color: #D00000; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-family: sans-serif;">Baixar Arquivo</a>`
            : `<p style="color: #666; font-size: 14px;">Acesse sua conta para visualizar.</p>`
        }
      </div>
    `,
    )
    .join("");

  const emailHtml = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #D00000;">Seu pedido está aqui! 🚀</h1>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Aqui estão os arquivos dos seus produtos:</p>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
          ${productsHtml}
        </div>
        <p>Você também pode acessar seus arquivos a qualquer momento na sua área de membros.</p>
      </div>
    `;

  await resend.emails.send({
    from: "SubMind Store <onboarding@resend.dev>",
    to: [to],
    subject: "Seu pedido está aqui! 📦",
    html: emailHtml,
  });
}

// ==============================================================================
// 1. CHECKOUT PAGO
// ==============================================================================
export async function createCheckoutSession(
  items: CartItemInput[],
  guestInfo?: { email: string; name: string },
  couponCode?: string,
) {
  // --- VERIFICAÇÃO DE ESTOQUE (PRÉ-VENDA) ---
  // Impede que o usuário crie um link de pagamento se não houver estoque
  for (const item of items) {
    const productInDb = await db.query.product.findFirst({
      where: eq(product.id, item.id),
    });

    if (!productInDb) {
      throw new Error(`Produto ${item.name} não encontrado.`);
    }

    // Se estoque limitado E quantidade pedida > estoque disponível
    if (
      !productInDb.isStockUnlimited &&
      productInDb.stock !== null &&
      productInDb.stock < item.quantity
    ) {
      throw new Error(
        `O produto "${productInDb.name}" esgotou ou não tem a quantidade solicitada (Restam: ${productInDb.stock}).`,
      );
    }
  }
  // ------------------------------------------

  const session = await auth.api.getSession({ headers: await headers() });

  let userId: string;
  let userEmail: string;
  let userName: string;

  if (session) {
    userId = session.user.id;
    userEmail = session.user.email;
    userName = session.user.name;
  } else {
    if (!guestInfo?.email) throw new Error("E-mail obrigatório.");
    const email = guestInfo.email.toLowerCase();
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (existingUser) {
      userId = existingUser.id;
      userEmail = existingUser.email;
      userName = existingUser.name;
    } else {
      const now = new Date();
      const [newUser] = await db
        .insert(user)
        .values({
          id: crypto.randomUUID(),
          name: guestInfo.name || "Visitante",
          email: email,
          image: "",
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
          role: "user",
        })
        .returning();
      userId = newUser.id;
      userEmail = newUser.email;
      userName = newUser.name;
    }
  }

  const { finalTotal, discountAmount, activeCouponId } =
    await calculateOrderTotals(items, couponCode);

  if (finalTotal === 0) {
    return await createFreeOrder(items, guestInfo, couponCode);
  }

  if (finalTotal < 100) {
    throw new Error(
      "O valor final da compra deve ser de no mínimo R$ 1,00 para processamento bancário.",
    );
  }

  const [newOrder] = await db
    .insert(order)
    .values({
      userId: userId,
      amount: finalTotal,
      discountAmount: discountAmount,
      couponId: activeCouponId,
      status: "pending",
    })
    .returning();

  await db.insert(orderItem).values(
    items.map((item) => ({
      orderId: newOrder.id,
      productId: item.id,
      productName: item.name,
      price: Math.round(item.price),
      quantity: item.quantity,
      image: item.image,
    })),
  );



  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const apiItems = items.map((item) => ({
    quantity: item.quantity,
    price: Math.round(
      item.price * (finalTotal / (finalTotal + discountAmount)),
    ),
    description: item.name.substring(0, 250),
  }));

  const itemsSum = apiItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const diff = finalTotal - itemsSum;

  if (diff !== 0 && apiItems.length > 0) {
    apiItems[0].price += diff;
  }

  const infinitePayPayload = {
    handle: process.env.INFINITEPAY_HANDLE,
    order_nsu: newOrder.id,
    amount: finalTotal,
    redirect_url: `${baseUrl}/checkout/success`,
    webhook_url: `${baseUrl}/api/webhooks/infinitepay`,
    items: apiItems,
    customer: { name: userName, email: userEmail },
    metadata: {
      source: "submind",
      user_id: userId,
    },
  };

  try {
    const res = await fetch(
      "https://api.infinitepay.io/invoices/public/checkout/links",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(infinitePayPayload),
      },
    );
    const data = await res.json();

    if (!res.ok) {
      console.error("Erro InfinitePay:", JSON.stringify(data, null, 2));
      throw new Error(data.message || "Erro ao gerar link de pagamento");
    }

    await db
      .update(order)
      .set({ infinitePayUrl: data.url })
      .where(eq(order.id, newOrder.id));

    if (activeCouponId) {
      await db
        .update(coupon)
        .set({
          usedCount: sql`${coupon.usedCount} + 1`,
        })
        .where(eq(coupon.id, activeCouponId));
    }

    return { url: data.url };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Erro checkout");
  }
}

// ==============================================================================
// 2. CHECKOUT GRATUITO
// ==============================================================================
export async function createFreeOrder(
  items: CartItemInput[],
  guestInfo?: { email: string; name: string },
  couponCode?: string,
) {
  // --- VERIFICAÇÃO DE ESTOQUE (PRÉ-VENDA - GRATUITO) ---
  for (const item of items) {
    const productInDb = await db.query.product.findFirst({
      where: eq(product.id, item.id),
    });

    if (!productInDb) {
      throw new Error(`Produto ${item.name} não encontrado.`);
    }

    if (
      !productInDb.isStockUnlimited &&
      productInDb.stock !== null &&
      productInDb.stock < item.quantity
    ) {
      throw new Error(
        `O produto "${productInDb.name}" esgotou (Restam: ${productInDb.stock}).`,
      );
    }
  }
  // ----------------------------------------------------

  const session = await auth.api.getSession({ headers: await headers() });

  let userId: string;
  let userEmail: string;
  let userName: string;

  if (session) {
    userId = session.user.id;
    userEmail = session.user.email;
    userName = session.user.name;
  } else {
    if (!guestInfo?.email) throw new Error("E-mail obrigatório.");
    const email = guestInfo.email.toLowerCase();
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (existingUser) {
      userId = existingUser.id;
      userEmail = existingUser.email;
      userName = existingUser.name;
    } else {
      const now = new Date();
      const [newUser] = await db
        .insert(user)
        .values({
          id: crypto.randomUUID(),
          name: guestInfo.name || "Visitante",
          email: email,
          image: "",
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
          role: "user",
        })
        .returning();
      userId = newUser.id;
      userEmail = newUser.email;
      userName = newUser.name;
    }
  }

  const { finalTotal, discountAmount, activeCouponId } =
    await calculateOrderTotals(items, couponCode);

  if (finalTotal > 0) {
    throw new Error("O valor final não é gratuito. Use o checkout pago.");
  }

  const [newOrder] = await db
    .insert(order)
    .values({
      userId: userId,
      amount: 0,
      discountAmount: discountAmount,
      couponId: activeCouponId,
      status: "completed",
    })
    .returning();

  await db.insert(orderItem).values(
    items.map((item) => ({
      orderId: newOrder.id,
      productId: item.id,
      productName: item.name,
      price: 0,
      quantity: item.quantity,
      image: item.image,
    })),
  );

  // --- ATUALIZAÇÃO DE ESTOQUE (GRATUITO - SÍNCRONO) ---
  for (const item of items) {
    await db
      .update(product)
      .set({ sales: sql`${product.sales} + ${item.quantity}` })
      .where(eq(product.id, item.id));

    // Atualiza estoque APENAS se não for ilimitado
    await db
      .update(product)
      .set({ stock: sql`${product.stock} - ${item.quantity}` })
      .where(and(eq(product.id, item.id), eq(product.isStockUnlimited, false)));
  }
  // ----------------------------------------------------

  if (activeCouponId) {
    await db
      .update(coupon)
      .set({
        usedCount: sql`${coupon.usedCount} + 1`,
      })
      .where(eq(coupon.id, activeCouponId));
  }

  try {
    await sendProductEmail(userEmail, userName, items);
  } catch (e) {
    console.error(e);
  }

  return { success: true, orderId: newOrder.id };
}

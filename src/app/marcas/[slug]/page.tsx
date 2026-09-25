import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { db } from "@/db";
import { brand, product } from "@/db/schema";

interface BrandPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;

  const allBrands = await db.select().from(brand);

  const currentBrand = allBrands.find(
    (b) => b.name.toLowerCase().trim().replace(/\s+/g, "-") === slug,
  );

  if (!currentBrand) {
    notFound();
  }

  const brandProducts = await db
    .select()
    .from(product)
    .where(eq(product.brandId, currentBrand.id));

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pt-32 pb-16 md:px-8">
        <div className="mb-8">
          <h1 className="font-clash-display text-3xl font-bold md:text-4xl">
            {currentBrand.name}
          </h1>
          <p className="mt-2 text-neutral-400">
            Confira todos os produtos da marca {currentBrand.name}.
          </p>
        </div>

        {brandProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 text-center">
            <p className="text-lg text-neutral-400">
              Nenhum produto encontrado para esta marca no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {brandProducts.map((prod) => (
              <ProductCard key={prod.id} data={prod} categoryName={currentBrand.name} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

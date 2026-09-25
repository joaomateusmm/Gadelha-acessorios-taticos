"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function AddProductButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    // 1. Previne cliques múltiplos se já estiver carregando
    if (isLoading) return;

    setIsLoading(true);
    router.push("/admin/produtos/new");
  };

  return (
    <Button
      onClick={handleClick}
      className={`flex items-center gap-2 border border-white/10 bg-white/5 text-white hover:bg-white/10 ${
        // 3. Adicionamos estilo visual de "desabilitado" manualmente
        isLoading ? "cursor-not-allowed opacity-70" : ""
      }`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Plus /> Adicionar Produto
        </div>
      )}
    </Button>
  );
}

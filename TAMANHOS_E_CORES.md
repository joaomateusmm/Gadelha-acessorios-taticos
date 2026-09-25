# Guia de Implementação: Tamanhos e Cores em Produtos

Este documento explica a arquitetura e a lógica utilizada para gerenciar **Tamanhos** (tanto letras quanto numéricos) e **Cores** no cadastro de produtos.

---

## 1. Banco de Dados (Drizzle ORM + PostgreSQL)

As colunas `tamanhos` e `cores` são armazenadas no banco PostgreSQL como colunas `jsonb` de arrays de strings (`string[]`).

**`lib/db/schema.ts`**:

```typescript
import { pgTable, text, jsonb } from "drizzle-orm/pg-core";

export const produtos = pgTable("produtos", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  tamanhos: jsonb("tamanhos").$type<string[]>().default([]).notNull(),
  cores: jsonb("cores").$type<string[]>().default([]).notNull(),
  // ...outros campos
});
```

---

## 2. Tipagem TypeScript

**`lib/types.ts`**:

```typescript
export type Tamanho =
  | "PP"
  | "P"
  | "M"
  | "G"
  | "GG"
  | "XG"
  | "XXG"
  | "36"
  | "38"
  | "40"
  | "42"
  | "44"
  | "46"
  | "48"
  | "50"
  | "52"
  | "54";

export interface Produto {
  id: string;
  nome: string;
  tamanhos: Tamanho[];
  cores: string[];
}
```

---

## 3. Lógica do Formulário (`app/admin/criar-produto/page.tsx`)

### Listas Padrão Pré-definidas

```typescript
const TAMANHOS_ROUPAS: Tamanho[] = ["PP", "P", "M", "G", "GG", "XG", "XXG"];
const TAMANHOS_NUMERICOS: Tamanho[] = [
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
  "50",
  "52",
  "54",
];
const TODOS_TAMANHOS = [...TAMANHOS_ROUPAS, ...TAMANHOS_NUMERICOS];

const CORES_PADRAO = [
  "Preto",
  "Branco",
  "Cinza",
  "Verde Militar",
  "Bege",
  "Marrom",
  "Azul Marinho",
  "Caqui",
];
```

### Estrutura do Estado no React

```typescript
const [form, setForm] = useState({
  nome: "",
  tamanhos: [] as string[],
  cores: [] as string[],
});
const [corCustom, setCorCustom] = useState("");
const [sizeCustom, setSizeCustom] = useState("");
```

### Funções de Manipulação (Toggle e Custom)

```typescript
// Alternar seleção de tamanho (Adiciona se não existir, remove se existir)
const toggleTamanho = (t: string) => {
  setForm((prev) => ({
    ...prev,
    tamanhos: prev.tamanhos.includes(t)
      ? prev.tamanhos.filter((x) => x !== t)
      : [...prev.tamanhos, t],
  }));
};

// Alternar seleção de cor
const toggleCor = (c: string) => {
  setForm((prev) => ({
    ...prev,
    cores: prev.cores.includes(c)
      ? prev.cores.filter((x) => x !== c)
      : [...prev.cores, c],
  }));
};

// Adicionar tamanho personalizado
const adicionarTamanhoCustom = () => {
  const t = sizeCustom.trim();
  if (!t || form.tamanhos.includes(t)) return;
  setForm((prev) => ({ ...prev, tamanhos: [...prev.tamanhos, t] }));
  setSizeCustom("");
};

// Adicionar cor personalizada
const adicionarCorCustom = () => {
  const c = corCustom.trim();
  if (!c || form.cores.includes(c)) return;
  setForm((prev) => ({ ...prev, cores: [...prev.cores, c] }));
  setCorCustom("");
};

// Remover cor personalizada ou selecionada
const removerCor = (c: string) => {
  setForm((prev) => ({ ...prev, cores: prev.cores.filter((x) => x !== c) }));
};
```

---

## 4. Componente Visual (UI)

- **Botões Toggle**: Exibe as opções pré-definidas em uma grade/flexbox. O botão fica destacado quando o item está no array (`form.tamanhos.includes(t)`).
- **Input Personalizado**: Um campo de texto com botão "Add" que permite inserir qualquer valor customizado (ex: tamanhos como "Único", "G1" ou cores como "Camo Woodland").

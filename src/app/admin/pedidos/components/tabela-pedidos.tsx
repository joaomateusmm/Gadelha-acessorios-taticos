"use client";

import {
  Building,
  Check,
  Pencil,
  Phone,
  Search,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  alternarItemSeparadoAction,
  alternarStatusPacoteAction,
  concluirPedidoSistemaAction,
  excluirPedidoSistemaAction,
  PedidoSistema,
  reverterPedidoSistemaAction,
  StatusPacote,
} from "@/actions/pedidos-sistema";
import { brl } from "@/lib/format";

export function TabelaPedidosSistema({
  initialPedidos,
}: {
  initialPedidos: PedidoSistema[];
}) {
  const [pedidos, setPedidos] = useState<PedidoSistema[]>(initialPedidos);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "Devendo" | "Entregue"
  >("todos");
  const [ordemData, setOrdemData] = useState<"recentes" | "antigos">(
    "recentes",
  );
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [excluindoEmMassa, setExcluindoEmMassa] = useState(false);

  const handleToggleStatusPacote = async (
    pedidoId: string,
    currentStatus: StatusPacote,
  ) => {
    const nextStatus: StatusPacote =
      currentStatus === "Criado" ? "Não criado" : "Criado";

    setPedidos((prev) =>
      prev.map((p) => {
        if (p.id !== pedidoId) return p;
        return {
          ...p,
          statusPacote: nextStatus,
        };
      }),
    );

    const res = await alternarStatusPacoteAction(pedidoId, nextStatus);
    if (!res.success) {
      toast.error("Erro ao atualizar status do pacote.");
    }
  };

  const handleToggleItem = async (
    pedidoId: string,
    itemId: string,
    currentSeparado: boolean,
  ) => {
    const nextVal = !currentSeparado;

    setPedidos((prev) =>
      prev.map((p) => {
        if (p.id !== pedidoId) return p;
        return {
          ...p,
          itens: p.itens.map((it) =>
            it.id === itemId ? { ...it, separado: nextVal } : it,
          ),
        };
      }),
    );

    const res = await alternarItemSeparadoAction(itemId, nextVal);
    if (!res.success) {
      toast.error("Erro ao atualizar item.");
    }
  };

  const handleConcluir = async (pedidoId: string) => {
    setPedidos((prev) =>
      prev.map((p) => {
        if (p.id !== pedidoId) return p;
        return {
          ...p,
          statusPedido: "Entregue",
          statusPacote: "Criado",
          itens: p.itens.map((it) => ({ ...it, separado: true })),
        };
      }),
    );

    const res = await concluirPedidoSistemaAction(pedidoId);
    if (res.success) {
      toast.success("Pedido concluído com sucesso!");
    } else {
      toast.error("Erro ao concluir pedido.");
    }
  };

  const handleReverter = async (pedidoId: string) => {
    setPedidos((prev) =>
      prev.map((p) => {
        if (p.id !== pedidoId) return p;
        return {
          ...p,
          statusPedido: "Devendo",
        };
      }),
    );

    const res = await reverterPedidoSistemaAction(pedidoId);
    if (res.success) {
      toast.success("Pedido revertido para Devendo.");
    } else {
      toast.error("Erro ao reverter pedido.");
    }
  };

  const handleExcluir = async (pedidoId: string, codigo: string) => {
    const confirmado = confirm(
      `Tem certeza que deseja excluir o pedido ${codigo}? Essa ação não pode ser desfeita.`,
    );
    if (!confirmado) return;

    setExcluindoId(pedidoId);
    try {
      setPedidos((prev) => prev.filter((p) => p.id !== pedidoId));
      setSelecionados((prev) => prev.filter((id) => id !== pedidoId));
      const res = await excluirPedidoSistemaAction(pedidoId);
      if (res.success) {
        toast.success("Pedido excluído.");
      } else {
        toast.error("Erro ao excluir pedido.");
      }
    } finally {
      setExcluindoId(null);
    }
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    const matchBusca =
      p.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      p.unidade.toLowerCase().includes(busca.toLowerCase());
    const matchStatus =
      filtroStatus === "todos" || p.statusPedido === filtroStatus;
    return matchBusca && matchStatus;
  });

  const todosSelecionados =
    pedidosFiltrados.length > 0 &&
    pedidosFiltrados.every((p) => selecionados.includes(p.id));

  const handleSelectAll = () => {
    if (todosSelecionados) {
      setSelecionados([]);
    } else {
      setSelecionados(pedidosFiltrados.map((p) => p.id));
    }
  };

  const handleToggleSelect = (pedidoId: string) => {
    setSelecionados((prev) =>
      prev.includes(pedidoId)
        ? prev.filter((id) => id !== pedidoId)
        : [...prev, pedidoId],
    );
  };

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0) return;
    const confirmado = confirm(
      `Tem certeza que deseja excluir os ${selecionados.length} pedidos selecionados? Essa ação não pode ser desfeita.`,
    );
    if (!confirmado) return;

    setExcluindoEmMassa(true);
    try {
      const idsParaExcluir = [...selecionados];
      setPedidos((prev) => prev.filter((p) => !idsParaExcluir.includes(p.id)));
      setSelecionados([]);

      await Promise.all(
        idsParaExcluir.map((id) => excluirPedidoSistemaAction(id)),
      );
      toast.success(`${idsParaExcluir.length} pedidos excluídos com sucesso.`);
    } catch {
      toast.error("Erro ao excluir alguns pedidos.");
    } finally {
      setExcluindoEmMassa(false);
    }
  };

  // Agrupamento dos pedidos por data (dataPedido) e ordenação por horário
  const pedidosAgrupadosPorData = pedidosFiltrados.reduce<
    Record<string, PedidoSistema[]>
  >((acc, pedido) => {
    const data = pedido.dataPedido || "Sem Data";
    if (!acc[data]) {
      acc[data] = [];
    }
    acc[data].push(pedido);
    return acc;
  }, {});

  // Ordena os pedidos de cada dia pelo horário
  Object.keys(pedidosAgrupadosPorData).forEach((data) => {
    pedidosAgrupadosPorData[data].sort((a, b) => {
      const horaA = a.horarioRegistrado || "00:00";
      const horaB = b.horarioRegistrado || "00:00";
      return ordemData === "recentes"
        ? horaB.localeCompare(horaA)
        : horaA.localeCompare(horaB);
    });
  });

  // Ordenação das datas (formato DD/MM/AAAA)
  const datasOrdenadas = Object.keys(pedidosAgrupadosPorData).sort((a, b) => {
    if (a === "Sem Data") return 1;
    if (b === "Sem Data") return -1;
    const [diaA, mesA, anoA] = a.split("/").map(Number);
    const [diaB, mesB, anoB] = b.split("/").map(Number);
    const dateA = new Date(anoA, mesA - 1, diaA).getTime();
    const dateB = new Date(anoB, mesB - 1, diaB).getTime();
    return ordemData === "recentes" ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="mx-auto pt-5 pb-10">
      {/* Header da Página */}
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        {/* Busca e Seleção Geral */}
        <div className="flex w-full items-center gap-3 md:w-auto">
          <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-neutral-400 select-none hover:text-white">
            <input
              type="checkbox"
              checked={todosSelecionados}
              onChange={handleSelectAll}
              className="h-5 w-5 cursor-pointer rounded border-neutral-700 bg-neutral-900 focus:ring-0"
            />
            <span className="text-sm text-white">Selecionar todos</span>
          </label>

          {selecionados.length > 0 && (
            <button
              onClick={handleExcluirSelecionados}
              disabled={excluindoEmMassa}
              className="flex cursor-pointer items-center space-x-1 border border-red-800 bg-red-900/40 px-3 py-2 font-mono text-xs font-bold text-red-400 uppercase transition-colors hover:bg-red-900/70 hover:text-white disabled:opacity-50"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              <span>
                {excluindoEmMassa
                  ? "Excluindo..."
                  : `Excluir (${selecionados.length})`}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          {/* Filtros por Data */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={() => setOrdemData("recentes")}
              className={`border px-3 py-1.5 uppercase transition-all ${
                ordemData === "recentes"
                  ? "border-neutral-600 bg-neutral-700 font-bold text-white"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-white"
              }`}
            >
              MAIS RECENTES
            </button>
            <button
              onClick={() => setOrdemData("antigos")}
              className={`border px-3 py-1.5 uppercase transition-all ${
                ordemData === "antigos"
                  ? "border-white bg-white font-bold text-black"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-white"
              }`}
            >
              MAIS ANTIGOS
            </button>
          </div>

          <span className="text-neutral-500">|</span>

          {/* Filtros por Status */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            {(["todos", "Devendo", "Entregue"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`border px-3 py-1.5 uppercase transition-all ${
                  filtroStatus === status
                    ? "border-neutral-600 bg-neutral-700 font-bold text-white"
                    : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-white"
                }`}
              >
                {status === "todos" ? "TODOS OS PEDIDOS" : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative my-10 w-full">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, código ou unidade..."
          className="w-full border border-neutral-800 bg-neutral-900 px-3.5 py-3 pl-9 font-mono text-xs text-white focus:outline-none"
        />
        <Search className="absolute top-3 left-3 h-4 w-4 text-neutral-500" />
      </div>

      {/* Lista de Pedidos Agrupados por Data */}
      {datasOrdenadas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center font-mono text-sm text-neutral-500">
          Nenhum pedido encontrado.
        </div>
      ) : (
        <div className="space-y-10">
          {datasOrdenadas.map((data) => (
            <div key={data} className="space-y-6">
              {/* Separador por Dia */}
              <div className="mt-20 flex items-center gap-4 font-mono text-xs text-neutral-400">
                <span className="text-sm font-bold whitespace-nowrap text-white">
                  {data}
                </span>
                <div className="h-[1px] w-full bg-neutral-800" />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {pedidosAgrupadosPorData[data].map((pedido) => {
                  const totalItens = pedido.itens.length;
                  const itensSeparados = pedido.itens.filter(
                    (i) => i.separado,
                  ).length;
                  const totalValor = pedido.itens.reduce(
                    (acc, item) => acc + item.precoUnitario * item.quantidade,
                    0,
                  );
                  const isChecked = selecionados.includes(pedido.id);

                  return (
                    <div
                      key={pedido.id}
                      className={`space-y-4 rounded-xl border p-5 transition-colors ${
                        isChecked
                          ? "border-neutral-700 bg-neutral-900/40"
                          : "border-neutral-800 bg-neutral-950"
                      }`}
                    >
                      {/* Header do Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 font-mono text-xs">
                        <div className="flex items-center space-x-3">
                          <div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(pedido.id)}
                              className="h-4 w-4 cursor-pointer rounded border-neutral-700 bg-neutral-900 text-white focus:ring-0"
                            />
                          </div>
                          <span className="text-sm font-bold text-white">
                            {pedido.codigo}
                          </span>
                          <span className="border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-neutral-300">
                            {pedido.corporacao}
                          </span>
                          <span className="text-neutral-500">
                            {pedido.dataPedido} às {pedido.horarioRegistrado}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleStatusPacote(
                                pedido.id,
                                pedido.statusPacote,
                              )
                            }
                            className={`cursor-pointer px-2 py-0.5 text-[10px] font-bold uppercase transition-all hover:opacity-80 ${
                              pedido.statusPacote === "Criado"
                                ? "border border-emerald-500/40 bg-emerald-600/20 text-emerald-400"
                                : "border border-neutral-700 bg-neutral-900 text-neutral-400"
                            }`}
                          >
                            Pacote: {pedido.statusPacote || "Não criado"}
                          </button>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                              pedido.statusPagamento === "Pago"
                                ? "border border-emerald-500/40 bg-emerald-600/20 text-emerald-400"
                                : "border border-amber-500/40 bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {pedido.statusPagamento || "Não Pago"}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                              pedido.statusPedido === "Entregue"
                                ? "border border-emerald-500/40 bg-emerald-600/20 text-emerald-400"
                                : "border border-amber-500/40 bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {pedido.statusPedido}
                          </span>
                          <span className="ml-2 text-sm font-bold text-white">
                            {brl(totalValor)}
                          </span>
                        </div>
                      </div>

                      {/* Dados do Agente */}
                      <div className="flex items-center gap-6 rounded-lg border border-neutral-900 bg-neutral-900/60 p-3 font-mono text-xs text-neutral-300 sm:grid-cols-3">
                        <div className="flex items-center space-x-2">
                          <User className="h-3.5 w-3.5 text-neutral-500" />
                          <span className="font-bold text-white">
                            {pedido.cliente ? (
                              pedido.cliente
                            ) : (
                              <span className="font-normal text-neutral-500 italic">
                                vazio
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-neutral-500">|</span>
                        <div className="flex items-center space-x-2">
                          <Building className="h-3.5 w-3.5 text-neutral-500" />
                          {pedido.unidade ? (
                            <span>{pedido.unidade}</span>
                          ) : (
                            <span className="text-neutral-500 italic">
                              vazio
                            </span>
                          )}
                        </div>
                        <span className="text-neutral-500">|</span>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3.5 w-3.5 text-neutral-500" />
                          {pedido.contato ? (
                            <span>{pedido.contato}</span>
                          ) : (
                            <span className="text-neutral-500 italic">
                              vazio
                            </span>
                          )}
                        </div>
                        {pedido.observacao && (
                          <>
                            <span className="text-neutral-500">|</span>
                            <div>
                              <span className="font-semibold text-neutral-400">
                                obs:{" "}
                              </span>
                              <span className="text-neutral-300">
                                {pedido.observacao}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Lista de Itens com Checkbox de Separação */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between font-mono text-[11px] text-neutral-400">
                          <span>ITENS DO PEDIDO:</span>
                          <span>
                            SEPARADOS: [{itensSeparados}/{totalItens}]
                          </span>
                        </div>

                        <ul className="space-y-1.5 font-mono text-xs">
                          {pedido.itens.map((item) => (
                            <li
                              key={item.id}
                              onClick={() =>
                                handleToggleItem(
                                  pedido.id,
                                  item.id!,
                                  !!item.separado,
                                )
                              }
                              className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-colors ${
                                item.separado
                                  ? "border-neutral-800 bg-neutral-900/40 text-neutral-500 line-through"
                                  : "border-neutral-800 bg-neutral-900 text-white hover:border-neutral-700"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={!!item.separado}
                                  onChange={() => {}}
                                  className="h-4 w-4 cursor-pointer rounded border-neutral-700 bg-neutral-950 text-white focus:ring-0"
                                />
                                <span>
                                  {item.quantidade}x {item.nome} —{" "}
                                  {item.tamanho} ({item.cor})
                                </span>
                              </div>
                              <span className="font-bold tabular-nums">
                                {brl(item.precoUnitario * item.quantidade)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Ações Rápidas */}
                      <div className="flex items-center justify-between pt-2 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/pedidos/novo?id=${pedido.id}`}
                            className="flex cursor-pointer items-center space-x-1 border border-neutral-800 bg-neutral-900/40 px-4 py-2 font-bold text-neutral-300 uppercase transition-colors hover:bg-neutral-900/70 hover:text-white"
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            <span>Editar</span>
                          </Link>

                          <button
                            onClick={() =>
                              handleExcluir(pedido.id, pedido.codigo)
                            }
                            disabled={excluindoId === pedido.id}
                            className="flex cursor-pointer items-center space-x-1 border border-neutral-800 bg-neutral-900/40 px-4 py-2 font-bold text-neutral-300 uppercase transition-colors hover:bg-neutral-900/70 hover:text-white disabled:opacity-50"
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            <span>
                              {excluindoId === pedido.id
                                ? "Excluindo..."
                                : "Excluir"}
                            </span>
                          </button>
                        </div>

                        {pedido.statusPedido === "Devendo" ? (
                          <button
                            onClick={() => handleConcluir(pedido.id)}
                            className="flex cursor-pointer items-center space-x-1 border border-emerald-800 bg-emerald-900/40 px-4 py-2 font-bold text-emerald-600 uppercase transition-colors hover:bg-emerald-900/70 hover:text-white disabled:opacity-50"
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            CONCLUIR PEDIDO
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReverter(pedido.id)}
                            className="flex cursor-pointer items-center space-x-1 border border-neutral-800 bg-neutral-900/40 px-4 py-2 font-bold text-neutral-300 uppercase transition-colors hover:bg-neutral-900/70 hover:text-white disabled:opacity-50"
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            NÃO CONCLUÍDO
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

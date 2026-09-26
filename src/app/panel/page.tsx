"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart, Pedido } from "@/context/CartContext";

function EstadoChip({ estado }: { estado: Pedido["estado"] }) {
  const styles: Record<Pedido["estado"], string> = {
    PENDIENTE: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    CONFIRMADO: "bg-sky-500/15 text-sky-400 ring-sky-500/30",
    PREPARANDO: "bg-blue-500/15 text-blue-400 ring-blue-500/30",
    LISTO_PARA_RETIRAR: "bg-purple-500/15 text-purple-400 ring-purple-500/30",
    RETIRADO: "bg-green-500/15 text-green-400 ring-green-500/30",
    CANCELADO: "bg-red-500/15 text-red-400 ring-red-500/30",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
        styles[estado] || styles.PENDIENTE
      }`}
    >
      {estado.replace(/_/g, " ")}
    </span>
  );
}

export default function PanelPedidosPage() {
  const { pedidos, cambiarEstadoPedido } = useCart();
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  const filtrados = pedidos.filter((p) => {
    if (filtroEstado === "TODOS") return true;
    return p.estado === filtroEstado;
  });

  const getSiguienteEstado = (estado: Pedido["estado"]): Pedido["estado"] | null => {
    switch (estado) {
      case "PENDIENTE":
        return "CONFIRMADO";
      case "CONFIRMADO":
        return "LISTO_PARA_RETIRAR";
      case "LISTO_PARA_RETIRAR":
        return "RETIRADO";
      default:
        return null;
    }
  };

  const getTextoBotonAccion = (estado: Pedido["estado"]): string | null => {
    switch (estado) {
      case "PENDIENTE":
        return "Confirmar pedido";
      case "CONFIRMADO":
        return "Marcar listo para retirar";
      case "LISTO_PARA_RETIRAR":
        return "Registrar entrega (Retirado)";
      default:
        return null;
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Pedidos online</h1>
          <p className="mt-1 text-sm text-slate-500">
            Panel del local · gestioná los pedidos de la tienda.
          </p>
        </div>
        <div>
          <span className="rounded-lg bg-brand/15 px-3 py-1.5 text-sm font-semibold text-brand ring-1 ring-brand/30">
            {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { key: "TODOS", label: "Todos" },
          { key: "PENDIENTE", label: "Pendientes" },
          { key: "CONFIRMADO", label: "Confirmados" },
          { key: "LISTO_PARA_RETIRAR", label: "Listos para retirar" },
          { key: "RETIRADO", label: "Retirados" },
        ].map((f) => {
          const active = filtroEstado === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-brand bg-brand/15 text-brand"
                  : "border-line text-slate-300 hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Lista de pedidos */}
      <div className="mt-4 space-y-3">
        {filtrados.length > 0 ? (
          filtrados.map((p) => {
            const sig = getSiguienteEstado(p.estado);
            const btnText = getTextoBotonAccion(p.estado);

            return (
              <div
                key={p.numero}
                className="rounded-xl border border-line bg-card p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand text-base">#{p.numero}</span>
                    <span className="text-xs text-slate-400">· {p.fecha}</span>
                    <span className="text-xs text-slate-300 font-semibold">
                      · {p.nombre} (DNI: {p.dni})
                    </span>
                  </div>
                  <EstadoChip estado={p.estado} />
                </div>

                <div className="space-y-1">
                  {p.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-300">
                        {item.cantidad} × {item.nombre}{" "}
                        <span className="text-slate-500 text-xs">({item.marca})</span>
                      </span>
                      <span className="text-slate-400 font-medium">
                        {formatPrice(item.precio * item.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <div className="text-xs text-slate-400">
                    <span>
                      Medio: <strong className="text-slate-200">{p.pago}</strong> · Tel:{" "}
                      <strong className="text-slate-200">{p.tel}</strong>
                    </span>
                    <span className="ml-3 text-sm font-bold text-white">
                      Total: <strong className="text-brand">{formatPrice(p.total)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.estado !== "CANCELADO" && p.estado !== "RETIRADO" && (
                      <button
                        onClick={() => cambiarEstadoPedido(p.numero, "CANCELADO")}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}

                    {sig && btnText && (
                      <button
                        onClick={() => cambiarEstadoPedido(p.numero, sig)}
                        className="rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brandhover transition-colors"
                      >
                        {btnText} &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-line bg-card p-10 text-center">
            <p className="text-sm text-slate-400">No hay pedidos en este estado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

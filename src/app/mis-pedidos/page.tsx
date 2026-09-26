"use client";

import React from "react";
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

export default function MisPedidosPage() {
  const { pedidos } = useCart();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  return (
    <div className="mt-6">
      <h1 className="text-2xl font-black tracking-tight">Mis pedidos</h1>
      <p className="mt-1 text-sm text-slate-500">Seguí el estado de tus pedidos online.</p>

      <div className="mt-4 space-y-3">
        {pedidos.length > 0 ? (
          pedidos.map((p) => (
            <div
              key={p.numero}
              className="rounded-xl border border-line bg-card p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand">#{p.numero}</span>
                  <span className="text-xs text-slate-500">· {p.fecha}</span>
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

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-xs text-slate-400">
                <span>
                  Pago:{" "}
                  <strong className="text-slate-200">
                    {p.pago === "EFECTIVO" ? "Efectivo" : "Transferencia"} al retirar
                  </strong>
                </span>
                <span className="text-sm font-bold text-white">
                  Total: <strong className="text-brand">{formatPrice(p.total)}</strong>
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-line bg-card p-10 text-center">
            <p className="text-lg font-semibold text-slate-300">Todavía no tenés pedidos</p>
            <p className="mt-1 text-sm text-slate-500">
              Cuando hagas un pedido online, lo vas a poder seguir desde acá.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brandhover"
            >
              Ver productos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

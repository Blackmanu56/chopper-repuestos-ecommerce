"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Check } from "lucide-react";

export default function ConfirmacionPage() {
  const searchParams = useSearchParams();
  const numero = searchParams.get("numero") ? Number(searchParams.get("numero")) : null;
  const { pedidos } = useCart();

  const pedido = pedidos.find((p) => p.numero === numero) || pedidos[0];
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-green-700/40 bg-green-950/20 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg">
        <Check size={28} strokeWidth={2.4} />
      </div>

      <h1 className="mt-4 text-2xl font-black tracking-tight">¡Pedido confirmado!</h1>
      <p className="mt-2 text-slate-400 text-sm">
        Te esperamos en el local para retirarlo. Vas a pagar cuando lo recibas.
      </p>

      <div className="mt-5 rounded-lg border border-line bg-surface p-4 text-left text-sm space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-400">Número de pedido</span>
          <span className="font-bold text-brand">#{pedido?.numero || "1002"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Estado</span>
          <span className="font-semibold text-amber-400">
            {pedido?.estado || "PENDIENTE"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Total a pagar</span>
          <span className="font-bold text-white">
            {pedido ? formatPrice(pedido.total) : "$0"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Medio de pago</span>
          <span className="font-medium text-slate-300">
            {pedido?.pago === "EFECTIVO" ? "Efectivo al retirar" : "Transferencia al retirar"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Punto de retiro</span>
          <span className="font-semibold text-white">Av. Colón 1540, Córdoba</span>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-surface p-4 text-left text-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          Qué sigue
        </p>
        <ol className="space-y-1.5 text-slate-300 text-xs">
          <li>
            <span className="text-brand font-bold">1.</span> El local confirma y aparta tu
            pedido.
          </li>
          <li>
            <span className="text-brand font-bold">2.</span> Te avisamos cuando esté listo para
            retirar.
          </li>
          <li>
            <span className="text-brand font-bold">3.</span> Pasás por el local, pagás y te lo
            llevás.
          </li>
        </ol>
      </div>

      <Link
        href="/mis-pedidos"
        className="mt-6 block w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brandhover transition-colors text-center"
      >
        Ver mis pedidos
      </Link>
    </div>
  );
}

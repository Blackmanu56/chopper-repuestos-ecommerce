"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, crearPedido } = useCart();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  const [formData, setFormData] = useState({
    nombre: "Martín Pérez",
    dni: "36.541.887",
    tel: "351 555-2233",
    email: "martin.perez@gmail.com",
    pago: "EFECTIVO" as "EFECTIVO" | "TRANSFERENCIA",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      router.push("/carrito");
      return;
    }

    const pedidoNum = crearPedido(formData);
    if (pedidoNum) {
      router.push(`/confirmacion?numero=${pedidoNum}`);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-line bg-card p-10 text-center max-w-lg mx-auto">
        <p className="text-lg font-semibold text-slate-300">No hay productos en el carrito</p>
        <p className="mt-1 text-sm text-slate-500">Agregá repuestos antes de finalizar el pedido.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brandhover"
        >
          Volver a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h1 className="text-2xl font-black tracking-tight">Finalizar pedido</h1>

      <form onSubmit={handleConfirmar} className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Tus datos */}
          <div className="rounded-xl border border-line bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Tus datos</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Nombre y apellido</span>
                <input
                  required
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-white outline-none focus:border-brand transition-colors"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">DNI</span>
                <input
                  required
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-white outline-none focus:border-brand transition-colors"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Teléfono</span>
                <input
                  required
                  name="tel"
                  value={formData.tel}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-white outline-none focus:border-brand transition-colors"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Email</span>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-white outline-none focus:border-brand transition-colors"
                />
              </label>
            </div>
          </div>

          {/* Retiro en local */}
          <div className="rounded-xl border border-line bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Retiro en local
            </h2>

            <div className="mt-3 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm">
              <p className="font-semibold text-brand">Av. Colón 1540, Córdoba</p>
              <p className="mt-0.5 text-slate-400 text-xs">
                Lun a Vie 9–13 / 16–20 · Sáb 9–13. Presentá tu DNI al retirar.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  name="pago"
                  value="EFECTIVO"
                  checked={formData.pago === "EFECTIVO"}
                  onChange={() => setFormData((prev) => ({ ...prev, pago: "EFECTIVO" }))}
                  className="mt-0.5 accent-brand"
                />
                <span>
                  <span className="font-semibold">Efectivo</span>
                  <span className="block text-xs text-slate-500">
                    Pagás al retirar en el mostrador
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm cursor-pointer hover:border-slate-600 transition-colors">
                <input
                  type="radio"
                  name="pago"
                  value="TRANSFERENCIA"
                  checked={formData.pago === "TRANSFERENCIA"}
                  onChange={() => setFormData((prev) => ({ ...prev, pago: "TRANSFERENCIA" }))}
                  className="mt-0.5 accent-brand"
                />
                <span>
                  <span className="font-semibold">Transferencia bancaria</span>
                  <span className="block text-xs text-slate-500">
                    Te pasamos el CBU y acreditás al momento de retirar
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Mobile button */}
          <button
            type="submit"
            className="w-full rounded-lg bg-brand py-3 text-sm font-bold text-white hover:bg-brandhover lg:hidden transition-colors"
          >
            Confirmar pedido
          </button>
        </div>

        {/* Aside resumen */}
        <aside className="h-fit rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Resumen del pedido
          </h2>

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2 text-sm">
                <span className="text-slate-300 truncate">
                  {item.cantidad} × {item.nombre}
                </span>
                <span className="font-semibold shrink-0">
                  {formatPrice(item.precio * item.cantidad)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between border-t border-line pt-2 text-base font-bold">
            <span>Total a pagar</span>
            <span className="text-brand">{formatPrice(subtotal)}</span>
          </div>

          <button
            type="submit"
            className="mt-4 hidden w-full rounded-lg bg-brand py-3 text-sm font-bold text-white hover:bg-brandhover lg:block transition-colors"
          >
            Confirmar pedido
          </button>
        </aside>
      </form>
    </div>
  );
}

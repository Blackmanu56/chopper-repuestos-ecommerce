"use client";

import React from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CarritoPage() {
  const { items, updateQuantity, subtotal } = useCart();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  return (
    <div className="mt-6">
      <h1 className="text-2xl font-black tracking-tight">Tu carrito</h1>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {/* Lista de productos */}
        <div className="lg:col-span-2">
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => {
                const itemTotal = item.precio * item.cantidad;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-card p-3"
                  >
                    {/* Imagen / Placeholder */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface text-slate-600 overflow-hidden p-1">
                      {item.imagen ? (
                        <img
                          src={item.imagen}
                          alt={item.nombre}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        >
                          <circle cx="10" cy="6" r="2.6" />
                          <path d="M6 12h5m3-2h4m-4 8h5M8 20l3-5m-5-1h3m0-4L8 7" />
                        </svg>
                      )}
                    </div>

                    {/* Datos */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/producto/${item.id}`}
                        className="text-sm font-semibold hover:text-brand transition-colors truncate block"
                      >
                        {item.nombre}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {item.marca} · {formatPrice(item.precio)} c/u
                      </div>
                    </div>

                    {/* Controles cantidad */}
                    <div className="flex items-center rounded-lg border border-line bg-surface">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-2.5 py-1 text-slate-400 hover:text-white transition-colors"
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-sm font-bold">{item.cantidad}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-2.5 py-1 text-slate-400 hover:text-white transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal del item */}
                    <div className="w-24 text-right text-sm font-bold text-white">
                      {formatPrice(itemTotal)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-card p-10 text-center">
              <p className="text-lg font-semibold text-slate-300">El carrito está vacío</p>
              <p className="mt-1 text-sm text-slate-500">Agregá productos desde la tienda.</p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brandhover transition-colors"
              >
                Ver productos
              </Link>
            </div>
          )}
        </div>

        {/* Resumen */}
        <aside className="h-fit rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Resumen</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Retiro en local</span>
              <span>Gratis</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-bold text-white">
              <span>Total</span>
              <span className="text-brand">{formatPrice(subtotal)}</span>
            </div>
          </div>

          {items.length > 0 ? (
            <Link
              href="/checkout"
              className="mt-4 block w-full text-center rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brandhover transition-colors"
            >
              Finalizar pedido
            </Link>
          ) : (
            <button
              disabled
              className="mt-4 w-full cursor-not-allowed rounded-lg border border-line py-2.5 text-sm font-semibold text-slate-600"
            >
              Finalizar pedido
            </button>
          )}

          <p className="mt-3 text-center text-xs text-slate-500">
            Pagás cuando retirás en el local
          </p>
        </aside>
      </div>
    </div>
  );
}

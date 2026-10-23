"use client";

import React, { useEffect } from "react";
import { X, CreditCard, ShieldCheck, Zap, Store, HelpCircle } from "lucide-react";
import { useConfig } from "@/context/ConfigContext";

interface CuotasModalProps {
  isOpen: boolean;
  onClose: () => void;
  precio: number;
  titulo?: string;
}

export default function CuotasModal({
  isOpen,
  onClose,
  precio,
  titulo,
}: CuotasModalProps) {
  const { config, calcularCuotas } = useConfig();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const financiacion = calcularCuotas(precio);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop click listener */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-cuotas-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 dark:border-[#26272e] bg-white dark:bg-[#141519] shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#26272e] px-5 py-4 bg-slate-50/80 dark:bg-[#1a1b20]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black shadow-xs">
              <CreditCard size={18} />
            </div>
            <div>
              <h3
                id="modal-cuotas-title"
                className="text-base font-extrabold text-slate-900 dark:text-white"
              >
                Planes de Financiación
              </h3>
              {titulo && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px] sm:max-w-xs font-medium">
                  {titulo}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal de cuotas"
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#26272e] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-4 text-xs">
          {/* Base Contado / Transferencia */}
          <div className="rounded-xl border border-slate-200 dark:border-[#26272e] bg-slate-50 dark:bg-[#0f1012] p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Precio de Contado / Transferencia
              </span>
              <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                Pago en 1 cuota en el local o transferencia bancaria
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {formatPrice(precio)}
              </span>
            </div>
          </div>

          {/* Plan de Cuotas Vigente */}
          {financiacion.habilitadas ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 dark:bg-amber-400/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 uppercase tracking-wider">
                  <Zap size={12} /> Plan Destacado
                </span>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  {financiacion.sinInteres
                    ? "Sin interés adicional"
                    : `Recargo financiado: ${financiacion.recargoPorcentaje}%`}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {financiacion.cuotas} cuotas de{" "}
                    <span className="text-brand">
                      {formatPrice(financiacion.valorCuota)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {financiacion.sinInteres
                      ? "Mismo precio final que en efectivo"
                      : `Total financiado: ${formatPrice(financiacion.totalFinanciado)}`}
                  </div>
                </div>
              </div>

              {/* Detalle cuota a cuota */}
              <div className="border-t border-amber-300/30 dark:border-amber-400/20 pt-2.5">
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {Array.from({ length: financiacion.cuotas }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-white/70 dark:bg-[#1a1b20] border border-amber-200 dark:border-[#2f303a] p-1.5"
                    >
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-semibold">
                        Cuota {i + 1}
                      </span>
                      <span className="text-[11px] font-extrabold text-slate-800 dark:text-white">
                        {formatPrice(financiacion.valorCuota)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-[#26272e] bg-slate-50 dark:bg-[#0f1012] p-4 text-center text-slate-500">
              Las cuotas financiadas se encuentran pausadas temporalmente. Consultá condiciones especiales en el local.
            </div>
          )}

          {/* Tarjetas Aceptadas */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
              Tarjetas Aceptadas
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {["Visa", "Mastercard", "Cabal", "Naranja", "Amex"].map((card) => (
                <div
                  key={card}
                  className="rounded-xl border border-slate-200 dark:border-[#26272e] bg-slate-50 dark:bg-[#1a1b20] py-2 text-center font-bold text-slate-700 dark:text-slate-300 text-[11px] shadow-2xs"
                >
                  {card}
                </div>
              ))}
            </div>
          </div>

          {/* Dónde y cómo pagar */}
          <div className="rounded-xl border border-slate-200 dark:border-[#26272e] bg-slate-50 dark:bg-[#0f1012] p-3.5 space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <Store size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 dark:text-white block">
                  En nuestro local comercial de Posadas:
                </strong>
                <span>
                  {config.direccion || "Av. Roque Sáenz Peña 1500"}. Podés abonar con tarjeta de débito o crédito en el mostrador mediante terminal POS oficial.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1 border-t border-slate-200 dark:border-[#1f2026]">
              <HelpCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 dark:text-white block">
                  Para compras con envío a domicilio:
                </strong>
                <span>
                  Podés solicitar un link de pago oficial a nuestros asesores comerciales por WhatsApp para abonar con tarjeta antes del despacho por Motomandado o encomienda.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-[#26272e] px-5 py-3 bg-slate-50/80 dark:bg-[#1a1b20] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Precios y condiciones transparentes</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brandhover transition-colors shadow-sm cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

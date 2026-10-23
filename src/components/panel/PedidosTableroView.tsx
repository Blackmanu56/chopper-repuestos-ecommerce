"use client";

import React, { useMemo } from "react";
import {
  CreditCard,
  ArrowRight,
  Package,
  Truck,
  CheckCircle2,
  CheckCircle,
  Clock,
  RefreshCw,
  FileText,
  UserCheck,
} from "lucide-react";
import { PedidoDTO } from "@/actions/pedidos";

interface PedidosTableroViewProps {
  pedidos: PedidoDTO[];
  role: "admin" | "venta" | "stock";
  staffPreparadores: Array<{ id: number; nombre: string; rol: string }>;
  saving: boolean;
  formatPrice: (n: number) => string;
  onSelectPedido: (p: PedidoDTO) => void;
  onSelectEntregaPedido: (p: PedidoDTO) => void;
  onChangeEstadoPedido: (
    pedidoId: number,
    nuevoEstado: string,
    notas?: string,
    preparadorId?: number | null
  ) => Promise<void> | void;
}

export function PedidosTableroView({
  pedidos,
  role,
  staffPreparadores,
  saving,
  formatPrice,
  onSelectPedido,
  onSelectEntregaPedido,
  onChangeEstadoPedido,
}: PedidosTableroViewProps) {
  const colVerificarPago = useMemo(
    () => pedidos.filter((p) => p.estado === "PENDIENTE"),
    [pedidos]
  );
  const colPendientesArmar = useMemo(
    () => pedidos.filter((p) => p.estado === "CONFIRMADO"),
    [pedidos]
  );
  const colEnPreparacion = useMemo(
    () => pedidos.filter((p) => p.estado === "PREPARANDO"),
    [pedidos]
  );
  const colListosEntrega = useMemo(
    () =>
      pedidos.filter(
        (p) => p.estado === "LISTO_ENTREGA" || p.estado === "LISTO_PARA_RETIRAR"
      ),
    [pedidos]
  );
  const colEntregados = useMemo(
    () => pedidos.filter((p) => p.estado === "ENTREGADO"),
    [pedidos]
  );

  return (
    <div className="space-y-4 w-full">
      {/* Breadcrumb del Proceso Operativo */}
      <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 font-semibold">
          <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> 1 · Ventas verifica el pago
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#6b6c75] hidden sm:inline" />
          <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> 2 · Stock prepara
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#6b6c75] hidden sm:inline" />
          <span className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> 3 · Ventas entrega
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#6b6c75] hidden sm:inline" />
          <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Entregado
          </span>
        </div>
        <div className="text-[11px] text-[#6b6c75]">
          Pedidos en tablero: <b className="text-white">{pedidos.length}</b>
        </div>
      </div>

      {/* Tablero Kanban de 5 Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
        {/* ────────────────────────────────────────────────────────── */}
        {/* COLUMNA 1: POR VERIFICAR PAGO */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> PENDIENTES DE CONFIRMACIÓN
            </h3>
            <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
              {colVerificarPago.length}
            </span>
          </div>

          <div className="space-y-3">
            {colVerificarPago.length === 0 ? (
              <div className="text-center py-8 text-[#6b6c75] text-xs bg-[#16171c]/50 border border-dashed border-[#26272e] rounded-xl p-4">
                No hay pagos pendientes de verificación.
              </div>
            ) : (
              colVerificarPago.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPedido(p)}
                  className="bg-[#16171c] border border-[#26272e] hover:border-amber-500/50 rounded-xl p-3.5 space-y-2.5 text-xs transition-all cursor-pointer hover:bg-[#1a1b20] group shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#dc2626] text-xs group-hover:underline">#ORD-{p.numero}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      PAGO PENDIENTE
                    </span>
                  </div>

                  <div>
                    <div className="text-white font-semibold">{p.nombreCliente}</div>
                    <div className="text-[11px] text-[#6b6c75]">DNI {p.dniCliente || "—"}</div>
                  </div>

                  {/* Items preview */}
                  {p.items && p.items.length > 0 && (
                    <div className="bg-slate-100/90 border border-slate-200 dark:bg-[#101114] dark:border-[#26272e] p-2 rounded-lg space-y-1">
                      {p.items.slice(0, 2).map((it, idx) => (
                        <div key={idx} className="text-[11px] text-slate-800 dark:text-[#b8b9c0] truncate font-medium">
                          <b className="text-amber-600 dark:text-amber-400 font-bold">{it.cantidad}x</b> {it.nombre}
                          {it.marca && <span className="text-[10px] text-slate-500 dark:text-[#8e8f96] ml-1 font-normal">({it.marca})</span>}
                        </div>
                      ))}
                      {p.items.length > 2 && (
                        <div className="text-[10px] text-slate-500 dark:text-[#6b6c75] italic">
                          + {p.items.length - 2} ítem(s) más...
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{formatPrice(p.total)}</span>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#26272e] dark:text-[#d7d8dd]">
                        {p.metodoPago === "TRANSFERENCIA" ? "Transferencia" : p.metodoPago === "TARJETA" ? "Tarjeta" : "Efectivo"}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                        p.modalidadEntrega === "MOTOMANDADO"
                          ? "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/30"
                          : "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/30"
                      }`}>
                        {p.modalidadEntrega === "MOTOMANDADO" ? "Moto" : "Retiro"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-[#26272e] mt-1 space-y-1.5">
                    {p.comprobanteUrl ? (
                      <div className="flex items-center justify-between text-[10px] text-emerald-400 font-semibold px-0.5">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Comprobante adjuntado
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#20222a] border border-[#2e303d] text-gray-300 font-mono text-[9px] uppercase">
                          {p.comprobanteUrl.toLowerCase().endsWith(".pdf") ? "PDF" : "IMG"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium px-0.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Sin comprobante aún</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPedido(p);
                      }}
                      className={`w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        p.comprobanteUrl
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                          : "bg-[#26272e] hover:bg-[#30323a] text-gray-300 border border-[#35363d]"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{p.comprobanteUrl ? "Revisar comprobante y verificar pago →" : "Ver detalle del pedido →"}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* COLUMNA 2: PENDIENTES DE ARMAR */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> PENDIENTES DE ARMAR
            </h3>
            <span className="bg-sky-500/20 text-sky-400 text-xs font-bold px-2 py-0.5 rounded-full border border-sky-500/30">
              {colPendientesArmar.length}
            </span>
          </div>

          <div className="space-y-3">
            {colPendientesArmar.length === 0 ? (
              <div className="text-center py-8 text-[#6b6c75] text-xs bg-[#16171c]/50 border border-dashed border-[#26272e] rounded-xl p-4">
                No hay pedidos pendientes de armado.
              </div>
            ) : (
              colPendientesArmar.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPedido(p)}
                  className="bg-[#16171c] border border-[#26272e] hover:border-sky-500/50 rounded-xl p-3.5 space-y-2.5 text-xs transition-all cursor-pointer hover:bg-[#1a1b20] group shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#dc2626] text-xs group-hover:underline">#ORD-{p.numero}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      PENDIENTE DE ARMAR
                    </span>
                  </div>

                  <div>
                    <div className="text-white font-semibold">{p.nombreCliente}</div>
                    <div className="text-[11px] text-[#6b6c75]">DNI {p.dniCliente || "—"}</div>
                  </div>

                  {p.items && p.items.length > 0 && (
                    <div className="bg-slate-100/90 border border-slate-200 dark:bg-[#101114] dark:border-[#26272e] p-2 rounded-lg space-y-1">
                      {p.items.slice(0, 2).map((it, idx) => (
                        <div key={idx} className="text-[11px] text-slate-800 dark:text-[#b8b9c0] truncate font-medium">
                          <b className="text-sky-600 dark:text-sky-400 font-bold">{it.cantidad}x</b> {it.nombre}
                          {it.marca && <span className="text-[10px] text-slate-500 dark:text-[#8e8f96] ml-1 font-normal">({it.marca})</span>}
                        </div>
                      ))}
                      {p.items.length > 2 && (
                        <div className="text-[10px] text-slate-500 dark:text-[#6b6c75] italic">
                          + {p.items.length - 2} ítem(s) más...
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{formatPrice(p.total)}</span>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#26272e] dark:text-[#d7d8dd]">
                        {p.metodoPago === "TRANSFERENCIA" ? "Transferencia" : p.metodoPago === "TARJETA" ? "Tarjeta" : "Efectivo"}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                        p.modalidadEntrega === "MOTOMANDADO"
                          ? "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/30"
                          : "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/30"
                      }`}>
                        {p.modalidadEntrega === "MOTOMANDADO" ? "Moto" : "Retiro"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 mt-1">
                    {(role === "admin" || role === "stock") ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const stockWorker = staffPreparadores.find((s) => s.rol === "ENCARGADO_STOCK")?.id || null;
                          onChangeEstadoPedido(p.id, "PREPARANDO", "Stock tomó el pedido para iniciar preparación", stockWorker);
                        }}
                        disabled={saving}
                        className="flex-1 py-1.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Iniciar armado</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-1.5 text-center text-[10px] text-sky-400 bg-sky-950/30 rounded-lg border border-sky-800/30 font-medium flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>En cola de Stock</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPedido(p);
                      }}
                      className="px-2.5 py-1.5 bg-[#26272e] hover:bg-[#35363d] text-white rounded-lg text-[11px] transition-colors"
                    >
                      Detalle →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* COLUMNA 3: EN PREPARACIÓN (STOCK) */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> EN PREPARACIÓN
            </h3>
            <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
              {colEnPreparacion.length}
            </span>
          </div>

          <div className="space-y-3">
            {colEnPreparacion.length === 0 ? (
              <div className="text-center py-8 text-[#6b6c75] text-xs bg-[#16171c]/50 border border-dashed border-[#26272e] rounded-xl p-4">
                No hay pedidos en preparación actualmente.
              </div>
            ) : (
              colEnPreparacion.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPedido(p)}
                  className="bg-[#16171c] border border-[#26272e] hover:border-blue-500/50 rounded-xl p-3.5 space-y-2.5 text-xs transition-all cursor-pointer hover:bg-[#1a1b20] group shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#dc2626] text-xs group-hover:underline">#ORD-{p.numero}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      ARMANDO
                    </span>
                  </div>

                  <div>
                    <div className="text-white font-semibold">{p.nombreCliente}</div>
                    <div className="text-[11px] text-[#6b6c75]">DNI {p.dniCliente || "—"}</div>
                  </div>

                  {p.items && p.items.length > 0 && (
                    <div className="bg-slate-100/90 border border-slate-200 dark:bg-[#101114] dark:border-[#26272e] p-2 rounded-lg space-y-1">
                      {p.items.slice(0, 2).map((it, idx) => (
                        <div key={idx} className="text-[11px] text-slate-800 dark:text-[#b8b9c0] truncate font-medium">
                          <b className="text-blue-600 dark:text-blue-400 font-bold">{it.cantidad}x</b> {it.nombre}
                          {it.marca && <span className="text-[10px] text-slate-500 dark:text-[#8e8f96] ml-1 font-normal">({it.marca})</span>}
                        </div>
                      ))}
                      {p.items.length > 2 && (
                        <div className="text-[10px] text-slate-500 dark:text-[#6b6c75] italic">
                          + {p.items.length - 2} ítem(s) más...
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{formatPrice(p.total)}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                      p.modalidadEntrega === "MOTOMANDADO"
                        ? "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/30"
                        : "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/30"
                    }`}>
                      {p.modalidadEntrega === "MOTOMANDADO" ? "Moto" : "Retiro"}
                    </span>
                  </div>

                  {/* Indicador de preparador */}
                  <div className="text-[11px] text-[#6b6c75] pt-0.5 flex items-center gap-1 border-t border-[#26272e]">
                    <UserCheck className="w-3 h-3 text-blue-400" />
                    <span>Preparador: <b className="text-white">{p.preparadorNombre || "María García"}</b></span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPedido(p);
                    }}
                    className="w-full mt-1 py-1.5 bg-[#26272e] hover:bg-[#35363d] text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Ver detalle de preparación →</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* COLUMNA 4: LISTO PARA ENTREGAR */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> LISTOS PARA ENTREGAR
            </h3>
            <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
              {colListosEntrega.length}
            </span>
          </div>

          <div className="space-y-3">
            {colListosEntrega.length === 0 ? (
              <div className="text-center py-8 text-[#6b6c75] text-xs bg-[#16171c]/50 border border-dashed border-[#26272e] rounded-xl p-4">
                No hay pedidos listos esperando entrega.
              </div>
            ) : (
              colListosEntrega.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPedido(p)}
                  className="bg-[#16171c] border border-[#26272e] hover:border-purple-500/50 rounded-xl p-3.5 space-y-2.5 text-xs transition-all cursor-pointer hover:bg-[#1a1b20] group shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#dc2626] text-xs group-hover:underline">#ORD-{p.numero}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      {p.modalidadEntrega === "MOTOMANDADO" ? "LISTO ENTREGA" : "LISTO RETIRO"}
                    </span>
                  </div>

                  <div>
                    <div className="text-white font-semibold">{p.nombreCliente}</div>
                    <div className="text-[11px] text-[#6b6c75]">DNI {p.dniCliente || "—"}</div>
                  </div>

                  {p.items && p.items.length > 0 && (
                    <div className="bg-slate-100/90 border border-slate-200 dark:bg-[#101114] dark:border-[#26272e] p-2 rounded-lg space-y-1">
                      {p.items.slice(0, 2).map((it, idx) => (
                        <div key={idx} className="text-[11px] text-slate-800 dark:text-[#b8b9c0] truncate font-medium">
                          <b className="text-purple-600 dark:text-purple-400 font-bold">{it.cantidad}x</b> {it.nombre}
                          {it.marca && <span className="text-[10px] text-slate-500 dark:text-[#8e8f96] ml-1 font-normal">({it.marca})</span>}
                        </div>
                      ))}
                      {p.items.length > 2 && (
                        <div className="text-[10px] text-slate-500 dark:text-[#6b6c75] italic">
                          + {p.items.length - 2} ítem(s) más...
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{formatPrice(p.total)}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                      p.modalidadEntrega === "MOTOMANDADO"
                        ? "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/30"
                        : "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/30"
                    }`}>
                      {p.modalidadEntrega === "MOTOMANDADO" ? "🛵 Motomandado" : "🏪 Mostrador"}
                    </span>
                  </div>

                  {p.preparadorNombre && (
                    <div className="text-[11px] text-[#6b6c75] border-t border-[#26272e] pt-1">
                      Preparó: <b className="text-white">{p.preparadorNombre}</b>
                    </div>
                  )}

                  {/* Botón directo de entrega -> Abre el modal de entrega interactivo */}
                  {(role === "admin" || role === "venta") ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEntregaPedido(p);
                      }}
                      className="w-full mt-1 py-1.5 bg-[#16a34a] hover:bg-green-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Entregar pedido →</span>
                    </button>
                  ) : (
                    <div className="w-full mt-1 py-1 text-center text-[10px] text-purple-400 bg-purple-950/30 rounded-lg border border-purple-800/30 font-medium">
                      Esperando entrega en mostrador (Ventas)
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* COLUMNA 5: ENTREGADOS */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> ENTREGADOS
            </h3>
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              {colEntregados.length}
            </span>
          </div>

          <div className="space-y-3">
            {colEntregados.length === 0 ? (
              <div className="text-center py-8 text-[#6b6c75] text-xs bg-[#16171c]/50 border border-dashed border-[#26272e] rounded-xl p-4">
                No hay pedidos entregados aún.
              </div>
            ) : (
              colEntregados.slice(0, 15).map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPedido(p)}
                  className="bg-[#16171c] border border-[#26272e] hover:border-emerald-500/50 rounded-xl p-3.5 space-y-2.5 text-xs transition-all cursor-pointer hover:bg-[#1a1b20] group shadow-sm opacity-90 hover:opacity-100"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#dc2626] text-xs group-hover:underline">#ORD-{p.numero}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      ENTREGADO
                    </span>
                  </div>

                  <div>
                    <div className="text-white font-semibold">{p.nombreCliente}</div>
                    <div className="text-[11px] text-[#6b6c75]">DNI {p.dniCliente || "—"}</div>
                  </div>

                  {p.items && p.items.length > 0 && (
                    <div className="bg-slate-100/90 border border-slate-200 dark:bg-[#101114] dark:border-[#26272e] p-2 rounded-lg space-y-1">
                      {p.items.slice(0, 2).map((it, idx) => (
                        <div key={idx} className="text-[11px] text-slate-800 dark:text-[#b8b9c0] truncate font-medium">
                          <b className="text-emerald-600 dark:text-emerald-400 font-bold">{it.cantidad}x</b> {it.nombre}
                          {it.marca && <span className="text-[10px] text-slate-500 dark:text-[#8e8f96] ml-1 font-normal">({it.marca})</span>}
                        </div>
                      ))}
                      {p.items.length > 2 && (
                        <div className="text-[10px] text-slate-500 dark:text-[#6b6c75] italic">
                          + {p.items.length - 2} ítem(s) más...
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{formatPrice(p.total)}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                      p.modalidadEntrega === "MOTOMANDADO"
                        ? "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/30"
                        : "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/30"
                    }`}>
                      {p.modalidadEntrega === "MOTOMANDADO" ? "Moto" : "Retiro"}
                    </span>
                  </div>

                  {p.notas && (
                    <div className="text-[10px] text-[#6b6c75] italic border-t border-[#26272e] pt-1 truncate">
                      {p.notas}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPedido(p);
                    }}
                    className="w-full mt-1 py-1.5 bg-[#26272e] hover:bg-[#35363d] text-[#b8b9c0] hover:text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Ver detalle →</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

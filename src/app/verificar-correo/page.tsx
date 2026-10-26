"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { confirmarCambioEmailAction, ConfirmarEmailResult } from "@/actions/auth";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  ArrowRight,
  Mail,
  Home,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";

// Caché en memoria a nivel módulo para deduplicar llamadas concurrentes y soportar React StrictMode
const inFlightVerifications = new Map<string, Promise<ConfirmarEmailResult>>();

function fetchVerification(token: string, force = false): Promise<ConfirmarEmailResult> {
  if (!force) {
    const existing = inFlightVerifications.get(token);
    if (existing) return existing;
  }

  const promise = confirmarCambioEmailAction(token).finally(() => {
    setTimeout(() => {
      inFlightVerifications.delete(token);
    }, 15000);
  });

  inFlightVerifications.set(token, promise);
  return promise;
}

function VerificarCorreoContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ConfirmarEmailResult | null>(null);

  useEffect(() => {
    let active = true;

    if (!token) {
      setLoading(false);
      setResult({
        success: false,
        code: "ENLACE_INVALIDO",
        error: "No se proporcionó ningún token de verificación en el enlace.",
      });
      return;
    }

    setLoading(true);

    // Timeout de seguridad: a los 8 segundos, forzar desbloqueo de la interfaz si el servidor demora
    const timeoutTimer = setTimeout(() => {
      if (active) {
        setLoading(false);
        setResult((prev) =>
          prev ?? {
            success: false,
            code: "ERROR_SERVIDOR",
            error: "La verificación tardó más de lo esperado. Por favor reintentá o recargá la página.",
          }
        );
      }
    }, 8000);

    fetchVerification(token)
      .then((res) => {
        if (active) {
          clearTimeout(timeoutTimer);
          setResult(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          clearTimeout(timeoutTimer);
          console.error("Error al verificar correo:", err);
          setResult({
            success: false,
            code: "ERROR_SERVIDOR",
            error: "Ocurrió un error al contactar con el servidor. Por favor, intentá nuevamente.",
          });
          setLoading(false);
        }
      });

    return () => {
      active = false;
      clearTimeout(timeoutTimer);
    };
  }, [token]);

  const handleRetry = () => {
    if (!token) return;
    setLoading(true);
    fetchVerification(token, true)
      .then((res) => {
        setResult(res);
        setLoading(false);
      })
      .catch(() => {
        setResult({
          success: false,
          code: "ERROR_SERVIDOR",
          error: "Ocurrió un error al contactar con el servidor.",
        });
        setLoading(false);
      });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-[#121318] p-8 shadow-xl text-center">
        {loading && (
          <div className="py-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand animate-pulse">
              <Loader2 size={36} className="animate-spin" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Verificando correo electrónico...
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estamos validando tu enlace de seguridad en el servidor. Aguardá un instante.
            </p>
          </div>
        )}

        {!loading && result && (
          <>
            {/* 1. ÉXITO (CONFIRMADO_EXITOSO o YA_CONFIRMADO) */}
            {result.success && (
              <div className="py-4 space-y-5 animate-in fade-in duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-md">
                  <CheckCircle2 size={36} />
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white">
                    {result.code === "YA_CONFIRMADO"
                      ? "Correo ya verificado"
                      : "¡Correo verificado con éxito!"}
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {result.code === "YA_CONFIRMADO"
                      ? "Este enlace ya fue confirmado anteriormente. Tu cuenta se encuentra activa con la dirección:"
                      : "Tu dirección de correo electrónico ha sido confirmada y actualizada a:"}
                  </p>
                  {result.email && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-surface px-4 py-2 border border-slate-200 dark:border-line/70 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Mail size={14} className="text-brand shrink-0" />
                      <span>{result.email}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    A partir de ahora, podés utilizar este correo para iniciar sesión y recibirás todas las notificaciones de tus compras en esta casilla.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-line flex flex-col sm:flex-row gap-2.5 justify-center">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                  >
                    <span>Ir a la tienda</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {/* 2. ENLACE CANCELADO POR SOLICITUD POSTERIOR (Requisito 8) */}
            {!result.success && result.code === "ENLACE_CANCELADO" && (
              <div className="py-4 space-y-5 animate-in fade-in duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-md">
                  <AlertTriangle size={36} />
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white">
                    Enlace sin validez
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Este enlace fue cancelado porque realizaste una solicitud de cambio posterior en tu perfil.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Por favor revisá tu casilla de correo y utilizá el enlace del <strong>último correo recibido</strong>.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-line flex flex-col sm:flex-row gap-2.5 justify-center items-center">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line hover:bg-slate-100 dark:hover:bg-surface px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Home size={14} />
                    <span>Volver al Inicio</span>
                  </Link>
                </div>
              </div>
            )}

            {/* 3. ENLACE VENCIDO */}
            {!result.success && result.code === "ENLACE_VENCIDO" && (
              <div className="py-4 space-y-5 animate-in fade-in duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-md">
                  <Clock size={36} />
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white">
                    El enlace de verificación ha expirado
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Por motivos de seguridad, los enlaces de verificación vencen luego de 24 horas.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Tu correo anterior sigue activo. Ingresá a tu perfil en el e-commerce para solicitar un nuevo enlace.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-line flex justify-center">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                  >
                    <span>Ir a Chopper Repuestos</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {/* 4. CORREO EN USO POR OTRA CUENTA */}
            {!result.success && result.code === "CORREO_EN_USO" && (
              <div className="py-4 space-y-5 animate-in fade-in duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-500 border border-red-500/30 shadow-md">
                  <ShieldAlert size={36} />
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white">
                    Correo electrónico no disponible
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    La dirección solicitada ya fue registrada por otra cuenta antes de completar la verificación.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Tu correo actual continúa activo sin modificaciones.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-line flex justify-center">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line hover:bg-slate-100 dark:hover:bg-surface px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span>Volver al Inicio</span>
                  </Link>
                </div>
              </div>
            )}

            {/* 5. ENLACE INVÁLIDO O ERROR GENERAL */}
            {!result.success &&
              result.code !== "ENLACE_CANCELADO" &&
              result.code !== "ENLACE_VENCIDO" &&
              result.code !== "CORREO_EN_USO" && (
                <div className="py-4 space-y-5 animate-in fade-in duration-300">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-500 border border-red-500/30 shadow-md">
                    <AlertTriangle size={36} />
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-xl font-black text-slate-900 dark:text-white">
                      Enlace de verificación no válido
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {result.error || "El enlace no existe o el código de verificación es incorrecto."}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      Comprobá haber abierto el enlace completo recibido en tu casilla de correo electrónico.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-line flex flex-col sm:flex-row gap-2.5 justify-center items-center">
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                    >
                      <RotateCcw size={14} />
                      <span>Reintentar verificación</span>
                    </button>
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line hover:bg-slate-100 dark:hover:bg-surface px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <Home size={14} />
                      <span>Volver a la tienda</span>
                    </Link>
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

export default function VerificarCorreoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-[#121318] p-8 shadow-xl text-center">
            <div className="py-8 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Cargando verificación...
              </h2>
            </div>
          </div>
        </div>
      }
    >
      <VerificarCorreoContent />
    </Suspense>
  );
}

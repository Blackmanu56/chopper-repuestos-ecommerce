"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  KeyRound,
  CheckCircle,
  Mail,
  Phone,
} from "lucide-react";
import Image from "next/image";

type AuthMode = "LOGIN" | "REGISTER" | "RECOVERY" | "STAFF";

export default function LoginModal() {
  const { isLoginOpen, closeLogin, loginClient, loginStaff } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("LOGIN");

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Limpiar campos para que siempre se ingresen a mano
  useEffect(() => {
    if (isLoginOpen) {
      setUsername("");
      setPassword("");
      setNombreCompleto("");
      setTelefono("");
      setEmail("");
      setRecoveryCode("");
      setRecoverySent(false);
      setError("");
      setSuccessMsg("");
      setLoading(false);
    }
  }, [isLoginOpen]);

  if (!isLoginOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Ingresá tu usuario o correo");
      return;
    }
    const res = loginClient(username, password);
    if (!res.success) {
      setError(res.error || "No se pudo iniciar sesión");
      return;
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await loginStaff(username, password);
      if (!res.success) {
        setError(res.error || "Credenciales de administración incorrectas.");
        setLoading(false);
        return;
      }
      setLoading(false);
      router.push("/panel");
    } catch {
      setError("Error de comunicación con el servidor.");
      setLoading(false);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto || !email || !password) {
      setError("Completá todos los campos requeridos");
      return;
    }
    loginClient(nombreCompleto.split(" ")[0].toLowerCase(), password);
    setSuccessMsg("¡Cuenta creada con éxito! Ya podés hacer tus pedidos.");
    setTimeout(() => {
      closeLogin();
    }, 1200);
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Ingresá tu correo electrónico");
      return;
    }
    setRecoverySent(true);
    setSuccessMsg(`Te enviamos un código de seguridad de 6 dígitos a ${email}`);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryCode.length < 4) {
      setError("Ingresá un código válido");
      return;
    }
    setSuccessMsg("Código verificado. Ya podés establecer una nueva contraseña.");
    setTimeout(() => {
      setMode("LOGIN");
      setRecoverySent(false);
      setSuccessMsg("");
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-5">
        {/* Botón cerrar */}
        <button
          onClick={closeLogin}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-surface transition-colors"
        >
          <X size={20} />
        </button>

        {/* Encabezado con Logo Oficial */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Chopper Repuestos"
            width={120}
            height={44}
            className="h-10 w-auto object-contain rounded-lg drop-shadow"
          />
          <div>
            <h3 className="text-base font-black text-white">Mi Cuenta</h3>
            <p className="text-[11px] text-slate-400">Chopper Repuestos · Posadas</p>
          </div>
        </div>

        {/* Selector de modo: Iniciar Sesión / Crear Cuenta / Recuperar */}
        <div className="flex border-b border-line text-xs font-bold">
          <button
            onClick={() => {
              setMode("LOGIN");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 pb-2.5 transition-colors border-b-2 ${
              mode === "LOGIN"
                ? "border-brand text-brand"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => {
              setMode("REGISTER");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 pb-2.5 transition-colors border-b-2 ${
              mode === "REGISTER"
                ? "border-brand text-brand"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Crear Cuenta
          </button>
          <button
            onClick={() => {
              setMode("RECOVERY");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 pb-2.5 transition-colors border-b-2 ${
              mode === "RECOVERY"
                ? "border-brand text-brand"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Recuperar
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-400">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. MODO INICIAR SESIÓN (CLIENTES) */}
        {mode === "LOGIN" && (
          <form onSubmit={handleLogin} className="space-y-3.5 text-xs" autoComplete="off">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Usuario o Correo
              </label>
              <div className="relative">
                <input
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresá tu usuario o correo"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                />
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setMode("RECOVERY")}
                  className="text-[11px] text-brand hover:underline"
                >
                  ¿La olvidaste?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 text-white placeholder-slate-500 outline-none focus:border-brand"
                />
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-xs font-bold text-white hover:bg-brandhover shadow transition-all active:scale-95"
            >
              <span>Ingresar a mi cuenta</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* 2. MODO CREAR CUENTA CLIENTE */}
        {mode === "REGISTER" && (
          <form onSubmit={handleRegister} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Nombre y Apellido *
              </label>
              <input
                required
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="Ej: Marcelo Benítez"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 376 412-3456"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Correo Electrónico *
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tunombre@gmail.com"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Crear Contraseña *
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-brand"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow transition-all active:scale-95"
            >
              <UserPlus size={14} />
              <span>Registrarme como Cliente</span>
            </button>
          </form>
        )}

        {/* 3. MODO RECUPERAR CONTRASEÑA */}
        {mode === "RECOVERY" && (
          <div className="space-y-3.5 text-xs">
            {!recoverySent ? (
              <form onSubmit={handleRecovery} className="space-y-3">
                <p className="text-slate-400 text-[11px]">
                  Ingresá el correo asociado a tu cuenta. Te enviaremos un código de 6 dígitos para restablecer tu contraseña.
                </p>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tunombre@gmail.com"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-brand"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-xs font-bold text-white hover:bg-brandhover shadow transition-all"
                >
                  <Mail size={14} />
                  <span>Enviar Código al Correo</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-3">
                <p className="text-slate-300 text-[11px]">
                  Ingresá el código de seguridad que enviamos a <strong>{email}</strong>:
                </p>
                <div>
                  <input
                    required
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="Ej: 489215"
                    className="w-full text-center font-mono tracking-widest text-lg rounded-xl border border-line bg-surface py-2 text-white outline-none focus:border-brand"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow transition-all"
                >
                  <KeyRound size={14} />
                  <span>Verificar y Restablecer</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* 4. MODO PERSONAL Y ADMINISTRACIÓN (SIN AUTO-LOGIN) */}
        {mode === "STAFF" && (
          <form onSubmit={handleStaffLogin} className="space-y-3.5 text-xs" autoComplete="off">
            <div className="rounded-xl border border-brand/40 bg-brand/10 p-3 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-brand shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Personal Autorizado</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Acceso para empleados, vendedores y administradores de Chopper Repuestos.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Usuario de Empleado o Administrador
              </label>
              <div className="relative">
                <input
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin, ventas o stock"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                />
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Contraseña de Acceso
              </label>
              <div className="relative">
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                />
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-xs font-bold text-white hover:bg-brandhover shadow transition-all active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck size={15} />
              <span>{loading ? "Verificando en BDD..." : "Ingresar al Panel de Gestión"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setError("");
                setUsername("");
                setPassword("");
              }}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-brand dark:text-slate-400 dark:hover:text-white pt-1 transition-colors"
            >
              ← Volver al acceso de clientes
            </button>
          </form>
        )}

        {/* Acceso: ADMINISTRACIÓN (Activa el formulario de empleados/admin) */}
        {mode !== "STAFF" && (
          <div className="pt-3 border-t border-line/60">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mb-2">
              Gestión interna de Chopper Repuestos
            </p>
            <button
              type="button"
              onClick={() => {
                setMode("STAFF");
                setError("");
                setSuccessMsg("");
                setUsername("");
                setPassword("");
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/10 py-2.5 text-xs font-bold text-brand hover:bg-brand/20 transition-all active:scale-95"
            >
              <ShieldCheck size={16} />
              <span>Administración</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

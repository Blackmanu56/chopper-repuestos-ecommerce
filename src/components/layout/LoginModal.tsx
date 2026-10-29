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
  ArrowLeft,
  UserPlus,
  KeyRound,
  CheckCircle,
  Mail,
  Phone,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import {
  solicitarRecuperacionPasswordAction,
  verificarCodigoRecuperacionAction,
  restablecerPasswordAction,
} from "@/actions/auth";

type AuthMode = "LOGIN" | "REGISTER" | "RECOVERY" | "STAFF";
type RecoveryStep = "REQUEST_CODE" | "VERIFY_CODE" | "RESET_PASSWORD";

export default function LoginModal() {
  const {
    isLoginOpen,
    closeLogin,
    loginClient,
    registerClient,
    loginStaff,
    sessionExpiredNotice,
    clearSessionExpiredNotice,
  } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("LOGIN");

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Recovery flow states
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("REQUEST_CODE");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Limpiar campos para que siempre se ingresen a mano
  useEffect(() => {
    if (isLoginOpen) {
      setUsername("");
      setPassword("");
      setShowPassword(false);
      setShowRegisterPassword(false);
      setShowStaffPassword(false);
      setNombreCompleto("");
      setDni("");
      setTelefono("");
      setEmail("");
      setError("");
      setSuccessMsg("");
      setLoading(false);
      setRecoveryStep("REQUEST_CODE");
      setRecoveryEmail("");
      setRecoveryCode("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setResendCooldown(0);
    }
  }, [isLoginOpen]);

  // Temporizador para el botón de reenvío de código
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isLoginOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Ingresá tu usuario o correo");
      return;
    }
    setLoading(true);
    try {
      const res = await loginClient(username, password);
      if (!res.success) {
        setError(res.error || "No se pudo iniciar sesión");
      }
    } finally {
      setLoading(false);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nombreCompleto || !email || !password) {
      setError("Completá todos los campos requeridos");
      return;
    }
    if (dni.trim()) {
      const cleanDni = dni.replace(/\D/g, "");
      if (cleanDni.length < 7 || cleanDni.length > 8) {
        setError("El DNI debe contener 7 u 8 dígitos numéricos.");
        return;
      }
    }
    setLoading(true);
    try {
      const res = await registerClient({
        nombreCompleto,
        email,
        telefono,
        password,
        dni: dni.trim() || undefined,
      });
      if (!res.success) {
        setError(res.error || "No se pudo crear la cuenta.");
        return;
      }
      setSuccessMsg("¡Cuenta creada con éxito! Ya podés hacer tus pedidos.");
      setTimeout(() => {
        closeLogin();
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    const targetEmail = (recoveryEmail || email || "").trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      setError("Ingresá un correo electrónico válido.");
      return;
    }
    setLoading(true);
    try {
      const res = await solicitarRecuperacionPasswordAction(targetEmail);
      if (!res.success) {
        setError(res.error || "No se pudo enviar el código de recuperación.");
        return;
      }
      setRecoveryEmail(targetEmail);
      setRecoveryStep("VERIFY_CODE");
      setRecoveryCode("");
      setSuccessMsg(res.message);
      setResendCooldown(60);
    } catch {
      setError("Error de comunicación al solicitar el código.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendRecoveryCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await solicitarRecuperacionPasswordAction(recoveryEmail);
      if (!res.success) {
        setError(res.error || "No se pudo reenviar el código.");
        return;
      }
      setSuccessMsg(res.message);
      setResendCooldown(60);
    } catch {
      setError("Error al reenviar el código.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    const cleanCode = recoveryCode.trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError("Ingresá el código numérico de 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const res = await verificarCodigoRecuperacionAction(recoveryEmail, cleanCode);
      if (!res.success || !res.resetToken) {
        setError(res.error || "Código incorrecto o vencido.");
        return;
      }
      setResetToken(res.resetToken);
      setRecoveryStep("RESET_PASSWORD");
      setSuccessMsg("Código verificado correctamente. Ingresá tu nueva contraseña.");
    } catch {
      setError("Error de comunicación al verificar el código.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!newPassword || newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await restablecerPasswordAction(recoveryEmail, resetToken, newPassword);
      if (!res.success) {
        setError(res.error || "No se pudo restablecer la contraseña.");
        return;
      }
      setSuccessMsg(res.message || "¡Contraseña restablecida con éxito!");
      setTimeout(() => {
        setMode("LOGIN");
        setUsername(recoveryEmail);
        setPassword("");
        setRecoveryStep("REQUEST_CODE");
        setRecoveryEmail("");
        setRecoveryCode("");
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMsg("");
        setError("");
      }, 1800);
    } catch {
      setError("Error de comunicación al restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
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
              if (!recoveryEmail) {
                if (email && email.includes("@")) {
                  setRecoveryEmail(email);
                } else if (username && username.includes("@")) {
                  setRecoveryEmail(username);
                }
              }
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

        {sessionExpiredNotice && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-400 flex items-center gap-2.5">
            <Lock size={16} className="shrink-0 text-amber-400" />
            <p className="font-semibold text-amber-300">{sessionExpiredNotice}</p>
          </div>
        )}

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
          <form onSubmit={handleLogin} className="grid grid-cols-2 gap-y-3.5 text-xs" autoComplete="off">
            {/* Campo 1: Usuario o Correo */}
            <div className="col-span-2">
              <label htmlFor="login-username" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Usuario o Correo
              </label>
              <div className="relative">
                <input
                  id="login-username"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresá tu usuario o correo"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                />
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Cabecera Contraseña: Label en col 1 */}
            <div className="col-span-1 self-end mb-1">
              <label htmlFor="login-password" className="text-slate-700 dark:text-slate-300 font-semibold">
                Contraseña
              </label>
            </div>

            {/* Campo 2: Input Contraseña (col-span-2) */}
            <div className="col-span-2 relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 pr-10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
              />
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 rounded transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Botón Ingresar */}
            <button
              type="submit"
              className="col-span-2 w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-xs font-bold text-white hover:bg-brandhover shadow transition-all active:scale-95"
            >
              <span>Ingresar a mi cuenta</span>
              <ArrowRight size={14} />
            </button>

            {/* Enlace Recuperar contraseña: En DOM va tras submit, pero visualmente se ubica en Fila 2, Columna 2 */}
            <div className="row-start-2 col-start-2 justify-self-end self-end mb-1">
              <button
                type="button"
                onClick={() => setMode("RECOVERY")}
                className="text-[11px] text-brand hover:underline"
              >
                ¿La olvidaste?
              </button>
            </div>
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
                DNI (para facturación y retiro)
              </label>
              <input
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ej: 34.567.890"
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
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Crear Contraseña *
              </label>
              <div className="relative">
                <input
                  required
                  type={showRegisterPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 pr-10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                  aria-label={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 rounded transition-colors"
                >
                  {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
          <div className="space-y-4 text-xs">
            {/* Indicador visual de los 3 pasos */}
            <div className="flex items-center justify-between pb-2 border-b border-line/60">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    recoveryStep === "REQUEST_CODE"
                      ? "bg-brand text-white shadow-sm"
                      : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {recoveryStep !== "REQUEST_CODE" ? "✓" : "1"}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    recoveryStep === "REQUEST_CODE" ? "text-white" : "text-slate-400"
                  }`}
                >
                  1. Correo
                </span>
              </div>

              <span className="text-slate-600 text-xs">→</span>

              <div className="flex items-center gap-1.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    recoveryStep === "VERIFY_CODE"
                      ? "bg-brand text-white shadow-sm"
                      : recoveryStep === "RESET_PASSWORD"
                      ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-surface text-slate-500 border border-line"
                  }`}
                >
                  {recoveryStep === "RESET_PASSWORD" ? "✓" : "2"}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    recoveryStep === "VERIFY_CODE" ? "text-white" : "text-slate-400"
                  }`}
                >
                  2. Código
                </span>
              </div>

              <span className="text-slate-600 text-xs">→</span>

              <div className="flex items-center gap-1.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    recoveryStep === "RESET_PASSWORD"
                      ? "bg-brand text-white shadow-sm"
                      : "bg-surface text-slate-500 border border-line"
                  }`}
                >
                  3
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    recoveryStep === "RESET_PASSWORD" ? "text-white" : "text-slate-400"
                  }`}
                >
                  3. Contraseña
                </span>
              </div>
            </div>

            {/* PASO 1: Solicitar Código */}
            {recoveryStep === "REQUEST_CODE" && (
              <form onSubmit={handleRequestRecoveryCode} className="space-y-3.5">
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Ingresá el correo asociado a tu cuenta. Te enviaremos un código de seguridad numérico de 6 dígitos para restablecer tu contraseña.
                </p>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="tunombre@gmail.com"
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 text-white placeholder-slate-500 outline-none focus:border-brand"
                    />
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover disabled:opacity-50 py-2.5 text-xs font-bold text-white shadow transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Enviando código...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={14} />
                      <span>Enviar Código al Correo</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* PASO 2: Verificar Código */}
            {recoveryStep === "VERIFY_CODE" && (
              <form onSubmit={handleVerifyRecoveryCode} className="space-y-3.5">
                <div className="rounded-xl border border-line bg-surface/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300">
                      Código enviado a:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryStep("REQUEST_CODE");
                        setError("");
                        setSuccessMsg("");
                      }}
                      className="text-brand hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft size={12} />
                      <span>Corregir correo</span>
                    </button>
                  </div>
                  <p className="font-bold text-white text-xs break-all">{recoveryEmail}</p>
                  <p className="text-[10px] text-slate-400">
                    ⏱ El código expira en 15 minutos. Si no lo ves, revisá la carpeta de correo no deseado (spam).
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-center">
                    Código de Seguridad (6 dígitos)
                  </label>
                  <input
                    required
                    autoFocus
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full text-center font-mono tracking-[0.5em] text-xl font-bold rounded-xl border border-line bg-surface py-2.5 text-white outline-none focus:border-brand"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || recoveryCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-2.5 text-xs font-bold text-white shadow transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={14} />
                      <span>Verificar Código</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  {resendCooldown > 0 ? (
                    <span className="text-[11px] text-slate-500">
                      Podés reenviar el código en {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendRecoveryCode}
                      disabled={loading}
                      className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      ¿No recibiste el correo? Reenviar código
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* PASO 3: Establecer Nueva Contraseña */}
            {recoveryStep === "RESET_PASSWORD" && (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle size={15} className="shrink-0 text-emerald-400" />
                  <span>Código validado para <strong>{recoveryEmail}</strong>.</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 pr-10 text-white placeholder-slate-500 outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Confirmar Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repetí la contraseña"
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 pr-10 text-white placeholder-slate-500 outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandhover disabled:opacity-50 py-2.5 text-xs font-bold text-white shadow transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Guardando contraseña...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      <span>Guardar Nueva Contraseña</span>
                    </>
                  )}
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
                  type={showStaffPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 pr-10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand"
                />
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowStaffPassword((prev) => !prev)}
                  aria-label={showStaffPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 rounded transition-colors"
                >
                  {showStaffPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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

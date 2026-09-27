"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Camera,
  CheckCircle2,
  Package,
  ShieldCheck,
  LogOut,
  FileText,
  AtSign,
  Trash2,
} from "lucide-react";

const AVATAR_PRESETS = [
  { id: "moto1", label: "Chopper Rider", emoji: "🏍️", bg: "bg-red-500/15 text-red-500 border-red-500/30" },
  { id: "moto2", label: "Casco Pista", emoji: "🪖", bg: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { id: "moto3", label: "Mecánico Pro", emoji: "🔧", bg: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  { id: "moto4", label: "Bandera Cuadros", emoji: "🏁", bg: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { id: "moto5", label: "Velocidad", emoji: "⚡", bg: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
];

export default function UserProfileModal() {
  const { user, isProfileOpen, closeProfile, updateUserProfile, uploadProfilePhoto, logout } = useAuth();

  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [dni, setDni] = useState("");
  const [cuit, setCuit] = useState("");
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (user) {
      setNombre(user.nombreCompleto || "");
      setUsername(user.username || "");
      setCorreo(user.correo || "");
      setTelefono(user.telefono || "376 524-3554");
      setDireccion(user.direccion || "Calle Félix de Azara 1890, Posadas, Misiones");
      setDni(user.dni || "34.567.890");
      setCuit(user.cuit || "");
      setAvatar(user.avatar || "");
      setPassword("");
      setNewPassword("");
      setSavedSuccess(false);
      setErrorMsg("");
    }
  }, [user, isProfileOpen]);

  if (!isProfileOpen || !user) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (user.rol !== "CLIENTE") {
        setIsUploadingPhoto(true);
        setErrorMsg("");
        const res = await uploadProfilePhoto(file);
        setIsUploadingPhoto(false);
        if (res.success && res.fotoUrl) {
          setAvatar(res.fotoUrl);
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2000);
        } else {
          setErrorMsg(res.error || "Error al subir la imagen");
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setAvatar(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");

    const res = await updateUserProfile({
      nombreCompleto: nombre.trim() || user.nombreCompleto,
      username: username.trim().toLowerCase() || user.username,
      correo: correo.trim() || user.correo,
      telefono: telefono.trim(),
      direccion: direccion.trim(),
      dni: dni.trim() || undefined,
      cuit: cuit.trim() || undefined,
      avatar: avatar || undefined,
      currentPassword: password.trim() || undefined,
      newPassword: newPassword.trim() || undefined,
    });

    setIsSaving(false);
    if (!res.success) {
      setErrorMsg(res.error || "Error al actualizar perfil.");
      return;
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      closeProfile();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-[#121318] p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-line/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand border border-brand/20 shadow-sm">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Perfil de Usuario
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {user.rol === "CLIENTE"
                  ? "Cuenta de Cliente Oficial · Chopper Repuestos"
                  : `Personal Autorizado (${user.rol})`}
              </p>
            </div>
          </div>

          <button
            onClick={closeProfile}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {savedSuccess && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold">¡Datos de perfil y foto actualizados con éxito!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* FOTO DE PERFIL / AVATAR */}
          <div className="rounded-xl border border-slate-200 dark:border-line/70 bg-slate-50 dark:bg-surface/50 p-4 space-y-3">
            <label className="block font-bold text-slate-900 dark:text-white">
              Foto o Avatar de Cliente
            </label>

            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-brand bg-white dark:bg-[#1a1b22] flex items-center justify-center shadow-md">
                {avatar ? (
                  avatar.startsWith("data:") || avatar.startsWith("http") ? (
                    <img
                      src={avatar}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">{avatar}</span>
                  )
                ) : (
                  <span className="text-2xl font-black text-brand">
                    {nombre ? nombre.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block font-medium">
                  Elegí un avatar motero o subí tu propia foto:
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatar(preset.emoji)}
                      className={`h-8 w-8 rounded-xl border flex items-center justify-center text-sm transition-all hover:scale-110 ${
                        avatar === preset.emoji
                          ? "border-brand bg-brand/20 ring-2 ring-brand"
                          : preset.bg
                      }`}
                      title={preset.label}
                    >
                      {preset.emoji}
                    </button>
                  ))}

                  <label className="cursor-pointer inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-brand hover:text-brand transition-colors shadow-xs">
                    <Camera size={13} />
                    <span>Subir foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar("")}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Quitar foto y usar inicial"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 1. DATOS PERSONALES */}
          <div className="space-y-3">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 block">
              Datos Personales y de Cuenta
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre y Apellido *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Carlos Motero"
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface py-2 px-3 pl-8 text-xs text-slate-900 dark:text-white outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de Usuario (opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="cliente / carlos"
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface py-2 px-3 pl-8 text-xs text-slate-900 dark:text-white outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <AtSign size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  DNI (para retiro y facturación)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Ej: 34.567.890"
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface py-2 px-3 pl-8 text-xs text-slate-900 dark:text-white outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <FileText size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CUIT / CUIL (opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cuit}
                    onChange={(e) => setCuit(e.target.value)}
                    placeholder="Ej: 20-34567890-4"
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface py-2 px-3 pl-8 text-xs text-slate-900 dark:text-white outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <FileText size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. CONTACTO Y ENTREGA */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-line/70">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 block">
              Contacto y Entrega en Posadas
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface py-2 px-3 pl-8 text-xs text-slate-900 dark:text-white outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Teléfono / WhatsApp (Posadas)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="376 524-3554"
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface py-2 px-3 pl-8 text-xs text-slate-900 dark:text-white outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dirección
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Calle Félix de Azara 1890, Posadas"
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface py-2 px-3 pl-8 text-xs text-slate-900 dark:text-white outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. CAMBIAR CONTRASEÑA */}
          <div className="rounded-xl border border-slate-200 dark:border-line/70 p-3.5 space-y-2.5 bg-slate-50/60 dark:bg-surface/30">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Lock size={13} className="text-amber-500" />
                <span>Seguridad y Contraseña</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPasswordFields(!showPasswordFields)}
                className="text-[11px] font-bold text-brand hover:underline"
              >
                {showPasswordFields ? "Ocultar" : "Modificar contraseña"}
              </button>
            </div>

            {showPasswordFields && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 dark:border-line/50 animate-in fade-in">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface py-1.5 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface py-1.5 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-brand"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. ACCESOS DIRECTOS */}
          <div className="pt-2 border-t border-slate-200 dark:border-line/60 flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/mis-pedidos"
              onClick={closeProfile}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-brand transition-colors"
            >
              <Package size={14} className="text-brand" />
              <span>Ver mis pedidos</span>
            </Link>

            {user.rol !== "CLIENTE" && (
              <Link
                href="/panel"
                onClick={closeProfile}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:underline"
              >
                <ShieldCheck size={14} />
                <span>Panel de Administración</span>
              </Link>
            )}

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 ml-auto transition-colors"
            >
              <LogOut size={13} />
              <span>Cerrar sesión</span>
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 font-semibold animate-in fade-in">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 5. BOTONES DE ACCIÓN */}
          <div className="pt-3 border-t border-slate-200 dark:border-line flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeProfile}
              className="rounded-xl border border-slate-300 dark:border-line px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploadingPhoto}
              className="rounded-xl bg-brand hover:bg-brandhover px-5 py-2 font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? "Guardando en BDD..." : isUploadingPhoto ? "Subiendo foto..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

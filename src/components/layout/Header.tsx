"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import CategoryDrawer from "./CategoryDrawer";
import LoginModal from "./LoginModal";
import UserProfileModal from "./UserProfileModal";
import {
  Search,
  ShoppingCart,
  Menu,
  User,
  Package,
  Sparkles,
  Layers,
  Info,
  Sun,
  Moon,
  ShieldCheck,
  MapPin,
  Clock,
  MessageCircle,
  LogOut,
} from "lucide-react";

const isImageAvatar = (val?: string | null): boolean => {
  if (!val) return false;
  return (
    val.startsWith("/") ||
    val.startsWith("http://") ||
    val.startsWith("https://") ||
    val.startsWith("data:") ||
    val.startsWith("blob:")
  );
};

export default function Header() {
  const { totalItems } = useCart();
  const { user, openLogin, logout, openProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const catParam = (searchParams?.get("cat") || "").toLowerCase();

  const isCombosActive =
    pathname === "/combos" ||
    (pathname === "/ofertas" && catParam.includes("combo"));

  const isOfertasActive =
    pathname === "/ofertas" && !isCombosActive;

  const isNosotrosActive =
    pathname === "/nosotros";

  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/ofertas?q=${encodeURIComponent(searchTerm.trim())}`);
      setMobileSearchOpen(false);
    }
  };

  const handleInputChange = (val: string) => {
    setSearchTerm(val);
    if (!val.trim()) {
      router.push("/ofertas");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 dark:bg-[#101114]/95 backdrop-blur-md transition-colors">
        {/* Barra superior de anuncios e información comercial */}
        <div className="border-b border-line/60 bg-slate-100/90 dark:bg-[#0e0f14] py-1.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
            <div className="flex items-center gap-4 text-[11px]">
              <a
                href="https://www.google.com/maps/place/Av.+Roque+S%C3%A1enz+Pe%C3%B1a+1500,+N3301BJF+Posadas,+Misiones/@-27.3649105,-55.8869655,17z"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-brand font-medium transition-colors"
              >
                <MapPin size={12} className="text-brand" />
                Av. Roque Sáenz Peña 1500 · Posadas, Misiones
              </a>
              <span className="hidden md:flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Clock size={12} className="text-brand" />
                Lun a Sáb 8:00-12:30 / 16:30-20:30
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                🛵 Motomandado y Moto Uber en el día
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <Link
                href="/mis-pedidos"
                className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-brand dark:hover:text-white transition-colors font-medium"
              >
                <Package size={12} className="text-brand" />
                Pedidos
              </Link>
              <a
                href="https://wa.me/5493765243554"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold transition-colors"
              >
                <MessageCircle size={12} />
                <span>WhatsApp: 376 524-3554</span>
              </a>
            </div>
          </div>
        </div>

        {/* Header Principal */}
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          {/* Botón 3 Rayitas / Productos */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-brand hover:text-brand dark:hover:text-white transition-all shrink-0 active:scale-95"
            title="Abrir menú de categorías"
          >
            <Menu size={18} className="text-brand" />
            <span className="hidden sm:inline">Productos</span>
          </button>

          {/* Logo oficial optimizado sin texto inferior para máxima legibilidad */}
          <Link
            href="/"
            className="flex items-center shrink-0 group py-0.5 rounded-xl transition-all"
            title="Chopper Repuestos - Posadas, Misiones"
          >
            <Image
              src="/logo-nav.png"
              alt="Chopper Repuestos"
              width={180}
              height={90}
              priority
              className="h-11 sm:h-12 w-auto object-contain rounded-lg drop-shadow transition-all duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Buscador Desktop */}
          <form onSubmit={handleSearch} className="relative hidden flex-1 max-w-md mx-2 md:block">
            <input
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-2 pr-11 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              placeholder="Buscar en Chopper... (cubiertas, aceites, frenos, bujías)"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              aria-label="Buscar"
            >
              <Search size={16} />
            </button>
          </form>

          {/* Navegación central con marcado activo dinámico */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold">
            <Link
              href="/ofertas"
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all ${
                isOfertasActive
                  ? "border border-brand/40 bg-brand/10 text-brand shadow-xs"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface hover:text-brand dark:hover:text-white"
              }`}
            >
              <Sparkles size={14} className={isOfertasActive ? "fill-brand text-brand" : "text-brand"} />
              <span>Ofertas</span>
            </Link>

            <Link
              href="/ofertas?cat=combos"
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all ${
                isCombosActive
                  ? "border border-amber-500/40 bg-amber-500/10 text-amber-500 dark:text-amber-400 shadow-xs"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface hover:text-amber-500 dark:hover:text-amber-400"
              }`}
            >
              <Layers size={14} className="text-amber-500 dark:text-amber-400" />
              <span>Combos</span>
            </Link>

            <Link
              href="/nosotros"
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all ${
                isNosotrosActive
                  ? "border border-sky-500/40 bg-sky-500/10 text-sky-500 dark:text-sky-400 shadow-xs"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface hover:text-sky-500 dark:hover:text-sky-400"
              }`}
            >
              <Info size={14} className="text-sky-500 dark:text-sky-400" />
              <span>Nosotros</span>
            </Link>
          </nav>

          {/* Acciones Derecha: Toggle Tema, Auth, Carrito */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Buscador móvil */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="flex md:hidden rounded-xl border border-line bg-surface p-2 text-slate-300 hover:text-white transition-colors"
              aria-label="Buscar en catálogo"
            >
              <Search size={18} />
            </button>

            {/* Selector Dark/Light */}
            <button
              onClick={toggleTheme}
              className="rounded-xl border border-line bg-surface p-2 text-slate-300 hover:border-slate-500 hover:text-white transition-all active:scale-95"
              title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-label="Alternar tema visual"
            >
              {theme === "dark" ? (
                <Sun size={17} className="text-amber-400" />
              ) : (
                <Moon size={17} className="text-slate-700" />
              )}
            </button>

            {/* Panel de Usuario o Ingresar / Perfil */}
            {user ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={openProfile}
                  className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand hover:text-brand transition-all active:scale-95 shadow-sm"
                  title="Ver y editar mi perfil, foto o contraseña"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 border border-brand/30 text-brand text-xs font-bold shrink-0 overflow-hidden">
                    {user.avatar ? (
                      isImageAvatar(user.avatar) ? (
                        <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span>{user.avatar}</span>
                      )
                    ) : (
                      <span>{user.nombreCompleto ? user.nombreCompleto.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="hidden sm:inline font-bold text-xs truncate max-w-[110px]">
                    {user.nombreCompleto || user.username}
                  </span>
                </button>

                <button
                  onClick={logout}
                  className="flex items-center justify-center rounded-xl border border-line bg-surface p-2 text-slate-500 hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10 dark:text-slate-400 dark:hover:text-red-400 transition-all active:scale-95 shadow-sm"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                >
                  <LogOut size={15} />
                </button>

                {user.rol !== "CLIENTE" && (
                  <Link
                    href="/panel"
                    className="hidden md:flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-500 hover:bg-amber-500/20 transition-all"
                    title="Panel de Administración"
                  >
                    <ShieldCheck size={13} />
                    <span>Panel</span>
                  </Link>
                )}
              </div>
            ) : (
              <button
                onClick={openLogin}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-brand hover:text-brand dark:hover:text-white transition-all active:scale-95"
              >
                <User size={15} className="text-slate-400" />
                <span className="hidden sm:inline">Ingresar</span>
              </button>
            )}

            {/* Botón Carrito */}
            <Link
              href="/carrito"
              className="relative flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white shadow-lg shadow-brand/20 hover:bg-brandhover transition-all active:scale-95"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Carrito</span>
              {totalItems > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-black text-brand">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Buscador Móvil Desplegable */}
        {mobileSearchOpen && (
          <div className="p-3 border-t border-line bg-surface md:hidden">
            <form onSubmit={handleSearch} className="relative">
              <input
                value={searchTerm}
                onChange={(e) => handleInputChange(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-line bg-card px-4 py-2 pr-10 text-xs text-white placeholder-slate-500 outline-none focus:border-brand"
                placeholder="Buscar repuestos, cubiertas, aceites..."
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <Search size={16} />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Drawer lateral de categorías */}
      <CategoryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Modal interactivo de Inicio de Sesión / Registro / Administración */}
      <LoginModal />

      {/* Modal interactivo de Perfil de Cliente */}
      <UserProfileModal />
    </>
  );
}

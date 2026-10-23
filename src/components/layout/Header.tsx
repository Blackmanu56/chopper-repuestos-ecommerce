"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useConfig } from "@/context/ConfigContext";
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
  ChevronDown,
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
  const { config } = useConfig();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isCombosActive = pathname.startsWith("/combos");
  const isOfertasActive = pathname === "/ofertas";

  const isNosotrosActive =
    pathname === "/nosotros";

  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const cleanWhatsappNumber = (config.whatsapp || "5493765243554").replace(/\D/g, "");
  const mapsHref = config.mapa_url || `https://maps.google.com/?q=${encodeURIComponent(config.direccion || "Av. Roque Sáenz Peña 1500, Posadas, Misiones")}`;

  const topBarItems = useMemo(() => {
    const list: { id: string; node: React.ReactNode }[] = [
      {
        id: "direccion",
        node: (
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-brand dark:hover:text-white transition-colors whitespace-nowrap group"
          >
            <MapPin size={13.5} className="text-brand shrink-0 transition-transform group-hover:scale-110 motion-reduce:transform-none" />
            <span className="font-medium">{config.direccion || "Av. Roque Sáenz Peña 1500 · Posadas, Misiones"}</span>
          </a>
        ),
      },
      {
        id: "horarios",
        node: (
          <div className="shrink-0 inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
            <Clock size={13.5} className="text-brand shrink-0" />
            <span className="font-medium">
              Horarios: <strong className="font-semibold text-slate-900 dark:text-white">{config.horarios || "Lun a Sáb 8:00-12:30 / 16:30-20:30"}</strong>
            </span>
          </div>
        ),
      },
    ];

    if (config.mostrar_banner_promocion && config.texto_banner) {
      list.push({
        id: "promo",
        node: (
          <div className="shrink-0 inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{config.texto_banner}</span>
          </div>
        ),
      });
    }

    list.push(
      {
        id: "pedidos",
        node: (
          <Link
            href="/mis-pedidos"
            className="shrink-0 inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-brand dark:hover:text-white transition-colors whitespace-nowrap group"
          >
            <Package size={13.5} className="text-brand shrink-0 transition-transform group-hover:scale-110 motion-reduce:transform-none" />
            <span className="font-medium">
              Seguí tu compra en <strong className="font-semibold text-slate-900 dark:text-white underline underline-offset-2">Mis Pedidos</strong>
            </span>
          </Link>
        ),
      },
      {
        id: "whatsapp",
        node: (
          <a
            href={`https://wa.me/${cleanWhatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-bold transition-colors whitespace-nowrap group"
          >
            <MessageCircle size={14} className="shrink-0 text-emerald-500 transition-transform group-hover:scale-110 motion-reduce:transform-none" />
            <span>
              WhatsApp: <strong className="font-bold">{config.telefono || "376 524-3554"}</strong>
            </span>
          </a>
        ),
      }
    );

    return list;
  }, [config, mapsHref, cleanWhatsappNumber]);

  // Duplicamos los elementos en dos mitades simétricas idénticas para garantizar
  // un ciclo de desplazamiento continuo horizontal sin cortes al llegar al -50%
  const topBarLoop = useMemo(() => {
    const half = [...topBarItems, ...topBarItems, ...topBarItems];
    return [...half, ...half];
  }, [topBarItems]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 dark:bg-[#101114]/95 backdrop-blur-md transition-colors">
        {/* Barra superior continua estilo marquesina idéntica a carrusel de marcas */}
        <div
          className="border-b border-line/60 bg-slate-100/90 dark:bg-[#0c0d12] py-2 text-xs text-slate-600 dark:text-slate-400 overflow-hidden select-none transition-colors"
          aria-label="Información comercial y avisos"
        >
          <div
            className="animate-marquee-smooth flex items-center gap-12 motion-reduce:animate-none"
            style={{ animationDuration: "68s" }}
          >
            {topBarLoop.map((item, idx) => (
              <React.Fragment key={`${item.id}-${idx}`}>
                {item.node}
                <span
                  className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 shrink-0 select-none"
                  aria-hidden="true"
                />
              </React.Fragment>
            ))}
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
            title={`${config.nombre_tienda || "Chopper Repuestos"} - Posadas, Misiones`}
          >
            <Image
              src={config.logo_url || "/logo-nav.png"}
              alt={config.nombre_tienda || "Chopper Repuestos"}
              width={180}
              height={90}
              priority
              unoptimized
              className="h-11 sm:h-12 w-auto object-contain rounded-lg drop-shadow transition-all duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Buscador Desktop */}
          <form onSubmit={handleSearch} className="relative hidden flex-1 max-w-md mx-2 md:block">
            <input
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-2 pr-11 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              placeholder="Buscar en Chopper Repuestos..."
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
              href="/combos"
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
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand hover:text-brand transition-all active:scale-95 shadow-sm"
                  title="Menú de usuario"
                  aria-expanded={isUserMenuOpen}
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
                  <ChevronDown size={13} className={`text-slate-400 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Menú desplegable */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-[#121318] shadow-2xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-line/60 mb-1">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {user.nombreCompleto || user.username}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{user.correo}</p>
                      {user.rol !== "CLIENTE" && (
                        <span className="mt-1 inline-block rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1.5 py-0.5 text-[10px] font-bold">
                          {user.rol}
                        </span>
                      )}
                    </div>

                    <Link
                      href="/mis-pedidos"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-brand/10 hover:text-brand transition-colors"
                    >
                      <Package size={15} className="text-brand shrink-0" />
                      <span>Mis Pedidos</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        openProfile();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface transition-colors"
                    >
                      <User size={15} className="text-slate-400 shrink-0" />
                      <span>Mi Perfil</span>
                    </button>

                    {user.rol !== "CLIENTE" && (
                      <Link
                        href="/panel"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <ShieldCheck size={15} className="shrink-0 text-amber-500" />
                        <span>Panel de Gestión</span>
                      </Link>
                    )}

                    <div className="border-t border-slate-100 dark:border-line/60 my-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <LogOut size={15} className="shrink-0" />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  </div>
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
                placeholder="Buscar en Chopper Repuestos..."
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

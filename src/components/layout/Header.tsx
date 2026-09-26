"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, Search } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const { totalItems } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push("/");
    }
  };

  const handleInputChange = (val: string) => {
    setSearchTerm(val);
    if (!val.trim()) {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#101114]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-left">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-black text-white">
            C
          </div>
          <div>
            <div className="text-base font-black leading-none tracking-tight">CHOPER</div>
            <div className="text-[11px] text-slate-400">Repuestos de Moto</div>
          </div>
        </Link>

        {/* Buscador Desktop */}
        <form onSubmit={handleSearch} className="relative hidden flex-1 md:block">
          <input
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-4 py-2 pr-10 text-sm text-white placeholder-slate-500 outline-none focus:border-brand transition-colors"
            placeholder="Buscar repuestos, marcas, códigos..."
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <Search size={16} />
          </button>
        </form>

        {/* Navegación */}
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Tienda
          </Link>
          <Link
            href="/mis-pedidos"
            className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Mis pedidos
          </Link>
          <Link
            href="/panel"
            className="hidden rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white sm:block transition-colors"
          >
            Panel
          </Link>
          <Link
            href="/carrito"
            className="relative ml-1 rounded-lg bg-brand p-2 text-white hover:bg-brandhover transition-colors flex items-center justify-center"
            title="Ver carrito"
          >
            <ShoppingCart size={18} />
            {totalItems > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-brand shadow">
                {totalItems}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* Buscador Mobile */}
      <div className="px-4 pb-3 md:hidden">
        <form onSubmit={handleSearch} className="relative">
          <input
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-4 py-2 pr-10 text-sm text-white placeholder-slate-500 outline-none focus:border-brand"
            placeholder="Buscar repuestos..."
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          >
            <Search size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}

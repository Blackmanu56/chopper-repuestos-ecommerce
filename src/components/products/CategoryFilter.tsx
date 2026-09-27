"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CategoryItem } from "@/actions/ecommerce";

export default function CategoryFilter({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat") || "";
  const selectedCat = categories.find(
    (c) => c.id.toString() === catParam || c.nombre.toLowerCase() === catParam.toLowerCase()
  );
  const selectedCatId = selectedCat ? selectedCat.id : (!catParam ? undefined : -1);
  const currentQ = searchParams.get("q") || "";

  const handleSelect = (catId?: number) => {
    const params = new URLSearchParams();
    if (currentQ) params.set("q", currentQ);
    if (catId) params.set("cat", catId.toString());

    const qs = params.toString();
    router.push(qs ? `/?${qs}#catalogo` : "/#catalogo");
  };

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <button
        onClick={() => handleSelect(undefined)}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          selectedCatId === undefined
            ? "border-brand bg-brand/15 text-brand"
            : "border-line text-slate-300 hover:bg-white/5"
        }`}
      >
        Todas
      </button>

      {categories.map((cat) => {
        const isActive = selectedCatId === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-brand bg-brand/15 text-brand"
                : "border-line text-slate-300 hover:bg-white/5"
            }`}
          >
            {cat.nombre}
            <span className="ml-1 opacity-60">({cat.count})</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ProductItem } from "@/actions/ecommerce";

export interface CartItem {
  id: number;
  nombre: string;
  marca: string;
  categoriaNombre: string;
  precio: number;
  cantidad: number;
  stock: number;
  imagen?: string | null;
}

export interface PedidoItem {
  id: number;
  nombre: string;
  marca: string;
  precio: number;
  cantidad: number;
}

export interface Pedido {
  numero: number;
  fecha: string;
  nombre: string;
  dni: string;
  tel: string;
  email: string;
  pago: "EFECTIVO" | "TRANSFERENCIA";
  estado: "PENDIENTE" | "CONFIRMADO" | "PREPARANDO" | "LISTO_PARA_RETIRAR" | "RETIRADO" | "CANCELADO";
  items: PedidoItem[];
  total: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: ProductItem, cantidad?: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  toastMessage: string | null;
  pedidos: Pedido[];
  crearPedido: (datos: {
    nombre: string;
    dni: string;
    tel: string;
    email: string;
    pago: "EFECTIVO" | "TRANSFERENCIA";
  }) => number | null;
  cambiarEstadoPedido: (numero: number, nuevoEstado: Pedido["estado"]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("choper_cart");
      if (savedCart) setItems(JSON.parse(savedCart));

      const savedPedidos = localStorage.getItem("choper_pedidos");
      if (savedPedidos) {
        setPedidos(JSON.parse(savedPedidos));
      } else {
        // Sample order matching mockup
        const defaultPedidos: Pedido[] = [
          {
            numero: 1001,
            fecha: "26/09/2026 14:22",
            nombre: "Juan García",
            dni: "31.254.770",
            tel: "351 555-4433",
            email: "juan.garcia@gmail.com",
            pago: "EFECTIVO",
            estado: "LISTO_PARA_RETIRAR",
            items: [
              {
                id: 1,
                nombre: "Kit de transmisión para Honda CG 150",
                marca: "Honda",
                precio: 15000,
                cantidad: 1,
              },
              {
                id: 2,
                nombre: "Pastillas de freno delantero Rouser NS200",
                marca: "Bajaj",
                precio: 7500,
                cantidad: 2,
              },
            ],
            total: 30000,
          },
        ];
        setPedidos(defaultPedidos);
        localStorage.setItem("choper_pedidos", JSON.stringify(defaultPedidos));
      }
    } catch (e) {
      console.error("Error reading localStorage:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("choper_cart", JSON.stringify(items));
    } catch (e) {
      console.error("Error saving cart to localStorage:", e);
    }
  }, [items, isLoaded]);

  // Save pedidos to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("choper_pedidos", JSON.stringify(pedidos));
    } catch (e) {
      console.error("Error saving pedidos to localStorage:", e);
    }
  }, [pedidos, isLoaded]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const addToCart = (product: ProductItem, cantidad: number = 1) => {
    if (product.stock <= 0) {
      showToast("Producto sin stock disponible");
      return;
    }

    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        const nuevaCantidad = existing.cantidad + cantidad;
        if (nuevaCantidad > product.stock) {
          showToast(`Solo hay ${product.stock} unidades en stock`);
          return prev;
        }
        showToast(`${product.nombre} actualizado en el carrito`);
        return prev.map((item) =>
          item.id === product.id ? { ...item, cantidad: nuevaCantidad } : item
        );
      } else {
        showToast(`${product.nombre} agregado al carrito`);
        return [
          ...prev,
          {
            id: product.id,
            nombre: product.nombre,
            marca: product.marca,
            categoriaNombre: product.categoriaNombre,
            precio: product.precio,
            cantidad: Math.min(cantidad, product.stock),
            stock: product.stock,
            imagen: product.imagen,
          },
        ];
      }
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nuevaCantidad = item.cantidad + delta;
            if (nuevaCantidad > item.stock) {
              showToast(`Stock máximo disponible alcanzado (${item.stock} u.)`);
              return item;
            }
            return nuevaCantidad <= 0 ? null : { ...item, cantidad: nuevaCantidad };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);
  const subtotal = items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const crearPedido = (datos: {
    nombre: string;
    dni: string;
    tel: string;
    email: string;
    pago: "EFECTIVO" | "TRANSFERENCIA";
  }): number | null => {
    if (items.length === 0) return null;

    const nextNumero =
      pedidos.length > 0 ? Math.max(...pedidos.map((p) => p.numero)) + 1 : 1001;

    const nuevoPedido: Pedido = {
      numero: nextNumero,
      fecha: new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      nombre: datos.nombre,
      dni: datos.dni,
      tel: datos.tel,
      email: datos.email,
      pago: datos.pago,
      estado: "PENDIENTE",
      items: items.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        marca: i.marca,
        precio: i.precio,
        cantidad: i.cantidad,
      })),
      total: subtotal,
    };

    setPedidos((prev) => [nuevoPedido, ...prev]);
    clearCart();
    return nextNumero;
  };

  const cambiarEstadoPedido = (numero: number, nuevoEstado: Pedido["estado"]) => {
    setPedidos((prev) =>
      prev.map((p) => (p.numero === numero ? { ...p, estado: nuevoEstado } : p))
    );
    showToast(`Pedido #${numero} actualizado a ${nuevoEstado.replace(/_/g, " ")}`);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        subtotal,
        toastMessage,
        pedidos,
        crearPedido,
        cambiarEstadoPedido,
      }}
    >
      {children}
      {toastMessage && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-2xl transition-all animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

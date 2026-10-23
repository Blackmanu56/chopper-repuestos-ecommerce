"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ProductItem } from "@/actions/ecommerce";
import { useAuth } from "@/context/AuthContext";

export interface CartItemComponente {
  productoId: number;
  cantidad: number;
  nombre?: string;
  stockProducto?: number;
}

export interface CartItem {
  id: number;
  cartItemId?: string;
  nombre: string;
  marca: string;
  categoriaNombre: string;
  precio: number;
  cantidad: number;
  stock: number;
  imagen?: string | null;
  esCombo?: boolean;
  componentes?: CartItemComponente[];
}

export function getCartItemKey(item: { id: number; esCombo?: boolean; cartItemId?: string }): string {
  if (item.cartItemId) return item.cartItemId;
  return item.esCombo ? `combo-${item.id}` : `prod-${item.id}`;
}

export interface PedidoItem {
  id: number;
  nombre: string;
  marca: string;
  precio: number;
  cantidad: number;
  esCombo?: boolean;
}

export interface Pedido {
  numero: number;
  fecha: string;
  nombre: string;
  dni: string;
  tel: string;
  email: string;
  pago: "TRANSFERENCIA" | "TARJETA" | "EFECTIVO_LOCAL" | "EFECTIVO";
  modalidadEntrega: "RETIRO_LOCAL" | "MOTOMANDADO";
  costoEnvio?: number;
  codigoTicket?: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "PREPARANDO" | "LISTO_ENTREGA" | "LISTO_PARA_RETIRAR" | "ENTREGADO" | "RETIRADO" | "CANCELADO";
  estadoPago?: string;
  fechaPago?: string | Date | null;
  items: PedidoItem[];
  total: number;
}

interface CartContextType {
  items: CartItem[];
  isStaff: boolean;
  addToCart: (product: ProductItem & { componentes?: CartItemComponente[] }, cantidad?: number) => void;
  updateQuantity: (idOrKey: number | string, delta: number, esCombo?: boolean) => void;
  removeFromCart: (idOrKey: number | string, esCombo?: boolean) => void;
  clearCart: () => void;
  sincronizarCarrito: (validated: any[]) => void;
  totalItems: number;
  subtotal: number;
  toastMessage: string | null;
  pedidos: Pedido[];
  crearPedido: (datos: {
    nombre: string;
    dni: string;
    tel: string;
    email: string;
    pago: "TRANSFERENCIA" | "TARJETA" | "EFECTIVO_LOCAL" | "EFECTIVO";
    modalidadEntrega?: "RETIRO_LOCAL" | "MOTOMANDADO";
    costoEnvio?: number;
    itemsVerificados?: PedidoItem[];
    totalVerificado?: number;
  }) => number | null;
  cambiarEstadoPedido: (numero: number, nuevoEstado: Pedido["estado"]) => void;
  cancelarPedido: (numero: number) => void;
  getItemCartQuantity: (id: number, esCombo?: boolean) => number;
  getRemainingStock: (product: {
    id: number;
    stock: number;
    esCombo?: boolean;
    componentes?: CartItemComponente[];
  }) => number;
  isItemAtLimit: (product: {
    id: number;
    stock: number;
    esCombo?: boolean;
    componentes?: CartItemComponente[];
  }) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isStaff } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const getStorageKey = (currentUser: typeof user) => {
    if (!currentUser) return "choper_cart_guest";
    if (currentUser.rol === "CLIENTE") return `choper_cart_client_${currentUser.id}`;
    return `choper_cart_staff_${currentUser.id}`;
  };

  // Carga y aislamiento de carritos por tipo de sesión
  useEffect(() => {
    try {
      if (isStaff) {
        // Cuentas de personal: no tienen permitido operar ni comprar en la tienda pública
        setItems([]);
        setIsLoaded(true);
        return;
      }

      let rawSaved: string | null = null;
      if (user && user.rol === "CLIENTE") {
        rawSaved = localStorage.getItem(`choper_cart_client_${user.id}`);
        // Si el cliente no tiene carrito guardado aún, migrar el carrito del visitante (guest)
        if (!rawSaved) {
          const guestSaved = localStorage.getItem("choper_cart_guest") || localStorage.getItem("choper_cart");
          if (guestSaved) {
            rawSaved = guestSaved;
            localStorage.setItem(`choper_cart_client_${user.id}`, guestSaved);
            localStorage.removeItem("choper_cart_guest");
          }
        }
      } else {
        // Visitante
        rawSaved = localStorage.getItem("choper_cart_guest") || localStorage.getItem("choper_cart");
      }

      if (rawSaved) {
        const parsed = JSON.parse(rawSaved);
        if (Array.isArray(parsed)) {
          const sanitized: CartItem[] = [];
          for (const raw of parsed) {
            if (!raw || typeof raw.id !== "number" || raw.id <= 0) continue;

            const esCombo = Boolean(
              raw.esCombo === true ||
              (typeof raw.cartItemId === "string" && raw.cartItemId.startsWith("combo-")) ||
              raw.categoriaNombre === "Combos Armados" ||
              raw.categoriaId === 9999 ||
              raw.marca === "Combo Chopper"
            );

            const cartItemId = raw.cartItemId || (esCombo ? `combo-${raw.id}` : `prod-${raw.id}`);

            const existingIndex = sanitized.findIndex((s) => s.cartItemId === cartItemId);
            if (existingIndex >= 0) {
              sanitized[existingIndex].cantidad = Math.min(
                sanitized[existingIndex].cantidad + (Number(raw.cantidad) || 1),
                sanitized[existingIndex].stock || 99
              );
            } else {
              sanitized.push({
                ...raw,
                id: Number(raw.id),
                cartItemId,
                esCombo,
                cantidad: Math.max(1, Number(raw.cantidad) || 1),
                precio: Number(raw.precio) || 0,
                stock: Number(raw.stock) || 0,
              });
            }
          }
          setItems(sanitized);
        }
      } else {
        setItems([]);
      }

      const savedPedidos = localStorage.getItem("choper_pedidos");
      if (savedPedidos) {
        setPedidos(JSON.parse(savedPedidos));
      } else {
        setPedidos([]);
      }
    } catch (e) {
      console.error("Error reading localStorage:", e);
    } finally {
      setIsLoaded(true);
    }
  }, [user?.id, user?.rol, isStaff]);

  // Guardar carrito en localStorage de forma aislada (el personal nunca guarda operaciones de compra)
  useEffect(() => {
    if (!isLoaded || isStaff) return;
    try {
      const key = getStorageKey(user);
      localStorage.setItem(key, JSON.stringify(items));
      if (!user) {
        localStorage.setItem("choper_cart", JSON.stringify(items));
      }
    } catch (e) {
      console.error("Error saving cart to localStorage:", e);
    }
  }, [items, isLoaded, user, isStaff]);

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
    }, 3200);
  };

  const computeCartDemand = (cartItems: CartItem[]): Map<number, number> => {
    const demand = new Map<number, number>();
    for (const item of cartItems) {
      if (item.esCombo && item.componentes && item.componentes.length > 0) {
        for (const comp of item.componentes) {
          const cur = demand.get(comp.productoId) || 0;
          demand.set(comp.productoId, cur + comp.cantidad * item.cantidad);
        }
      } else if (!item.esCombo) {
        const cur = demand.get(item.id) || 0;
        demand.set(item.id, cur + item.cantidad);
      }
    }
    return demand;
  };

  const getItemCartQuantity = (id: number, esCombo?: boolean): number => {
    const isCombo = Boolean(esCombo);
    const itemKey = isCombo ? `combo-${id}` : `prod-${id}`;
    const found = items.find((i) => {
      if (i.cartItemId) return i.cartItemId === itemKey;
      return i.id === id && Boolean(i.esCombo) === isCombo;
    });
    return found ? found.cantidad : 0;
  };

  const getRemainingStock = (product: {
    id: number;
    stock: number;
    esCombo?: boolean;
    componentes?: CartItemComponente[];
  }): number => {
    if (product.stock <= 0) return 0;
    const esCombo = Boolean(product.esCombo);

    if (esCombo && product.componentes && product.componentes.length > 0) {
      const demand = computeCartDemand(items);
      const possibleAdditions = product.componentes.map((comp) => {
        const compStock =
          comp.stockProducto !== undefined ? comp.stockProducto : comp.cantidad * product.stock;
        const alreadyUsed = demand.get(comp.productoId) || 0;
        const remainingCompStock = Math.max(0, compStock - alreadyUsed);
        return Math.floor(remainingCompStock / comp.cantidad);
      });
      return Math.max(0, Math.min(product.stock, ...possibleAdditions));
    }

    const demand = computeCartDemand(items);
    const alreadyUsed = demand.get(product.id) || 0;
    return Math.max(0, product.stock - alreadyUsed);
  };

  const isItemAtLimit = (product: {
    id: number;
    stock: number;
    esCombo?: boolean;
    componentes?: CartItemComponente[];
  }): boolean => {
    if (product.stock <= 0) return true;
    return getRemainingStock(product) <= 0;
  };

  const addToCart = (
    product: ProductItem & { componentes?: CartItemComponente[] },
    cantidad: number = 1
  ) => {
    if (isStaff) {
      showToast("Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente.");
      return;
    }

    if (product.stock <= 0) {
      showToast("Producto sin stock disponible");
      return;
    }

    const cantSolicitada = Math.max(1, Math.floor(cantidad || 1));
    const esCombo = Boolean(
      (product as any).esCombo === true ||
      product.categoriaNombre === "Combos Armados" ||
      product.categoriaId === 9999 ||
      product.marca === "Combo Chopper"
    );
    const itemKey = esCombo ? `combo-${product.id}` : `prod-${product.id}`;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => {
        if (item.cartItemId) return item.cartItemId === itemKey;
        return item.id === product.id && Boolean(item.esCombo) === esCombo;
      });

      const demand = computeCartDemand(prev);
      let remaining = 0;

      if (esCombo && product.componentes && product.componentes.length > 0) {
        const possibleAdditions = product.componentes.map((comp) => {
          const compStock =
            comp.stockProducto !== undefined ? comp.stockProducto : comp.cantidad * product.stock;
          const alreadyUsed = demand.get(comp.productoId) || 0;
          const remainingCompStock = Math.max(0, compStock - alreadyUsed);
          return Math.floor(remainingCompStock / comp.cantidad);
        });
        remaining = Math.max(0, Math.min(product.stock, ...possibleAdditions));
      } else {
        const alreadyUsed = demand.get(product.id) || 0;
        remaining = Math.max(0, product.stock - alreadyUsed);
      }

      if (remaining <= 0) {
        showToast("Ya tenés todas las unidades disponibles en tu carrito");
        return prev;
      }

      const toAdd = Math.min(cantSolicitada, remaining);

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const nuevaCantidad = existing.cantidad + toAdd;

        if (toAdd < cantSolicitada) {
          showToast(`Se agregaron las ${toAdd} u. restantes disponibles (${nuevaCantidad} u. en total)`);
        } else {
          showToast(`${product.nombre} actualizado en el carrito`);
        }

        return prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                cantidad: nuevaCantidad,
                stock: product.stock,
                componentes: product.componentes || item.componentes,
              }
            : item
        );
      } else {
        if (toAdd < cantSolicitada) {
          showToast(`Se agregaron las ${toAdd} u. restantes disponibles (límite alcanzado)`);
        } else {
          showToast(`${product.nombre} agregado al carrito`);
        }

        return [
          ...prev,
          {
            id: product.id,
            cartItemId: itemKey,
            nombre: product.nombre,
            marca: product.marca,
            categoriaNombre: product.categoriaNombre,
            precio: product.precio,
            cantidad: toAdd,
            stock: product.stock,
            imagen: product.imagen,
            esCombo,
            componentes: product.componentes,
          },
        ];
      }
    });
  };

  const updateQuantity = (idOrKey: number | string, delta: number, esCombo?: boolean) => {
    if (isStaff) {
      showToast("Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente.");
      return;
    }

    setItems((prev) => {
      const targetIndex = prev.findIndex((item) => {
        if (typeof idOrKey === "string") {
          return item.cartItemId === idOrKey || getCartItemKey(item) === idOrKey;
        }
        return item.id === idOrKey && (esCombo === undefined || Boolean(item.esCombo) === esCombo);
      });

      if (targetIndex < 0) return prev;

      const item = prev[targetIndex];

      if (delta > 0) {
        const demand = computeCartDemand(prev);
        let remaining = 0;
        if (item.esCombo && item.componentes && item.componentes.length > 0) {
          const possible = item.componentes.map((comp) => {
            const compStock =
              comp.stockProducto !== undefined ? comp.stockProducto : comp.cantidad * item.stock;
            const alreadyUsed = demand.get(comp.productoId) || 0;
            const remainingComp = Math.max(0, compStock - alreadyUsed);
            return Math.floor(remainingComp / comp.cantidad);
          });
          remaining = Math.max(0, Math.min(item.stock, ...possible));
        } else {
          const alreadyUsed = demand.get(item.id) || 0;
          remaining = Math.max(0, item.stock - alreadyUsed);
        }

        if (remaining <= 0 || item.cantidad >= item.stock) {
          showToast("Ya tenés todas las unidades disponibles en tu carrito");
          return prev;
        }
      }

      const nuevaCantidad = item.cantidad + delta;
      if (nuevaCantidad <= 0) {
        return prev.filter((_, idx) => idx !== targetIndex);
      }

      return prev.map((it, idx) => (idx === targetIndex ? { ...it, cantidad: nuevaCantidad } : it));
    });
  };

  const removeFromCart = (idOrKey: number | string, esCombo?: boolean) => {
    setItems((prev) =>
      prev.filter((item) => {
        const match =
          typeof idOrKey === "string"
            ? item.cartItemId === idOrKey || getCartItemKey(item) === idOrKey
            : item.id === idOrKey && (esCombo === undefined || Boolean(item.esCombo) === esCombo);
        return !match;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      const key = getStorageKey(user);
      localStorage.removeItem(key);
      if (!user) localStorage.removeItem("choper_cart");
    } catch {}
  };

  const sincronizarCarrito = (validated: any[]) => {
    if (!Array.isArray(validated)) return;
    setItems((prev) => {
      return prev.map((localItem) => {
        const val = validated.find((v) => {
          if (v.cartItemId && localItem.cartItemId) {
            return v.cartItemId === localItem.cartItemId;
          }
          return v.id === localItem.id && Boolean(v.esCombo) === Boolean(localItem.esCombo);
        });
        if (val) {
          return {
            ...localItem,
            nombre: val.nombre,
            marca: val.marca,
            precio: val.precioFinal,
            stock: val.stockDisponible,
            imagen: val.imagen || localItem.imagen,
            cantidad: Math.min(localItem.cantidad, Math.max(1, val.stockDisponible)),
          };
        }
        return localItem;
      });
    });
  };

  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);
  const subtotal = items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const crearPedido = (datos: {
    nombre: string;
    dni: string;
    tel: string;
    email: string;
    pago: "TRANSFERENCIA" | "TARJETA" | "EFECTIVO_LOCAL" | "EFECTIVO";
    modalidadEntrega?: "RETIRO_LOCAL" | "MOTOMANDADO";
    costoEnvio?: number;
    itemsVerificados?: PedidoItem[];
    totalVerificado?: number;
  }): number | null => {
    if (isStaff) {
      showToast("Estás utilizando una cuenta de personal. Para realizar compras, ingresá con una cuenta de cliente.");
      return null;
    }

    if (items.length === 0) return null;

    const nextNumero =
      pedidos.length > 0 ? Math.max(...pedidos.map((p) => p.numero)) + 1 : 1001;

    const esEfectivo = datos.pago === "EFECTIVO_LOCAL" || datos.pago === "EFECTIVO";
    const modEntrega: "RETIRO_LOCAL" | "MOTOMANDADO" = esEfectivo
      ? "RETIRO_LOCAL"
      : (datos.modalidadEntrega || "RETIRO_LOCAL");

    const costoEnvio = modEntrega === "MOTOMANDADO" ? 2500 : 0;
    const codigoTicket = esEfectivo ? `OC-${nextNumero}` : `TK-${nextNumero}`;

    // Si el checkout validó los precios contra PostgreSQL, usamos los datos seguros del servidor
    const itemsFinales = datos.itemsVerificados || items.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      marca: i.marca,
      precio: i.precio,
      cantidad: i.cantidad,
    }));

    const totalFinal = datos.totalVerificado !== undefined
      ? datos.totalVerificado + costoEnvio
      : subtotal + costoEnvio;

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
      modalidadEntrega: modEntrega,
      costoEnvio: costoEnvio > 0 ? costoEnvio : undefined,
      codigoTicket: codigoTicket,
      estado: esEfectivo ? "PENDIENTE" : "CONFIRMADO",
      items: itemsFinales,
      total: totalFinal,
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

  const cancelarPedido = (numero: number) => {
    setPedidos((prev) =>
      prev.map((p) => (p.numero === numero ? { ...p, estado: "CANCELADO" } : p))
    );
    showToast(`Orden #${numero} cancelada`);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        isStaff,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        sincronizarCarrito,
        totalItems,
        subtotal,
        toastMessage,
        pedidos,
        crearPedido,
        cambiarEstadoPedido,
        cancelarPedido,
        getItemCartQuantity,
        getRemainingStock,
        isItemAtLimit,
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

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart, Pedido } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  Package,
  Flame,
  FileCheck,
  CheckCircle,
  Clock,
  ShieldCheck,
  Upload,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Bike,
  CreditCard,
  Lock,
  User,
  X,
  FileText,
  Image as ImageIcon,
  Search,
  SlidersHorizontal,
  Settings,
  Star,
  Eye,
  EyeOff,
  Tag,
  Check,
  RefreshCw,
  Plus,
  Layers,
  Store,
  Phone,
  MapPin,
  Trash2,
  Edit,
  ExternalLink,
  UserCheck,
} from "lucide-react";
import {
  getCommercialProductsAction,
  upsertCommercialProductAction,
  CommercialProductItem,
} from "@/actions/commercial";
import {
  getPedidosEcommerceAction,
  actualizarEstadoPedidoAction,
  getStaffPreparadoresAction,
  PedidoDTO,
} from "@/actions/pedidos";
import {
  getAllCombosAdminAction,
  upsertComboAction,
  toggleComboEstadoAction,
  eliminarComboAction,
  ComboDTO,
} from "@/actions/combos";
import {
  getConfiguracionAction,
  updateConfiguracionAction,
  uploadLogoAction,
  TiendaConfig,
} from "@/actions/configuracion";

function EstadoChip({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    PENDIENTE: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30",
    CONFIRMADO: "bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-sky-500/30",
    PREPARANDO: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30",
    LISTO_ENTREGA: "bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/30",
    LISTO_PARA_RETIRAR: "bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/30",
    ENTREGADO: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
    RETIRADO: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
    CANCELADO: "bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
        styles[estado] || styles.PENDIENTE
      }`}
    >
      {estado.replace(/_/g, " ")}
    </span>
  );
}

export default function PanelPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const ordenParam = searchParams.get("orden") || "";

  const { user, openLogin, loginClient } = useAuth();
  const formatPrice = (n: number) => "$" + Number(n).toLocaleString("es-AR");

  // Verificar rol del staff
  const isStaff =
    Boolean(user) &&
    user?.rol !== "CLIENTE" &&
    (user?.rol?.includes("ADMIN") ||
      user?.rol?.includes("VENTAS") ||
      user?.rol?.includes("STOCK"));

  const isAdmin = Boolean(user && (user.rol === "ADMIN" || user.rol === "ADMINISTRADOR"));
  const canManageOffers = Boolean(user && (isAdmin || user.rol.includes("VENTAS") || user.rol.includes("STOCK")));
  const canManageCombos = Boolean(user && (isAdmin || user.rol.includes("VENTAS")));
  const canManageConfig = Boolean(user && (isAdmin || user.rol.includes("VENTAS")));
  const canViewAudit = isAdmin;

  const isComprobanteOnly = tabParam === "comprobante" || !isStaff;

  const resolveTab = (): string => {
    if (!isStaff) return "comprobante";
    if (tabParam === "auditoria") return canViewAudit ? "auditoria" : "pedidos";
    if (tabParam === "ofertas") return canManageOffers ? "ofertas" : "pedidos";
    if (tabParam === "combos") return canManageCombos ? "combos" : "pedidos";
    if (tabParam === "configuracion") return canManageConfig ? "configuracion" : "pedidos";
    if (tabParam === "pedidos") return "pedidos";
    return "pedidos";
  };

  const [activeTab, setActiveTab] = useState<string>(resolveTab);

  useEffect(() => {
    setActiveTab(resolveTab());
  }, [tabParam, user]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // ═════════════════════════════════════════════════════════════════════════
  // 1. ESTADO DE PEDIDOS (DESDE POSTGRESQL)
  // ═════════════════════════════════════════════════════════════════════════
  const [dbPedidos, setDbPedidos] = useState<PedidoDTO[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState<boolean>(false);
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [pedidosSearch, setPedidosSearch] = useState<string>("");
  const [staffPreparadores, setStaffPreparadores] = useState<Array<{ id: number; nombre: string; rol: string }>>([]);

  const loadPedidos = async () => {
    if (!user) return;
    setLoadingPedidos(true);
    try {
      const [res, staffRes] = await Promise.all([
        getPedidosEcommerceAction(user.id, {
          estado: filtroEstado !== "TODOS" ? filtroEstado : undefined,
          search: pedidosSearch,
        }),
        getStaffPreparadoresAction(user.id),
      ]);

      if (res.success && res.pedidos) {
        setDbPedidos(res.pedidos);
      }
      if (staffRes.success && staffRes.staff) {
        setStaffPreparadores(staffRes.staff);
      }
    } catch (e) {
      console.error("Error loading pedidos:", e);
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    if (activeTab === "pedidos" && isStaff && user) {
      loadPedidos();
    }
  }, [activeTab, filtroEstado, isStaff, user]);

  const handleCambiarEstadoPedido = async (
    pedidoId: number,
    nuevoEstado: "PENDIENTE" | "CONFIRMADO" | "PREPARANDO" | "LISTO_ENTREGA" | "ENTREGADO" | "CANCELADO",
    preparadorId?: number | null
  ) => {
    if (!user) return;
    const res = await actualizarEstadoPedidoAction(user.id, pedidoId, nuevoEstado, preparadorId);
    if (res.success && res.pedido) {
      setDbPedidos((prev) => prev.map((p) => (p.id === pedidoId ? res.pedido! : p)));
      showToast(`Pedido #ORD-${res.pedido.numero} cambiado a ${nuevoEstado.replace(/_/g, " ")}`);
      addAuditLog(
        `Actualizó pedido #ORD-${res.pedido.numero} a '${nuevoEstado}' (Preparador: ${res.pedido.preparadorNombre || "N/A"})`,
        "Gestión de Pedidos"
      );
    } else {
      showToast(res.error || "No se pudo actualizar el estado.");
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // 2. ESTADO DE CATÁLOGO & OFERTAS
  // ═════════════════════════════════════════════════════════════════════════
  const [commercialProducts, setCommercialProducts] = useState<CommercialProductItem[]>([]);
  const [loadingCommercial, setLoadingCommercial] = useState<boolean>(false);
  const [commercialFilter, setCommercialFilter] = useState<"TODOS" | "OFERTAS" | "NO_PUBLICADOS" | "DESTACADOS" | "RECOMENDADOS">("TODOS");
  const [commercialSearch, setCommercialSearch] = useState<string>("");

  const [editingProduct, setEditingProduct] = useState<CommercialProductItem | null>(null);
  const [editForm, setEditForm] = useState({
    enOferta: false,
    precioOferta: "",
    descuentoPct: "",
    publicadoOnline: true,
    destacado: false,
    recomendado: false,
    badgePromo: "",
  });
  const [savingCommercial, setSavingCommercial] = useState(false);

  const loadCommercialProducts = async () => {
    setLoadingCommercial(true);
    try {
      const res = await getCommercialProductsAction();
      if (res.success) {
        setCommercialProducts(res.products);
      }
    } catch (err) {
      console.error("Error loading commercial products:", err);
    } finally {
      setLoadingCommercial(false);
    }
  };

  useEffect(() => {
    if (activeTab === "ofertas" && canManageOffers) {
      loadCommercialProducts();
    }
  }, [activeTab, canManageOffers]);

  const handleQuickTogglePublicado = async (prod: CommercialProductItem) => {
    if (!user) return;
    const nuevoEstado = !prod.publicadoOnline;
    setCommercialProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, publicadoOnline: nuevoEstado } : p))
    );
    const res = await upsertCommercialProductAction(user.id, prod.id, {
      publicadoOnline: nuevoEstado,
    });
    if (res.success && res.product) {
      setCommercialProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? res.product! : p))
      );
      showToast(
        nuevoEstado
          ? `"${prod.nombre}" publicado en la tienda online`
          : `"${prod.nombre}" pausado (oculto de la web)`
      );
      addAuditLog(`${nuevoEstado ? "Publicó" : "Ocultó"} "${prod.nombre}" en catálogo online`);
    } else {
      setCommercialProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, publicadoOnline: !nuevoEstado } : p))
      );
      showToast(res.error || "No se pudo actualizar");
    }
  };

  const handleQuickToggleOferta = async (prod: CommercialProductItem) => {
    if (!user) return;
    if (!prod.enOferta) {
      const precioOferta = prod.precioOferta && prod.precioOferta > 0
        ? prod.precioOferta
        : Math.round(prod.precioVenta * 0.85);
      const res = await upsertCommercialProductAction(user.id, prod.id, {
        enOferta: true,
        precioOferta,
        badgePromo: prod.badgePromo || "Mes de la Primavera",
      });
      if (res.success && res.product) {
        setCommercialProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? res.product! : p))
        );
        showToast(`"${prod.nombre}" ahora está en oferta (${formatPrice(precioOferta)})`);
        addAuditLog(`Activó oferta para "${prod.nombre}" en ${formatPrice(precioOferta)}`);
      }
    } else {
      const res = await upsertCommercialProductAction(user.id, prod.id, {
        enOferta: false,
      });
      if (res.success && res.product) {
        setCommercialProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? res.product! : p))
        );
        showToast(`Oferta desactivada para "${prod.nombre}"`);
        addAuditLog(`Desactivó oferta de "${prod.nombre}"`);
      }
    }
  };

  const handleOpenEditProduct = (prod: CommercialProductItem) => {
    setEditingProduct(prod);
    setEditForm({
      enOferta: prod.enOferta,
      precioOferta: prod.precioOferta ? String(prod.precioOferta) : String(Math.round(prod.precioVenta * 0.85)),
      descuentoPct: String(prod.descuentoPorcentaje || 15),
      publicadoOnline: prod.publicadoOnline,
      destacado: prod.destacado,
      recomendado: prod.recomendado,
      badgePromo: prod.badgePromo || "Mes de la Primavera",
    });
  };

  const handleSaveProductModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !user) return;
    setSavingCommercial(true);
    try {
      const parsedOferta = editForm.enOferta ? parseFloat(editForm.precioOferta) || null : null;
      const res = await upsertCommercialProductAction(user.id, editingProduct.id, {
        enOferta: editForm.enOferta,
        precioOferta: parsedOferta,
        publicadoOnline: editForm.publicadoOnline,
        destacado: editForm.destacado,
        recomendado: editForm.recomendado,
        badgePromo: editForm.badgePromo.trim() || null,
      });

      if (res.success && res.product) {
        setCommercialProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? res.product! : p))
        );
        showToast(`Configuración de "${editingProduct.nombre}" actualizada`);
        addAuditLog(`Editó configuración comercial de "${editingProduct.nombre}"`);
        setEditingProduct(null);
      } else {
        showToast(res.error || "Error al guardar");
      }
    } finally {
      setSavingCommercial(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // 3. ESTADO DE COMBOS & KITS (CRUD)
  // ═════════════════════════════════════════════════════════════════════════
  const [combosList, setCombosList] = useState<ComboDTO[]>([]);
  const [loadingCombos, setLoadingCombos] = useState<boolean>(false);
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [editingComboId, setEditingComboId] = useState<number | null>(null);

  const [comboForm, setComboForm] = useState({
    nombre: "",
    slug: "",
    descripcion: "",
    badge: "Mes de la Primavera",
    precio: "",
    precioRegular: "",
    imagen: "/combos/combo-service-motul.jpg",
    activo: true,
    destacado: true,
    items: [] as Array<{ productoId: number; cantidad: number; nombre?: string; precioVenta?: number }>,
  });
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState<number>(0);
  const [savingCombo, setSavingCombo] = useState(false);

  const loadCombos = async () => {
    if (!user) return;
    setLoadingCombos(true);
    try {
      const res = await getAllCombosAdminAction(user.id);
      if (res.success && res.combos) {
        setCombosList(res.combos);
      }
    } finally {
      setLoadingCombos(false);
    }
  };

  useEffect(() => {
    if (activeTab === "combos" && canManageCombos && user) {
      loadCombos();
      if (commercialProducts.length === 0) {
        loadCommercialProducts();
      }
    }
  }, [activeTab, canManageCombos, user]);

  const handleOpenCreateCombo = () => {
    setEditingComboId(null);
    setComboForm({
      nombre: "",
      slug: "",
      descripcion: "",
      badge: "Mes de la Primavera",
      precio: "",
      precioRegular: "",
      imagen: "/combos/combo-service-motul.jpg",
      activo: true,
      destacado: true,
      items: [],
    });
    setComboModalOpen(true);
  };

  const handleOpenEditCombo = (c: ComboDTO) => {
    setEditingComboId(c.id);
    setComboForm({
      nombre: c.nombre,
      slug: c.slug || "",
      descripcion: c.descripcion || "",
      badge: c.badge || "Mes de la Primavera",
      precio: String(c.precio),
      precioRegular: String(c.precioRegular),
      imagen: c.imagen || "/combos/combo-service-motul.jpg",
      activo: c.activo,
      destacado: c.destacado,
      items: c.items.map((it) => ({
        productoId: it.productoId,
        cantidad: it.cantidad,
        nombre: it.producto.nombre,
        precioVenta: it.producto.precioVenta,
      })),
    });
    setComboModalOpen(true);
  };

  const handleAddProductToComboForm = () => {
    if (selectedProductIdToAdd <= 0) return;
    const prod = commercialProducts.find((p) => p.id === selectedProductIdToAdd);
    if (!prod) return;

    setComboForm((prev) => {
      const existing = prev.items.find((it) => it.productoId === prod.id);
      let updatedItems;
      if (existing) {
        updatedItems = prev.items.map((it) =>
          it.productoId === prod.id ? { ...it, cantidad: it.cantidad + 1 } : it
        );
      } else {
        updatedItems = [
          ...prev.items,
          {
            productoId: prod.id,
            cantidad: 1,
            nombre: prod.nombre,
            precioVenta: prod.precioVenta,
          },
        ];
      }

      // Auto calcular precio regular
      const sumRegular = updatedItems.reduce(
        (acc, it) => acc + (it.precioVenta || 0) * it.cantidad,
        0
      );

      return {
        ...prev,
        items: updatedItems,
        precioRegular: String(sumRegular),
        precio: prev.precio ? prev.precio : String(Math.round(sumRegular * 0.85)),
      };
    });
  };

  const handleRemoveProductFromComboForm = (prodId: number) => {
    setComboForm((prev) => {
      const updatedItems = prev.items.filter((it) => it.productoId !== prodId);
      const sumRegular = updatedItems.reduce(
        (acc, it) => acc + (it.precioVenta || 0) * it.cantidad,
        0
      );
      return {
        ...prev,
        items: updatedItems,
        precioRegular: String(sumRegular),
      };
    });
  };

  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (comboForm.items.length === 0) {
      alert("Agregá al menos un producto al combo.");
      return;
    }
    const precioNum = parseFloat(comboForm.precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      alert("Ingresá un precio válido para el combo.");
      return;
    }

    setSavingCombo(true);
    try {
      const res = await upsertComboAction(user.id, {
        id: editingComboId || undefined,
        nombre: comboForm.nombre,
        slug: comboForm.slug,
        descripcion: comboForm.descripcion,
        badge: comboForm.badge,
        precio: precioNum,
        precioRegular: parseFloat(comboForm.precioRegular) || undefined,
        imagen: comboForm.imagen,
        activo: comboForm.activo,
        destacado: comboForm.destacado,
        items: comboForm.items.map((it) => ({
          productoId: it.productoId,
          cantidad: it.cantidad,
        })),
      });

      if (res.success) {
        showToast(editingComboId ? "Combo actualizado con éxito" : "Nuevo combo creado con éxito");
        addAuditLog(`${editingComboId ? "Editó" : "Creó"} combo "${comboForm.nombre}"`, "Combos & Kits");
        setComboModalOpen(false);
        await loadCombos();
      } else {
        alert(res.error || "No se pudo guardar el combo.");
      }
    } finally {
      setSavingCombo(false);
    }
  };

  const handleToggleComboActivo = async (combo: ComboDTO) => {
    if (!user) return;
    const nuevo = !combo.activo;
    setCombosList((prev) =>
      prev.map((c) => (c.id === combo.id ? { ...c, activo: nuevo } : c))
    );
    const res = await toggleComboEstadoAction(user.id, combo.id, nuevo);
    if (res.success) {
      showToast(nuevo ? `Combo "${combo.nombre}" activado` : `Combo "${combo.nombre}" pausado`);
    } else {
      await loadCombos();
    }
  };

  const handleDeleteCombo = async (combo: ComboDTO) => {
    if (!user) return;
    if (!confirm(`¿Estás seguro de eliminar el combo "${combo.nombre}"?`)) return;
    const res = await eliminarComboAction(user.id, combo.id);
    if (res.success) {
      showToast(`Combo eliminado`);
      addAuditLog(`Eliminó combo "${combo.nombre}"`, "Combos & Kits");
      await loadCombos();
    } else {
      alert(res.error || "No se pudo eliminar.");
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // 4. ESTADO DE IDENTIDAD & BRANDING DE LA TIENDA
  // ═════════════════════════════════════════════════════════════════════════
  const [configForm, setConfigForm] = useState<TiendaConfig>({
    nombre_tienda: "Chopper Repuestos",
    logo_url: "/logo-nav.png",
    direccion: "Av. Roque Sáenz Peña 1500 · Posadas, Misiones",
    mapa_url: "https://www.google.com/maps/place/Av.+Roque+S%C3%A1enz+Pe%C3%B1a+1500,+N3301BJF+Posadas,+Misiones/@-27.3649105,-55.8869655,17z",
    telefono: "376 524-3554",
    whatsapp: "5493765243554",
    email: "contacto@chopper-repuestos.com",
    horarios: "Lun a Sáb 8:00-12:30 / 16:30-20:30",
    texto_banner: "🛵 Motomandado y Moto Uber en el día en Posadas",
    mes_promocion: "Mes de la Primavera",
    mostrar_banner_promocion: true,
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const cfg = await getConfiguracionAction();
      setConfigForm(cfg);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (activeTab === "configuracion" && canManageConfig) {
      loadConfig();
    }
  }, [activeTab, canManageConfig]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingConfig(true);
    try {
      const res = await updateConfiguracionAction(user.id, configForm);
      if (res.success && res.config) {
        setConfigForm(res.config);
        showToast("Configuración e identidad comercial guardadas");
        addAuditLog("Actualizó configuración y datos de tienda", "Configuración / Branding");
      } else {
        alert(res.error || "No se pudo guardar la configuración.");
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("logo", file);

    const res = await uploadLogoAction(user.id, formData);
    if (res.success && res.logoUrl) {
      setConfigForm((prev) => ({ ...prev, logo_url: res.logoUrl! }));
      showToast("Nuevo logo actualizado con éxito");
    } else {
      alert(res.error || "Error al subir el logo.");
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // 5. AUDITORÍA
  // ═════════════════════════════════════════════════════════════════════════
  const [auditLogs, setAuditLogs] = useState<any[]>([
    {
      nombre: "Administrador General",
      rol: "ADMIN",
      rolColor: "bg-red-500/15 text-red-500 border-red-500/30",
      accion: "Inicio de sesión exitoso",
      modulo: "Autenticación",
      fecha: "Hoy, 11:32 hs",
      terminal: "Terminal Mostrador · Roque Sáenz Peña 1500",
    },
    {
      nombre: "Carlos López",
      rol: "VENTAS",
      rolColor: "bg-sky-500/15 text-sky-600 border-sky-500/30",
      accion: "Cambió estado de pedido #ORD-1043 a 'Confirmado' (Pago acreditado)",
      modulo: "Gestión de Pedidos",
      fecha: "Hoy, 10:45 hs",
      terminal: "Caja Central Mostrador",
    },
  ]);

  const addAuditLog = (accion: string, modulo: string = "Comercial") => {
    if (!user) return;
    const isAdm = user.rol?.includes("ADMIN");
    setAuditLogs((prev) => [
      {
        nombre: user.nombreCompleto,
        rol: isAdm ? "ADMIN" : "VENTAS",
        rolColor: isAdm ? "bg-red-500/15 text-red-500 border-red-500/30" : "bg-sky-500/15 text-sky-600 border-sky-500/30",
        accion,
        modulo,
        fecha: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) + " hs",
        terminal: "Panel Web Chopper (Posadas)",
      },
      ...prev,
    ]);
  };

  // ═════════════════════════════════════════════════════════════════════════
  // SUBIDA DE COMPROBANTE (CLIENTE / ANONIMO)
  // ═════════════════════════════════════════════════════════════════════════
  const [comprobanteData, setComprobanteData] = useState({
    orden: ordenParam,
    nombre: "",
    monto: "",
    banco: "Mercado Pago",
    subido: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (user && !comprobanteData.nombre) {
      setComprobanteData((prev) => ({
        ...prev,
        nombre: user.nombreCompleto || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    if (ordenParam) {
      setComprobanteData((prev) => ({ ...prev, orden: ordenParam }));
    }
  }, [ordenParam]);

  // Si es un cliente o se pidió específicamente la solapa comprobante
  if (isComprobanteOnly) {
    return (
      <div className="max-w-2xl mx-auto mt-6 px-4 space-y-6">
        <div className="border-b border-slate-200 dark:border-line pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <FileCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Subir Comprobante de Pago
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Informá tu transferencia bancaria o Mercado Pago para agilizar el despacho de tu pedido en Posadas.
              </p>
            </div>
          </div>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-8 sm:p-10 text-center shadow-sm space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 border border-brand/30 text-brand mx-auto shadow-sm">
              <Lock size={32} />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Iniciá sesión para subir tu comprobante
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Para asociar tu transferencia a tu orden de compra en Chopper Repuestos, es necesario identificarte.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={openLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-xs font-bold text-white hover:bg-brandhover shadow-lg shadow-brand/20 transition-all active:scale-95"
              >
                <User size={15} />
                <span>Iniciar Sesión</span>
              </button>
              <Link
                href="/ofertas"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line px-5 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface transition-all"
              >
                <span>Ver catálogo de repuestos</span>
              </Link>
            </div>
          </div>
        ) : comprobanteData.subido ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-white dark:bg-card p-8 sm:p-10 text-center space-y-5 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto border border-emerald-500/30 shadow-sm">
              <CheckCircle size={36} />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                ¡Comprobante Registrado con Éxito!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Tu pago para la orden <strong className="text-slate-900 dark:text-white">#{comprobanteData.orden}</strong> fue recibido.
              </p>
            </div>
            <Link
              href="/mis-pedidos"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-xs font-bold text-white hover:bg-brandhover shadow transition-all"
            >
              <span>Ver estado en Mis Pedidos</span>
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setComprobanteData({ ...comprobanteData, subido: true });
              showToast("Comprobante enviado para revisión");
            }}
            className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1.5 text-xs">
                Número de Orden / Pedido *
              </label>
              <input
                required
                placeholder="Ej: 1043"
                value={comprobanteData.orden}
                onChange={(e) => setComprobanteData({ ...comprobanteData, orden: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1.5 text-xs">
                Nombre del Titular *
              </label>
              <input
                required
                value={comprobanteData.nombre}
                onChange={(e) => setComprobanteData({ ...comprobanteData, nombre: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1.5 text-xs">
                Adjuntar Imagen o PDF del Comprobante *
              </label>
              <input
                type="file"
                required
                accept="image/*,.pdf"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                }}
                className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand file:text-white hover:file:bg-brandhover"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3.5 text-xs font-bold text-white shadow transition-all mt-4"
            >
              <CheckCircle size={16} />
              <span>Enviar Comprobante</span>
            </button>
          </form>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PANEL COMPLETO PARA STAFF (ADMIN / VENTAS / STOCK)
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="mt-6 space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand"></span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-3xl">
              Panel de Control · Chopper Repuestos
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Gestión comercial unificada con PostgreSQL: pedidos online, catálogo, combos y branding en Posadas, Misiones.
          </p>
        </div>

        {user && (
          <div className="rounded-xl border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>
              {user.nombreCompleto} ({user.rol})
            </span>
          </div>
        )}
      </div>

      {/* Selector de Solapas Principales */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 dark:border-line pb-2 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab("pedidos")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "pedidos"
              ? "bg-brand text-white shadow"
              : "bg-slate-100 dark:bg-surface text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Package size={15} />
          <span>Pedidos Online ({dbPedidos.length})</span>
        </button>

        {canManageOffers && (
          <button
            onClick={() => setActiveTab("ofertas")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "ofertas"
                ? "bg-brand text-white shadow"
                : "bg-slate-100 dark:bg-surface text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Flame size={15} />
            <span>Catálogo & Ofertas</span>
          </button>
        )}

        {canManageCombos && (
          <button
            onClick={() => setActiveTab("combos")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "combos"
                ? "bg-brand text-white shadow"
                : "bg-slate-100 dark:bg-surface text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers size={15} />
            <span>Combos & Kits ({combosList.length})</span>
          </button>
        )}

        {canManageConfig && (
          <button
            onClick={() => setActiveTab("configuracion")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "configuracion"
                ? "bg-brand text-white shadow"
                : "bg-slate-100 dark:bg-surface text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Store size={15} />
            <span>Identidad & Branding</span>
          </button>
        )}

        {canViewAudit && (
          <button
            onClick={() => setActiveTab("auditoria")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "auditoria"
                ? "bg-brand text-white shadow"
                : "bg-slate-100 dark:bg-surface text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock size={15} />
            <span>Auditoría</span>
          </button>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SOLAPA 1: PEDIDOS ONLINE & PREPARACIÓN (POSTGRESQL REAL) */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "pedidos" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "TODOS", label: "Todos" },
                { key: "PENDIENTE", label: "Pendientes" },
                { key: "CONFIRMADO", label: "Confirmados" },
                { key: "PREPARANDO", label: "En Preparación" },
                { key: "LISTO_ENTREGA", label: "Listos para entrega" },
                { key: "ENTREGADO", label: "Entregados" },
                { key: "CANCELADO", label: "Cancelados" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFiltroEstado(f.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filtroEstado === f.key
                      ? "border-brand bg-brand/15 text-brand font-bold"
                      : "border-slate-300 dark:border-line text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar orden, cliente o DNI..."
                  value={pedidosSearch}
                  onChange={(e) => setPedidosSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadPedidos()}
                  className="rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface px-3 py-1.5 pl-8 text-xs text-slate-900 dark:text-white outline-none focus:border-brand w-56"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button
                onClick={loadPedidos}
                className="p-2 rounded-xl border border-slate-300 dark:border-line hover:bg-slate-100 dark:hover:bg-surface text-slate-600 dark:text-slate-300 transition-colors"
                title="Refrescar pedidos"
              >
                <RefreshCw size={14} className={loadingPedidos ? "animate-spin text-brand" : ""} />
              </button>
            </div>
          </div>

          {loadingPedidos ? (
            <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-12 text-center text-slate-500 text-xs">
              Cargando pedidos desde PostgreSQL...
            </div>
          ) : dbPedidos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-12 text-center text-slate-500 text-xs">
              No hay pedidos que coincidan con el filtro seleccionado.
            </div>
          ) : (
            <div className="space-y-3">
              {dbPedidos.map((p) => {
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 transition-all hover:border-slate-400 shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-line/60 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-black text-brand">
                          #ORD-{p.numero}
                        </span>
                        <EstadoChip estado={p.estado} />
                        <span className="text-xs text-slate-500">
                          {new Date(p.creadoEn).toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span>Pago: <strong>{p.metodoPago}</strong></span>
                        <span>·</span>
                        <span>Entrega: <strong>{p.modalidadEntrega}</strong></span>
                      </div>
                    </div>

                    <div className="grid gap-4 text-xs md:grid-cols-3 items-start">
                      {/* Cliente */}
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                          Cliente
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">
                          {p.nombreCliente}
                        </span>
                        <div className="text-slate-600 dark:text-slate-400 space-y-0.5 mt-0.5">
                          <p>DNI: {p.dniCliente}</p>
                          <p>Tel: {p.telefonoCliente || "No informado"}</p>
                          {p.direccionEnvio && <p>Envío: {p.direccionEnvio}</p>}
                        </div>
                      </div>

                      {/* Ítems */}
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                          Repuestos & Combos
                        </span>
                        <div className="space-y-1 text-slate-700 dark:text-slate-300">
                          {p.items.map((it) => (
                            <div key={it.id} className="flex justify-between gap-2">
                              <span className="truncate">
                                {it.cantidad}x {it.nombre}
                              </span>
                              <span className="font-bold shrink-0">
                                {formatPrice(it.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Estado de Preparación y Acciones */}
                      <div className="space-y-3 bg-slate-50 dark:bg-surface/50 p-3 rounded-xl border border-slate-200 dark:border-line">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">
                            Total a Cobrar
                          </span>
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            {formatPrice(p.total)}
                          </span>
                        </div>

                        {/* Asignación de preparador (Requisito explícito del usuario) */}
                        <div className="pt-2 border-t border-slate-200 dark:border-line/60">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500 font-semibold flex items-center gap-1">
                              <UserCheck size={12} className="text-brand" />
                              <span>Preparador:</span>
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {p.preparadorNombre || "Sin asignar"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            <select
                              value={p.preparadorUsuarioId || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                handleCambiarEstadoPedido(p.id, p.estado as any, val);
                              }}
                              className="w-full text-[11px] py-1 px-2 rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-card text-slate-800 dark:text-slate-200 outline-none"
                            >
                              <option value="">-- Asignar preparador --</option>
                              {staffPreparadores.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.nombre} ({st.rol})
                                </option>
                              ))}
                            </select>

                            {user && p.preparadorUsuarioId !== user.id && (
                              <button
                                onClick={() => handleCambiarEstadoPedido(p.id, "PREPARANDO", user.id)}
                                title="Asignarme a mí y empezar a preparar"
                                className="shrink-0 px-2 py-1 rounded-lg bg-brand text-white text-[10px] font-bold hover:bg-brandhover transition-colors"
                              >
                                Tomar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Botones de progresión de estado */}
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200 dark:border-line/60">
                          {p.estado === "PENDIENTE" && (
                            <button
                              onClick={() => handleCambiarEstadoPedido(p.id, "CONFIRMADO")}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] transition-all shadow"
                            >
                              ✓ Confirmar Pago
                            </button>
                          )}

                          {p.estado === "CONFIRMADO" && (
                            <button
                              onClick={() => handleCambiarEstadoPedido(p.id, "PREPARANDO", user?.id)}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-all shadow"
                            >
                              📦 Iniciar Preparación
                            </button>
                          )}

                          {p.estado === "PREPARANDO" && (
                            <button
                              onClick={() => handleCambiarEstadoPedido(p.id, "LISTO_ENTREGA")}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition-all shadow"
                            >
                              🛵 Listo p/ Retiro / Envío
                            </button>
                          )}

                          {p.estado === "LISTO_ENTREGA" && (
                            <button
                              onClick={() => handleCambiarEstadoPedido(p.id, "ENTREGADO")}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all shadow"
                            >
                              🎉 Completar Entrega
                            </button>
                          )}

                          {p.estado !== "CANCELADO" && p.estado !== "ENTREGADO" && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Cancelar pedido #ORD-${p.numero}?`)) {
                                  handleCambiarEstadoPedido(p.id, "CANCELADO");
                                }
                              }}
                              className="py-1.5 px-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold text-[10px] transition-all"
                            >
                              ✕ Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SOLAPA 2: CATÁLOGO & OFERTAS */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "ofertas" && canManageOffers && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Flame size={20} className="text-brand fill-brand" />
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Gestión Comercial de Productos & Ofertas
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Controlá qué repuestos están en oferta, sus precios promocionales y badges como &quot;Mes de la Primavera&quot;.
                  Los precios base del SGI permanecen inmutables.
                </p>
              </div>

              <button
                onClick={loadCommercialProducts}
                disabled={loadingCommercial}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-line px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface transition-colors shadow-sm shrink-0"
              >
                <RefreshCw size={14} className={loadingCommercial ? "animate-spin text-brand" : ""} />
                <span>Actualizar catálogo</span>
              </button>
            </div>

            {/* Filtros rápidos */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-line/40">
              {(["TODOS", "OFERTAS", "DESTACADOS", "RECOMENDADOS", "NO_PUBLICADOS"] as const).map((fil) => (
                <button
                  key={fil}
                  onClick={() => setCommercialFilter(fil)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    commercialFilter === fil
                      ? "border-brand bg-brand/15 text-brand font-bold"
                      : "border-slate-300 dark:border-line text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {fil === "TODOS" && `Todos (${commercialProducts.length})`}
                  {fil === "OFERTAS" && `En Oferta (${commercialProducts.filter((p) => p.enOferta).length})`}
                  {fil === "DESTACADOS" && `Destacados (${commercialProducts.filter((p) => p.destacado).length})`}
                  {fil === "RECOMENDADOS" && `Recomendados (${commercialProducts.filter((p) => p.recomendado).length})`}
                  {fil === "NO_PUBLICADOS" && `Pausados (${commercialProducts.filter((p) => !p.publicadoOnline).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de productos comerciales */}
          <div className="space-y-2">
            {commercialProducts
              .filter((p) => {
                if (commercialFilter === "OFERTAS") return p.enOferta;
                if (commercialFilter === "DESTACADOS") return p.destacado;
                if (commercialFilter === "RECOMENDADOS") return p.recomendado;
                if (commercialFilter === "NO_PUBLICADOS") return !p.publicadoOnline;
                return true;
              })
              .map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{p.nombre}</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {p.marca} · Stock SGI: <strong>{p.cantidad} u.</strong> · Base: <strong>{formatPrice(p.precioVenta)}</strong>
                    </span>
                    {p.badgePromo && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 rounded-md">
                        🏷️ {p.badgePromo}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {p.enOferta && p.precioOferta ? (
                        <>
                          <span className="text-sm font-black text-brand block">{formatPrice(p.precioOferta)}</span>
                          <span className="text-[10px] text-emerald-600 font-bold">{p.descuentoPorcentaje}% OFF</span>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{formatPrice(p.precioVenta)}</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleQuickTogglePublicado(p)}
                      className={`p-2 rounded-xl border text-xs font-bold ${
                        p.publicadoOnline ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-slate-300 text-slate-400"
                      }`}
                      title={p.publicadoOnline ? "Publicado online" : "Pausado"}
                    >
                      {p.publicadoOnline ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>

                    <button
                      onClick={() => handleQuickToggleOferta(p)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                        p.enOferta ? "border-brand bg-brand text-white" : "border-slate-300 hover:border-brand text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {p.enOferta ? "🔥 En Oferta" : "Poner Oferta"}
                    </button>

                    <button
                      onClick={() => handleOpenEditProduct(p)}
                      className="p-2 rounded-xl border border-slate-300 dark:border-line hover:bg-slate-100 dark:hover:bg-surface text-slate-700 dark:text-slate-300"
                      title="Editar metadatos comerciales"
                    >
                      <SlidersHorizontal size={15} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SOLAPA 3: COMBOS & KITS (NUEVA FUNCIONALIDAD COMPLETA) */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "combos" && canManageCombos && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers size={20} className="text-brand" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Administración de Combos y Kits Promocionales
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Creá combos combinando productos físicos del inventario del SGI con precio especial y badges comerciales.
              </p>
            </div>

            <button
              onClick={handleOpenCreateCombo}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all shadow"
            >
              <Plus size={16} />
              <span>Crear Nuevo Combo</span>
            </button>
          </div>

          {/* Grilla de Combos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {combosList.map((combo) => (
              <div
                key={combo.id}
                className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-5 space-y-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                      AHORRÁ {formatPrice(combo.ahorro)}
                    </span>
                    <button
                      onClick={() => handleToggleComboActivo(combo)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        combo.activo
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                          : "border-slate-300 text-slate-400 bg-slate-100 dark:bg-surface"
                      }`}
                    >
                      {combo.activo ? "Activo" : "Pausado"}
                    </button>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                    {combo.nombre}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {combo.descripcion}
                  </p>

                  {combo.badge && (
                    <span className="inline-block mt-2 text-[10px] font-bold text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 rounded-md">
                      🏷️ {combo.badge}
                    </span>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-line/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Productos vinculados ({combo.items.length}):
                    </span>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                      {combo.items.map((it) => (
                        <li key={it.id} className="truncate">
                          • {it.cantidad}x {it.producto.nombre}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-line/60">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(combo.precioRegular)}
                    </span>
                    <span className="text-lg font-black text-brand">
                      {formatPrice(combo.precio)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditCombo(combo)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-line py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface transition-all"
                    >
                      <Edit size={13} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCombo(combo)}
                      className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all"
                      title="Eliminar combo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SOLAPA 4: IDENTIDAD & BRANDING DE LA TIENDA */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "configuracion" && canManageConfig && (
        <form onSubmit={handleSaveConfig} className="max-w-4xl space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Store size={20} className="text-brand" />
                <span>Identidad de Marca & Datos de Contacto</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Configurá el logo, dirección, horarios, teléfonos y textos de campaña para Posadas, Misiones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Nombre Oficial de la Tienda
                </label>
                <input
                  value={configForm.nombre_tienda}
                  onChange={(e) => setConfigForm({ ...configForm, nombre_tienda: e.target.value })}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Campaña / Promoción del Mes
                </label>
                <input
                  value={configForm.mes_promocion}
                  onChange={(e) => setConfigForm({ ...configForm, mes_promocion: e.target.value })}
                  placeholder="Ej: Mes de la Primavera"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Dirección en Posadas
                </label>
                <input
                  value={configForm.direccion}
                  onChange={(e) => setConfigForm({ ...configForm, direccion: e.target.value })}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  WhatsApp (con código de país)
                </label>
                <input
                  value={configForm.whatsapp}
                  onChange={(e) => setConfigForm({ ...configForm, whatsapp: e.target.value })}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Teléfono de Atención
                </label>
                <input
                  value={configForm.telefono}
                  onChange={(e) => setConfigForm({ ...configForm, telefono: e.target.value })}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Horarios de Atención
                </label>
                <input
                  value={configForm.horarios}
                  onChange={(e) => setConfigForm({ ...configForm, horarios: e.target.value })}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Texto del Banner Superior
                </label>
                <input
                  value={configForm.texto_banner}
                  onChange={(e) => setConfigForm({ ...configForm, texto_banner: e.target.value })}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>
            </div>

            {/* Subida de Logo */}
            <div className="pt-4 border-t border-slate-100 dark:border-line/40 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Logo de la Tienda
              </label>
              <div className="flex items-center gap-4">
                <div className="h-14 w-28 bg-slate-900 rounded-xl p-2 flex items-center justify-center border border-slate-200 dark:border-line">
                  <img src={configForm.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand file:text-white hover:file:bg-brandhover"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={savingConfig}
                className="inline-flex items-center gap-2 rounded-xl bg-brand hover:bg-brandhover px-6 py-3 text-xs font-bold text-white transition-all shadow"
              >
                <Check size={16} />
                <span>{savingConfig ? "Guardando..." : "Guardar Cambios de Identidad"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SOLAPA 5: AUDITORÍA */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "auditoria" && canViewAudit && (
        <div className="rounded-2xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-brand" />
              <span>Auditoría de Actividad del Sistema</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Registro cronológico de quién realizó modificaciones en pedidos, catálogo o configuración en Posadas.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface/50">
            <table className="w-full text-left text-xs text-slate-800 dark:text-slate-300">
              <thead className="border-b border-slate-200 dark:border-line bg-slate-100 dark:bg-surface text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Acción Realizada</th>
                  <th className="py-3 px-4">Módulo Afectado</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Terminal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-line/60">
                {auditLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{log.nombre}</td>
                    <td className="py-3 px-4">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${log.rolColor}`}>
                        {log.rol}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{log.accion}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{log.modulo}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">{log.fecha}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{log.terminal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL EDITAR / CREAR COMBO */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {comboModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-line pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {editingComboId ? "Editar Combo Armado" : "Crear Nuevo Combo Armado"}
              </h3>
              <button
                onClick={() => setComboModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCombo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Nombre del Combo *
                </label>
                <input
                  required
                  value={comboForm.nombre}
                  onChange={(e) => setComboForm({ ...comboForm, nombre: e.target.value })}
                  placeholder="Ej: Combo Service 4T: Motul + Filtro"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={comboForm.descripcion}
                  onChange={(e) => setComboForm({ ...comboForm, descripcion: e.target.value })}
                  placeholder="Kit completo de mantenimiento para Posadas..."
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Badge Promocional
                  </label>
                  <input
                    value={comboForm.badge}
                    onChange={(e) => setComboForm({ ...comboForm, badge: e.target.value })}
                    placeholder="Ej: Mes de la Primavera"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Precio del Combo ($) *
                  </label>
                  <input
                    required
                    type="number"
                    value={comboForm.precio}
                    onChange={(e) => setComboForm({ ...comboForm, precio: e.target.value })}
                    placeholder="Ej: 28900"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-slate-50 dark:bg-surface text-slate-900 dark:text-white outline-none focus:border-brand font-bold text-brand"
                  />
                </div>
              </div>

              {/* Selector de productos del catálogo físico */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-line/40">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Repuestos Incluidos en el Kit
                </span>

                <div className="flex gap-2">
                  <select
                    value={selectedProductIdToAdd}
                    onChange={(e) => setSelectedProductIdToAdd(parseInt(e.target.value, 10))}
                    className="flex-1 text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-line bg-white dark:bg-surface text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="0">-- Seleccionar repuesto del catálogo --</option>
                    {commercialProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({formatPrice(p.precioVenta)})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddProductToComboForm}
                    className="px-3 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brandhover transition-colors"
                  >
                    + Agregar
                  </button>
                </div>

                {/* Lista de productos agregados */}
                <div className="space-y-1.5 pt-1">
                  {comboForm.items.map((it) => (
                    <div
                      key={it.productoId}
                      className="flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-line bg-slate-50 dark:bg-surface text-xs"
                    >
                      <span className="truncate">{it.cantidad}x {it.nombre}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-600 dark:text-slate-400">
                          {formatPrice((it.precioVenta || 0) * it.cantidad)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductFromComboForm(it.productoId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {comboForm.items.length > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 pt-1">
                    <span>Suma individual regular:</span>
                    <span>{formatPrice(parseFloat(comboForm.precioRegular) || 0)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-line/40">
                <button
                  type="button"
                  onClick={() => setComboModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-line text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCombo}
                  className="px-5 py-2 rounded-xl bg-brand hover:bg-brandhover text-xs font-bold text-white shadow"
                >
                  {savingCombo ? "Guardando..." : "Guardar Combo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL CONFIGURACIÓN COMERCIAL PRODUCTO */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-line pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Editar Comercial: {editingProduct.nombre}
                </h3>
                <span className="text-xs text-slate-500">
                  Base SGI: {formatPrice(editingProduct.precioVenta)} · Stock: {editingProduct.cantidad} u.
                </span>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProductModal} className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={editForm.enOferta}
                    onChange={(e) => setEditForm({ ...editForm, enOferta: e.target.checked })}
                    className="rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <span>Habilitar Producto en Oferta</span>
                </label>

                {editForm.enOferta && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-brand/5 border border-brand/20">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Precio Oferta ($)
                      </label>
                      <input
                        type="number"
                        value={editForm.precioOferta}
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = parseFloat(val);
                          const pct = num && editingProduct.precioVenta > 0
                            ? Math.round(((editingProduct.precioVenta - num) / editingProduct.precioVenta) * 100)
                            : 0;
                          setEditForm({ ...editForm, precioOferta: val, descuentoPct: String(pct) });
                        }}
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-card text-brand font-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Badge Promocional
                      </label>
                      <input
                        value={editForm.badgePromo}
                        onChange={(e) => setEditForm({ ...editForm, badgePromo: e.target.value })}
                        placeholder="Ej: Mes de la Primavera"
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-line bg-white dark:bg-card text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-line/40 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={editForm.publicadoOnline}
                      onChange={(e) => setEditForm({ ...editForm, publicadoOnline: e.target.checked })}
                      className="rounded border-slate-300 text-brand"
                    />
                    <span>Visible para venta en la tienda online</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={editForm.destacado}
                      onChange={(e) => setEditForm({ ...editForm, destacado: e.target.checked })}
                      className="rounded border-slate-300 text-brand"
                    />
                    <span>Destacar en sección principal</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-line/40">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-line text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCommercial}
                  className="px-5 py-2 rounded-xl bg-brand hover:bg-brandhover text-xs font-bold text-white shadow"
                >
                  {savingCommercial ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Flotante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-white dark:bg-card px-4 py-3 text-xs font-bold text-slate-900 dark:text-white shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle size={16} className="text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

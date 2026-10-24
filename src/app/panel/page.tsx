"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Package,
  Flame,
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
  List,
  Layers,
  Store,
  Phone,
  MapPin,
  Trash2,
  Edit,
  ExternalLink,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckSquare,
  Square,
  History,
  Truck,
  Menu,
  Info,
  ShoppingBag,
  MessageCircle,
  Minus,
  CheckCircle2,
  Users,
  Filter,
  RotateCcw,
  XCircle,
  Download,
  AlertTriangle,
  Award,
  Sparkles,
  Boxes,
  Coins,
  Bell,
} from "lucide-react";
import { NotificationBell } from "@/components/panel/NotificationBell";
import { PedidosTableroView } from "@/components/panel/PedidosTableroView";
import { FinanzasOnlineView } from "@/components/panel/FinanzasOnlineView";
import { useConfig } from "@/context/ConfigContext";
import { EMOJIS_DISPONIBLES, formatBadgeWithEmoji } from "@/lib/etiquetas";
import {
  getCommercialProductsAction,
  upsertCommercialProductAction,
  getCategoriasAdminAction,
  crearCategoriaAction,
  getMarcasAdminAction,
  crearMarcaAction,
  actualizarLogoMarcaAction,
  editarMarcaCompletaAction,
  toggleMarcaAction,
  toggleMultiplesMarcasAction,
  aplicarOfertaLoteAction,
  quitarOfertaLoteAction,
  CommercialProductItem,
  MarcaAdminItem,
} from "@/actions/commercial";
import {
  getPedidosEcommerceAction,
  actualizarEstadoPedidoAction,
  subirComprobantePedidoAction,
  rechazarComprobantePedidoAction,
  getStaffPreparadoresAction,
  registrarCobroEfectivoAction,
  obtenerInfoComprobanteAction,
  actualizarChecklistItemsAction,
  InfoComprobanteDTO,
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
  uploadMediaAction,
  getEtiquetasOfertaAction,
  crearEtiquetaOfertaAction,
  editarEtiquetaOfertaAction,
  toggleEtiquetaOfertaAction,
  getAuditoriaLogsAction,
  registrarAuditoriaAction,
  getBannersHomeAction,
  crearBannerHomeAction,
  editarBannerHomeAction,
  toggleBannerHomeAction,
  eliminarBannerHomeAction,
  BannerHome,
  TiendaConfig,
  EtiquetaOferta,
  AuditoriaLog,
} from "@/actions/configuracion";

// Roles del prototipo
type RoleType = "admin" | "venta" | "stock";
type ViewType =
  | "pedidos"
  | "estado_pedidos"
  | "catalogo"
  | "marcas"
  | "combos"
  | "etiquetas"
  | "identidad"
  | "auditoria"
  | "entrega"
  | "preparacion"
  | "finanzas";

function parseImages(imgStr: string | null | undefined): string[] {
  if (!imgStr) return [];
  if (imgStr.startsWith("[")) {
    try {
      const arr = JSON.parse(imgStr);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    } catch {}
  }
  return imgStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function EstadoChip({ estado }: { estado: string }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    PENDIENTE: { bg: "rgba(217,119,6,0.15)", text: "#d97706", border: "#d97706" },
    CONFIRMADO: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", border: "#3b82f6" },
    PREPARANDO: { bg: "rgba(99,102,241,0.15)", text: "#818cf8", border: "#6366f1" },
    LISTO_ENTREGA: { bg: "rgba(168,85,247,0.15)", text: "#c084fc", border: "#a855f7" },
    LISTO_PARA_RETIRAR: { bg: "rgba(168,85,247,0.15)", text: "#c084fc", border: "#a855f7" },
    ENTREGADO: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "#22c55e" },
    RETIRADO: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "#22c55e" },
    CANCELADO: { bg: "rgba(220,38,38,0.15)", text: "#ef4444", border: "#dc2626" },
  };

  const current = styles[estado] || styles.PENDIENTE;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide"
      style={{
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}40`,
      }}
    >
      {estado.replace(/_/g, " ")}
    </span>
  );
}

export default function PanelPage() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("tab") as ViewType) || "pedidos";
  const { user, isStaff, isHydrating, openLogin, loginClient } = useAuth();
  const { updateConfig: updateContextConfig } = useConfig();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrating && (!user || !isStaff)) {
      window.location.href = "/?sessionExpired=true";
    }
  }, [isHydrating, user, isStaff]);

  const formatPrice = (n: number) => "$" + Number(n || 0).toLocaleString("es-AR");

  // Estado del Prototipo
  const [role, setRole] = useState<RoleType>("admin");
  const [activeView, setActiveView] = useState<ViewType>(tabParam === "estado_pedidos" ? "pedidos" : tabParam);
  const [modoVisualizacionPedidos, setModoVisualizacionPedidos] = useState<"listado" | "tablero">(
    tabParam === "estado_pedidos" ? "tablero" : "listado"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Datos principales
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Pedidos
  const [pedidos, setPedidos] = useState<PedidoDTO[]>([]);
  const [filtroEstadoPedido, setFiltroEstadoPedido] = useState<string>("TODOS");
  const [filtroModalidadPedido, setFiltroModalidadPedido] = useState<string>("TODOS");
  const [filtroEmpleadoPedido, setFiltroEmpleadoPedido] = useState<string>("TODOS");
  const [busquedaPedido, setBusquedaPedido] = useState("");
  const [comprobanteModalUrl, setComprobanteModalUrl] = useState<string | null>(null);
  const [comprobanteModalPedido, setComprobanteModalPedido] = useState<PedidoDTO | null>(null);
  const [comprobanteInfo, setComprobanteInfo] = useState<InfoComprobanteDTO | null>(null);
  const [loadingComprobanteInfo, setLoadingComprobanteInfo] = useState<boolean>(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoDTO | null>(null);
  const [filtroSoloComprobante, setFiltroSoloComprobante] = useState<boolean>(false);
  const [checkedStockItems, setCheckedStockItems] = useState<Record<string, boolean>>({});
  const [savingChecklistItems, setSavingChecklistItems] = useState<Record<string, boolean>>({});

  // Catálogo & Productos
  const [products, setProducts] = useState<CommercialProductItem[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string; productCount: number }[]>([]);
  const [filtroCatId, setFiltroCatId] = useState<number>(0);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [filtroEcom, setFiltroEcom] = useState<"TODOS" | "OFERTAS" | "NO_PUBLICADOS" | "DESTACADOS">("TODOS");
  const [editingProduct, setEditingProduct] = useState<CommercialProductItem | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productNormalPrice, setProductNormalPrice] = useState<number>(0);
  const [productEnOferta, setProductEnOferta] = useState(false);
  const [productDescuentoPct, setProductDescuentoPct] = useState(15);
  const [productBadge, setProductBadge] = useState("Mes de la Primavera");
  const [productPublicado, setProductPublicado] = useState(true);
  const [productDestacado, setProductDestacado] = useState(false);
  const [productRecomendado, setProductRecomendado] = useState(false);
  const [nuevaCatNombre, setNuevaCatNombre] = useState("");
  const [showNuevaCatModal, setShowNuevaCatModal] = useState(false);

  // Ofertas Masivas y Selección en Catálogo
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [bulkDescuentoPct, setBulkDescuentoPct] = useState(15);
  const [bulkBadgePromo, setBulkBadgePromo] = useState("Mes de la Primavera");
  const [showBulkOfferModal, setShowBulkOfferModal] = useState(false);

  // Staff de Preparadores para Stock (solo Stock y Administrador)
  const [staffPreparadores, setStaffPreparadores] = useState<Array<{ id: number; nombre: string; rol: string }>>([]);

  // Marcas
  const [marcas, setMarcas] = useState<MarcaAdminItem[]>([]);
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState("");
  const [nuevaMarcaLogo, setNuevaMarcaLogo] = useState<string | null>(null);
  const [showCrearMarcaModal, setShowCrearMarcaModal] = useState(false);
  const [uploadingNuevaMarcaLogo, setUploadingNuevaMarcaLogo] = useState(false);
  const [uploadingCardLogoId, setUploadingCardLogoId] = useState<number | null>(null);
  const [busquedaMarca, setBusquedaMarca] = useState("");
  const [selectedMarcaIds, setSelectedMarcaIds] = useState<number[]>([]);
  const [filtroMarcaEstado, setFiltroMarcaEstado] = useState<"TODAS" | "VISIBLES" | "OCULTAS">("TODAS");
  const [editingMarca, setEditingMarca] = useState<MarcaAdminItem | null>(null);
  const [editingMarcaNombre, setEditingMarcaNombre] = useState("");
  const [editingMarcaLogo, setEditingMarcaLogo] = useState<string | null>(null);
  const [uploadingEditingLogo, setUploadingEditingLogo] = useState(false);

  // Combos y kits
  const [combos, setCombos] = useState<ComboDTO[]>([]);
  const [busquedaCombo, setBusquedaCombo] = useState("");
  const [filtroComboEstado, setFiltroComboEstado] = useState<"TODOS" | "ACTIVOS" | "PAUSADOS">("TODOS");
  const [editingCombo, setEditingCombo] = useState<ComboDTO | null>(null);
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboNombre, setComboNombre] = useState("");
  const [comboSlug, setComboSlug] = useState("");
  const [comboDescripcion, setComboDescripcion] = useState("");
  const [comboBadge, setComboBadge] = useState("Mes de la Primavera");
  const [comboPrecio, setComboPrecio] = useState<number>(0);
  const [comboImages, setComboImages] = useState<string[]>([]);
  const [comboItems, setComboItems] = useState<{ productoId: number; cantidad: number }[]>([]);
  const [comboItemSearch, setComboItemSearch] = useState("");
  const [comboFormErrors, setComboFormErrors] = useState<Record<string, string>>({});

  // Etiquetas de Oferta
  const [etiquetas, setEtiquetas] = useState<EtiquetaOferta[]>([]);
  const [nuevaEtiquetaNombre, setNuevaEtiquetaNombre] = useState("");
  const [nuevaEtiquetaEmoji, setNuevaEtiquetaEmoji] = useState<string>("🔥");
  const [showCrearEtiquetaModal, setShowCrearEtiquetaModal] = useState(false);
  const [editingEtiqueta, setEditingEtiqueta] = useState<EtiquetaOferta | null>(null);
  const [editingEtiquetaNombre, setEditingEtiquetaNombre] = useState("");
  const [editingEtiquetaEmoji, setEditingEtiquetaEmoji] = useState<string | null>(null);
  const [busquedaEtiqueta, setBusquedaEtiqueta] = useState("");
  const [filtroEtiquetaEstado, setFiltroEtiquetaEstado] = useState<"TODAS" | "ACTIVAS" | "PAUSADAS">("TODAS");

  // Identidad
  const [config, setConfig] = useState<TiendaConfig>({
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
    mostrar_ahorro: true,
    ocultar_ahorro_cero: true,
    cuotas_habilitadas: false,
    cuotas_cantidad: 3,
    cuotas_sin_interes: true,
    cuotas_recargo_porcentaje: 0,
  });

  // Banners del Inicio (Hero y Temporada)
  const [bannersHome, setBannersHome] = useState<BannerHome[]>([]);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerHome | null>(null);
  const [bannerTitulo, setBannerTitulo] = useState("");
  const [bannerDescripcion, setBannerDescripcion] = useState("");
  const [bannerEnlace, setBannerEnlace] = useState("/ofertas");
  const [bannerBadge, setBannerBadge] = useState("CHOPPER REPUESTOS · POSADAS, MISIONES");
  const [bannerImagenUrl, setBannerImagenUrl] = useState("");
  const [bannerActivo, setBannerActivo] = useState(true);
  const [bannerOrden, setBannerOrden] = useState(1);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

  // Auditoría
  const [auditoriaLogs, setAuditoriaLogs] = useState<AuditoriaLog[]>([]);
  const [busquedaAuditoria, setBusquedaAuditoria] = useState("");
  const [filtroModuloAuditoria, setFiltroModuloAuditoria] = useState<string>("TODOS");
  const [filtroUsuarioAuditoria, setFiltroUsuarioAuditoria] = useState<string>("TODOS");
  const [filtroAccionAuditoria, setFiltroAccionAuditoria] = useState<string>("TODAS");
  const [filtroTipoAuditoria, setFiltroTipoAuditoria] = useState<string>("TODOS");
  const [filtroPeriodoAuditoria, setFiltroPeriodoAuditoria] = useState<string>("TODOS");

  // Vista Entrega (Ventas)
  const [entregaTab, setEntregaTab] = useState<"RETIRO_LOCAL" | "MOTOMANDADO">("RETIRO_LOCAL");
  const [filtroEstadoEntrega, setFiltroEstadoEntrega] = useState<"POR_ENTREGAR" | "ENTREGADOS" | "TODOS">("POR_ENTREGAR");
  const [busquedaEntrega, setBusquedaEntrega] = useState("");
  const [selectedEntregaPedido, setSelectedEntregaPedido] = useState<PedidoDTO | null>(null);
  const [codigoRetiroVerificado, setCodigoRetiroVerificado] = useState("");
  const [checkedEntregaItems, setCheckedEntregaItems] = useState<Record<string, boolean>>({});
  const [pagoEfectivoCobrado, setPagoEfectivoCobrado] = useState(false);
  const [choferMotoIdentificado, setChoferMotoIdentificado] = useState(false);
  const [isSubmittingCobro, setIsSubmittingCobro] = useState(false);
  const [cobroError, setCobroError] = useState<string | null>(null);
  const [cobroSuccess, setCobroSuccess] = useState<string | null>(null);
  const [tokenVerificacionActivo, setTokenVerificacionActivo] = useState<string | null>(null);
  const [isSubmittingEntrega, setIsSubmittingEntrega] = useState(false);

  // Vista Estado de Pedidos (Flujo Kanban)
  const [busquedaEstadoPedidos, setBusquedaEstadoPedidos] = useState("");

  // Helper para verificar vistas permitidas por rol
  const isViewAllowedForRole = (r: RoleType, v: ViewType): boolean => {
    if (r === "admin") return true;
    if (r === "venta") return v === "pedidos" || v === "entrega" || v === "finanzas" || v === "estado_pedidos";
    if (r === "stock") return v === "preparacion";
    return false;
  };

  // Sincronizar vista según rol (sin reinicios forzados si la vista actual está permitida)
  const handleSetRole = (newRole: RoleType) => {
    setRole(newRole);
    if (!isViewAllowedForRole(newRole, activeView)) {
      if (newRole === "stock") {
        setActiveView("preparacion");
      } else {
        setActiveView("pedidos");
      }
    }
  };

  useEffect(() => {
    if (activeView === "estado_pedidos") {
      setActiveView("pedidos");
      setModoVisualizacionPedidos("tablero");
    }
  }, [activeView]);

  // Carga inicial de datos
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        resPedidos,
        resProducts,
        resCats,
        resMarcas,
        resCombos,
        resEtiquetas,
        resConfig,
        resAudit,
        resStaff,
        resBanners,
      ] = await Promise.all([
        user?.id ? getPedidosEcommerceAction(user.id) : { success: false, pedidos: [] },
        getCommercialProductsAction(),
        getCategoriasAdminAction(),
        getMarcasAdminAction(),
        user?.id ? getAllCombosAdminAction(user.id) : { success: false, combos: [] },
        getEtiquetasOfertaAction(),
        getConfiguracionAction(),
        getAuditoriaLogsAction(),
        user?.id ? getStaffPreparadoresAction(user.id) : { success: false, staff: [] },
        getBannersHomeAction(),
      ]);

      if (resPedidos.success && resPedidos.pedidos) setPedidos(resPedidos.pedidos);
      if (resProducts.success) setProducts(resProducts.products);
      if (resCats.success) setCategorias(resCats.categorias);
      if (resMarcas.success) setMarcas(resMarcas.marcas);
      if (resCombos.success && resCombos.combos) setCombos(resCombos.combos);
      setEtiquetas(resEtiquetas);
      setConfig(resConfig);
      setAuditoriaLogs(resAudit);
      if (resBanners) setBannersHome(resBanners);
      if (resStaff.success && resStaff.staff) {
        setStaffPreparadores(resStaff.staff);
      }
    } catch (err) {
      console.error("Error al cargar datos del panel:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [user?.id]);

  useEffect(() => {
    if (activeView === "marcas") {
      getMarcasAdminAction().then((res) => {
        if (res.success && res.marcas) setMarcas(res.marcas);
      });
    }
  }, [activeView]);

  useEffect(() => {
    if (user?.rol) {
      if (user.rol === "ENCARGADO_VENTAS") {
        setRole("venta");
        if (!isViewAllowedForRole("venta", activeView)) {
          setActiveView("pedidos");
        }
      } else if (user.rol === "ENCARGADO_STOCK") {
        setRole("stock");
        if (!isViewAllowedForRole("stock", activeView)) {
          setActiveView("preparacion");
        }
      }
    }
  }, [user?.rol, activeView]);

  const showFeedback = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ════════════════════════════════════════════════════════════
  // MANEJADORES DE PEDIDOS
  // ════════════════════════════════════════════════════════════
  const handleCambiarEstadoPedido = async (
    pedidoId: number,
    nuevoEstado: string,
    notas?: string,
    preparadorId?: number | null,
    checklistCompletado?: boolean
  ) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const targetPreparer = preparadorId !== undefined ? preparadorId : null;
      const res = await actualizarEstadoPedidoAction(
        user.id,
        pedidoId,
        nuevoEstado as any,
        targetPreparer,
        notas,
        checklistCompletado
      );

      if (res.success) {
        showFeedback("success", `Pedido #${pedidoId} actualizado a ${nuevoEstado.replace(/_/g, " ")}`);
        await registrarAuditoriaAction(
          user.nombreCompleto || "Administrador",
          `Actualizó estado de orden #${pedidoId} a ${nuevoEstado}`,
          "Pedidos Online",
          notas || `Estado actualizado con éxito`
        );
        loadAllData();
        if (selectedPedido && selectedPedido.id === pedidoId && res.pedido) {
          setSelectedPedido(res.pedido);
        }
      } else {
        showFeedback("error", res.error || "No se pudo actualizar el estado del pedido.");
      }
    } catch (e) {
      showFeedback("error", "Error de red al actualizar pedido.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadComprobanteAdmin = async (pedidoNumero: number, file: File) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("comprobante", file);
      const res = await subirComprobantePedidoAction(pedidoNumero, formData);
      if (res.success && res.comprobanteUrl) {
        showFeedback("success", "Comprobante de pago adjuntado.");
        await registrarAuditoriaAction(
          user?.nombreCompleto || "Administrador",
          `Adjuntó comprobante de pago a orden #${pedidoNumero}`,
          "Pedidos Online",
          `Comprobante verificado y cargado`
        );
        loadAllData();
        if (selectedPedido && selectedPedido.numero === pedidoNumero) {
          setSelectedPedido((prev) => (prev ? { ...prev, comprobanteUrl: res.comprobanteUrl! } : null));
        }
      } else {
        showFeedback("error", res.error || "No se pudo subir el comprobante.");
      }
    } catch (e) {
      showFeedback("error", "Error al procesar el comprobante.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenComprobante = async (url: string | null, pedido?: PedidoDTO | null) => {
    if (!url) return;
    setComprobanteModalUrl(url);
    setComprobanteModalPedido(pedido || null);
    setLoadingComprobanteInfo(true);
    setComprobanteInfo(null);
    try {
      const res = await obtenerInfoComprobanteAction(url, pedido?.numero);
      if (res.success && res.info) {
        setComprobanteInfo(res.info);
      } else {
        const isPdf = url.toLowerCase().endsWith(".pdf");
        setComprobanteInfo({
          existe: false,
          url,
          nombreArchivo: url.split("/").pop() || "comprobante",
          esPdf: isPdf,
          esImagen: !isPdf,
          error: res.error || "No se pudo verificar el archivo.",
        });
      }
    } catch {
      const isPdf = url.toLowerCase().endsWith(".pdf");
      setComprobanteInfo({
        existe: false,
        url,
        nombreArchivo: url.split("/").pop() || "comprobante",
        esPdf: isPdf,
        esImagen: !isPdf,
        error: "Error de comunicación al consultar el archivo.",
      });
    } finally {
      setLoadingComprobanteInfo(false);
    }
  };

  // Cierre accesible con tecla Escape para el visor de comprobantes
  useEffect(() => {
    if (!comprobanteModalUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setComprobanteModalUrl(null);
        setComprobanteModalPedido(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [comprobanteModalUrl]);

  const getWhatsAppLink = (telefono: string | null | undefined, nombre: string, numero: number) => {
    if (!telefono) return null;
    let clean = telefono.replace(/\D/g, "");
    if (!clean.startsWith("549") && !clean.startsWith("54")) {
      clean = `549${clean}`;
    }
    const msg = `Hola ${nombre}, te escribimos de Chopper Repuestos por tu pedido #ORD-${numero}.`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      // Filtro de solo con comprobante
      if (filtroSoloComprobante && !p.comprobanteUrl) {
        return false;
      }
      // Filtro de estado
      if (filtroEstadoPedido === "CANCELACION_SOLICITADA") {
        const notas = p.notas || "";
        const tieneCancelacion =
          p.estado === "CANCELACION_SOLICITADA" ||
          (notas.includes("Cancelación solicitada por el cliente") &&
            !notas.includes("[CANCELACION_METADATA:") &&
            p.estado !== "CANCELADO");
        if (!tieneCancelacion) return false;
      } else if (filtroEstadoPedido === "LISTO_ENTREGA") {
        if (p.estado !== "LISTO_ENTREGA" && p.estado !== "LISTO_PARA_RETIRAR") {
          return false;
        }
      } else if (filtroEstadoPedido !== "TODOS" && p.estado !== filtroEstadoPedido) {
        return false;
      }
      // Filtro de modalidad
      if (filtroModalidadPedido !== "TODOS" && p.modalidadEntrega !== filtroModalidadPedido) {
        return false;
      }
      // Filtro de empleado preparador
      if (filtroEmpleadoPedido === "SIN_ASIGNAR") {
        if (p.preparadorUsuarioId || p.preparadorNombre) return false;
      } else if (filtroEmpleadoPedido !== "TODOS") {
        if (String(p.preparadorUsuarioId) !== filtroEmpleadoPedido) return false;
      }
      // Búsqueda
      if (busquedaPedido.trim()) {
        const q = busquedaPedido.toLowerCase().trim();
        const matchesOrd = `#ORD-${p.numero}`.toLowerCase().includes(q) || String(p.numero).includes(q);
        const matchesClient = (p.nombreCliente || "").toLowerCase().includes(q);
        const matchesDni = (p.dniCliente || "").toLowerCase().includes(q);
        const matchesTel = (p.telefonoCliente || "").toLowerCase().includes(q);
        const matchesPrep = (p.preparadorNombre || "").toLowerCase().includes(q);
        if (!matchesOrd && !matchesClient && !matchesDni && !matchesTel && !matchesPrep) return false;
      }
      return true;
    });
  }, [pedidos, filtroEstadoPedido, filtroModalidadPedido, filtroEmpleadoPedido, filtroSoloComprobante, busquedaPedido]);

  // Contadores para chips y KPI cards
  const countPendientes = useMemo(() => pedidos.filter((p) => p.estado === "PENDIENTE").length, [pedidos]);
  const countConfirmados = useMemo(() => pedidos.filter((p) => p.estado === "CONFIRMADO").length, [pedidos]);
  const countPreparando = useMemo(() => pedidos.filter((p) => p.estado === "PREPARANDO").length, [pedidos]);
  const countEnPreparacionTotal = useMemo(
    () => pedidos.filter((p) => p.estado === "PREPARANDO" || p.estado === "CONFIRMADO" || p.estado === "PENDIENTE").length,
    [pedidos]
  );
  const countPreparados = useMemo(
    () => pedidos.filter((p) => p.estado === "LISTO_ENTREGA" || p.estado === "LISTO_PARA_RETIRAR").length,
    [pedidos]
  );
  const countListos = countPreparados;
  const countPorEntregar = useMemo(
    () => pedidos.filter((p) => p.estado === "LISTO_PARA_RETIRAR" || p.estado === "LISTO_ENTREGA").length,
    [pedidos]
  );
  const countEntregados = useMemo(() => pedidos.filter((p) => p.estado === "ENTREGADO").length, [pedidos]);
  const countCancelados = useMemo(() => pedidos.filter((p) => p.estado === "CANCELADO").length, [pedidos]);
  const countCancelacionesPendientes = useMemo(
    () =>
      pedidos.filter((p) => {
        const notas = p.notas || "";
        return (
          p.estado === "CANCELACION_SOLICITADA" ||
          (notas.includes("Cancelación solicitada por el cliente") &&
            !notas.includes("[CANCELACION_METADATA:") &&
            p.estado !== "CANCELADO")
        );
      }).length,
    [pedidos]
  );
  const countConComprobante = useMemo(() => pedidos.filter((p) => !!p.comprobanteUrl).length, [pedidos]);
  const totalMontoPedidos = useMemo(() => pedidos.reduce((acc, p) => acc + (p.total || 0), 0), [pedidos]);

  // ════════════════════════════════════════════════════════════
  // MANEJADORES DE CATÁLOGO & PRODUCTOS
  // ════════════════════════════════════════════════════════════
  const handleOpenProductEdit = (p: CommercialProductItem) => {
    setEditingProduct(p);
    setProductImages(parseImages(p.imagen));
    setProductNormalPrice(p.precioVenta);
    setProductEnOferta(p.enOferta);
    setProductDescuentoPct(p.descuentoPorcentaje || 15);
    setProductBadge(p.badgePromo || "Mes de la Primavera");
    setProductPublicado(p.publicadoOnline);
    setProductDestacado(p.destacado);
    setProductRecomendado(p.recomendado);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || !user?.id) return;
    setSaving(true);
    try {
      // Calcular precio de oferta si está activo
      let precioOferta: number | null = null;
      if (productEnOferta && productDescuentoPct > 0) {
        precioOferta = Math.round(productNormalPrice * (1 - productDescuentoPct / 100));
      }

      const res = await upsertCommercialProductAction(user.id, editingProduct.id, {
        publicadoOnline: productPublicado,
        enOferta: productEnOferta,
        precioOferta,
        badgePromo: productEnOferta ? productBadge : null,
        destacado: productDestacado,
        recomendado: productRecomendado,
        imagenes: productImages.filter(Boolean),
        precioVenta: productNormalPrice,
      });

      if (res.success) {
        showFeedback("success", `Producto "${editingProduct.nombre}" guardado con éxito.`);
        await registrarAuditoriaAction(
          user.nombreCompleto || "Administrador",
          `Editó configuración comercial de "${editingProduct.nombre}"`,
          "Catálogo y Ofertas",
          `Precio: $${productNormalPrice} · Oferta: ${productEnOferta ? `${productDescuentoPct}% OFF ($${precioOferta})` : "No"}`
        );
        setEditingProduct(null);
        loadAllData();
      } else {
        showFeedback("error", res.error || "No se pudo actualizar el producto.");
      }
    } catch (e) {
      showFeedback("error", "Error al guardar producto.");
    } finally {
      setSaving(false);
    }
  };

  const handleCrearCategoria = async () => {
    if (!user?.id || !nuevaCatNombre.trim()) return;
    setSaving(true);
    try {
      const res = await crearCategoriaAction(user.id, nuevaCatNombre.trim());
      if (res.success) {
        showFeedback("success", `Categoría "${nuevaCatNombre}" creada.`);
        setNuevaCatNombre("");
        setShowNuevaCatModal(false);
        loadAllData();
      } else {
        showFeedback("error", res.error || "No se pudo crear la categoría.");
      }
    } catch (e) {
      showFeedback("error", "Error al crear categoría.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImageSlot = async (slotIndex: number, file: File, target: "producto" | "combo") => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadMediaAction(user.id, formData, target === "producto" ? "productos" : "combos");
      if (res.success && res.url) {
        if (target === "producto") {
          const updated = [...productImages];
          updated[slotIndex] = res.url;
          setProductImages(updated);
        } else {
          const updated = [...comboImages];
          updated[slotIndex] = res.url;
          setComboImages(updated);
        }
        showFeedback("success", "Foto subida correctamente.");
      } else {
        showFeedback("error", res.error || "Error al subir foto.");
      }
    } catch (e) {
      showFeedback("error", "Error de red al subir archivo.");
    } finally {
      setSaving(false);
    }
  };

  const productosFiltrados = useMemo(() => {
    return products.filter((p) => {
      if (filtroCatId > 0 && p.categoriaId !== filtroCatId) return false;
      if (filtroEcom === "OFERTAS" && !p.enOferta) return false;
      if (filtroEcom === "NO_PUBLICADOS" && p.publicadoOnline) return false;
      if (filtroEcom === "DESTACADOS" && !p.destacado) return false;

      if (busquedaProducto.trim()) {
        const q = busquedaProducto.toLowerCase().trim();
        const matchesNombre = p.nombre.toLowerCase().includes(q);
        const matchesMarca = (p.marca || "").toLowerCase().includes(q);
        const matchesCodigo = (p.codigo || "").toLowerCase().includes(q);
        if (!matchesNombre && !matchesMarca && !matchesCodigo) return false;
      }
      return true;
    });
  }, [products, filtroCatId, filtroEcom, busquedaProducto]);

  const isAllProductsSelected =
    productosFiltrados.length > 0 &&
    productosFiltrados.every((p) => selectedProductIds.includes(p.id));

  const handleSelectAllProducts = () => {
    if (isAllProductsSelected) {
      const filteredIds = new Set(productosFiltrados.map((p) => p.id));
      setSelectedProductIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const allFilteredIds = productosFiltrados.map((p) => p.id);
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleToggleSelectProduct = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAplicarOfertaLote = async () => {
    if (!user?.id || selectedProductIds.length === 0) return;
    setSaving(true);
    try {
      const res = await aplicarOfertaLoteAction(
        user.id,
        selectedProductIds,
        bulkDescuentoPct,
        bulkBadgePromo
      );
      if (res.success) {
        showFeedback(
          "success",
          `Oferta del ${bulkDescuentoPct}% (${bulkBadgePromo}) aplicada a ${res.count || selectedProductIds.length} repuestos.`
        );
        await registrarAuditoriaAction(
          user.nombreCompleto || "Administrador",
          `Aplicó oferta masiva del ${bulkDescuentoPct}% (${bulkBadgePromo}) a ${selectedProductIds.length} repuestos`,
          "Catálogo y Ofertas",
          `Productos: [${selectedProductIds.join(", ")}]`
        );
        setShowBulkOfferModal(false);
        setSelectedProductIds([]);
        loadAllData();
      } else {
        showFeedback("error", res.error || "No se pudo aplicar la oferta en lote.");
      }
    } catch (e) {
      showFeedback("error", "Error al aplicar oferta en lote.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuitarOfertaLote = async () => {
    if (!user?.id || selectedProductIds.length === 0) return;
    if (!confirm(`¿Quitar la oferta a los ${selectedProductIds.length} productos seleccionados?`)) return;
    setSaving(true);
    try {
      const res = await quitarOfertaLoteAction(user.id, selectedProductIds);
      if (res.success) {
        showFeedback("success", `Oferta quitada de ${res.count || selectedProductIds.length} repuestos.`);
        await registrarAuditoriaAction(
          user.nombreCompleto || "Administrador",
          `Quitó ofertas comerciales en lote a ${selectedProductIds.length} productos`,
          "Catálogo y Ofertas",
          `Productos: [${selectedProductIds.join(", ")}]`
        );
        setSelectedProductIds([]);
        loadAllData();
      } else {
        showFeedback("error", res.error || "No se pudo quitar la oferta en lote.");
      }
    } catch (e) {
      showFeedback("error", "Error al quitar oferta en lote.");
    } finally {
      setSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // MANEJADORES DE MARCAS
  // ════════════════════════════════════════════════════════════
  const marcasFiltradas = useMemo(() => {
    return marcas.filter((m) => {
      if (filtroMarcaEstado === "VISIBLES" && !m.activo) return false;
      if (filtroMarcaEstado === "OCULTAS" && m.activo) return false;
      if (busquedaMarca.trim()) {
        const q = busquedaMarca.toLowerCase().trim();
        return m.nombre.toLowerCase().includes(q);
      }
      return true;
    });
  }, [marcas, filtroMarcaEstado, busquedaMarca]);

  const isAllMarcasSelected =
    marcasFiltradas.length > 0 &&
    marcasFiltradas.every((m) => selectedMarcaIds.includes(m.id));

  const handleSelectAllMarcas = () => {
    if (isAllMarcasSelected) {
      const filteredIds = new Set(marcasFiltradas.map((m) => m.id));
      setSelectedMarcaIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const allFilteredIds = marcasFiltradas.map((m) => m.id);
      setSelectedMarcaIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleToggleSelectMarca = (id: number) => {
    setSelectedMarcaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchToggleMarcas = async (nuevoEstado: boolean) => {
    if (!user?.id || selectedMarcaIds.length === 0) return;
    setSaving(true);
    try {
      const res = await toggleMultiplesMarcasAction(user.id, selectedMarcaIds, nuevoEstado);
      if (res.success) {
        setMarcas((prev) =>
          prev.map((m) =>
            selectedMarcaIds.includes(m.id) ? { ...m, activo: nuevoEstado } : m
          )
        );
        showFeedback(
          "success",
          `${selectedMarcaIds.length} marcas marcadas como ${nuevoEstado ? "Visibles" : "Ocultas"}.`
        );
      } else {
        showFeedback("error", res.error || "No se pudieron actualizar las marcas.");
      }
    } catch (e) {
      showFeedback("error", "Error al actualizar marcas en lote.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadNuevaMarcaLogo = async (file?: File) => {
    if (!file || !user?.id) return;
    setUploadingNuevaMarcaLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadMediaAction(user.id, fd, "marcas");
      if (res.success && res.url) {
        setNuevaMarcaLogo(res.url);
        showFeedback("success", "Logo preparado para la marca.");
      } else {
        showFeedback("error", res.error || "No se pudo subir la imagen.");
      }
    } catch {
      showFeedback("error", "Error al procesar el logo de la marca.");
    } finally {
      setUploadingNuevaMarcaLogo(false);
    }
  };

  const handleUploadCardLogo = async (marcaId: number, file?: File) => {
    if (!file || !user?.id) return;
    setUploadingCardLogoId(marcaId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadMediaAction(user.id, fd, "marcas");
      if (res.success && res.url) {
        const updateRes = await actualizarLogoMarcaAction(user.id, marcaId, res.url);
        if (updateRes.success) {
          setMarcas((prev) =>
            prev.map((m) => (m.id === marcaId ? { ...m, imagen: res.url } : m))
          );
          showFeedback("success", "Foto de la marca actualizada.");
        } else {
          showFeedback("error", updateRes.error || "No se pudo actualizar el logo.");
        }
      } else {
        showFeedback("error", res.error || "Error al subir la imagen.");
      }
    } catch {
      showFeedback("error", "Error al actualizar el logo de la marca.");
    } finally {
      setUploadingCardLogoId(null);
    }
  };

  const handleCrearMarca = async () => {
    if (!user?.id || !nuevaMarcaNombre.trim()) return;
    setSaving(true);
    try {
      const res = await crearMarcaAction(user.id, nuevaMarcaNombre.trim(), nuevaMarcaLogo);
      if (res.success) {
        showFeedback("success", `Marca "${nuevaMarcaNombre}" agregada con éxito.`);
        setNuevaMarcaNombre("");
        setNuevaMarcaLogo(null);
        setShowCrearMarcaModal(false);
        loadAllData();
      } else {
        showFeedback("error", res.error || "No se pudo agregar la marca.");
      }
    } catch (e) {
      showFeedback("error", "Error al crear marca.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditarMarca = (m: MarcaAdminItem) => {
    setEditingMarca(m);
    setEditingMarcaNombre(m.nombre);
    const slug = m.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "");
    setEditingMarcaLogo(m.imagen || `/marcas/${slug}.svg`);
  };

  const handleUploadEditingMarcaLogo = async (file?: File) => {
    if (!file || !user?.id) return;
    setUploadingEditingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadMediaAction(user.id, fd);
      if (res.success && res.url) {
        setEditingMarcaLogo(res.url);
        showFeedback("success", "Logo cargado.");
      } else {
        showFeedback("error", res.error || "Error al subir imagen.");
      }
    } catch {
      showFeedback("error", "Error al procesar imagen.");
    } finally {
      setUploadingEditingLogo(false);
    }
  };

  const handleSaveEditarMarca = async () => {
    if (!user?.id || !editingMarca || !editingMarcaNombre.trim()) return;
    setSaving(true);
    try {
      const res = await editarMarcaCompletaAction(
        user.id,
        editingMarca.id,
        editingMarcaNombre.trim(),
        editingMarcaLogo
      );
      if (res.success) {
        showFeedback("success", `Marca "${editingMarcaNombre}" actualizada.`);
        setEditingMarca(null);
        loadAllData();
      } else {
        showFeedback("error", res.error || "No se pudo actualizar la marca.");
      }
    } catch {
      showFeedback("error", "Error al actualizar marca.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMarca = async (marcaId: number, estadoActual: boolean) => {
    if (!user?.id) return;
    try {
      const res = await toggleMarcaAction(user.id, marcaId, !estadoActual);
      if (res.success) {
        setMarcas((prev) => prev.map((m) => (m.id === marcaId ? { ...m, activo: !estadoActual } : m)));
        showFeedback("success", `Marca ${!estadoActual ? "activada" : "ocultada"} del carrusel.`);
      }
    } catch (e) {
      showFeedback("error", "No se pudo actualizar el estado de la marca.");
    }
  };

  // ════════════════════════════════════════════════════════════
  // MANEJADORES DE COMBOS & KITS
  // ════════════════════════════════════════════════════════════
  const handleOpenNuevoCombo = () => {
    setEditingCombo(null);
    setComboNombre("");
    setComboSlug("");
    setComboDescripcion("");
    setComboBadge("Mes de la Primavera");
    setComboPrecio(0);
    setComboImages([]);
    setComboItems([]);
    setComboFormErrors({});
    setShowComboModal(true);
  };

  const handleOpenEditCombo = (c: ComboDTO) => {
    setEditingCombo(c);
    setComboNombre(c.nombre);
    setComboSlug(c.slug || "");
    setComboDescripcion(c.descripcion || "");
    setComboBadge(c.badge || "Mes de la Primavera");
    setComboPrecio(c.precio);
    setComboImages(parseImages(c.imagen));
    setComboItems(c.items.map((it) => ({ productoId: it.productoId, cantidad: it.cantidad })));
    setComboFormErrors({});
    setShowComboModal(true);
  };

  const combosFiltrados = useMemo(() => {
    return combos.filter((c) => {
      if (filtroComboEstado === "ACTIVOS" && !c.activo) return false;
      if (filtroComboEstado === "PAUSADOS" && c.activo) return false;
      if (busquedaCombo.trim()) {
        const q = busquedaCombo.toLowerCase().trim();
        const matchesName = c.nombre.toLowerCase().includes(q);
        const matchesDesc = (c.descripcion || "").toLowerCase().includes(q);
        const matchesBadge = (c.badge || "").toLowerCase().includes(q);
        const matchesItems = c.items?.some((it) => it.producto?.nombre?.toLowerCase().includes(q));
        return matchesName || matchesDesc || matchesBadge || matchesItems;
      }
      return true;
    });
  }, [combos, filtroComboEstado, busquedaCombo]);

  const comboPrecioRegularCalculado = useMemo(() => {
    return comboItems.reduce((acc, it) => {
      const p = products.find((prod) => prod.id === it.productoId);
      return acc + (p ? p.precioVenta * it.cantidad : 0);
    }, 0);
  }, [comboItems, products]);

  const comboAhorroCalculado = useMemo(() => {
    return Math.max(0, comboPrecioRegularCalculado - comboPrecio);
  }, [comboPrecioRegularCalculado, comboPrecio]);

  const comboDescuentoPct = useMemo(() => {
    if (comboPrecioRegularCalculado <= 0) return 0;
    return Math.round((comboAhorroCalculado / comboPrecioRegularCalculado) * 100);
  }, [comboAhorroCalculado, comboPrecioRegularCalculado]);

  const comboStockCalculado = useMemo(() => {
    if (comboItems.length === 0) return 0;
    const stocksPosibles = comboItems.map((it) => {
      const p = products.find((prod) => prod.id === it.productoId);
      const stock = p?.cantidad ?? 0;
      return it.cantidad > 0 ? Math.floor(stock / it.cantidad) : 0;
    });
    return Math.min(...stocksPosibles);
  }, [comboItems, products]);

  const handleSaveCombo = async () => {
    if (!user?.id) {
      showFeedback("error", "Sesión inválida o expirada.");
      return;
    }

    const errors: Record<string, string> = {};
    if (!comboNombre.trim()) {
      errors.nombre = "Ingresá un nombre para el combo.";
    }
    if (typeof comboPrecio !== "number" || isNaN(comboPrecio) || comboPrecio <= 0) {
      errors.precio = "El precio del combo debe ser mayor a 0.";
    }
    if (comboItems.length === 0) {
      errors.items = "Agregá al menos un repuesto al combo.";
    } else {
      const hasInvalidQty = comboItems.some(
        (it) => !Number.isInteger(it.cantidad) || it.cantidad < 1
      );
      if (hasInvalidQty) {
        errors.items = "Cada repuesto seleccionado debe tener una cantidad entera mayor o igual a 1.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setComboFormErrors(errors);
      showFeedback("error", "Por favor revisá los campos del combo antes de guardar.");
      return;
    }
    setComboFormErrors({});

    setSaving(true);
    try {
      const mainImage = comboImages.filter(Boolean)[0] || "/combos/combo-service-motul.jpg";
      const res = await upsertComboAction(user.id, {
        id: editingCombo?.id,
        nombre: comboNombre.trim(),
        slug: comboSlug.trim() || undefined,
        descripcion: comboDescripcion.trim() || undefined,
        badge: comboBadge.trim() || "Mes de la Primavera",
        precio: comboPrecio,
        precioRegular: comboPrecioRegularCalculado,
        imagen: comboImages.filter(Boolean).join(",") || mainImage,
        items: comboItems,
        especificaciones: editingCombo?.especificaciones,
        motosCompatibles: editingCombo?.motosCompatibles,
      });

      if (res.success) {
        showFeedback("success", `Combo "${comboNombre}" guardado exitosamente.`);
        await registrarAuditoriaAction(
          user.nombreCompleto || "Administrador",
          `${editingCombo ? "Actualizó" : "Creó"} combo "${comboNombre}"`,
          "Combos y kits",
          `Precio: $${comboPrecio} · Regular: $${comboPrecioRegularCalculado} (${comboDescuentoPct}% OFF)`
        );
        setShowComboModal(false);
        loadAllData();
      } else {
        showFeedback("error", res.error || "No se pudo guardar el combo.");
      }
    } catch (e) {
      showFeedback("error", "Error al procesar el combo.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCombo = async (comboId: number, estadoActual: boolean) => {
    if (!user?.id) return;
    try {
      const res = await toggleComboEstadoAction(user.id, comboId, !estadoActual);
      if (res.success) {
        setCombos((prev) => prev.map((c) => (c.id === comboId ? { ...c, activo: !estadoActual } : c)));
        showFeedback("success", `Combo ${!estadoActual ? "activado" : "pausado"}.`);
      } else {
        showFeedback("error", res.error || "No se pudo actualizar el estado del combo.");
      }
    } catch (e) {
      showFeedback("error", "No se pudo actualizar el combo.");
    }
  };

  const handleEliminarCombo = async (comboId: number) => {
    if (!user?.id || !confirm("¿Estás seguro de eliminar este combo?")) return;
    try {
      const res = await eliminarComboAction(user.id, comboId);
      if (res.success) {
        setCombos((prev) => prev.filter((c) => c.id !== comboId));
        showFeedback("success", "Combo eliminado.");
      }
    } catch (e) {
      showFeedback("error", "No se pudo eliminar el combo.");
    }
  };

  // ════════════════════════════════════════════════════════════
  // MANEJADORES DE ETIQUETAS
  // ════════════════════════════════════════════════════════════
  const handleCrearEtiqueta = async () => {
    if (!user?.id || !nuevaEtiquetaNombre.trim()) return;
    setSaving(true);
    try {
      const res = await crearEtiquetaOfertaAction(user.id, nuevaEtiquetaNombre.trim(), nuevaEtiquetaEmoji);
      if (res.success && res.etiquetas) {
        setEtiquetas(res.etiquetas);
        setNuevaEtiquetaNombre("");
        setNuevaEtiquetaEmoji("🔥");
        setShowCrearEtiquetaModal(false);
        showFeedback("success", `Etiqueta "${nuevaEtiquetaNombre}" creada con éxito.`);
      } else {
        showFeedback("error", res.error || "No se pudo crear la etiqueta.");
      }
    } catch (e) {
      showFeedback("error", "Error al crear etiqueta.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEtiqueta = async (id: string, activa: boolean) => {
    if (!user?.id) return;
    try {
      const res = await toggleEtiquetaOfertaAction(user.id, id, !activa);
      if (res.success && res.etiquetas) {
        setEtiquetas(res.etiquetas);
        showFeedback("success", `Etiqueta ${!activa ? "activada" : "pausada"}.`);
      }
    } catch (e) {
      showFeedback("error", "Error al modificar etiqueta.");
    }
  };

  const handleSaveEditarEtiqueta = async () => {
    if (!user?.id || !editingEtiqueta || !editingEtiquetaNombre.trim()) return;
    setSaving(true);
    try {
      const res = await editarEtiquetaOfertaAction(
        user.id,
        editingEtiqueta.id,
        editingEtiquetaNombre.trim(),
        editingEtiquetaEmoji
      );
      if (res.success && res.etiquetas) {
        setEtiquetas(res.etiquetas);
        setEditingEtiqueta(null);
        setEditingEtiquetaEmoji(null);
        showFeedback("success", `Etiqueta actualizada a "${editingEtiquetaNombre}".`);
      } else {
        showFeedback("error", res.error || "No se pudo actualizar la etiqueta.");
      }
    } catch {
      showFeedback("error", "Error al actualizar etiqueta.");
    } finally {
      setSaving(false);
    }
  };

  const etiquetasFiltradas = useMemo(() => {
    return etiquetas.filter((e) => {
      if (filtroEtiquetaEstado === "ACTIVAS" && !e.activa) return false;
      if (filtroEtiquetaEstado === "PAUSADAS" && e.activa) return false;
      if (busquedaEtiqueta.trim()) {
        const q = busquedaEtiqueta.toLowerCase().trim();
        return e.nombre.toLowerCase().includes(q);
      }
      return true;
    });
  }, [etiquetas, filtroEtiquetaEstado, busquedaEtiqueta]);

  // ════════════════════════════════════════════════════════════
  // MANEJADORES DE IDENTIDAD & BRANDING
  // ════════════════════════════════════════════════════════════
  const handleSaveConfig = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const res = await updateConfiguracionAction(user.id, config);
      if (res.success && res.config) {
        setConfig(res.config);
        updateContextConfig(res.config);
        showFeedback("success", "Identidad y configuración de la tienda guardada.");
        await registrarAuditoriaAction(
          user.nombreCompleto || "Administrador",
          "Actualizó datos de identidad y branding",
          "Identidad & Branding",
          `Banner: ${config.mostrar_banner_promocion ? "Activo" : "Inactivo"} · Badges ahorro: ${config.mostrar_ahorro ? "Visible" : "Oculto"}`
        );
      } else {
        showFeedback("error", res.error || "No se pudo guardar la configuración.");
      }
    } catch (e) {
      showFeedback("error", "Error al guardar configuración.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (file: File) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await uploadLogoAction(user.id, formData);
      if (res.success && res.logoUrl) {
        setConfig((prev) => ({ ...prev, logo_url: res.logoUrl! }));
        updateContextConfig({ logo_url: res.logoUrl });
        showFeedback("success", "Logo institucional actualizado con éxito.");
      } else {
        showFeedback("error", res.error || "No se pudo subir el logo.");
      }
    } catch (e) {
      showFeedback("error", "Error al subir archivo de logo.");
    } finally {
      setSaving(false);
    }
  };

  // Manejadores de Banners del Inicio (Hero y Temporada)
  const handleOpenCrearBanner = () => {
    setEditingBanner(null);
    setBannerTitulo("");
    setBannerDescripcion("");
    setBannerEnlace("/ofertas");
    setBannerBadge("CHOPPER REPUESTOS · POSADAS, MISIONES");
    setBannerImagenUrl("");
    setBannerActivo(true);
    setBannerOrden(bannersHome.length + 1);
    setShowBannerModal(true);
  };

  const handleOpenEditarBanner = (banner: BannerHome) => {
    setEditingBanner(banner);
    setBannerTitulo(banner.titulo);
    setBannerDescripcion(banner.descripcion);
    setBannerEnlace(banner.enlace || "/ofertas");
    setBannerBadge(banner.badge || "");
    setBannerImagenUrl(banner.imagenUrl || "");
    setBannerActivo(banner.activo);
    setBannerOrden(banner.orden || 1);
    setShowBannerModal(true);
  };

  const handleGuardarBanner = async () => {
    if (!user?.id) return;
    if (!bannerTitulo.trim()) {
      showFeedback("error", "Ingresá un título para el banner.");
      return;
    }
    setSaving(true);
    try {
      if (editingBanner) {
        const res = await editarBannerHomeAction(user.id, editingBanner.id, {
          titulo: bannerTitulo,
          descripcion: bannerDescripcion,
          enlace: bannerEnlace,
          badge: bannerBadge,
          imagenUrl: bannerImagenUrl,
          activo: bannerActivo,
          orden: bannerOrden,
        });
        if (res.success && res.banners) {
          setBannersHome(res.banners);
          setShowBannerModal(false);
          showFeedback("success", "Banner actualizado con éxito.");
          await registrarAuditoriaAction(
            user.nombreCompleto || "Administrador",
            `Editó banner de inicio "${bannerTitulo}"`,
            "Identidad",
            `Estado: ${bannerActivo ? "Activo" : "Pausado"}`
          );
        } else {
          showFeedback("error", res.error || "No se pudo actualizar el banner.");
        }
      } else {
        const res = await crearBannerHomeAction(user.id, {
          titulo: bannerTitulo,
          descripcion: bannerDescripcion,
          enlace: bannerEnlace,
          badge: bannerBadge,
          imagenUrl: bannerImagenUrl,
          activo: bannerActivo,
          orden: bannerOrden,
        });
        if (res.success && res.banners) {
          setBannersHome(res.banners);
          setShowBannerModal(false);
          showFeedback("success", "Banner creado con éxito.");
          await registrarAuditoriaAction(
            user.nombreCompleto || "Administrador",
            `Creó nuevo banner "${bannerTitulo}"`,
            "Identidad",
            `Estado: ${bannerActivo ? "Activo" : "Pausado"}`
          );
        } else {
          showFeedback("error", res.error || "No se pudo crear el banner.");
        }
      }
    } catch {
      showFeedback("error", "Error al procesar el banner.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBanner = async (id: string, activo: boolean) => {
    if (!user?.id) return;
    try {
      const res = await toggleBannerHomeAction(user.id, id, activo);
      if (res.success && res.banners) {
        setBannersHome(res.banners);
        showFeedback("success", activo ? "Banner activado en la tienda." : "Banner pausado.");
      } else {
        showFeedback("error", res.error || "No se pudo cambiar el estado del banner.");
      }
    } catch {
      showFeedback("error", "Error al alternar estado del banner.");
    }
  };

  const handleEliminarBanner = async (id: string) => {
    if (!user?.id) return;
    if (!confirm("¿Seguro que deseás eliminar este banner del inicio?")) return;
    try {
      const res = await eliminarBannerHomeAction(user.id, id);
      if (res.success && res.banners) {
        setBannersHome(res.banners);
        showFeedback("success", "Banner eliminado.");
        await registrarAuditoriaAction(
          user.nombreCompleto || "Administrador",
          `Eliminó banner del inicio ID: ${id}`,
          "Identidad"
        );
      } else {
        showFeedback("error", res.error || "No se pudo eliminar el banner.");
      }
    } catch {
      showFeedback("error", "Error al eliminar el banner.");
    }
  };

  const handleUploadBannerImage = async (file: File) => {
    if (!user?.id) return;
    setUploadingBannerImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadMediaAction(user.id, formData, "banners");
      if (res.success && res.url) {
        setBannerImagenUrl(res.url);
        showFeedback("success", "Imagen de banner cargada con éxito.");
      } else {
        showFeedback("error", res.error || "No se pudo subir la imagen.");
      }
    } catch {
      showFeedback("error", "Error al procesar la imagen del banner.");
    } finally {
      setUploadingBannerImage(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // MANEJADORES DE ENTREGA (Ventas)
  // ════════════════════════════════════════════════════════════
  const handleOpenEntregaModal = (p: PedidoDTO) => {
    setSelectedEntregaPedido(p);
    // El campo de verificación de DNI inicia siempre vacío para exigir ingreso manual de Ventas
    setCodigoRetiroVerificado("");
    const initialChecked: Record<string, boolean> = {};
    p.items?.forEach((it) => {
      initialChecked[String(it.id)] = false;
    });
    setCheckedEntregaItems(initialChecked);
    setPagoEfectivoCobrado(p.estadoPago === "PAGADO");
    setChoferMotoIdentificado(false);
    setCobroError(null);
    setCobroSuccess(null);
    setTokenVerificacionActivo(null);
  };

  const handleRegistrarCobroMostradorModal = async () => {
    if (!selectedEntregaPedido || !user?.id) return;
    if (isSubmittingCobro) return;

    if (selectedEntregaPedido.estadoPago === "PAGADO") {
      setCobroError("Este pedido ya figura como pagado.");
      return;
    }

    const dniIngresado = (codigoRetiroVerificado || "").trim();
    if (!dniIngresado) {
      setCobroError("Ingresá el DNI del cliente en el Paso 1 para verificar su identidad antes de registrar el cobro.");
      return;
    }

    // Validar DNI ingresado contra el registrado en la orden
    const dniRegNorm = (selectedEntregaPedido.dniCliente || "").replace(/\D/g, "").trim();
    const dniIngNorm = dniIngresado.replace(/\D/g, "").trim();
    const isMatch = dniRegNorm
      ? dniIngNorm === dniRegNorm
      : dniIngresado.toLowerCase() === (selectedEntregaPedido.dniCliente || "").trim().toLowerCase();

    if (!isMatch) {
      setCobroError(
        `El DNI ingresado (${dniIngresado}) no coincide con el DNI registrado en el pedido (${selectedEntregaPedido.dniCliente || "sin DNI"}). Verificá el documento del cliente antes de registrar el cobro.`
      );
      return;
    }

    setIsSubmittingCobro(true);
    setCobroError(null);
    setCobroSuccess(null);

    try {
      const res = await registrarCobroEfectivoAction(
        user.id,
        selectedEntregaPedido.id,
        `Cobro en mostrador DNI ${dniIngresado}`,
        tokenVerificacionActivo || undefined,
        dniIngresado
      );

      if (res.success && res.pedido) {
        setCobroSuccess(`Cobro de ${formatPrice(selectedEntregaPedido.total)} registrado con éxito en mostrador.`);
        if (res.tokenVerificacion) {
          setTokenVerificacionActivo(res.tokenVerificacion);
        }
        setSelectedEntregaPedido(res.pedido);
        setPagoEfectivoCobrado(true);
        showFeedback("success", `Cobro de ${formatPrice(selectedEntregaPedido.total)} registrado para #ORD-${selectedEntregaPedido.numero}`);
        await registrarAuditoriaAction(
          user.nombreCompleto || "Personal de Ventas",
          `Registró cobro en mostrador de orden #${selectedEntregaPedido.numero} por ${formatPrice(selectedEntregaPedido.total)}`,
          "Entregas",
          `DNI presentado: ${dniIngresado}`
        );
        loadAllData();
      } else {
        setCobroError(res.error || "No se pudo registrar el cobro en mostrador.");
      }
    } catch (e: any) {
      setCobroError("Error de comunicación al procesar el cobro.");
    } finally {
      setIsSubmittingCobro(false);
    }
  };

  const handleConfirmarEntregaModal = async () => {
    if (!selectedEntregaPedido || !user?.id) return;
    if (isSubmittingEntrega) return;

    // Guard 1: no se puede entregar si todavía está preparándose
    if (
      selectedEntregaPedido.estado === "PREPARANDO" ||
      selectedEntregaPedido.estado === "PENDIENTE" ||
      selectedEntregaPedido.estado === "CONFIRMADO"
    ) {
      showFeedback("error", "El pedido todavía no fue marcado como listo por Stock. Esperá a que Stock complete la preparación.");
      return;
    }

    // Guard 2: si es cobro en mostrador y no está pagado, exigir cobro previo
    if (selectedEntregaPedido.metodoPago === "EFECTIVO_LOCAL" && selectedEntregaPedido.estadoPago !== "PAGADO") {
      setCobroError("No podés entregar el pedido sin registrar primero el cobro en mostrador.");
      return;
    }

    // Guard 3: validar DNI presentado para retiro en mostrador
    const isRetiro = selectedEntregaPedido.modalidadEntrega === "RETIRO_LOCAL";
    const dniIngresado = (codigoRetiroVerificado || "").trim();
    if (isRetiro) {
      if (!dniIngresado) {
        setCobroError("Ingresá el DNI del cliente que retira en el Paso 1 para confirmar la entrega.");
        return;
      }

      const dniRegNorm = (selectedEntregaPedido.dniCliente || "").replace(/\D/g, "").trim();
      const dniIngNorm = dniIngresado.replace(/\D/g, "").trim();
      const isMatch = dniRegNorm
        ? dniIngNorm === dniRegNorm
        : dniIngresado.toLowerCase() === (selectedEntregaPedido.dniCliente || "").trim().toLowerCase();

      if (!isMatch) {
        setCobroError(
          `El DNI ingresado (${dniIngresado}) no coincide con el DNI registrado en el pedido (${selectedEntregaPedido.dniCliente || "sin DNI"}). No se puede autorizar la entrega.`
        );
        return;
      }
    }

    setIsSubmittingEntrega(true);
    setCobroError(null);
    try {
      const notasEntrega = isRetiro
        ? `Entregado en mostrador por ${user.nombreCompleto || "Carlos López"} · DNI retiro: ${dniIngresado}`
        : `Despachado en Motomandado/Moto Uber por ${user.nombreCompleto || "Carlos López"} a ${selectedEntregaPedido.direccionEnvio || "Posadas"}`;

      const res = await actualizarEstadoPedidoAction(
        user.id,
        selectedEntregaPedido.id,
        "ENTREGADO",
        notasEntrega,
        tokenVerificacionActivo || (dniIngresado ? `DNI: ${dniIngresado}` : undefined)
      );

      if (res.success) {
        showFeedback("success", `Orden #ORD-${selectedEntregaPedido.numero} entregada con éxito.`);
        await registrarAuditoriaAction(
          user.nombreCompleto || "Personal de Ventas",
          `Entregó orden #${selectedEntregaPedido.numero} en mostrador`,
          "Entregas",
          notasEntrega
        );
        setSelectedEntregaPedido(null);
        loadAllData();
      } else {
        setCobroError(res.error || "No se pudo confirmar la entrega.");
      }
    } catch (e) {
      setCobroError("Error de conexión al confirmar entrega.");
    } finally {
      setIsSubmittingEntrega(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  const pedidosEntrega = useMemo(() => {
    return pedidos.filter((p) => {
      if (p.estado === "CANCELADO") return false;
      if (p.modalidadEntrega !== entregaTab) return false;

      // Respetar estrictamente el filtro activo por estado de entrega
      if (filtroEstadoEntrega === "POR_ENTREGAR") {
        if (p.estado !== "LISTO_PARA_RETIRAR" && p.estado !== "LISTO_ENTREGA") return false;
      } else if (filtroEstadoEntrega === "ENTREGADOS") {
        if (p.estado !== "ENTREGADO") return false;
      } else if (filtroEstadoEntrega === "TODOS") {
        if (
          p.estado !== "LISTO_PARA_RETIRAR" &&
          p.estado !== "LISTO_ENTREGA" &&
          p.estado !== "ENTREGADO"
        ) {
          return false;
        }
      }

      // Si no hay texto de búsqueda, pasa el filtro
      if (!busquedaEntrega.trim()) return true;

      // Con búsqueda activa: filtrar por número de orden, DNI o cliente
      const rawQ = busquedaEntrega.trim().toLowerCase();
      const cleanDigits = busquedaEntrega.replace(/\D/g, "");

      const matchesOrd =
        `#ord-${p.numero}`.includes(rawQ) ||
        `ord-${p.numero}`.includes(rawQ) ||
        String(p.numero).includes(rawQ) ||
        (cleanDigits.length > 0 && String(p.numero) === cleanDigits);

      const pDniClean = (p.dniCliente || "").replace(/\D/g, "");
      const matchesDni =
        (p.dniCliente || "").toLowerCase().includes(rawQ) ||
        (cleanDigits.length >= 3 && pDniClean.includes(cleanDigits));

      const matchesName = (p.nombreCliente || "").toLowerCase().includes(rawQ);

      return matchesOrd || matchesDni || matchesName;
    });
  }, [pedidos, entregaTab, filtroEstadoEntrega, busquedaEntrega]);

  // ════════════════════════════════════════════════════════════
  // MANEJADORES DE PREPARACIÓN KANBAN (Stock)
  // ════════════════════════════════════════════════════════════
  const kanbanPendientes = useMemo(
    () => pedidos.filter((p) => p.estado === "CONFIRMADO"),
    [pedidos]
  );
  const kanbanPreparando = useMemo(() => pedidos.filter((p) => p.estado === "PREPARANDO"), [pedidos]);
  const kanbanListos = useMemo(
    () =>
      pedidos.filter(
        (p) => p.estado === "LISTO_ENTREGA" || p.estado === "LISTO_PARA_RETIRAR" || p.estado === "ENTREGADO"
      ),
    [pedidos]
  );

  const handleToggleChecklistItem = async (pedidoId: number, itemId: number, nuevoPreparado: boolean) => {
    if (!user?.id) return;
    const itemKey = `${pedidoId}-${itemId}`;
    const orderKey = `ped-${pedidoId}`;
    setSavingChecklistItems((prev) => ({ ...prev, [itemKey]: true, [orderKey]: true }));

    try {
      const res = await actualizarChecklistItemsAction(user.id, pedidoId, [
        { itemId, preparado: nuevoPreparado },
      ]);

      if (res.success && res.items) {
        setPedidos((prevPedidos) =>
          prevPedidos.map((ped) => {
            if (ped.id !== pedidoId) return ped;
            return {
              ...ped,
              items: ped.items?.map((it) => {
                const itemActualizado = res.items?.find((upIt) => upIt.id === it.id);
                return itemActualizado ? { ...it, ...itemActualizado } : it;
              }),
            };
          })
        );
        if (selectedPedido && selectedPedido.id === pedidoId) {
          setSelectedPedido((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              items: prev.items?.map((it) => {
                const itemActualizado = res.items?.find((upIt) => upIt.id === it.id);
                return itemActualizado ? { ...it, ...itemActualizado } : it;
              }),
            };
          });
        }
      } else {
        showFeedback("error", res.error || "No se pudo guardar el control del repuesto.");
      }
    } catch (e) {
      showFeedback("error", "Error de comunicación al actualizar el checklist.");
    } finally {
      setSavingChecklistItems((prev) => {
        const next = { ...prev };
        delete next[itemKey];
        const quedanDelPedido = Object.keys(next).some((k) => k !== orderKey && k.startsWith(`${pedidoId}-`));
        if (!quedanDelPedido) {
          delete next[orderKey];
        }
        return next;
      });
    }
  };

  const handleMarcarTodosChecklist = async (pedido: PedidoDTO, marcarComo: boolean) => {
    if (!user?.id || !pedido.items || pedido.items.length === 0) return;
    const orderKey = `ped-${pedido.id}`;
    setSavingChecklistItems((prev) => ({ ...prev, [orderKey]: true }));

    try {
      const itemsCheck = pedido.items.map((it) => ({
        itemId: it.id,
        preparado: marcarComo,
        cantidadPreparada: marcarComo ? it.cantidad : 0,
      }));

      const res = await actualizarChecklistItemsAction(user.id, pedido.id, itemsCheck);
      if (res.success && res.items) {
        setPedidos((prevPedidos) =>
          prevPedidos.map((ped) => {
            if (ped.id !== pedido.id) return ped;
            return {
              ...ped,
              items: ped.items?.map((it) => {
                const itemActualizado = res.items?.find((upIt) => upIt.id === it.id);
                return itemActualizado ? { ...it, ...itemActualizado } : it;
              }),
            };
          })
        );
        if (selectedPedido && selectedPedido.id === pedido.id) {
          setSelectedPedido((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              items: prev.items?.map((it) => {
                const itemActualizado = res.items?.find((upIt) => upIt.id === it.id);
                return itemActualizado ? { ...it, ...itemActualizado } : it;
              }),
            };
          });
        }
      } else {
        showFeedback("error", res.error || "No se pudieron actualizar los controles en el servidor.");
      }
    } catch (e) {
      showFeedback("error", "Error de comunicación al actualizar el checklist.");
    } finally {
      setSavingChecklistItems((prev) => {
        const next = { ...prev };
        delete next[orderKey];
        return next;
      });
    }
  };

  const handleFinalizarPreparacion = async (p: PedidoDTO) => {
    if (!user?.id || saving) return;
    const isOrderSaving = !!savingChecklistItems[`ped-${p.id}`];
    if (isOrderSaving) {
      showFeedback("error", "Esperá a que se guarden los controles pendientes en el servidor.");
      return;
    }

    const totalItems = p.items?.length || 0;
    const checkedCount = p.items?.filter((it) => !!it.preparado && (it.cantidadPreparada ?? 0) >= it.cantidad).length || 0;

    if (totalItems === 0 || checkedCount < totalItems) {
      showFeedback("error", `No podés marcar listo para entrega: faltan ${totalItems - checkedCount} repuesto(s) por controlar en el checklist.`);
      return;
    }

    await handleCambiarEstadoPedido(
      p.id,
      p.modalidadEntrega === "MOTOMANDADO" ? "LISTO_ENTREGA" : "LISTO_PARA_RETIRAR",
      `Listo para entrega. Preparado por: ${p.preparadorNombre || user.nombreCompleto}`,
      p.preparadorUsuarioId || user.id,
      true
    );
  };

  // ════════════════════════════════════════════════════════════
  // MANEJADORES DE ESTADO DE PEDIDOS (Flujo Ventas & Admin)
  // ════════════════════════════════════════════════════════════
  const pedidosFiltradosEstado = useMemo(() => {
    if (!busquedaEstadoPedidos.trim()) return pedidos;
    const q = busquedaEstadoPedidos.toLowerCase().trim();
    return pedidos.filter((p) => {
      const matchesOrd = `#ORD-${p.numero}`.toLowerCase().includes(q) || String(p.numero).includes(q);
      const matchesDni = (p.dniCliente || "").toLowerCase().includes(q);
      const matchesName = (p.nombreCliente || "").toLowerCase().includes(q);
      return matchesOrd || matchesDni || matchesName;
    });
  }, [pedidos, busquedaEstadoPedidos]);

  const colVerificarPago = useMemo(
    () => pedidosFiltradosEstado.filter((p) => p.estado === "PENDIENTE"),
    [pedidosFiltradosEstado]
  );
  const colPendientesArmar = useMemo(
    () => pedidosFiltradosEstado.filter((p) => p.estado === "CONFIRMADO"),
    [pedidosFiltradosEstado]
  );
  const colEnPreparacion = useMemo(
    () => pedidosFiltradosEstado.filter((p) => p.estado === "PREPARANDO"),
    [pedidosFiltradosEstado]
  );
  const colListosEntrega = useMemo(
    () =>
      pedidosFiltradosEstado.filter(
        (p) => p.estado === "LISTO_PARA_RETIRAR" || p.estado === "LISTO_ENTREGA"
      ),
    [pedidosFiltradosEstado]
  );
  const colEntregados = useMemo(
    () => pedidosFiltradosEstado.filter((p) => p.estado === "ENTREGADO"),
    [pedidosFiltradosEstado]
  );

  const cleanModuloName = (m?: string | null) => {
    if (!m) return "General";
    return m
      .replace(/Identidad & Branding/gi, "Identidad")
      .replace(/Combos & Kits/gi, "Combos y kits")
      .replace(/Catálogo & Ofertas/gi, "Catálogo y Ofertas")
      .replace(/\s*&\s*/g, " y ");
  };

  const modulosAuditoriaDisponibles = useMemo(() => {
    const setMods = new Set<string>();
    auditoriaLogs.forEach((l) => {
      if (l.modulo) setMods.add(cleanModuloName(l.modulo));
    });
    return Array.from(setMods);
  }, [auditoriaLogs]);

  const usuariosAuditoriaDisponibles = useMemo(() => {
    const setUsers = new Set<string>();
    staffPreparadores.forEach((s) => setUsers.add(s.nombre));
    if (user?.nombreCompleto) setUsers.add(user.nombreCompleto);
    auditoriaLogs.forEach((l) => {
      if (l.usuario) {
        const clean = l.usuario.replace(/\s*\(Ventas\)$/i, "").trim();
        setUsers.add(clean);
      }
    });
    return Array.from(setUsers);
  }, [auditoriaLogs, staffPreparadores, user]);

  const auditoriaFiltrada = useMemo(() => {
    return auditoriaLogs.filter((log) => {
      const modLimpio = cleanModuloName(log.modulo);
      const cleanLogUser = log.usuario ? log.usuario.replace(/\s*\(Ventas\)$/i, "").trim() : "";
      if (filtroUsuarioAuditoria !== "TODOS" && cleanLogUser !== filtroUsuarioAuditoria) return false;
      if (filtroModuloAuditoria !== "TODOS" && modLimpio !== filtroModuloAuditoria && log.modulo !== filtroModuloAuditoria) return false;

      // Filtro por tipo de acción
      if (filtroTipoAuditoria !== "TODOS") {
        const accLower = (log.accion || "").toLowerCase();
        if (filtroTipoAuditoria === "ESTADOS" && !accLower.includes("estado") && !accLower.includes("entregado") && !accLower.includes("preparando") && !accLower.includes("orden")) return false;
        if (filtroTipoAuditoria === "PREPARADORES" && !accLower.includes("preparador") && !accLower.includes("asignó") && !accLower.includes("reasignado")) return false;
        if (filtroTipoAuditoria === "PRECIOS" && !accLower.includes("precio") && !accLower.includes("oferta") && !accLower.includes("descuento")) return false;
        if (filtroTipoAuditoria === "CONFIG" && !accLower.includes("identidad") && !accLower.includes("banner") && !accLower.includes("campaña")) return false;
      }

      // Filtro por período
      if (filtroPeriodoAuditoria === "HOY" && !log.fecha.toLowerCase().includes("hoy")) return false;

      if (busquedaAuditoria.trim()) {
        const q = busquedaAuditoria.toLowerCase().trim();
        const matchesUser = cleanLogUser.toLowerCase().includes(q);
        const matchesAccion = (log.accion || "").toLowerCase().includes(q);
        const matchesDetalles = (log.detalle || "").toLowerCase().includes(q);
        const matchesModulo = modLimpio.toLowerCase().includes(q);
        return matchesUser || matchesAccion || matchesDetalles || matchesModulo;
      }
      return true;
    });
  }, [auditoriaLogs, filtroModuloAuditoria, filtroUsuarioAuditoria, filtroTipoAuditoria, filtroPeriodoAuditoria, busquedaAuditoria]);

  // Redireccionar inmediatamente a la tienda si no hay usuario autenticado
  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleSelectPedidoFromNotification = (pedidoId: number, moduloDestino?: string) => {
    if (moduloDestino === "preparacion" || role === "stock") {
      setActiveView("preparacion");
    } else if (moduloDestino === "entrega") {
      setActiveView("entrega");
    } else {
      setActiveView("pedidos");
    }
    const pedido = pedidos.find((p: PedidoDTO) => p.id === pedidoId || p.numero === pedidoId);
    if (pedido) {
      setSelectedPedido(pedido);
    }
  };

  const handleNavigateSectionFromNotification = (
    modulo: "pedidos" | "preparacion" | "entrega",
    filtroEstado?: string
  ) => {
    setActiveView(modulo);
    if (modulo === "pedidos") {
      setBusquedaPedido("");
      setFiltroModalidadPedido("TODOS");
      setFiltroEmpleadoPedido("TODOS");
      setFiltroSoloComprobante(false);
      setModoVisualizacionPedidos("listado");
      if (filtroEstado) setFiltroEstadoPedido(filtroEstado);
    } else if (modulo === "entrega") {
      setBusquedaEntrega("");
      setFiltroEstadoEntrega(filtroEstado === "ENTREGADOS" ? "ENTREGADOS" : "POR_ENTREGAR");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="panel-root flex h-full w-full overflow-hidden bg-[#0f1012] text-[#e7e7ea] font-sans antialiased">
      {/* Toast de feedback */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-2.5 border transition-all ${
            feedback.type === "success"
              ? "bg-[#16a34a] text-white border-green-400"
              : "bg-[#dc2626] text-white border-red-400"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.msg}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SIDEBAR CALCADO AL PROTOTIPO */}
      {/* ════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#16171c] border-r border-[#26272e] flex flex-col transition-transform duration-200 lg:static lg:h-full lg:flex-shrink-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "hidden lg:flex"
        }`}
      >
        {/* Brand */}
        <div className="p-5 font-bold tracking-wider text-sm border-b border-[#26272e] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-pulse"></span>
            CHOPPER REPUESTOS
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#9a9ba3] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switcher de Vista Operativa (Exclusivo Administrador) */}
        {user.rol === "ADMINISTRADOR" && (
          <div className="p-3 mx-3 mt-3 mb-1 bg-[#121316] border border-[#26272e] rounded-xl space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] text-[#6b6c75] font-semibold uppercase tracking-wider">
                VISTA OPERATIVA
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-[#0f1012] p-0.5 rounded-lg border border-[#26272e]">
              <button
                type="button"
                onClick={() => handleSetRole("admin")}
                className={`text-[10px] font-bold py-1 rounded transition-colors ${
                  role === "admin"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-[#8e8f96] hover:text-white"
                }`}
                title="Menú completo de Administrador"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleSetRole("venta")}
                className={`text-[10px] font-bold py-1 rounded transition-colors ${
                  role === "venta"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-[#8e8f96] hover:text-white"
                }`}
                title="Navegación de Ventas"
              >
                Ventas
              </button>
              <button
                type="button"
                onClick={() => handleSetRole("stock")}
                className={`text-[10px] font-bold py-1 rounded transition-colors ${
                  role === "stock"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-[#8e8f96] hover:text-white"
                }`}
                title="Navegación de Stock"
              >
                Stock
              </button>
            </div>
          </div>
        )}

        {/* Navegación por vistas */}
        <nav className="p-3 flex-1 overflow-y-auto space-y-4">
          {/* ══════════════════════════════════════════════════════════ */}
          {/* GRUPO 1: GESTIÓN DE PEDIDOS                                */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#6b6c75]">
              Gestión de Pedidos
            </div>

            {/* 1. Pedidos (Admin y Ventas) */}
            {(role === "admin" || role === "venta") && (
              <button
                onClick={() => setActiveView("pedidos")}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors focus:outline-none flex items-center justify-between ${
                  activeView === "pedidos"
                    ? "bg-[#1f2026] text-white font-semibold border-l-2 border-[#dc2626]"
                    : "text-[#9a9ba3] hover:bg-[#1a1b20] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <ShoppingBag className={`w-4 h-4 flex-shrink-0 ${activeView === "pedidos" ? "text-red-500" : "text-zinc-400"}`} />
                  <span className="truncate">Pedidos</span>
                </div>
                {countPendientes > 0 && (
                  <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/30">
                    {countPendientes}
                  </span>
                )}
              </button>
            )}

            {/* 2. Preparación de pedidos (Admin y Stock) */}
            {(role === "admin" || role === "stock") && (
              <button
                onClick={() => setActiveView("preparacion")}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors focus:outline-none flex items-center justify-between ${
                  activeView === "preparacion"
                    ? "bg-[#1f2026] text-white font-semibold border-l-2 border-[#dc2626]"
                    : "text-[#9a9ba3] hover:bg-[#1a1b20] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Package className={`w-4 h-4 flex-shrink-0 ${activeView === "preparacion" ? "text-red-500" : "text-sky-400"}`} />
                  <span className="truncate">Preparación de pedidos</span>
                </div>
                {kanbanPendientes.length > 0 && (
                  <span className="bg-sky-500/20 text-sky-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-sky-500/30">
                    {kanbanPendientes.length}
                  </span>
                )}
              </button>
            )}

            {/* 3. Entrega de pedidos (Admin y Ventas) */}
            {(role === "admin" || role === "venta") && (
              <button
                onClick={() => setActiveView("entrega")}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors focus:outline-none flex items-center justify-between ${
                  activeView === "entrega"
                    ? "bg-[#1f2026] text-white font-semibold border-l-2 border-[#dc2626]"
                    : "text-[#9a9ba3] hover:bg-[#1a1b20] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Truck className={`w-4 h-4 flex-shrink-0 ${activeView === "entrega" ? "text-red-500" : "text-emerald-400"}`} />
                  <span className="truncate">Entrega de pedidos</span>
                </div>
                {countListos > 0 && (
                  <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-purple-500/30">
                    {countListos}
                  </span>
                )}
              </button>
            )}

            {/* 4. Finanzas Online (Admin y Ventas) */}
            {(role === "admin" || role === "venta") && (
              <button
                onClick={() => setActiveView("finanzas")}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors focus:outline-none flex items-center justify-between ${
                  activeView === "finanzas"
                    ? "bg-[#1f2026] text-white font-semibold border-l-2 border-[#dc2626]"
                    : "text-[#9a9ba3] hover:bg-[#1a1b20] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <CreditCard className={`w-4 h-4 flex-shrink-0 ${activeView === "finanzas" ? "text-red-500" : "text-emerald-400"}`} />
                  <span className="truncate">Finanzas Online</span>
                </div>
              </button>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* GRUPO 2: CATÁLOGO COMERCIAL (Exclusivo Administrador)      */}
          {/* ══════════════════════════════════════════════════════════ */}
          {role === "admin" && (
            <div className="space-y-1 pt-2 border-t border-[#26272e]">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#6b6c75]">
                Catálogo Comercial
              </div>

              <button
                onClick={() => setActiveView("catalogo")}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors focus:outline-none flex items-center gap-2.5 ${
                  activeView === "catalogo"
                    ? "bg-[#1f2026] text-white font-semibold border-l-2 border-[#dc2626]"
                    : "text-[#9a9ba3] hover:bg-[#1a1b20] hover:text-white"
                }`}
              >
                <Flame className={`w-4 h-4 flex-shrink-0 ${activeView === "catalogo" ? "text-red-500" : "text-orange-400"}`} />
                <span className="truncate">Catálogo y Ofertas</span>
              </button>

              <button
                onClick={() => setActiveView("combos")}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors focus:outline-none flex items-center gap-2.5 ${
                  activeView === "combos"
                    ? "bg-[#1f2026] text-white font-semibold border-l-2 border-[#dc2626]"
                    : "text-[#9a9ba3] hover:bg-[#1a1b20] hover:text-white"
                }`}
              >
                <Layers className={`w-4 h-4 flex-shrink-0 ${activeView === "combos" ? "text-red-500" : "text-purple-400"}`} />
                <span className="truncate">Combos y kits</span>
              </button>

              <button
                onClick={() => setActiveView("marcas")}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors focus:outline-none flex items-center gap-2.5 ${
                  activeView === "marcas"
                    ? "bg-[#1f2026] text-white font-semibold border-l-2 border-[#dc2626]"
                    : "text-[#9a9ba3] hover:bg-[#1a1b20] hover:text-white"
                }`}
              >
                <Star className={`w-4 h-4 flex-shrink-0 ${activeView === "marcas" ? "text-red-500" : "text-amber-400"}`} />
                <span className="truncate">Marcas</span>
              </button>

              <button
                onClick={() => setActiveView("etiquetas")}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors focus:outline-none flex items-center gap-2.5 ${
                  activeView === "etiquetas"
                    ? "bg-[#1f2026] text-white font-semibold border-l-2 border-[#dc2626]"
                    : "text-[#9a9ba3] hover:bg-[#1a1b20] hover:text-white"
                }`}
              >
                <Tag className={`w-4 h-4 flex-shrink-0 ${activeView === "etiquetas" ? "text-red-500" : "text-red-400"}`} />
                <span className="truncate">Etiquetas de oferta</span>
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* GRUPO 3: SISTEMA Y TIENDA (Exclusivo Administrador)        */}
          {/* ══════════════════════════════════════════════════════════ */}
          {role === "admin" && (
            <div className="space-y-1 pt-2 border-t border-[#26272e]">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#6b6c75]">
                Sistema y Tienda
              </div>

              <button
                onClick={() => setActiveView("identidad")}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors focus:outline-none flex items-center gap-2.5 ${
                  activeView === "identidad"
                    ? "bg-[#1f2026] text-white font-semibold border-l-2 border-[#dc2626]"
                    : "text-[#9a9ba3] hover:bg-[#1a1b20] hover:text-white"
                }`}
              >
                <Settings className={`w-4 h-4 flex-shrink-0 ${activeView === "identidad" ? "text-red-500" : "text-zinc-400"}`} />
                <span className="truncate">Identidad</span>
              </button>

              <button
                onClick={() => setActiveView("auditoria")}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors focus:outline-none flex items-center gap-2.5 ${
                  activeView === "auditoria"
                    ? "bg-[#1f2026] text-white font-semibold border-l-2 border-[#dc2626]"
                    : "text-[#9a9ba3] hover:bg-[#1a1b20] hover:text-white"
                }`}
              >
                <History className={`w-4 h-4 flex-shrink-0 ${activeView === "auditoria" ? "text-red-500" : "text-zinc-400"}`} />
                <span className="truncate">Auditoría</span>
              </button>
            </div>
          )}
        </nav>

        {/* Footer Sidebar con Link a Tienda */}
        <div className="p-3 border-t border-[#26272e] bg-[#141519] flex items-center justify-between text-xs">
          <span className="text-[#6b6c75] text-[11px] font-medium">Panel Chopper</span>
          <Link
            href="/"
            target="_blank"
            className="p-1.5 rounded-md bg-[#1a1b20] border border-[#35363d] text-[#9a9ba3] hover:text-white hover:border-red-500 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Ir a la tienda online"
          >
            <span>Ver tienda</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ════════════════════════════════════════════════════════════ */}
      <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* Barra superior móvil */}
        <div className="lg:hidden flex items-center justify-between pb-4 mb-4 border-b border-[#26272e]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-[#16171c] border border-[#26272e] text-[#e7e7ea]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm tracking-wide">CHOPPER REPUESTOS</span>
          <NotificationBell
            user={user}
            role={role}
            onSelectPedido={handleSelectPedidoFromNotification}
            onNavigateSection={handleNavigateSectionFromNotification}
          />
        </div>

        {/* Barra superior de escritorio */}
        <div className="hidden lg:flex items-center justify-end pb-4 mb-6 border-b border-[#26272e]">
          <div className="flex items-center gap-3">
            <NotificationBell
              user={user}
              role={role}
              onSelectPedido={handleSelectPedidoFromNotification}
              onNavigateSection={handleNavigateSectionFromNotification}
            />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 1: PEDIDOS (UNIFICADA: LISTADO Y TABLERO)              */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "pedidos" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Pedidos</h1>

                  {/* Selector Listado | Tablero */}
                  <div className="inline-flex items-center bg-[#0f1012] p-1 rounded-xl border border-[#26272e]">
                    <button
                      type="button"
                      onClick={() => setModoVisualizacionPedidos("listado")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        modoVisualizacionPedidos === "listado"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-[#9a9ba3] hover:text-white hover:bg-[#1a1b20]"
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Listado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoVisualizacionPedidos("tablero")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        modoVisualizacionPedidos === "tablero"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-[#9a9ba3] hover:text-white hover:bg-[#1a1b20]"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Tablero</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] text-[#9a9ba3] mt-1">
                  Gestión centralizada de pedidos web · Vista de listado operativo y tablero Kanban de seguimiento de estados.
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {role !== "venta" && (
                    <button
                      type="button"
                      onClick={() => setActiveView("preparacion")}
                      className="px-2.5 py-1 text-xs bg-[#16171c] hover:bg-[#22232a] text-sky-400 border border-sky-500/30 rounded-lg flex items-center gap-1.5 transition-colors font-semibold"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Ir a Preparación (Stock)</span>
                    </button>
                  )}
                  {role !== "stock" && (
                    <button
                      type="button"
                      onClick={() => setActiveView("entrega")}
                      className="px-2.5 py-1 text-xs bg-[#16171c] hover:bg-[#22232a] text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 transition-colors font-semibold"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Ir a Entregas</span>
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={loadAllData}
                disabled={loading}
                className="self-start sm:self-auto px-3 py-1.5 text-xs bg-[#16171c] border border-[#35363d] rounded-lg text-[#9a9ba3] hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </button>
            </div>

            {/* Tarjetas KPI de Resumen Operativo (4 tarjetas solicitadas) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {/* 1. Total Pedidos */}
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-[#8e8f96] uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" /> Total Pedidos
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white">{pedidos.length}</span>
                  <span className="text-[10px] text-[#6b6c75]">Registrados</span>
                </div>
              </div>

              {/* 2. En Preparación Total */}
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> En Preparación
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-amber-400">{countEnPreparacionTotal}</span>
                  <span className="text-[10px] text-[#6b6c75]">Armado de stock</span>
                </div>
              </div>

              {/* 3. Preparados */}
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-sky-400" /> Preparados
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-sky-400">{countPreparados}</span>
                  <span className="text-[10px] text-[#6b6c75]">Listos en sucursal</span>
                </div>
              </div>

              {/* 4. Entregados */}
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Entregados
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-emerald-400">{countEntregados}</span>
                  <span className="text-[10px] text-[#6b6c75]">Completados</span>
                </div>
              </div>
            </div>

            {/* Barra de Búsqueda y Filtros Unificados */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-4 mb-6 space-y-3.5">
              {/* Fila 1: Buscador + Filtro por Empleado + Botón Limpiar */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                  <input
                    type="text"
                    placeholder="Buscar por #ORD, DNI, cliente o preparador..."
                    value={busquedaPedido}
                    onChange={(e) => setBusquedaPedido(e.target.value)}
                    className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-9 pr-8 py-2 text-sm text-[#e7e7ea] focus:outline-none focus:border-red-600 placeholder:text-[#6b6c75]"
                  />
                  {busquedaPedido && (
                    <button
                      onClick={() => setBusquedaPedido("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6c75] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro por Empleado Preparador (Stock) */}
                <div className="flex items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <UserCheck className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                    <select
                      value={filtroEmpleadoPedido}
                      onChange={(e) => setFiltroEmpleadoPedido(e.target.value)}
                      className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-8 pr-3 py-2 text-xs text-[#e7e7ea] focus:outline-none focus:border-red-600"
                    >
                      <option value="TODOS">Todos los preparadores</option>
                      <option value="SIN_ASIGNAR">Sin preparador asignado</option>
                      {staffPreparadores
                        .filter((s) => s.rol === "ADMINISTRADOR" || s.rol === "ENCARGADO_STOCK")
                        .map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.nombre} ({s.rol === "ADMINISTRADOR" ? "Admin" : "Stock"})
                          </option>
                        ))}
                    </select>
                  </div>

                  {(filtroEstadoPedido !== "TODOS" ||
                    filtroModalidadPedido !== "TODOS" ||
                    filtroEmpleadoPedido !== "TODOS" ||
                    filtroSoloComprobante ||
                    busquedaPedido) && (
                    <button
                      onClick={() => {
                        setFiltroEstadoPedido("TODOS");
                        setFiltroModalidadPedido("TODOS");
                        setFiltroEmpleadoPedido("TODOS");
                        setFiltroSoloComprobante(false);
                        setBusquedaPedido("");
                      }}
                      className="px-2.5 py-2 bg-[#1a1b20] hover:bg-[#26272e] border border-[#35363d] rounded-lg text-xs font-semibold text-[#9a9ba3] hover:text-white transition-colors flex items-center gap-1"
                      title="Restablecer todos los filtros"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Limpiar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Fila 2: Segmented Tabs de Estado + Modalidad + Con Comprobante */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-[#26272e]">
                {/* Segmented Control: Estados */}
                <div className="bg-[#0f1012] p-1 rounded-xl border border-[#26272e] flex flex-wrap items-center gap-1">
                  {[
                    { id: "TODOS", label: "Todos", count: pedidos.length },
                    { id: "PENDIENTE", label: "Pendientes", count: countPendientes },
                    { id: "CONFIRMADO", label: "Confirmados", count: countConfirmados },
                    { id: "PREPARANDO", label: "Preparando", count: countPreparando },
                    { id: "LISTO_ENTREGA", label: "Listos", count: countListos },
                    { id: "ENTREGADO", label: "Entregados", count: countEntregados },
                    ...(countCancelacionesPendientes > 0 || filtroEstadoPedido === "CANCELACION_SOLICITADA"
                      ? [{ id: "CANCELACION_SOLICITADA", label: "Cancelaciones", count: countCancelacionesPendientes }]
                      : []),
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setFiltroEstadoPedido(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        filtroEstadoPedido === item.id
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-[#9a9ba3] hover:text-white hover:bg-[#1a1b20]"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          filtroEstadoPedido === item.id
                            ? "bg-white/20 text-white"
                            : "bg-[#1f2026] text-[#6b6c75]"
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Segmented Control: Modalidad + Comprobante */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-[#0f1012] p-1 rounded-xl border border-[#26272e] flex items-center gap-1">
                    {[
                      { id: "TODOS", label: "Todas" },
                      { id: "RETIRO_LOCAL", label: "🏪 Retiro" },
                      { id: "MOTOMANDADO", label: "🛵 Moto" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFiltroModalidadPedido(item.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          filtroModalidadPedido === item.id
                            ? "bg-[#26272e] text-white shadow-sm"
                            : "text-[#6b6c75] hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setFiltroSoloComprobante(!filtroSoloComprobante)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                      filtroSoloComprobante
                        ? "bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-600/30"
                        : "bg-[#0f1012] border-[#26272e] text-sky-400 hover:text-white hover:border-sky-500/40"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Con Comprobante ({countConComprobante})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Selector de modo: Listado vs Tablero */}
            {modoVisualizacionPedidos === "listado" ? (
              /* ─── VISTA LISTADO DE PEDIDOS ─── */
              <div className="space-y-3">
              {pedidosFiltrados.length === 0 ? (
                <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-8 text-center text-[#9a9ba3]">
                  No se encontraron pedidos con los filtros aplicados.
                </div>
              ) : (
                pedidosFiltrados.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPedido(p)}
                    className="cursor-pointer bg-[#1a1b20] border border-[#26272e] hover:border-[#454652] rounded-xl p-4 sm:p-5 transition-all space-y-3 hover:shadow-lg group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="text-sm sm:text-base font-bold text-[#dc2626] group-hover:underline">
                          #ORD-{p.numero}
                        </span>
                        <EstadoChip estado={p.estado} />
                        {p.comprobanteUrl && (
                          <span className="bg-sky-950/40 text-sky-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-800/40 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Comprobante
                          </span>
                        )}
                        {p.preparadorNombre && (
                          <span className="bg-indigo-950/40 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-800/40 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Preparando: {p.preparadorNombre}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#6b6c75]">
                        {new Date(p.creadoEn).toLocaleString("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-[13px] pt-1">
                      <div>
                        <div className="text-[#6b6c75] text-[11px] uppercase tracking-wide">Cliente</div>
                        <div className="text-white font-semibold">{p.nombreCliente}</div>
                        <div className="text-[#9a9ba3]">
                          DNI {p.dniCliente} {p.telefonoCliente ? `· Tel: ${p.telefonoCliente}` : ""}
                        </div>
                      </div>

                      <div>
                        <div className="text-[#6b6c75] text-[11px] uppercase tracking-wide">Entrega y pago</div>
                        <div className="text-white font-medium">
                          {p.modalidadEntrega === "MOTOMANDADO" ? "🛵 Motomandado Posadas" : "🏪 Retiro en mostrador"}
                        </div>
                        <div className="text-[#9a9ba3]">
                          {p.metodoPago.replace(/_/g, " ")} {p.direccionEnvio ? `· Dir: ${p.direccionEnvio}` : ""}
                        </div>
                      </div>

                      <div>
                        <div className="text-[#6b6c75] text-[11px] uppercase tracking-wide">Total</div>
                        <div className="text-white font-bold text-sm sm:text-base text-emerald-400">
                          {formatPrice(p.total)}
                        </div>
                        {p.costoEnvio > 0 && (
                          <div className="text-[11px] text-[#6b6c75]">Incluye envío: {formatPrice(p.costoEnvio)}</div>
                        )}
                      </div>
                    </div>

                    {/* Resumen de items */}
                    <div className="bg-[#141519] border border-[#26272e] rounded-lg p-2.5 text-xs text-[#9a9ba3]">
                      <div className="font-semibold text-[#b8b9c0] mb-1">Repuestos de la orden:</div>
                      <div className="flex flex-wrap gap-2">
                        {p.items?.map((it, idx) => (
                          <span key={idx} className="bg-[#1a1b20] px-2 py-0.5 rounded border border-[#26272e] text-[#e7e7ea]">
                            {it.cantidad}x {it.nombre} ({formatPrice(it.precioUnitario)})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Acciones del pedido */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#26272e]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPedido(p);
                          }}
                          className="px-3 py-1.5 bg-[#16171c] hover:bg-[#26272e] border border-[#35363d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          Ver detalle <ChevronRight className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Botón directo si tiene comprobante para pasar a preparación */}
                        {p.comprobanteUrl && p.estado !== "PREPARANDO" && p.estado !== "ENTREGADO" && p.estado !== "LISTO_ENTREGA" && p.estado !== "LISTO_PARA_RETIRAR" && p.estado !== "CANCELADO" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCambiarEstadoPedido(p.id, "PREPARANDO");
                            }}
                            disabled={saving}
                            className="px-3.5 py-1.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Comprobante verificado · Enviar a Stock
                          </button>
                        )}

                        {p.estado === "PENDIENTE" && !p.comprobanteUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const stockWorker = staffPreparadores.find((s) => s.rol === "ENCARGADO_STOCK")?.id || null;
                              handleCambiarEstadoPedido(p.id, "PREPARANDO", "Ventas verificó pedido y envió orden a Stock", stockWorker);
                            }}
                            disabled={saving}
                            className="px-3.5 py-1.5 bg-[#16a34a] hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verificar pedido · Enviar a Stock
                          </button>
                        )}

                        {p.estado === "CONFIRMADO" && !p.comprobanteUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const stockWorker = staffPreparadores.find((s) => s.rol === "ENCARGADO_STOCK")?.id || null;
                              handleCambiarEstadoPedido(p.id, "PREPARANDO", "Ventas envió orden confirmada a Stock", stockWorker);
                            }}
                            disabled={saving}
                            className="px-4 py-1.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Enviar a Stock para preparar
                          </button>
                        )}

                        {p.estado === "PREPARANDO" && (
                          (user.rol === "ENCARGADO_STOCK" || user.rol === "ADMINISTRADOR") ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCambiarEstadoPedido(
                                  p.id,
                                  p.modalidadEntrega === "MOTOMANDADO" ? "LISTO_ENTREGA" : "LISTO_PARA_RETIRAR"
                                );
                              }}
                              disabled={saving}
                              className="px-4 py-1.5 bg-[#a855f7] hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Marcar listo para entrega
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-blue-950/40 border border-blue-800/30 text-blue-400 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5" />
                              En preparación por Stock ({p.preparadorNombre || "Stock"})
                            </span>
                          )
                        )}

                        {(p.estado === "LISTO_ENTREGA" || p.estado === "LISTO_PARA_RETIRAR") && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCambiarEstadoPedido(p.id, "ENTREGADO");
                            }}
                            disabled={saving}
                            className="px-4 py-1.5 bg-[#16a34a] hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Confirmar entrega / retiro
                          </button>
                        )}

                        {p.estado !== "CANCELADO" && p.estado !== "ENTREGADO" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("¿Seguro que deseás cancelar esta orden?")) {
                                handleCambiarEstadoPedido(p.id, "CANCELADO", "Cancelado por el administrador");
                              }
                            }}
                            disabled={saving}
                            className="px-3 py-1.5 bg-transparent border border-[#35363d] text-[#6b6c75] hover:text-red-400 hover:border-red-500/50 rounded-lg text-xs transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            ) : (
              <PedidosTableroView
                pedidos={pedidosFiltrados}
                role={role}
                staffPreparadores={staffPreparadores}
                saving={saving}
                formatPrice={formatPrice}
                onSelectPedido={setSelectedPedido}
                onSelectEntregaPedido={handleOpenEntregaModal}
                onChangeEstadoPedido={handleCambiarEstadoPedido}
              />
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 2: CATÁLOGO & OFERTAS */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "catalogo" && (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Catálogo y Ofertas</h1>
                <p className="text-xs sm:text-[13px] text-[#9a9ba3] mt-0.5">
                  Buscá cualquier producto, ajustá precios, gestioná ofertas y cargá hasta 4 fotos.
                </p>
              </div>
              <button
                onClick={() => setShowNuevaCatModal(true)}
                className="self-start sm:self-auto px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-red-600/20"
              >
                <Plus className="w-4 h-4" /> Nueva Categoría
              </button>
            </div>

            {/* Barra de Búsqueda y Filtros de Categoría */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-4 mb-6 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                  <input
                    type="text"
                    placeholder="Buscar por repuesto, marca o código..."
                    value={busquedaProducto}
                    onChange={(e) => setBusquedaProducto(e.target.value)}
                    className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-9 pr-4 py-2 text-sm text-[#e7e7ea] focus:outline-none focus:border-red-600 placeholder:text-[#6b6c75]"
                  />
                </div>

                <select
                  value={filtroCatId}
                  onChange={(e) => setFiltroCatId(Number(e.target.value))}
                  className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-xs text-[#e7e7ea] focus:outline-none focus:border-red-600"
                >
                  <option value={0}>Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.productCount})
                    </option>
                  ))}
                </select>
              </div>

              {/* Solapas Rápidas */}
              <div className="flex flex-wrap gap-1.5 text-xs pt-1">
                {(["TODOS", "OFERTAS", "NO_PUBLICADOS", "DESTACADOS"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFiltroEcom(mode)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filtroEcom === mode
                        ? "bg-[#dc2626] text-white"
                        : "bg-[#1a1b20] border border-[#26272e] text-[#9a9ba3] hover:text-white"
                    }`}
                  >
                    {mode === "TODOS"
                      ? "Todos"
                      : mode === "OFERTAS"
                      ? "En Oferta"
                      : mode === "NO_PUBLICADOS"
                      ? "Pausados Online"
                      : "Destacados"}
                  </button>
                ))}
              </div>
            </div>

            {/* Barra de Selección Masiva */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllProductsSelected}
                  onChange={handleSelectAllProducts}
                  className="rounded bg-[#0f1012] border-[#35363d] text-red-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold">
                  {isAllProductsSelected ? "Deseleccionar todos" : "Marcar todos"} ({productosFiltrados.length} repuestos)
                </span>
              </label>

              {selectedProductIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in">
                  <span className="text-xs text-red-400 font-bold bg-red-950/40 px-2.5 py-1 rounded-md border border-red-800/40">
                    {selectedProductIds.length} seleccionados
                  </span>
                  <button
                    onClick={() => setShowBulkOfferModal(true)}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
                  >
                    <Flame className="w-3.5 h-3.5 fill-white" /> Poner en oferta en lote
                  </button>
                  <button
                    onClick={handleQuitarOfertaLote}
                    disabled={saving}
                    className="px-3.5 py-1.5 bg-[#1a1b20] hover:bg-[#26272e] border border-[#35363d] text-[#e7e7ea] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5 text-red-400" /> Quitar oferta
                  </button>
                  <button
                    onClick={() => setSelectedProductIds([])}
                    className="px-2.5 py-1 text-xs text-[#9a9ba3] hover:text-white transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            {/* Listado de Productos con Selección y Botón de Edición */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {productosFiltrados.map((p) => {
                const imgs = parseImages(p.imagen);
                const mainImg = imgs[0] || "/repuestos/generico.jpg";
                const isSelected = selectedProductIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`bg-[#1a1b20] border rounded-xl p-4 flex flex-col justify-between transition-colors space-y-3 relative ${
                      isSelected
                        ? "border-red-500/70 bg-[#21171a]"
                        : "border-[#26272e] hover:border-[#35363d]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectProduct(p.id)}
                          className="w-4 h-4 rounded bg-[#0f1012] border-[#35363d] text-red-600 focus:ring-0 cursor-pointer"
                        />
                      </div>
                      <div className="w-16 h-16 rounded-lg bg-[#141519] border border-[#26272e] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img
                          src={mainImg}
                          alt={p.nombre}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] uppercase font-bold text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/40">
                            {p.marca}
                          </span>
                          <span className="text-[10px] text-[#6b6c75] truncate">{p.categoriaNombre}</span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-semibold text-white truncate" title={p.nombre}>
                          {p.nombre}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#9a9ba3]">Stock: <b className="text-white">{p.cantidad}</b></span>
                          <span className="text-xs font-bold text-white">{formatPrice(p.precioVenta)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Estado de Oferta / Publicación */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#26272e] text-xs">
                      <div>
                        {p.enOferta ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            {p.descuentoPorcentaje}% OFF ({formatPrice(p.precioOferta || 0)})
                          </span>
                        ) : (
                          <span className="text-[#6b6c75] text-[11px]">Precio de lista</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenProductEdit(p)}
                        className="px-3 py-1 bg-[#16171c] hover:bg-[#26272e] border border-[#35363d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Edit className="w-3 h-3 text-[#dc2626]" /> Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MODAL OFERTA EN LOTE */}
            {showBulkOfferModal && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#16171c] border border-[#26272e] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                  <div className="flex items-start justify-between border-b border-[#26272e] pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Flame className="w-5 h-5 text-red-500 fill-red-500" />
                        Poner en oferta en lote
                      </h3>
                      <p className="text-xs text-[#9a9ba3] mt-0.5">
                        Se aplicará a los <b>{selectedProductIds.length}</b> repuestos seleccionados.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBulkOfferModal(false)}
                      className="p-1 rounded-md text-[#9a9ba3] hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                      % Descuento a aplicar
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={bulkDescuentoPct}
                        onChange={(e) => setBulkDescuentoPct(Math.max(1, Math.min(90, Number(e.target.value))))}
                        className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 font-bold"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                      Etiqueta de promoción
                      <select
                        value={bulkBadgePromo}
                        onChange={(e) => setBulkBadgePromo(e.target.value)}
                        className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                      >
                        {etiquetas
                          .filter((e) => e.activa)
                          .map((et) => (
                            <option key={et.id} value={et.nombre}>
                              {formatBadgeWithEmoji(et.nombre, et.emoji)}
                            </option>
                          ))}
                        {!etiquetas.some((e) => e.nombre === bulkBadgePromo) && (
                          <option value={bulkBadgePromo}>{bulkBadgePromo}</option>
                        )}
                      </select>
                    </label>

                    <div className="bg-[#141519] p-3 rounded-lg border border-[#26272e] text-xs text-[#9a9ba3]">
                      Ejemplo: un producto de $10.000 quedará a{" "}
                      <b className="text-emerald-400">
                        {formatPrice(Math.round(10000 * (1 - bulkDescuentoPct / 100)))}
                      </b>{" "}
                      con el badge <span className="text-white font-semibold">"{bulkBadgePromo}"</span>.
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#26272e]">
                    <button
                      onClick={() => setShowBulkOfferModal(false)}
                      className="px-4 py-2 bg-transparent border border-[#35363d] text-[#b8b9c0] rounded-lg text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAplicarOfertaLote}
                      disabled={saving}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-red-600/20"
                    >
                      {saving ? "Aplicando..." : `Aplicar a ${selectedProductIds.length} repuestos`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL / EDITOR DE PRODUCTO CALCADO AL PROTOTIPO */}
            {editingProduct && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-[#16171c] border border-[#26272e] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
                  <div className="flex items-start justify-between border-b border-[#26272e] pb-3">
                    <div>
                      <h2 className="text-xl font-bold text-white">Editar producto</h2>
                      <p className="text-xs text-[#9a9ba3] mt-0.5">{editingProduct.nombre}</p>
                    </div>
                    <button
                      onClick={() => setEditingProduct(null)}
                      className="p-1 rounded-md text-[#9a9ba3] hover:text-white hover:bg-[#26272e]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Card 1: Datos Base */}
                  <div className="bg-[#1a1b20] border border-[#26272e] rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                        Precio normal ($)
                        <input
                          type="number"
                          value={productNormalPrice}
                          onChange={(e) => setProductNormalPrice(Math.max(0, Number(e.target.value)))}
                          className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 font-bold"
                        />
                      </label>

                      <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                        Stock físico (SGI)
                        <input
                          type="text"
                          disabled
                          value={`${editingProduct.cantidad} unidades`}
                          className="bg-[#0f1012]/60 border border-[#26272e] rounded-lg px-3 py-2 text-sm text-[#6b6c75] cursor-not-allowed font-semibold"
                        />
                      </label>

                      <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                        Marca
                        <input
                          type="text"
                          disabled
                          value={editingProduct.marca}
                          className="bg-[#0f1012]/60 border border-[#26272e] rounded-lg px-3 py-2 text-sm text-[#6b6c75] cursor-not-allowed font-semibold"
                        />
                      </label>
                    </div>

                    {/* Gestión de hasta 4 fotos */}
                    <div className="pt-2 border-t border-[#26272e]">
                      <div className="text-xs font-semibold text-[#b8b9c0] mb-2 flex items-center justify-between">
                        <span>Fotos del producto (hasta 4):</span>
                        <span className="text-[11px] text-[#6b6c75]">JPG, PNG, WEBP o URL</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map((idx) => {
                          const img = productImages[idx] || "";
                          return (
                            <div
                              key={idx}
                              className="relative bg-[#141519] border border-[#26272e] rounded-lg p-2 flex flex-col items-center justify-center gap-1.5 h-28 overflow-hidden group"
                            >
                              {img ? (
                                <>
                                  <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover rounded" />
                                  <button
                                    onClick={() => {
                                      const updated = [...productImages];
                                      updated.splice(idx, 1);
                                      setProductImages(updated);
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 rounded text-white"
                                    title="Quitar foto"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-[#6b6c75] hover:text-white transition-colors">
                                  <Upload className="w-4 h-4 mb-1" />
                                  <span className="text-[10px]">Subir foto {idx + 1}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadImageSlot(idx, file, "producto");
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Poner en Oferta (Estilo prototipo) */}
                  <div className="bg-[#1a1b20] border-2 border-red-600/80 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-red-500 fill-red-500" />
                        <b className="text-white text-sm">Poner en oferta</b>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProductEnOferta(!productEnOferta)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          productEnOferta ? "bg-red-600" : "bg-[#26272e]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                            productEnOferta ? "right-1" : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    {productEnOferta && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                          % Descuento
                          <input
                            type="number"
                            min="1"
                            max="90"
                            value={productDescuentoPct}
                            onChange={(e) => setProductDescuentoPct(Math.max(1, Math.min(90, Number(e.target.value))))}
                            className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 font-bold"
                          />
                        </label>

                        <div className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                          Precio con oferta
                          <div className="text-emerald-400 font-bold text-base pt-1.5">
                            {formatPrice(Math.round(productNormalPrice * (1 - productDescuentoPct / 100)))}
                          </div>
                          <span className="text-[10px] text-[#6b6c75]">
                            Ahorro: {formatPrice(Math.round((productNormalPrice * productDescuentoPct) / 100))}
                          </span>
                        </div>

                        <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                          Etiqueta
                          <select
                            value={productBadge}
                            onChange={(e) => setProductBadge(e.target.value)}
                            className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                          >
                            {etiquetas
                              .filter((e) => e.activa)
                              .map((et) => (
                                <option key={et.id} value={et.nombre}>
                                  {formatBadgeWithEmoji(et.nombre, et.emoji)}
                                </option>
                              ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Visibilidad y Destacados */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#1a1b20] border border-[#26272e] rounded-xl p-4">
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productPublicado}
                        onChange={(e) => setProductPublicado(e.target.checked)}
                        className="rounded bg-[#0f1012] border-[#35363d] text-red-600 focus:ring-0"
                      />
                      Publicado online
                    </label>

                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productDestacado}
                        onChange={(e) => setProductDestacado(e.target.checked)}
                        className="rounded bg-[#0f1012] border-[#35363d] text-red-600 focus:ring-0"
                      />
                      Destacado en inicio
                    </label>

                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productRecomendado}
                        onChange={(e) => setProductRecomendado(e.target.checked)}
                        className="rounded bg-[#0f1012] border-[#35363d] text-red-600 focus:ring-0"
                      />
                      Recomendado
                    </label>
                  </div>

                  {/* Nota informativa de Lo más vendido calcada al prototipo */}
                  <div className="bg-[#141519] border border-[#26272e] rounded-xl p-3.5 text-xs text-[#9a9ba3]">
                    <b className="text-[#e7e7ea]">Lo más vendido:</b> se calcula solo contando ventas reales de los últimos 30 días — no se carga a mano.{" "}
                    <span className="text-emerald-400 font-semibold">Cálculo automatizado activo.</span>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#26272e]">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-4 py-2 bg-transparent border border-[#35363d] hover:bg-[#26272e] text-[#b8b9c0] rounded-lg text-xs font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProduct}
                      disabled={saving}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-red-600/20"
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Nueva Categoría */}
            {showNuevaCatModal && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#16171c] border border-[#26272e] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white">Nueva Categoría</h3>
                  <input
                    type="text"
                    placeholder="Ej: Transmisión y Cadenas"
                    value={nuevaCatNombre}
                    onChange={(e) => setNuevaCatNombre(e.target.value)}
                    className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowNuevaCatModal(false)}
                      className="px-3.5 py-1.5 bg-transparent border border-[#35363d] text-[#b8b9c0] rounded-lg text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCrearCategoria}
                      disabled={saving}
                      className="px-4 py-1.5 bg-[#16a34a] hover:bg-green-700 text-white rounded-lg text-xs font-bold"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 3: MARCAS */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "marcas" && (
          <section className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Marcas del carrusel</h1>
                <p className="text-xs sm:text-[13px] text-[#9a9ba3] mt-0.5">
                  Al tocar una marca en la tienda, filtra el catálogo por esa marca. Podés agregar nuevas marcas, buscarlas, filtrarlas y activar/ocultar en lote.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    getMarcasAdminAction().then((res) => {
                      if (res.success && res.marcas) {
                        setMarcas(res.marcas);
                        showFeedback("success", "Marcas actualizadas.");
                      }
                    });
                  }}
                  className="px-3 py-2 bg-[#16171c] hover:bg-[#26272e] border border-[#35363d] text-[#9a9ba3] hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCrearMarcaModal(true)}
                  className="px-4 py-2 bg-[#16a34a] hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar nueva marca</span>
                </button>
              </div>
            </div>

            {/* 2. BUSCADOR, FILTROS Y ACCIONES MASIVAS */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-4 space-y-3.5">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Buscador de Marcas */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                  <input
                    type="text"
                    placeholder="Buscar marca por nombre..."
                    value={busquedaMarca}
                    onChange={(e) => setBusquedaMarca(e.target.value)}
                    className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-[#6b6c75]"
                  />
                </div>

                {/* Filtros de Estado */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <button
                    onClick={() => setFiltroMarcaEstado("TODAS")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      filtroMarcaEstado === "TODAS"
                        ? "bg-[#dc2626] text-white"
                        : "bg-[#1a1b20] border border-[#35363d] text-[#9a9ba3] hover:text-white"
                    }`}
                  >
                    Todas ({marcas.length})
                  </button>
                  <button
                    onClick={() => setFiltroMarcaEstado("VISIBLES")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      filtroMarcaEstado === "VISIBLES"
                        ? "bg-[#dc2626] text-white"
                        : "bg-[#1a1b20] border border-[#35363d] text-[#9a9ba3] hover:text-white"
                    }`}
                  >
                    Visibles ({marcas.filter((m) => m.activo).length})
                  </button>
                  <button
                    onClick={() => setFiltroMarcaEstado("OCULTAS")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      filtroMarcaEstado === "OCULTAS"
                        ? "bg-[#dc2626] text-white"
                        : "bg-[#1a1b20] border border-[#35363d] text-[#9a9ba3] hover:text-white"
                    }`}
                  >
                    Ocultas ({marcas.filter((m) => !m.activo).length})
                  </button>
                </div>
              </div>

              {/* Barra de Control y Selección Masiva */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#26272e] text-xs">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-white select-none">
                    <input
                      type="checkbox"
                      checked={isAllMarcasSelected}
                      onChange={handleSelectAllMarcas}
                      className="rounded bg-[#0f1012] border-[#35363d] text-red-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Marcar todas ({marcasFiltradas.length})</span>
                  </label>
                  {selectedMarcaIds.length > 0 && (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px]">
                      {selectedMarcaIds.length} seleccionada(s)
                    </span>
                  )}
                </div>

                {selectedMarcaIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[#6b6c75] text-[11px] font-semibold">Acciones en lote:</span>
                    <button
                      onClick={() => handleBatchToggleMarcas(true)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Poner Visibles ({selectedMarcaIds.length})
                    </button>
                    <button
                      onClick={() => handleBatchToggleMarcas(false)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-[#d7d8dd] border border-[#35363d] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Poner Ocultas ({selectedMarcaIds.length})
                    </button>
                    <button
                      onClick={() => setSelectedMarcaIds([])}
                      className="text-xs text-[#6b6c75] hover:text-white underline ml-1"
                    >
                      Deseleccionar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. LISTADO DE MARCAS EN GRID DE TARJETAS (Foto de marca + Nombre + Acciones) */}
            {marcasFiltradas.length === 0 ? (
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-8 text-center text-[#9a9ba3] text-xs">
                No se encontraron marcas con el criterio seleccionado.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {marcasFiltradas.map((m) => {
                  const isSelected = selectedMarcaIds.includes(m.id);
                  const isUploadingThis = uploadingCardLogoId === m.id;

                  return (
                    <div
                      key={m.id}
                      className={`bg-[#1a1b20] border rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all relative ${
                        isSelected
                          ? "border-red-600 bg-red-950/20 shadow-lg shadow-red-900/10"
                          : "border-[#26272e] hover:border-[#35363d]"
                      }`}
                    >
                      {/* Cabecera de tarjeta: Checkbox + Foto + Nombre + Estado */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectMarca(m.id)}
                              className="rounded bg-[#0f1012] border-[#35363d] text-red-600 focus:ring-0 cursor-pointer"
                            />
                            <span className="font-bold text-white text-sm truncate" title={m.nombre}>
                              {m.nombre}
                            </span>
                          </label>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              m.activo
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-zinc-800 text-[#6b6c75] border border-[#26272e]"
                            }`}
                          >
                            {m.activo ? "Visible" : "Oculta"}
                          </span>
                        </div>

                        {/* Bloque visual: Foto de la marca (interactiva para tocar y cambiar) */}
                        {(() => {
                          const slug = m.nombre
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .replace(/\s+/g, "");
                          const logoSrc = m.imagen || `/marcas/${slug}.svg`;

                          return (
                            <div onClick={() => handleOpenEditarMarca(m)} className="bg-[#141519] border border-[#26272e] hover:border-red-500/60 rounded-xl p-3 flex items-center gap-3 cursor-pointer group/brand transition-all hover:bg-[#1a1b20]" title="Click para editar nombre y logo de esta marca">
                              {/* Miniatura del Logo con fondo blanco para que resalten todos los logos */}
                              <div className="w-16 h-16 shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden shadow-sm">
                                <img
                                  src={logoSrc}
                                  alt={m.nombre}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = "none";
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = "flex";
                                  }}
                                />
                                <div
                                  style={{ display: "none" }}
                                  className="text-[10px] font-bold text-zinc-500 text-center leading-tight items-center justify-center w-full h-full"
                                >
                                  Sin foto
                                </div>
                              </div>

                              {/* Info de la marca: al tocar abre la ventana de editar */}
                              <div className="flex-1 min-w-0">
                                <span className="text-white text-sm font-bold block truncate group-hover/brand:text-red-400 transition-colors">
                                  {m.nombre}
                                </span>
                                <span className="text-xs text-[#9a9ba3] block mt-0.5">
                                  {m.productCount} repuestos asociados
                                </span>
                                <span className="text-[10px] text-amber-400 font-medium inline-flex items-center gap-1 mt-1">
                                  Tocar para editar datos →
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Pie de tarjeta: Ver en catálogo + Botón de alternar */}
                      <div className="pt-2 border-t border-[#26272e] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditarMarca(m)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#141519] border border-[#35363d] text-[#e7e7ea] hover:border-red-500 hover:text-white transition-colors flex items-center gap-1"
                            title="Editar nombre y logo grande"
                          >
                            <Edit className="w-3 h-3 text-amber-400" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => {
                              setBusquedaProducto(m.nombre);
                              setActiveView("catalogo");
                            }}
                            className="text-xs text-[#dc2626] hover:underline flex items-center gap-1 font-semibold ml-1"
                          >
                            Repuestos →
                          </button>
                        </div>

                        <button
                          onClick={() => handleToggleMarca(m.id, m.activo)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            m.activo
                              ? "bg-transparent border border-[#35363d] text-[#d7d8dd] hover:bg-[#26272e]"
                              : "bg-[#16a34a] hover:bg-green-700 text-white"
                          }`}
                        >
                          {m.activo ? "Ocultar" : "Mostrar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Crear Marca */}
            {showCrearMarcaModal && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#16171c] border border-[#26272e] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#26272e] pb-3">
                    <div className="flex items-center gap-2 text-white font-bold text-base">
                      <Plus className="w-5 h-5 text-emerald-400" />
                      <span>Agregar nueva marca al catálogo</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCrearMarcaModal(false)}
                      className="p-1 rounded-lg text-[#9a9ba3] hover:text-white hover:bg-[#26272e] transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Guía de formato y dimensiones requeridas */}
                  <div className="bg-[#141519] border border-[#26272e] rounded-lg p-3 text-xs text-[#9a9ba3] flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 leading-relaxed">
                      <span className="text-white font-bold block">Recomendación para fotos y logos:</span>
                      <p>
                        Usá imágenes en formato <strong>SVG o PNG con fondo transparente</strong> y relación cuadrada (<strong>200x200 px</strong> o superior).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-[#b8b9c0]">
                      Nombre de la marca
                      <input
                        type="text"
                        placeholder="Ej: Bajaj, Rinaldi, Castrol, Motul, Honda, Yamaha..."
                        value={nuevaMarcaNombre}
                        onChange={(e) => setNuevaMarcaNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCrearMarca();
                        }}
                        className="mt-1 w-full bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-[#6b6c75]"
                      />
                    </label>

                    {/* Box de adjuntar foto */}
                    <div>
                      <span className="block text-xs font-semibold text-[#b8b9c0] mb-1">Logo o foto de la marca</span>
                      {nuevaMarcaLogo ? (
                        <div className="flex items-center gap-3 bg-[#0f1012] border border-emerald-500/40 p-2.5 rounded-lg">
                          <img src={nuevaMarcaLogo} alt="Logo" className="w-10 h-10 object-contain bg-black/40 rounded p-1" />
                          <div className="flex-1">
                            <span className="text-xs text-emerald-400 font-semibold block">Foto adjuntada correctamente</span>
                            <span className="text-[10px] text-[#6b6c75]">Se mostrará en carrusel y catálogo</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNuevaMarcaLogo(null)}
                            className="p-1 rounded text-[#9a9ba3] hover:text-red-400"
                            title="Quitar foto"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-full py-4 bg-[#141519] hover:bg-[#1a1b20] border border-dashed border-[#35363d] hover:border-sky-500 text-[#d7d8dd] rounded-lg text-xs font-semibold cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5">
                          {uploadingNuevaMarcaLogo ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                              <span>Subiendo logo...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 text-sky-400" />
                              <span>Click para adjuntar logo (SVG o PNG 200x200)</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept=".png,.svg,.jpg,.jpeg,.webp"
                            disabled={uploadingNuevaMarcaLogo}
                            className="hidden"
                            onChange={(e) => handleUploadNuevaMarcaLogo(e.target.files?.[0])}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#26272e]">
                    <button
                      type="button"
                      onClick={() => setShowCrearMarcaModal(false)}
                      className="px-4 py-2 bg-transparent border border-[#35363d] hover:bg-[#26272e] text-[#b8b9c0] rounded-lg text-xs font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCrearMarca}
                      disabled={saving || !nuevaMarcaNombre.trim() || uploadingNuevaMarcaLogo}
                      className="px-5 py-2 bg-[#16a34a] hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{saving ? "Guardando..." : "Agregar marca"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Editar Marca y Logo del Carrusel */}
            {editingMarca && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#16171c] border border-[#26272e] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#26272e] pb-3">
                    <div className="flex items-center gap-2 text-white font-bold text-base">
                      <ImageIcon className="w-5 h-5 text-red-500" />
                      <span>Editar marca y logo del carrusel</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingMarca(null)}
                      className="p-1 rounded-lg text-[#9a9ba3] hover:text-white hover:bg-[#26272e] transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#b8b9c0] mb-1.5">
                        Nombre de la marca
                      </label>
                      <input
                        type="text"
                        value={editingMarcaNombre}
                        onChange={(e) => setEditingMarcaNombre(e.target.value)}
                        className="w-full bg-[#0f1012] border border-[#35363d] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-[#6b6c75]"
                      />
                    </div>

                    {/* Vista previa ampliada de cómo se ve en el carrusel */}
                    <div>
                      <span className="block text-xs font-semibold text-[#b8b9c0] mb-1.5">
                        Vista previa en el carrusel de marcas (logo grande):
                      </span>
                      <div className="bg-[#0f1012] border border-[#26272e] rounded-xl p-5 flex flex-col items-center justify-center gap-3">
                        <div className="w-48 h-28 bg-white rounded-2xl p-4 flex items-center justify-center shadow-lg border border-slate-200">
                          {editingMarcaLogo ? (
                            <img
                              src={editingMarcaLogo}
                              alt={editingMarcaNombre}
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-zinc-400 text-xs font-bold">Sin logo</span>
                          )}
                        </div>
                        <span className="text-white font-bold text-sm tracking-wide">
                          {editingMarcaNombre || "Nombre de marca"}
                        </span>
                        <span className="text-[11px] text-[#6b6c75]">
                          Así se visualiza en el carrusel interactivo de la página principal
                        </span>
                      </div>
                    </div>

                    {/* Botón para cambiar logo */}
                    <div>
                      <label className="w-full py-3 bg-[#141519] hover:bg-[#1a1b20] border border-dashed border-[#35363d] hover:border-red-500 text-[#d7d8dd] rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-2">
                        {uploadingEditingLogo ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                            <span>Subiendo nuevo logo...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-red-500" />
                            <span>Subir nueva imagen o logo (PNG / SVG 200x200)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".png,.svg,.jpg,.jpeg,.webp"
                          disabled={uploadingEditingLogo}
                          className="hidden"
                          onChange={(e) => handleUploadEditingMarcaLogo(e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#26272e]">
                    <button
                      type="button"
                      onClick={() => setEditingMarca(null)}
                      className="px-4 py-2 bg-transparent border border-[#35363d] hover:bg-[#26272e] text-[#b8b9c0] rounded-xl text-xs font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditarMarca}
                      disabled={saving || !editingMarcaNombre.trim() || uploadingEditingLogo}
                      className="px-5 py-2 bg-[#dc2626] hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-red-900/20"
                    >
                      <Check className="w-4 h-4" />
                      <span>{saving ? "Guardando..." : "Guardar cambios"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 4: COMBOS & KITS */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "combos" && (
          <section className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Combos y kits</h1>
                <p className="text-xs sm:text-[13px] text-[#9a9ba3] mt-0.5">
                  Armá kits vinculando repuestos reales del catálogo con cálculo automático de ahorro y stock.
                </p>
              </div>
              <button
                onClick={handleOpenNuevoCombo}
                className="self-start sm:self-auto px-4 py-2 bg-[#16a34a] hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" /> Nuevo combo
              </button>
            </div>

            {/* Filtros y Búsqueda de Combos */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                <input
                  type="text"
                  placeholder="Buscar combo por nombre, repuestos o etiqueta..."
                  value={busquedaCombo}
                  onChange={(e) => setBusquedaCombo(e.target.value)}
                  className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-[#6b6c75]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setFiltroComboEstado("TODOS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    filtroComboEstado === "TODOS"
                      ? "bg-[#dc2626] text-white"
                      : "bg-[#1a1b20] border border-[#35363d] text-[#9a9ba3] hover:text-white"
                  }`}
                >
                  Todos ({combos.length})
                </button>
                <button
                  onClick={() => setFiltroComboEstado("ACTIVOS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    filtroComboEstado === "ACTIVOS"
                      ? "bg-[#dc2626] text-white"
                      : "bg-[#1a1b20] border border-[#35363d] text-[#9a9ba3] hover:text-white"
                  }`}
                >
                  Activos ({combos.filter((c) => c.activo).length})
                </button>
                <button
                  onClick={() => setFiltroComboEstado("PAUSADOS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    filtroComboEstado === "PAUSADOS"
                      ? "bg-[#dc2626] text-white"
                      : "bg-[#1a1b20] border border-[#35363d] text-[#9a9ba3] hover:text-white"
                  }`}
                >
                  Pausados ({combos.filter((c) => !c.activo).length})
                </button>
              </div>
            </div>

            {/* Listado de Combos en Grid de Tarjetas */}
            {combosFiltrados.length === 0 ? (
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-8 text-center text-[#9a9ba3] text-xs">
                No se encontraron combos con los filtros aplicados.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {combosFiltrados.map((c) => {
                  const imgs = parseImages(c.imagen);
                  const mainImg = imgs[0] || "/combos/combo-service-motul.jpg";
                  return (
                    <div
                      key={c.id}
                      className="bg-[#1a1b20] border border-[#26272e] hover:border-[#35363d] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors"
                    >
                      <div>
                        <div className="relative w-full h-36 rounded-lg bg-[#141519] border border-[#26272e] overflow-hidden mb-3">
                          <img src={mainImg} alt={c.nombre} className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                            {c.badge}
                          </span>
                          {c.descuentoPorcentaje > 0 && (
                            <span className="absolute top-2 right-2 bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                              {c.descuentoPorcentaje}% OFF
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-white text-sm mb-1 truncate" title={c.nombre}>
                          {c.nombre}
                        </h3>
                        <p className="text-xs text-[#9a9ba3] line-clamp-2 mb-2">{c.descripcion}</p>

                        <div className="space-y-1 text-xs bg-[#141519] p-2.5 rounded-lg border border-[#26272e]">
                          <div className="text-[#6b6c75] font-semibold text-[11px]">Incluye:</div>
                          {c.items.slice(0, 3).map((it, idx) => (
                            <div key={idx} className="flex justify-between text-[#e7e7ea] truncate">
                              <span className="truncate">{it.cantidad}x {it.producto?.nombre}</span>
                              <span className="text-[#9a9ba3] ml-1.5 whitespace-nowrap">
                                {formatPrice(it.producto?.precioVenta * it.cantidad)}
                              </span>
                            </div>
                          ))}
                          {c.items.length > 3 && (
                            <div className="text-[10px] text-[#6b6c75] italic">
                              +{c.items.length - 3} repuesto(s) más
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#26272e] flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-[#6b6c75] line-through">{formatPrice(c.precioRegular || 0)}</div>
                          <div className="text-sm font-bold text-emerald-400">{formatPrice(c.precio)}</div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleCombo(c.id, c.activo)}
                            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                              c.activo ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-[#9a9ba3]"
                            }`}
                          >
                            {c.activo ? "Activo" : "Pausado"}
                          </button>
                          <button
                            onClick={() => handleOpenEditCombo(c)}
                            className="p-1.5 bg-[#16171c] hover:bg-[#26272e] border border-[#35363d] rounded text-white"
                            title="Editar combo"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEliminarCombo(c.id)}
                            className="p-1.5 bg-[#16171c] hover:bg-red-950/60 border border-[#35363d] rounded text-red-400"
                            title="Eliminar combo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODAL CREAR / EDITAR COMBO */}
            {showComboModal && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-[#16171c] border border-[#26272e] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
                  <div className="flex items-start justify-between border-b border-[#26272e] pb-3">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {editingCombo ? "Editar combo" : "Nuevo combo"}
                      </h2>
                      <p className="text-xs text-[#9a9ba3] mt-0.5">
                        Seleccioná repuestos reales y definí el precio promocional.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowComboModal(false)}
                      className="p-1 rounded-md text-[#9a9ba3] hover:text-white hover:bg-[#26272e]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                      Nombre del combo
                      <input
                        type="text"
                        placeholder="Ej: Combo Cadena y Piñón Honda CG"
                        value={comboNombre}
                        onChange={(e) => {
                          setComboNombre(e.target.value);
                          if (comboFormErrors.nombre) {
                            setComboFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.nombre;
                              return next;
                            });
                          }
                        }}
                        className={`bg-[#0f1012] border rounded-lg px-3 py-2 text-sm text-white focus:outline-none ${
                          comboFormErrors.nombre
                            ? "border-red-500 focus:border-red-500"
                            : "border-[#35363d] focus:border-red-600"
                        }`}
                      />
                      {comboFormErrors.nombre && (
                        <span className="text-[11px] text-red-400 font-medium">
                          {comboFormErrors.nombre}
                        </span>
                      )}
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                        Etiqueta de promoción
                        <select
                          value={comboBadge}
                          onChange={(e) => setComboBadge(e.target.value)}
                          className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                        >
                          <option value="">Sin etiqueta</option>
                          {etiquetas
                            .filter((e) => e.activa)
                            .map((e) => (
                              <option key={e.id} value={e.nombre}>
                                {formatBadgeWithEmoji(e.nombre, e.emoji)}
                              </option>
                            ))}
                          {comboBadge && !etiquetas.some((e) => e.nombre === comboBadge) && (
                            <option value={comboBadge}>{comboBadge}</option>
                          )}
                        </select>
                      </label>

                      <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                        Precio del combo ($)
                        <input
                          type="number"
                          value={comboPrecio}
                          onChange={(e) => {
                            setComboPrecio(Math.max(0, Number(e.target.value)));
                            if (comboFormErrors.precio) {
                              setComboFormErrors((prev) => {
                                const next = { ...prev };
                                delete next.precio;
                                return next;
                              });
                            }
                          }}
                          className={`bg-[#0f1012] border rounded-lg px-3 py-2 text-sm font-bold text-emerald-400 focus:outline-none ${
                            comboFormErrors.precio
                              ? "border-red-500 focus:border-red-500"
                              : "border-[#35363d] focus:border-red-600"
                          }`}
                        />
                        {comboFormErrors.precio && (
                          <span className="text-[11px] text-red-400 font-medium">
                            {comboFormErrors.precio}
                          </span>
                        )}
                      </label>
                    </div>

                    {/* Resumen de Ahorro Calculado */}
                    <div className="bg-[#141519] border border-[#26272e] rounded-xl p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#6b6c75]">Precio regular suma de ítems: </span>
                        <b className="text-white">{formatPrice(comboPrecioRegularCalculado)}</b>
                      </div>
                      <div className="text-emerald-400 font-bold">
                        Ahorro cliente: {formatPrice(comboAhorroCalculado)} ({comboDescuentoPct}% OFF)
                      </div>
                    </div>

                    {/* Disponibilidad proporcional calculada según stock real */}
                    <div
                      className={`rounded-xl p-3 border text-xs flex items-center justify-between gap-3 ${
                        comboItems.length === 0
                          ? "bg-[#141519] border-[#26272e] text-[#9a9ba3]"
                          : comboStockCalculado > 0
                          ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                          : "bg-amber-950/20 border-amber-800/40 text-amber-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Package
                          className={`w-4 h-4 flex-shrink-0 ${
                            comboItems.length === 0
                              ? "text-[#6b6c75]"
                              : comboStockCalculado > 0
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        />
                        <div>
                          <div className="font-bold">
                            {comboItems.length === 0
                              ? "Disponibilidad del combo: pendiente (sin repuestos)"
                              : comboStockCalculado > 0
                              ? `Disponibilidad calculada: ${comboStockCalculado} unidad${
                                  comboStockCalculado === 1 ? "" : "es"
                                } para la venta`
                              : "Disponibilidad calculada: 0 unidades (sin stock)"}
                          </div>
                          <p className="text-[11px] text-[#9a9ba3] mt-0.5">
                            {comboItems.length === 0
                              ? "Sumá repuestos para calcular el stock conjunto del combo."
                              : comboStockCalculado > 0
                              ? "Calculado automáticamente a partir del repuesto con menor stock disponible proporcional."
                              : "Uno o más componentes no tienen stock. Podés guardar la configuración del combo, pero figurará sin stock en la tienda hasta que ingrese mercadería."}
                          </p>
                        </div>
                      </div>
                      {comboItems.length > 0 && (
                        <div
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap ${
                            comboStockCalculado > 0
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {comboStockCalculado} disp.
                        </div>
                      )}
                    </div>

                    {/* 1. LISTA DE REPUESTOS SELECCIONADOS EN EL COMBO */}
                    <div className="space-y-2.5 bg-[#141519] border border-[#26272e] rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Repuestos incluidos en el combo ({comboItems.length}):
                        </span>
                        <span className="text-[11px] text-[#6b6c75]">
                          Podés modificar cantidades o quitar repuestos
                        </span>
                      </div>

                      {comboFormErrors.items && (
                        <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-400 text-xs font-medium flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>{comboFormErrors.items}</span>
                        </div>
                      )}

                      {comboItems.length === 0 ? (
                        <div className="py-4 text-center text-xs text-[#9a9ba3] italic border border-dashed border-[#26272e] rounded-lg">
                          Aún no incluiste repuestos. Buscá abajo en el catálogo para sumarlos.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {comboItems.map((it) => {
                            const prod = products.find((p) => p.id === it.productoId);
                            const unitPrice = prod?.precioVenta || 0;
                            const subtotal = unitPrice * it.cantidad;
                            const stockProd = prod?.cantidad ?? 0;
                            const sinStock = stockProd === 0;
                            const superaStock = !sinStock && it.cantidad > stockProd;

                            return (
                              <div
                                key={it.productoId}
                                className={`border rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                                  sinStock
                                    ? "bg-red-950/20 border-red-800/40"
                                    : superaStock
                                    ? "bg-amber-950/20 border-amber-800/40"
                                    : "bg-[#1a1b20] border-[#35363d]"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-red-400 font-bold bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/40">
                                      {prod?.marca || "Repuesto"}
                                    </span>
                                    <span className="font-semibold text-white truncate">
                                      {prod?.nombre || `Producto #${it.productoId}`}
                                    </span>
                                    {sinStock && (
                                      <span className="text-[10px] text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/60 font-semibold flex items-center gap-1">
                                        ⚠️ Sin stock disponible (0 unid.)
                                      </span>
                                    )}
                                    {superaStock && (
                                      <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60 font-semibold flex items-center gap-1">
                                        ⚠️ Supera stock físico ({stockProd} disp.)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#9a9ba3] mt-1 flex items-center gap-2 flex-wrap">
                                    <span>Unitario: {formatPrice(unitPrice)}</span>
                                    <span>·</span>
                                    <span>
                                      Stock en local:{" "}
                                      <b className={stockProd > 0 ? "text-slate-200" : "text-red-400"}>
                                        {stockProd} unid.
                                      </b>
                                    </span>
                                    <span>·</span>
                                    <span>
                                      Subtotal: <b className="text-emerald-400">{formatPrice(subtotal)}</b>
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Stepper Cantidad con input numérico directo */}
                                  <div className="flex items-center bg-[#0f1012] border border-[#35363d] rounded-lg overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (it.cantidad > 1) {
                                          setComboItems(
                                            comboItems.map((x) =>
                                              x.productoId === it.productoId
                                                ? { ...x, cantidad: x.cantidad - 1 }
                                                : x
                                            )
                                          );
                                        } else {
                                          setComboItems(
                                            comboItems.filter((x) => x.productoId !== it.productoId)
                                          );
                                        }
                                      }}
                                      className="px-2 py-1 hover:bg-[#26272e] text-[#9a9ba3] hover:text-white transition-colors"
                                      title="Disminuir cantidad"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={it.cantidad}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        const cleanVal = isNaN(val) ? 1 : Math.max(1, Math.floor(val));
                                        setComboItems(
                                          comboItems.map((x) =>
                                            x.productoId === it.productoId
                                              ? { ...x, cantidad: cleanVal }
                                              : x
                                          )
                                        );
                                      }}
                                      className="w-10 bg-transparent text-xs font-bold text-white text-center focus:outline-none py-1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setComboItems(
                                          comboItems.map((x) =>
                                            x.productoId === it.productoId
                                              ? { ...x, cantidad: x.cantidad + 1 }
                                              : x
                                          )
                                        );
                                      }}
                                      className="px-2 py-1 hover:bg-[#26272e] text-[#9a9ba3] hover:text-white transition-colors"
                                      title="Aumentar cantidad"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setComboItems(
                                        comboItems.filter((x) => x.productoId !== it.productoId)
                                      )
                                    }
                                    className="p-1.5 rounded-lg bg-transparent hover:bg-red-950/50 text-[#6b6c75] hover:text-red-400 transition-colors"
                                    title="Quitar del combo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. BUSCADOR PARA AGREGAR NUEVOS REPUESTOS AL COMBO */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#b8b9c0]">
                        <span className="font-semibold text-white">Buscar y agregar repuestos al combo:</span>
                        <span className="text-[#6b6c75]">Escribí código, nombre o marca</span>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                        <input
                          type="text"
                          placeholder="Ej: Corona, Cadena, Aceite Motul, Bujía, Pastillas..."
                          value={comboItemSearch}
                          onChange={(e) => setComboItemSearch(e.target.value)}
                          className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-600"
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto bg-[#141519] border border-[#26272e] rounded-lg p-2 space-y-1.5">
                        {products
                          .filter((p) =>
                            comboItemSearch.trim()
                              ? p.nombre.toLowerCase().includes(comboItemSearch.toLowerCase()) ||
                                (p.marca || "").toLowerCase().includes(comboItemSearch.toLowerCase()) ||
                                (p.codigo || "").toLowerCase().includes(comboItemSearch.toLowerCase())
                              : true
                          )
                          .slice(0, 20)
                          .map((prod) => {
                            const includedItem = comboItems.find((it) => it.productoId === prod.id);
                            const isSelected = Boolean(includedItem);
                            const stockProd = prod.cantidad ?? 0;
                            const sinStock = stockProd === 0;

                            return (
                              <div
                                key={prod.id}
                                className={`p-2 rounded-md flex items-center justify-between text-xs transition-colors ${
                                  isSelected
                                    ? "bg-red-950/20 border border-red-800/30 text-white"
                                    : "bg-[#1a1b20] border border-[#26272e] text-[#9a9ba3] hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-[10px] text-red-400 font-bold bg-red-950/40 px-1 py-0.5 rounded">
                                    {prod.marca || "Repuesto"}
                                  </span>
                                  <span className="truncate text-white">{prod.nombre}</span>
                                  {sinStock ? (
                                    <span className="text-[10px] text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/40 whitespace-nowrap">
                                      Sin stock (0)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-[#8e8f99] bg-[#0f1012] px-1.5 py-0.5 rounded whitespace-nowrap">
                                      Stock: {stockProd}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 ml-2">
                                  <span className="font-semibold text-white whitespace-nowrap">
                                    {formatPrice(prod.precioVenta)}
                                  </span>
                                  {isSelected ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Incluido
                                      </span>
                                      <div className="flex items-center bg-[#0f1012] border border-[#35363d] rounded overflow-hidden">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (includedItem && includedItem.cantidad > 1) {
                                              setComboItems(
                                                comboItems.map((x) =>
                                                  x.productoId === prod.id
                                                    ? { ...x, cantidad: x.cantidad - 1 }
                                                    : x
                                                )
                                              );
                                            } else {
                                              setComboItems(
                                                comboItems.filter((x) => x.productoId !== prod.id)
                                              );
                                            }
                                          }}
                                          className="px-1.5 py-0.5 hover:bg-[#26272e] text-[#9a9ba3] hover:text-white"
                                          title="Reducir cantidad"
                                        >
                                          <Minus className="w-2.5 h-2.5" />
                                        </button>
                                        <span className="px-1.5 py-0.5 text-[11px] font-bold text-white min-w-[20px] text-center">
                                          {includedItem?.cantidad || 1}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setComboItems(
                                              comboItems.map((x) =>
                                                x.productoId === prod.id
                                                  ? { ...x, cantidad: x.cantidad + 1 }
                                                  : x
                                              )
                                            );
                                          }}
                                          className="px-1.5 py-0.5 hover:bg-[#26272e] text-[#9a9ba3] hover:text-white"
                                          title="Aumentar cantidad"
                                        >
                                          <Plus className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!comboItems.some((x) => x.productoId === prod.id)) {
                                          setComboItems([
                                            ...comboItems,
                                            { productoId: prod.id, cantidad: 1 },
                                          ]);
                                          if (comboFormErrors.items) {
                                            setComboFormErrors((prev) => {
                                              const c = { ...prev };
                                              delete c.items;
                                              return c;
                                            });
                                          }
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold transition-colors flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> Agregar
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Hasta 4 Fotos del Combo */}
                    <div className="pt-2 border-t border-[#26272e]">
                      <div className="text-xs font-semibold text-[#b8b9c0] mb-2">Fotos del combo (hasta 4):</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map((idx) => {
                          const img = comboImages[idx] || "";
                          return (
                            <div
                              key={idx}
                              className="relative bg-[#141519] border border-[#26272e] rounded-lg p-2 flex flex-col items-center justify-center gap-1.5 h-24 overflow-hidden"
                            >
                              {img ? (
                                <>
                                  <img src={img} alt={`Combo ${idx + 1}`} className="w-full h-full object-cover rounded" />
                                  <button
                                    onClick={() => {
                                      const updated = [...comboImages];
                                      updated.splice(idx, 1);
                                      setComboImages(updated);
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 rounded text-white"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-[#6b6c75] hover:text-white transition-colors">
                                  <Upload className="w-4 h-4 mb-1" />
                                  <span className="text-[10px]">Foto {idx + 1}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadImageSlot(idx, file, "combo");
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#26272e]">
                    <button
                      type="button"
                      onClick={() => setShowComboModal(false)}
                      className="px-4 py-2 bg-transparent border border-[#35363d] text-[#b8b9c0] rounded-lg text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCombo}
                      disabled={saving}
                      className="px-5 py-2 bg-[#16a34a] hover:bg-green-700 text-white rounded-lg text-xs font-bold"
                    >
                      {saving ? "Guardando..." : "Guardar combo"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 5: ETIQUETAS DE OFERTA */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "etiquetas" && (
          <section className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Etiquetas de oferta</h1>
                <p className="text-xs sm:text-[13px] text-[#9a9ba3] mt-0.5">
                  Se crean, activan o pausan sin perder el historial. Quedan guardadas para reutilizar en cualquier campaña.
                </p>
              </div>

              <button
                onClick={() => {
                  setNuevaEtiquetaNombre("");
                  setShowCrearEtiquetaModal(true);
                }}
                className="px-4 py-2 bg-[#16a34a] hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-green-900/20 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Crear nueva etiqueta
              </button>
            </div>

            {/* VENTANA MODAL PARA CREAR ETIQUETA */}
            {showCrearEtiquetaModal && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-[#1a1b20] border border-[#26272e] rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl relative">
                  {/* Cabecera del Modal */}
                  <div className="flex items-center justify-between border-b border-[#26272e] pb-3">
                    <div className="flex items-center gap-2 text-white font-bold text-base">
                      <Tag className="w-5 h-5 text-emerald-400" />
                      <span>Crear nueva etiqueta promocional</span>
                    </div>
                    <button
                      onClick={() => setShowCrearEtiquetaModal(false)}
                      className="text-[#6b6c75] hover:text-white transition-colors p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Cuerpo del Modal */}
                  <div className="space-y-3.5 text-xs">
                    <p className="text-[#9a9ba3] leading-relaxed">
                      Definí el nombre de la etiqueta comercial para destacar ofertas en el catálogo online (por ejemplo, para campañas de temporada, descuentos relámpago o liquidaciones).
                    </p>

                    <div>
                      <label className="block text-[#b8b9c0] font-semibold mb-1.5">
                        Nombre de la etiqueta:
                      </label>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ej: Black Friday, Mes de la Primavera, Liquidación, 2x1..."
                        value={nuevaEtiquetaNombre}
                        onChange={(e) => setNuevaEtiquetaNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCrearEtiqueta();
                        }}
                        className="w-full bg-[#0f1012] border border-[#35363d] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-[#6b6c75]"
                      />
                    </div>

                    {/* Selector de ícono o emoji */}
                    <div>
                      <label className="block text-[#b8b9c0] font-semibold mb-1.5">
                        Ícono o emoji decorativo:
                      </label>
                      <div className="flex flex-wrap gap-1.5 p-2 bg-[#0f1012] border border-[#35363d] rounded-xl items-center">
                        <button
                          type="button"
                          onClick={() => setNuevaEtiquetaEmoji("")}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            !nuevaEtiquetaEmoji
                              ? "bg-[#26272e] text-white border border-[#45464f]"
                              : "text-[#6b6c75] hover:text-white"
                          }`}
                        >
                          Ninguno
                        </button>
                        {EMOJIS_DISPONIBLES.map((item) => (
                          <button
                            key={item.emoji}
                            type="button"
                            title={item.label}
                            onClick={() => setNuevaEtiquetaEmoji(item.emoji)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-transform ${
                              nuevaEtiquetaEmoji === item.emoji
                                ? "bg-emerald-500/20 border border-emerald-500 text-white scale-110"
                                : "hover:bg-[#1a1b20] hover:scale-105"
                            }`}
                          >
                            {item.emoji}
                          </button>
                        ))}
                      </div>
                      {nuevaEtiquetaNombre.trim() && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] text-[#6b6c75]">Vista previa:</span>
                          <span className="bg-[#dc2626] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                            {formatBadgeWithEmoji(nuevaEtiquetaNombre, nuevaEtiquetaEmoji)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Sugerencias rápidas */}
                    <div>
                      <span className="text-[11px] text-[#6b6c75] font-semibold block mb-1.5">
                        Sugerencias de campañas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Mes de la Primavera",
                          "Super Promo",
                          "Liquidación",
                          "Black Friday",
                          "Cyber Chopper",
                          "2x1 Especial",
                        ].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setNuevaEtiquetaNombre(sug)}
                            className="px-2.5 py-1 bg-[#141519] hover:bg-[#26272e] border border-[#26272e] hover:border-[#35363d] text-[#b8b9c0] hover:text-white rounded-lg text-[11px] transition-colors"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#26272e]">
                    <button
                      type="button"
                      onClick={() => setShowCrearEtiquetaModal(false)}
                      className="px-4 py-2 bg-transparent hover:bg-[#26272e] text-[#9a9ba3] hover:text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCrearEtiqueta}
                      disabled={saving || !nuevaEtiquetaNombre.trim()}
                      className="px-5 py-2 bg-[#16a34a] hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-green-900/20"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" /> Crear etiqueta
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Editar Nombre de Etiqueta */}
            {editingEtiqueta && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-[#1a1b20] border border-[#26272e] rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[#26272e] pb-3">
                    <div className="flex items-center gap-2 text-white font-bold text-base">
                      <Tag className="w-5 h-5 text-amber-400" />
                      <span>Editar nombre de etiqueta</span>
                    </div>
                    <button
                      onClick={() => setEditingEtiqueta(null)}
                      className="text-[#6b6c75] hover:text-white transition-colors p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <p className="text-[#9a9ba3]">
                      Modificá el nombre comercial de la etiqueta. Se actualizará en todos los productos asociados:
                    </p>
                    <div>
                      <label className="block text-[#b8b9c0] font-semibold mb-1.5">
                        Nuevo nombre de etiqueta:
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={editingEtiquetaNombre}
                        onChange={(e) => setEditingEtiquetaNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEditarEtiqueta();
                        }}
                        className="w-full bg-[#0f1012] border border-[#35363d] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-[#6b6c75]"
                      />
                    </div>

                    {/* Selector de ícono o emoji */}
                    <div>
                      <label className="block text-[#b8b9c0] font-semibold mb-1.5">
                        Ícono o emoji decorativo:
                      </label>
                      <div className="flex flex-wrap gap-1.5 p-2 bg-[#0f1012] border border-[#35363d] rounded-xl items-center">
                        <button
                          type="button"
                          onClick={() => setEditingEtiquetaEmoji("")}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            !editingEtiquetaEmoji
                              ? "bg-[#26272e] text-white border border-[#45464f]"
                              : "text-[#6b6c75] hover:text-white"
                          }`}
                        >
                          Ninguno
                        </button>
                        {EMOJIS_DISPONIBLES.map((item) => (
                          <button
                            key={item.emoji}
                            type="button"
                            title={item.label}
                            onClick={() => setEditingEtiquetaEmoji(item.emoji)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-transform ${
                              editingEtiquetaEmoji === item.emoji
                                ? "bg-amber-500/20 border border-amber-500 text-white scale-110"
                                : "hover:bg-[#1a1b20] hover:scale-105"
                            }`}
                          >
                            {item.emoji}
                          </button>
                        ))}
                      </div>
                      {editingEtiquetaNombre.trim() && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] text-[#6b6c75]">Vista previa:</span>
                          <span className="bg-[#dc2626] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                            {formatBadgeWithEmoji(editingEtiquetaNombre, editingEtiquetaEmoji)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#26272e]">
                    <button
                      type="button"
                      onClick={() => setEditingEtiqueta(null)}
                      className="px-4 py-2 bg-transparent hover:bg-[#26272e] text-[#9a9ba3] hover:text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditarEtiqueta}
                      disabled={saving || !editingEtiquetaNombre.trim()}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" /> Guardar nombre
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BUSCADOR Y FILTROS */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                <input
                  type="text"
                  placeholder="Buscar etiqueta por nombre..."
                  value={busquedaEtiqueta}
                  onChange={(e) => setBusquedaEtiqueta(e.target.value)}
                  className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-[#6b6c75]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setFiltroEtiquetaEstado("TODAS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    filtroEtiquetaEstado === "TODAS"
                      ? "bg-[#dc2626] text-white"
                      : "bg-[#1a1b20] border border-[#35363d] text-[#9a9ba3] hover:text-white"
                  }`}
                >
                  Todas ({etiquetas.length})
                </button>
                <button
                  onClick={() => setFiltroEtiquetaEstado("ACTIVAS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    filtroEtiquetaEstado === "ACTIVAS"
                      ? "bg-[#dc2626] text-white"
                      : "bg-[#1a1b20] border border-[#35363d] text-[#9a9ba3] hover:text-white"
                  }`}
                >
                  Activas ({etiquetas.filter((e) => e.activa).length})
                </button>
                <button
                  onClick={() => setFiltroEtiquetaEstado("PAUSADAS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    filtroEtiquetaEstado === "PAUSADAS"
                      ? "bg-[#dc2626] text-white"
                      : "bg-[#1a1b20] border border-[#35363d] text-[#9a9ba3] hover:text-white"
                  }`}
                >
                  Pausadas ({etiquetas.filter((e) => !e.activa).length})
                </button>
              </div>
            </div>

            {/* 3. GRID DE TARJETAS DE ETIQUETAS */}
            {etiquetasFiltradas.length === 0 ? (
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-8 text-center text-[#9a9ba3] text-xs">
                No se encontraron etiquetas con los filtros actuales.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {etiquetasFiltradas.map((e) => {
                  const prodsUsing = products.filter((p) => p.badgePromo === e.nombre).length;
                  const combosUsing = combos.filter((c) => c.badge === e.nombre).length;

                  return (
                    <div
                      key={e.id}
                      className={`bg-[#1a1b20] border rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors ${
                        e.activa ? "border-[#26272e] hover:border-[#35363d]" : "border-[#26272e] opacity-75 border-dashed"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full truncate ${
                              e.activa ? "bg-[#dc2626] !text-white keep-white shadow" : "bg-[#3a3b42] text-[#9a9ba3]"
                            }`}
                            title={e.nombre}
                          >
                            {formatBadgeWithEmoji(e.nombre, e.emoji)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              e.activa
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-zinc-800 text-[#6b6c75] border border-[#26272e]"
                            }`}
                          >
                            {e.activa ? "Activa" : "Pausada"}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs bg-[#141519] p-2.5 rounded-lg border border-[#26272e]">
                          <div className="flex justify-between text-[#b8b9c0]">
                            <span className="text-[#6b6c75]">Productos con este badge:</span>
                            <span className="font-bold text-white">{prodsUsing}</span>
                          </div>
                          <div className="flex justify-between text-[#b8b9c0]">
                            <span className="text-[#6b6c75]">Combos vinculados:</span>
                            <span className="font-bold text-white">{combosUsing}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#26272e] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEtiqueta(e);
                            setEditingEtiquetaNombre(e.nombre);
                            setEditingEtiquetaEmoji(e.emoji || "");
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#141519] border border-[#35363d] text-[#e7e7ea] hover:bg-[#26272e] hover:border-amber-500 transition-colors flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3 text-amber-400" />
                          <span>Editar etiqueta</span>
                        </button>
                        <button
                          onClick={() => handleToggleEtiqueta(e.id, e.activa)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            e.activa
                              ? "bg-transparent border border-[#35363d] text-[#d7d8dd] hover:bg-[#26272e]"
                              : "bg-[#16a34a] hover:bg-green-700 text-white"
                          }`}
                        >
                          {e.activa ? "Pausar" : "Reactivar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 6: IDENTIDAD & BRANDING */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "identidad" && (
          <section className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Identidad de la Tienda</h1>
              <p className="text-xs sm:text-[13px] text-[#9a9ba3] mt-0.5">
                Configuración de marca oficial, sucursal de retiro en Posadas, contacto de WhatsApp y promociones web.
              </p>
            </div>

            {/* Banner explicativo de la función del módulo */}
            <div className="bg-gradient-to-r from-red-950/40 via-[#16171c] to-[#16171c] border border-red-900/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> ¿Cuál es la función de este módulo?
                </span>
                <h2 className="text-white font-bold text-sm">Identidad institucional y atención a clientes de Posadas</h2>
                <p className="text-xs text-[#9a9ba3] max-w-2xl leading-relaxed">
                  Acá definís la presencia oficial de Chopper Repuestos: el logo en encabezado y pie de página, el punto físico de retiro en <strong className="text-white">Av. Roque Sáenz Peña 1500</strong>, el número oficial de WhatsApp para avisos de pedidos, y el banner superior de anuncios y ofertas.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#141519] border border-[#26272e] text-emerald-400 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" /> Sucursal Posadas activa
                </span>
              </div>
            </div>

            {/* 1. ESCAPARATE GRANDE DEL LOGO (Requisito: logo más grande y centrado para evaluar cómo queda) */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#26272e]">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-red-500" />
                    Logo institucional de Chopper Repuestos
                  </h2>
                  <p className="text-xs text-[#9a9ba3] mt-0.5">
                    Este es el logo que se muestra en el encabezado superior, comprobantes de pedidos y footer.
                  </p>
                </div>

                <label className="px-5 py-2.5 bg-red-600 hover:bg-red-700 !text-white keep-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 self-start sm:self-center">
                  <Upload className="w-4 h-4 !text-white stroke-white" />
                  <span className="!text-white">Subir nuevo logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadLogo(file);
                    }}
                  />
                </label>
              </div>

              {/* Contenedor Showcase de Alta Visibilidad */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-2 relative w-full h-44 sm:h-52 bg-[#0a0a0d] border-2 border-dashed border-[#35363d] hover:border-red-600/60 rounded-2xl flex items-center justify-center p-6 shadow-2xl group transition-colors">
                  {config.logo_url ? (
                    <img
                      src={config.logo_url}
                      alt="Logo Chopper Repuestos"
                      className="max-h-32 sm:max-h-36 max-w-full object-contain filter drop-shadow-2xl transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-center text-[#6b6c75] text-xs">Sin logo cargado</div>
                  )}

                  <span className="absolute bottom-2.5 right-3 text-[10px] text-[#8e8f96] bg-black/80 px-2.5 py-1 rounded-md font-mono border border-white/5">
                    Vista previa ampliada (Fondo oscuro)
                  </span>
                </div>

                <div className="bg-[#141519] border border-[#26272e] rounded-xl p-4 space-y-3 text-xs">
                  <div className="text-white font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-400" />
                    Recomendaciones de diseño:
                  </div>
                  <ul className="space-y-1.5 text-[#9a9ba3] list-disc list-inside text-[11px] leading-relaxed">
                    <li>Formato ideal: <strong className="text-white">PNG transparente</strong> o <strong className="text-white">SVG</strong>.</li>
                    <li>Orientación horizontal / apaisada (proporción 3:1 o 4:1).</li>
                    <li>Resolución mínima recomendada: <strong className="text-white">400 × 120 px</strong>.</li>
                    <li>Permite contrastar limpiamente sobre el fondo oscuro de la tienda.</li>
                  </ul>
                  <div className="pt-2 border-t border-[#26272e] space-y-2">
                    <label className="block text-[11px] text-[#b8b9c0] font-semibold">
                      O ingresar URL manual de la imagen:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.logo_url}
                        onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
                        placeholder="/logo-nav.png"
                        className="flex-1 bg-[#0f1012] border border-[#35363d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, logo_url: "/logo-nav.png" })}
                        className="px-2.5 py-1.5 bg-[#1a1b20] hover:bg-[#26272e] border border-[#35363d] text-[#b8b9c0] hover:text-white rounded-lg text-[10px] font-semibold transition-colors"
                        title="Restaurar logo predeterminado"
                      >
                        Default
                      </button>
                    </div>
                    <div className="text-[10px] text-[#6b6c75] font-mono break-all">
                      Ruta actual: {config.logo_url}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. GRILLA BALANCEADA DE 2 COLUMNAS (Contacto vs Promociones & Badges) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna Izquierda: Datos de Contacto y Tienda */}
              <div className="bg-[#16171c] border border-[#26272e] rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#26272e]">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <b className="text-white text-sm">Datos de contacto y sucursal</b>
                </div>

                <div className="space-y-3.5">
                  <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                    Nombre comercial
                    <input
                      type="text"
                      value={config.nombre_tienda}
                      onChange={(e) => setConfig({ ...config, nombre_tienda: e.target.value })}
                      className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                      Email de atención
                      <input
                        type="email"
                        value={config.email}
                        onChange={(e) => setConfig({ ...config, email: e.target.value })}
                        className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                      Teléfono de línea
                      <input
                        type="text"
                        value={config.telefono}
                        onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                        className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                    WhatsApp de ventas (con código de país)
                    <input
                      type="text"
                      value={config.whatsapp}
                      onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })}
                      className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                    Dirección en Posadas, Misiones
                    <input
                      type="text"
                      value={config.direccion}
                      onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                      className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                    />
                  </label>

                  {/* Vista Previa en Vivo de Google Maps */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11px] text-[#9a9ba3] mb-1.5">
                      <span className="flex items-center gap-1.5 font-semibold text-white">
                        <MapPin className="w-3.5 h-3.5 text-red-500" /> Mapa interactivo (actualiza en vivo con la dirección):
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Posición dinámica</span>
                    </div>
                    <div className="w-full h-44 rounded-xl overflow-hidden border border-[#26272e] bg-[#0f1012] shadow-inner">
                      <iframe
                        title="Ubicación Chopper Repuestos"
                        width="100%"
                        height="100%"
                        style={{ border: 0, filter: "grayscale(15%) contrast(1.05)" }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(config.direccion || "Av. Roque Sáenz Peña 1500, Posadas, Misiones")}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                      />
                    </div>
                  </div>

                  <label className="flex flex-col gap-1.5 text-xs text-[#b8b9c0]">
                    Horarios de atención
                    <input
                      type="text"
                      value={config.horarios}
                      onChange={(e) => setConfig({ ...config, horarios: e.target.value })}
                      className="bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                    />
                  </label>
                </div>
              </div>

              {/* Columna Derecha: Banners, Promociones y Badges de Ahorro */}
              <div className="bg-[#16171c] border border-[#26272e] rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#26272e]">
                    <Flame className="w-4 h-4 text-red-500" />
                    <b className="text-white text-sm">Banner y badges de ahorro</b>
                  </div>

                  {/* Switch Banner Promocional */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.mostrar_banner_promocion}
                        onChange={(e) => setConfig({ ...config, mostrar_banner_promocion: e.target.checked })}
                        className="rounded bg-[#0f1012] border-[#35363d] text-red-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-semibold">Mostrar banner superior en toda la tienda</span>
                    </label>

                    <input
                      type="text"
                      placeholder="Texto del banner promocional..."
                      value={config.texto_banner}
                      onChange={(e) => setConfig({ ...config, texto_banner: e.target.value })}
                      className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                    />

                    {/* Previsualización en vivo del Banner */}
                    <div className="pt-1">
                      <div className="text-[10px] text-[#6b6c75] mb-1 font-semibold uppercase tracking-wider">
                        Vista previa del banner en la tienda:
                      </div>
                      <div className="bg-red-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg text-center shadow-md truncate">
                        {config.texto_banner || "🛵 Motomandado y Moto Uber en el día en Posadas"}
                      </div>
                    </div>
                  </div>

                  {/* Configuración de Badges de Ahorro */}
                  <div className="pt-3 border-t border-[#26272e] space-y-2.5">
                    <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.mostrar_ahorro}
                        onChange={(e) => setConfig({ ...config, mostrar_ahorro: e.target.checked })}
                        className="rounded bg-[#0f1012] border-[#35363d] text-red-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Mostrar badge "Ahorrá $X" en tarjetas de ofertas y combos</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.ocultar_ahorro_cero}
                        onChange={(e) => setConfig({ ...config, ocultar_ahorro_cero: e.target.checked })}
                        className="rounded bg-[#0f1012] border-[#35363d] text-red-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Ocultar badge si el ahorro es $0</span>
                    </label>

                    {/* Badge Preview */}
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-[11px] text-[#6b6c75]">Ejemplo de badge:</span>
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        Ahorrás $2.400 (15% OFF)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#26272e] flex justify-end">
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#16a34a] hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-900/30 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{saving ? "Guardando..." : "Guardar Identidad & Configuración"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. GESTIÓN DE BANNERS DEL INICIO (HERO Y TEMPORADA) */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#26272e]">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-red-500" />
                    Banners del Inicio y Temporada
                  </h2>
                  <p className="text-xs text-[#9a9ba3] mt-0.5">
                    Administrá los banners principales de la página principal, promociones de temporada, imágenes de fondo y enlaces directos a ofertas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCrearBanner}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 self-start sm:self-center"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear nuevo banner</span>
                </button>
              </div>

              {bannersHome.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-[#121316] rounded-xl border border-dashed border-slate-300 dark:border-[#26272e] p-6 space-y-3">
                  <ImageIcon className="w-10 h-10 text-slate-400 dark:text-[#6b6c75] mx-auto" />
                  <p className="text-xs text-slate-600 dark:text-[#9a9ba3]">No hay banners configurados en la tienda.</p>
                  <button
                    type="button"
                    onClick={handleOpenCrearBanner}
                    className="px-3 py-1.5 bg-red-600/10 dark:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-600/20 dark:hover:bg-red-600/30 transition-colors cursor-pointer"
                  >
                    Crear el primer banner
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {bannersHome.map((b, idx) => (
                    <div
                      key={b.id || idx}
                      className="bg-slate-50/80 dark:bg-[#121316] border border-slate-200 dark:border-[#26272e] hover:border-slate-300 dark:hover:border-[#35363d] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors shadow-2xs"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/80 dark:bg-[#1a1b20] border border-slate-300 dark:border-[#26272e] text-slate-700 dark:text-[#8e8f96] font-bold">
                            #{b.orden || idx + 1}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              b.activo
                                ? "bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700"
                            }`}
                          >
                            {b.activo ? "Activo en tienda" : "Pausado"}
                          </span>
                          {b.badge && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              {b.badge}
                            </span>
                          )}
                          {b.imagenUrl && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Con imagen
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{b.titulo}</h3>
                        <p className="text-xs text-slate-600 dark:text-[#9a9ba3] line-clamp-2 leading-relaxed">
                          {b.descripcion}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-[#8e8f96]">
                          {b.enlace && (
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono">
                              <ExternalLink className="w-3 h-3" />
                              <span>Enlace: {b.enlace}</span>
                            </div>
                          )}
                          {b.imagenUrl && (
                            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-mono truncate max-w-xs">
                              <span>Foto: {b.imagenUrl}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleBanner(b.id, !b.activo)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            b.activo
                              ? "bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 border border-slate-300/80 dark:border-transparent"
                              : "bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-600/30"
                          }`}
                          title={b.activo ? "Pausar banner" : "Activar banner"}
                        >
                          {b.activo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{b.activo ? "Pausar" : "Activar"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditarBanner(b)}
                          className="p-2 bg-white dark:bg-[#1a1b20] hover:bg-slate-100 dark:hover:bg-[#26272e] border border-slate-300 dark:border-[#26272e] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                          title="Editar banner"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEliminarBanner(b.id)}
                          className="p-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                          title="Eliminar banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal para Crear / Editar Banner del Inicio */}
            {showBannerModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                <div className="w-full max-w-lg bg-white dark:bg-[#141519] border border-slate-200 dark:border-[#26272e] rounded-2xl shadow-2xl overflow-hidden space-y-4 p-6 my-8">
                  <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-[#26272e]">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {editingBanner ? "Editar Banner del Inicio" : "Crear Nuevo Banner del Inicio"}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-[#9a9ba3]">
                          Configurá los textos, subtítulo, imagen y enlace para la página principal.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBannerModal(false)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1f2026] transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-700 dark:text-[#b8b9c0] font-semibold mb-1">
                        Título principal del banner:
                      </label>
                      <input
                        type="text"
                        value={bannerTitulo}
                        onChange={(e) => setBannerTitulo(e.target.value)}
                        placeholder="Ej: Hacé tu pedido y retiralo en el local"
                        className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-300 dark:border-[#35363d] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-red-600 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-[#b8b9c0] font-semibold mb-1">
                        Etiqueta / Subtítulo superior (Badge):
                      </label>
                      <input
                        type="text"
                        value={bannerBadge}
                        onChange={(e) => setBannerBadge(e.target.value)}
                        placeholder="Ej: CHOPPER REPUESTOS · POSADAS o Promoción de Temporada"
                        className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-300 dark:border-[#35363d] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-red-600 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-[#b8b9c0] font-semibold mb-1">
                        Descripción / Texto secundario:
                      </label>
                      <textarea
                        rows={3}
                        value={bannerDescripcion}
                        onChange={(e) => setBannerDescripcion(e.target.value)}
                        placeholder="Ej: Buscá tu repuesto, armá el pedido online y pasá a retirarlo por nuestro local..."
                        className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-300 dark:border-[#35363d] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-red-600 text-xs resize-none"
                      />
                    </div>

                    {/* Imagen de fondo del Banner */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 dark:border-[#26272e] bg-slate-50/80 dark:bg-[#0f1012]">
                      <label className="block text-slate-700 dark:text-[#b8b9c0] font-semibold">
                        Imagen de fondo del banner (opcional):
                      </label>
                      <p className="text-[10px] text-slate-500 dark:text-[#8e8f96] leading-relaxed">
                        Podés subir un archivo o ingresar su URL. Si la dejás vacía, se usará el degradado temático original adaptativo.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <input
                          type="text"
                          value={bannerImagenUrl}
                          onChange={(e) => setBannerImagenUrl(e.target.value)}
                          placeholder="/uploads/banners/... o ruta directa"
                          className="flex-1 bg-white dark:bg-[#16171c] border border-slate-300 dark:border-[#35363d] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-600 text-xs font-mono"
                        />
                        <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#22232a] dark:hover:bg-[#2c2d36] text-slate-700 dark:text-white border border-slate-300 dark:border-[#35363d] rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-colors">
                          <Upload className="w-3.5 h-3.5 text-red-500" />
                          <span>{uploadingBannerImage ? "Subiendo..." : "Subir archivo"}</span>
                          <input
                            type="file"
                            accept="image/*,.svg"
                            className="hidden"
                            disabled={uploadingBannerImage}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadBannerImage(file);
                            }}
                          />
                        </label>
                        {bannerImagenUrl && (
                          <button
                            type="button"
                            onClick={() => setBannerImagenUrl("")}
                            className="px-2.5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            title="Quitar imagen (usar degradado)"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-[#b8b9c0] font-semibold mb-1">
                          Enlace de destino (opcional):
                        </label>
                        <input
                          type="text"
                          value={bannerEnlace}
                          onChange={(e) => setBannerEnlace(e.target.value)}
                          placeholder="/ofertas"
                          className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-300 dark:border-[#35363d] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-600 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-[#b8b9c0] font-semibold mb-1">
                          Orden de prioridad:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={bannerOrden}
                          onChange={(e) => setBannerOrden(parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-slate-50 dark:bg-[#0f1012] border border-slate-300 dark:border-[#35363d] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-600 text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={bannerActivo}
                          onChange={(e) => setBannerActivo(e.target.checked)}
                          className="rounded bg-white dark:bg-[#0f1012] border-slate-300 dark:border-[#35363d] text-red-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-slate-800 dark:text-white font-medium">Banner activo (visible en la página de inicio)</span>
                      </label>
                    </div>

                    {/* Previsualización rápida */}
                    <div className="pt-2 border-t border-slate-200 dark:border-[#26272e] space-y-1">
                      <span className="text-[10px] text-slate-500 dark:text-[#6b6c75] font-semibold uppercase tracking-wider block">
                        Previsualización aproximada:
                      </span>
                      <div className="relative overflow-hidden p-3.5 rounded-xl border border-red-500/25 bg-gradient-to-r from-red-50 via-white to-slate-50 dark:from-red-950/30 dark:to-[#16171c] shadow-xs space-y-1.5">
                        {bannerImagenUrl && (
                          <div
                            className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-25 pointer-events-none"
                            style={{ backgroundImage: `url(${bannerImagenUrl})` }}
                          />
                        )}
                        <div className="relative z-10 space-y-1">
                          {bannerBadge && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block">
                              {bannerBadge}
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {bannerTitulo || "Título de ejemplo"}
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-[#9a9ba3] line-clamp-2">
                            {bannerDescripcion || "Descripción de ejemplo del banner..."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#26272e]">
                    <button
                      type="button"
                      onClick={() => setShowBannerModal(false)}
                      disabled={saving}
                      className="px-4 py-2 bg-white dark:bg-transparent border border-slate-300 dark:border-[#35363d] text-slate-700 dark:text-[#b8b9c0] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1b20] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleGuardarBanner}
                      disabled={saving}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{editingBanner ? "Guardar cambios" : "Crear banner"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 7: AUDITORÍA */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "auditoria" && (
          <section className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Registro de Auditoría</h1>
                <p className="text-xs sm:text-[13px] text-[#9a9ba3] mt-0.5">
                  Trazabilidad histórica de quién realizó cada cambio comercial en precios, stock, pedidos y marcas.
                </p>
              </div>
            </div>

            {/* Banner explicativo: Para qué sirve este módulo */}
            <div className="bg-gradient-to-r from-red-950/40 via-[#16171c] to-[#16171c] border border-red-900/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> ¿Para qué sirve el Registro de Auditoría?
                </span>
                <h2 className="text-white font-bold text-sm">Control operativo y transparencia interna de Chopper Repuestos</h2>
                <p className="text-xs text-[#9a9ba3] max-w-3xl leading-relaxed">
                  Este módulo audita automáticamente cada acción del personal: cambios de estado de pedidos, asignación de preparadores de stock, entregas en mostrador, modificaciones de precios o stock, y altas de combos. Permite conocer con precisión qué usuario ejecutó cada operación y en qué fecha exacta.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#141519] border border-[#26272e] text-[#e7e7ea] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-red-500" /> {auditoriaLogs.length} eventos registrados
                </span>
              </div>
            </div>

            {/* Tarjetas KPI de Auditoría */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-[#8e8f96] uppercase tracking-wider block">Total Eventos</span>
                <span className="text-2xl font-bold text-white mt-1 block">{auditoriaLogs.length}</span>
              </div>
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">Pedidos y Entregas</span>
                <span className="text-2xl font-bold text-sky-400 mt-1 block">
                  {auditoriaLogs.filter((l) => (l.modulo || "").includes("Pedido")).length}
                </span>
              </div>
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Combos y Catálogo</span>
                <span className="text-2xl font-bold text-amber-400 mt-1 block">
                  {auditoriaLogs.filter((l) => (l.modulo || "").includes("Catálogo") || (l.modulo || "").includes("Combo") || (l.modulo || "").includes("Marca")).length}
                </span>
              </div>
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Personal Activo</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">{usuariosAuditoriaDisponibles.length}</span>
              </div>
              <button
                onClick={loadAllData}
                disabled={loading}
                className="self-start sm:self-auto px-4 py-2 text-xs bg-[#16171c] hover:bg-[#26272e] border border-[#35363d] rounded-lg text-[#d7d8dd] flex items-center gap-2 transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refrescar logs</span>
              </button>
            </div>

            {/* Buscador de Auditoría, Filtro de Empleado y Módulos */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-4 space-y-3.5">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                  <input
                    type="text"
                    placeholder="Buscar por usuario, acción o detalle técnico..."
                    value={busquedaAuditoria}
                    onChange={(e) => setBusquedaAuditoria(e.target.value)}
                    className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-[#6b6c75]"
                  />
                  {busquedaAuditoria && (
                    <button
                      onClick={() => setBusquedaAuditoria("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6c75] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro por Usuario / Empleado */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Filtro por Usuario */}
                  <div className="relative min-w-[170px]">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                    <select
                      value={filtroUsuarioAuditoria}
                      onChange={(e) => setFiltroUsuarioAuditoria(e.target.value)}
                      className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-8 pr-3 py-2 text-xs text-[#e7e7ea] focus:outline-none focus:border-red-600"
                    >
                      <option value="TODOS">Todos los usuarios ({usuariosAuditoriaDisponibles.length})</option>
                      {usuariosAuditoriaDisponibles.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Tipo de Evento */}
                  <div className="relative min-w-[160px]">
                    <SlidersHorizontal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                    <select
                      value={filtroTipoAuditoria}
                      onChange={(e) => setFiltroTipoAuditoria(e.target.value)}
                      className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-8 pr-3 py-2 text-xs text-[#e7e7ea] focus:outline-none focus:border-red-600"
                    >
                      <option value="TODOS">Todas las acciones</option>
                      <option value="ESTADOS">Cambios de estado / Entrega</option>
                      <option value="PREPARADORES">Asignación de preparador</option>
                      <option value="PRECIOS">Precios y ofertas</option>
                      <option value="CONFIG">Identidad y banners</option>
                    </select>
                  </div>

                  {/* Filtro por Período */}
                  <div className="relative min-w-[130px]">
                    <Clock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                    <select
                      value={filtroPeriodoAuditoria}
                      onChange={(e) => setFiltroPeriodoAuditoria(e.target.value)}
                      className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-8 pr-3 py-2 text-xs text-[#e7e7ea] focus:outline-none focus:border-red-600"
                    >
                      <option value="TODOS">Todo el historial</option>
                      <option value="HOY">Solo hoy</option>
                    </select>
                  </div>

                  {(filtroModuloAuditoria !== "TODOS" || filtroUsuarioAuditoria !== "TODOS" || filtroTipoAuditoria !== "TODOS" || filtroPeriodoAuditoria !== "TODOS" || busquedaAuditoria) && (
                    <button
                      onClick={() => {
                        setFiltroModuloAuditoria("TODOS");
                        setFiltroUsuarioAuditoria("TODOS");
                        setFiltroTipoAuditoria("TODOS");
                        setFiltroPeriodoAuditoria("TODOS");
                        setBusquedaAuditoria("");
                      }}
                      className="px-2.5 py-2 bg-[#1a1b20] hover:bg-[#26272e] border border-[#35363d] rounded-lg text-xs font-semibold text-[#9a9ba3] hover:text-white transition-colors flex items-center gap-1"
                      title="Restablecer filtros"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Limpiar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Segmented Control: Pestañas de Módulos */}
              <div className="pt-3 border-t border-[#26272e] overflow-x-auto pb-1">
                <div className="bg-[#0f1012] p-1 rounded-xl border border-[#26272e] inline-flex items-center gap-1">
                  <button
                    onClick={() => setFiltroModuloAuditoria("TODOS")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      filtroModuloAuditoria === "TODOS"
                        ? "bg-red-600 text-white shadow-sm"
                        : "text-[#9a9ba3] hover:text-white hover:bg-[#1a1b20]"
                    }`}
                  >
                    <span>Todos los módulos</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        filtroModuloAuditoria === "TODOS" ? "bg-white/20 text-white" : "bg-[#1f2026] text-[#6b6c75]"
                      }`}
                    >
                      {auditoriaLogs.length}
                    </span>
                  </button>
                  {modulosAuditoriaDisponibles.map((mod) => (
                    <button
                      key={mod}
                      onClick={() => setFiltroModuloAuditoria(mod)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                        filtroModuloAuditoria === mod
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-[#9a9ba3] hover:text-white hover:bg-[#1a1b20]"
                      }`}
                    >
                      <span>{mod}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          filtroModuloAuditoria === mod ? "bg-white/20 text-white" : "bg-[#1f2026] text-[#6b6c75]"
                        }`}
                      >
                        {auditoriaLogs.filter((l) => l.modulo === mod).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Listado de Logs de Auditoría */}
            {auditoriaFiltrada.length === 0 ? (
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-8 text-center text-[#9a9ba3] text-xs">
                No se encontraron eventos de auditoría con los filtros aplicados.
              </div>
            ) : (
              <div className="space-y-3">
                {auditoriaFiltrada.map((log) => (
                  <div
                    key={log.id}
                    className="bg-[#1a1b20] border border-[#26272e] hover:border-[#35363d] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm">{log.accion}</span>
                        <span className="text-[10px] bg-red-950/40 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-full font-semibold">
                          {cleanModuloName(log.modulo)}
                        </span>
                      </div>

                      {log.detalle && (
                        <p className="text-[#9a9ba3] text-xs leading-relaxed">{log.detalle}</p>
                      )}

                      <div className="flex items-center gap-2 text-[#6b6c75] text-[11px] pt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[#8e8f96]" />
                          Responsable: <strong className="text-[#e7e7ea] font-semibold">{log.usuario}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-[#6b6c75] font-mono text-[11px] whitespace-nowrap self-start md:self-center bg-[#141519] px-2.5 py-1 rounded-md border border-[#26272e]">
                      {log.fecha}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 8: ENTREGA DE PEDIDO (Empleado Venta Mejorado) */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "entrega" && (
          <section className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Entrega de pedido</h1>
                <p className="text-xs sm:text-[13px] text-[#9a9ba3] mt-0.5">
                  Módulo de Ventas · Registrá quién entrega en mostrador o despacha al Moto Uber / Motomandado.
                </p>
              </div>
            </div>

            {/* Barra de Filtros y Modalidad */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-4 space-y-3.5">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Selector de Modalidad */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEntregaTab("RETIRO_LOCAL")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                      entregaTab === "RETIRO_LOCAL"
                        ? "bg-[#dc2626] text-white shadow-md shadow-red-600/20"
                        : "bg-[#1a1b20] border border-[#35363d] text-[#d7d8dd] hover:bg-[#26272e]"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    Retiro en mostrador ({pedidos.filter((p) => p.modalidadEntrega === "RETIRO_LOCAL" && (p.estado === "LISTO_PARA_RETIRAR" || p.estado === "LISTO_ENTREGA")).length})
                  </button>
                  <button
                    onClick={() => setEntregaTab("MOTOMANDADO")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                      entregaTab === "MOTOMANDADO"
                        ? "bg-[#dc2626] text-white shadow-md shadow-red-600/20"
                        : "bg-[#1a1b20] border border-[#35363d] text-[#d7d8dd] hover:bg-[#26272e]"
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    Envío Moto Uber / Motomandado ({pedidos.filter((p) => p.modalidadEntrega === "MOTOMANDADO" && (p.estado === "LISTO_PARA_RETIRAR" || p.estado === "LISTO_ENTREGA")).length})
                  </button>
                </div>

                {/* Búsqueda rápida + Botón Limpiar */}
                <div className="flex items-center gap-2 flex-1 md:max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                    <input
                      type="text"
                      placeholder="Buscar por #ORD, DNI o cliente..."
                      value={busquedaEntrega}
                      onChange={(e) => setBusquedaEntrega(e.target.value)}
                      className="w-full bg-[#0f1012] border border-[#35363d] rounded-lg pl-9 pr-9 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-[#6b6c75]"
                    />
                    {busquedaEntrega && (
                      <button
                        type="button"
                        onClick={() => setBusquedaEntrega("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6c75] hover:text-white transition-colors"
                        title="Borrar texto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBusquedaEntrega("")}
                    disabled={!busquedaEntrega}
                    className={`px-3 py-2 border rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                      busquedaEntrega
                        ? "bg-[#1a1b20] hover:bg-[#26272e] border-[#35363d] text-[#e7e7ea] hover:text-white cursor-pointer shadow-sm"
                        : "bg-[#16171c]/60 border-[#26272e] text-[#6b6c75] cursor-not-allowed opacity-50"
                    }`}
                    title="Limpiar búsqueda"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpiar</span>
                  </button>
                </div>
              </div>

              {/* Sub-filtros por estado de entrega: Por Entregar, Entregados, Todos */}
              <div className="pt-3 border-t border-[#26272e] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-[#0f1012] p-1 rounded-xl border border-[#26272e]">
                  <button
                    onClick={() => setFiltroEstadoEntrega("POR_ENTREGAR")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      filtroEstadoEntrega === "POR_ENTREGAR"
                        ? "bg-red-600 text-white shadow"
                        : "text-[#9a9ba3] hover:text-white"
                    }`}
                  >
                    Por Entregar ({pedidos.filter((p) => p.modalidadEntrega === entregaTab && (p.estado === "LISTO_PARA_RETIRAR" || p.estado === "LISTO_ENTREGA")).length})
                  </button>
                  <button
                    onClick={() => setFiltroEstadoEntrega("ENTREGADOS")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      filtroEstadoEntrega === "ENTREGADOS"
                        ? "bg-red-600 text-white shadow"
                        : "text-[#9a9ba3] hover:text-white"
                    }`}
                  >
                    Entregados ({pedidos.filter((p) => p.modalidadEntrega === entregaTab && p.estado === "ENTREGADO").length})
                  </button>
                  <button
                    onClick={() => setFiltroEstadoEntrega("TODOS")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      filtroEstadoEntrega === "TODOS"
                        ? "bg-red-600 text-white shadow"
                        : "text-[#9a9ba3] hover:text-white"
                    }`}
                  >
                    Todos ({pedidos.filter((p) => p.modalidadEntrega === entregaTab && (p.estado === "LISTO_PARA_RETIRAR" || p.estado === "LISTO_ENTREGA" || p.estado === "ENTREGADO")).length})
                  </button>
                </div>

                <div className="text-xs text-[#8e8f96] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>
                    {entregaTab === "RETIRO_LOCAL"
                      ? "Punto de entrega: Av. Roque Sáenz Peña 1500 (Posadas)"
                      : "Despachos en el día a toda el área de Posadas"}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid de Pedidos para Entrega */}
            {pedidosEntrega.length === 0 ? (
              <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-8 text-center text-[#9a9ba3] text-xs">
                No hay pedidos en cola para entrega bajo estos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pedidosEntrega.map((p) => {
                  const waLink = getWhatsAppLink(p.telefonoCliente, p.nombreCliente, p.numero);
                  return (
                    <div
                      key={p.id}
                      className="bg-[#1a1b20] border border-[#26272e] hover:border-[#35363d] rounded-xl p-5 space-y-4 flex flex-col justify-between transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-[#26272e]">
                          <div className="flex items-center gap-2">
                            <b className="text-base text-[#dc2626]">#ORD-{p.numero}</b>
                            <EstadoChip estado={p.estado} />
                          </div>
                          <span className="text-xs text-[#6b6c75]">
                            {new Date(p.creadoEn).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                          </span>
                        </div>

                        {/* Datos del Cliente y WhatsApp */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#141519] p-3 rounded-xl border border-[#26272e]">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#6b6c75] font-semibold">Cliente</span>
                            <div className="text-white font-bold text-sm">{p.nombreCliente}</div>
                            <div className="text-[#9a9ba3]">DNI {p.dniCliente}</div>
                          </div>
                          <div className="flex flex-col justify-between items-start sm:items-end gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-[#6b6c75] font-semibold">
                              Total {p.estadoPago === "PAGADO" ? "cobrado" : "a cobrar"}
                            </span>
                            <div className="text-emerald-400 font-bold text-base">{formatPrice(p.total)}</div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-[#9a9ba3]">
                                {p.metodoPago === "EFECTIVO_LOCAL" ? "Efectivo en mostrador" : p.metodoPago.replace(/_/g, " ")}
                              </span>
                              {p.estadoPago === "PAGADO" ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                                  <Check size={10} /> PAGADO
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                                  <Clock size={10} /> PENDIENTE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Teléfono y WhatsApp Directo */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-[#9a9ba3]">
                            Tel: <b className="text-white">{p.telefonoCliente || "No especificado"}</b>
                          </span>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> Escribir WhatsApp
                            </a>
                          )}
                        </div>

                        {/* Dirección de Envío si es Motomandado */}
                        {p.modalidadEntrega === "MOTOMANDADO" && (
                          <div className="text-xs bg-red-950/20 border border-red-800/30 p-2.5 rounded-lg text-white">
                            <span className="text-red-400 font-semibold block mb-0.5">🛵 Destino Moto Uber / Motomandado:</span>
                            <div className="flex items-center justify-between gap-2">
                              <span>{p.direccionEnvio || "Dirección pendiente"}</span>
                              {p.direccionEnvio && (
                                <a
                                  href={`https://maps.google.com/?q=${encodeURIComponent(p.direccionEnvio + ", Posadas, Misiones")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-red-400 underline hover:text-red-300"
                                >
                                  Ver mapa
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Quién preparó en depósito */}
                        <div className="text-xs text-[#9a9ba3] flex items-center gap-1.5 pt-1">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Preparado en stock por:</span>
                          <b className="text-white">{p.preparadorNombre || "Sin asignar"}</b>
                        </div>

                        {/* Repuestos a entregar */}
                        <div className="bg-[#141519] p-2.5 rounded-lg border border-[#26272e] text-xs space-y-1">
                          <span className="text-[11px] font-semibold text-[#b8b9c0] block">Control de repuestos del paquete:</span>
                          {p.items?.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-white">
                              <span>• {it.cantidad}x {it.nombre}</span>
                              <span className="text-[#9a9ba3]">{formatPrice(it.subtotal)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Notas registradas */}
                        {p.notas && (
                          <div className="text-[11px] text-[#9a9ba3] bg-[#0f1012] p-2 rounded border border-[#26272e] italic">
                            Nota: {p.notas}
                          </div>
                        )}
                      </div>

                      {/* Botones Operativos con Apertura de Modal */}
                      <div className="pt-2 border-t border-[#26272e] flex flex-col gap-2">
                        {p.modalidadEntrega === "RETIRO_LOCAL" ? (
                          p.estado === "ENTREGADO" ? (
                            <button
                              disabled
                              className="w-full py-2.5 rounded-lg text-xs font-bold bg-zinc-800 text-[#6b6c75] cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>Orden entregada en mostrador</span>
                            </button>
                          ) : p.metodoPago === "EFECTIVO_LOCAL" && p.estadoPago !== "PAGADO" ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEntregaModal(p)}
                              className="w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>Registrar cobro en mostrador ({formatPrice(p.total)})</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEntregaModal(p)}
                              className="w-full py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-green-700 text-white shadow-lg shadow-green-900/20 cursor-pointer"
                            >
                              <Store className="w-4 h-4" />
                              <span>Completar entrega en mostrador (por {user.nombreCompleto || "Carlos López"})</span>
                            </button>
                          )
                        ) : (
                          p.estado === "ENTREGADO" ? (
                            <button
                              disabled
                              className="w-full py-2.5 rounded-lg text-xs font-bold bg-zinc-800 text-[#6b6c75] cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>Orden entregada al chofer de Moto Uber</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEntregaModal(p)}
                              className="w-full py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-green-700 text-white shadow-lg shadow-green-900/20 cursor-pointer"
                            >
                              <Bike className="w-4 h-4" />
                              <span>Confirmar salida a Moto Uber (por {user.nombreCompleto || "Carlos López"})</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 9: PREPARACIÓN DE PEDIDOS (Empleado Stock Kanban) */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "preparacion" && (
          <section className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Preparación de pedidos</h1>
                <p className="text-xs sm:text-[13px] text-[#9a9ba3] mt-0.5">
                  Picking de repuestos, checklist de depósito y asignación del empleado encargado de preparar.
                </p>
              </div>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Columna 1: PENDIENTE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#d97706] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> PENDIENTES DE ARMAR
                  </h3>
                  <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    {kanbanPendientes.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {kanbanPendientes.length === 0 ? (
                    <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-4 text-center text-[#6b6c75] text-xs">
                      No hay pedidos pendientes de inicio.
                    </div>
                  ) : (
                    kanbanPendientes.map((p) => (
                      <div
                        key={p.id}
                        className="bg-[#1a1b20] border border-[#26272e] hover:border-[#35363d] rounded-xl p-4 space-y-2.5 text-xs transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <b className="text-xs font-bold text-[#dc2626]">#ORD-{p.numero}</b>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#141519] border border-[#26272e] text-[#b8b9c0]">
                            {p.modalidadEntrega === "MOTOMANDADO" ? "🛵 Motomandado" : "🏪 Retiro Local"}
                          </span>
                        </div>

                        <div className="text-white font-semibold">{p.nombreCliente}</div>

                        <div className="space-y-1 text-[#b8b9c0] bg-[#141519] p-2 rounded-lg border border-[#26272e]">
                          {p.items?.map((it, idx) => (
                            <div key={idx} className="truncate">
                              • <b className="text-white">{it.cantidad}x</b> {it.nombre}
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() =>
                            handleCambiarEstadoPedido(
                              p.id,
                              "PREPARANDO",
                              `Comenzado a preparar por: ${user.nombreCompleto || "Stock"}`,
                              user.id
                            )
                          }
                          disabled={saving}
                          className="w-full mt-2 py-2 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tomar y empezar a armar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Columna 2: PREPARANDO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#3b82f6] flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> En Preparación
                  </h3>
                  <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                    {kanbanPreparando.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {kanbanPreparando.length === 0 ? (
                    <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-4 text-center text-[#6b6c75] text-xs">
                      No hay pedidos en preparación ahora.
                    </div>
                  ) : (
                    kanbanPreparando.map((p) => {
                      const totalItems = p.items?.length || 0;
                      const checkedCount = p.items?.filter((it) => !!it.preparado && (it.cantidadPreparada ?? 0) >= it.cantidad).length || 0;
                      const isAllChecked = totalItems > 0 && checkedCount === totalItems;
                      const isOrderSaving = !!savingChecklistItems[`ped-${p.id}`];

                      return (
                        <div
                          key={p.id}
                          className="bg-[#1a1b20] border-2 border-[#3b82f6]/60 rounded-xl p-4 space-y-3 text-xs shadow-lg"
                        >
                          <div className="flex justify-between items-center">
                            <b className="text-xs font-bold text-[#dc2626]">#ORD-{p.numero}</b>
                            <span className="text-[10px] text-blue-400 font-bold px-2 py-0.5 rounded-full bg-blue-950/40 border border-blue-800/40">
                              {p.modalidadEntrega === "MOTOMANDADO" ? "🛵 Motomandado" : "🏪 Retiro Local"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-white font-semibold">{p.nombreCliente}</span>
                            <span className="text-[11px] text-[#9a9ba3] flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-indigo-400" />
                              {p.preparadorNombre || user.nombreCompleto}
                            </span>
                          </div>

                          {/* Interactive Picking Checklist */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[11px] text-[#6b6c75] font-semibold">
                              <span className="flex items-center gap-1.5">
                                <span>Checklist de depósito:</span>
                                {isOrderSaving && (
                                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={isAllChecked ? "text-emerald-400 font-bold" : "text-[#b8b9c0]"}>
                                  {checkedCount}/{totalItems} controlados
                                </span>
                                {totalItems > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarcarTodosChecklist(p, !isAllChecked)}
                                    disabled={isOrderSaving || saving}
                                    className="text-[10px] text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer disabled:opacity-50"
                                  >
                                    {isAllChecked ? "Desmarcar todos" : "Marcar todos"}
                                  </button>
                                )}
                              </div>
                            </div>

                            {p.items?.map((it, idx) => {
                              const isChecked = !!it.preparado && (it.cantidadPreparada ?? 0) >= it.cantidad;
                              const isItemSaving = !!savingChecklistItems[`${p.id}-${it.id}`];

                              return (
                                <label
                                  key={it.id || idx}
                                  className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-colors ${
                                    isChecked
                                      ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
                                      : "bg-[#141519] border-[#26272e] text-white hover:border-[#35363d]"
                                  } ${isItemSaving ? "opacity-60 pointer-events-none" : ""}`}
                                >
                                  {isItemSaving ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        handleToggleChecklistItem(p.id, it.id, !isChecked)
                                      }
                                      disabled={isOrderSaving || saving}
                                      className="rounded bg-[#0f1012] border-[#35363d] text-emerald-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                                    />
                                  )}
                                  <span className={`flex-1 truncate ${isChecked ? "line-through opacity-75" : ""}`}>
                                    <b>{it.cantidad}x</b> {it.nombre}
                                  </span>
                                </label>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleFinalizarPreparacion(p)}
                            disabled={saving || isOrderSaving || !isAllChecked}
                            className={`w-full mt-2 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow ${
                              isAllChecked && !isOrderSaving
                                ? "bg-[#16a34a] hover:bg-green-700 text-white cursor-pointer"
                                : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 cursor-not-allowed opacity-75"
                            }`}
                            title={
                              isOrderSaving
                                ? "Guardando cambios en el servidor..."
                                : !isAllChecked
                                ? `Faltan repuestos por controlar (${checkedCount}/${totalItems})`
                                : "Marcar paquete como listo para entregar"
                            }
                          >
                            {isOrderSaving ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Guardando checklist...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>
                                  {isAllChecked
                                    ? "Marcar paquete listo para entrega"
                                    : `Faltan repuestos por controlar (${checkedCount}/${totalItems})`}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Columna 3: LISTO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#22c55e] flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> LISTOS / ENTREGADOS
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {kanbanListos.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {kanbanListos.slice(0, 10).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPedido(p)}
                      className="bg-[#1a1b20] border border-[#26272e] hover:border-[#3b82f6]/50 rounded-xl p-4 space-y-2 text-xs transition-all cursor-pointer hover:bg-[#1e1f26] group"
                    >
                      <div className="flex justify-between items-center">
                        <b className="text-xs font-bold text-[#dc2626] group-hover:underline">#ORD-{p.numero}</b>
                        <EstadoChip estado={p.estado} />
                      </div>
                      <div className="text-white font-semibold">{p.nombreCliente}</div>
                      <div className="text-[11px] text-[#6b6c75] pt-0.5">
                        {p.modalidadEntrega === "MOTOMANDADO" ? "🛵 Motomandado Posadas" : "🏪 Retiro en mostrador"}
                        {p.preparadorNombre && ` · Armó: ${p.preparadorNombre}`}
                      </div>

                      {/* Repuestos / contenido entregado */}
                      <div className="mt-2.5 pt-2 border-t border-[#26272e] space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#9a9ba3] uppercase tracking-wider flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-emerald-400" /> Contenido entregado ({p.items?.length || 0}):
                          </span>
                          <span className="font-bold text-emerald-400">{formatPrice(p.total)}</span>
                        </div>
                        <div className="space-y-1 bg-[#141519] p-2.5 rounded-lg border border-[#26272e]">
                          {p.items?.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="text-white truncate">
                                <b className="text-emerald-400 font-bold">{it.cantidad}x</b> {it.nombre}
                              </span>
                              <span className="text-[#9a9ba3] font-mono text-[11px] shrink-0 ml-2">
                                {formatPrice(it.subtotal || it.precioUnitario * it.cantidad)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Botón para ver detalle completo con comprobante */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPedido(p);
                        }}
                        className="w-full mt-2 py-1.5 bg-[#26272e] hover:bg-[#35363d] text-[#e7e7ea] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span>Ver detalle</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 10: ESTADO DE PEDIDOS (Flujo Kanban Ventas & Admin) */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "estado_pedidos" && (
          <section className="space-y-6 w-full">
            {/* Header del tablero */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Estado de pedidos</h1>
                <p className="text-xs sm:text-[13px] text-[#9a9ba3] mt-0.5">
                  Flujo operativo integral · Monitoreo y gestión de pedidos desde la verificación de pago hasta la entrega final.
                </p>
              </div>

              {/* Búsqueda rápida + Botón Limpiar */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c75]" />
                  <input
                    type="text"
                    placeholder="Buscar por #ORD, DNI o cliente..."
                    value={busquedaEstadoPedidos}
                    onChange={(e) => setBusquedaEstadoPedidos(e.target.value)}
                    className="w-full bg-[#16171c] border border-[#35363d] rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-red-600 placeholder:text-[#6b6c75]"
                  />
                  {busquedaEstadoPedidos && (
                    <button
                      onClick={() => setBusquedaEstadoPedidos("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6c75] hover:text-white"
                      title="Borrar texto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setBusquedaEstadoPedidos("")}
                  disabled={!busquedaEstadoPedidos}
                  className={`px-3 py-2 border rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                    busquedaEstadoPedidos
                      ? "bg-[#1a1b20] hover:bg-[#26272e] border-[#35363d] text-[#e7e7ea] hover:text-white cursor-pointer shadow-sm"
                      : "bg-[#16171c]/60 border-[#26272e] text-[#6b6c75] cursor-not-allowed opacity-50"
                  }`}
                  title="Limpiar búsqueda"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              </div>
            </div>

            {/* Breadcrumb del Proceso Operativo */}
            <div className="bg-[#16171c] border border-[#26272e] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> 1 · Ventas verifica el pago
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#6b6c75] hidden sm:inline" />
                <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> 2 · Stock prepara
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#6b6c75] hidden sm:inline" />
                <span className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> 3 · Ventas entrega
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#6b6c75] hidden sm:inline" />
                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Entregado
                </span>
              </div>
              <div className="text-[11px] text-[#6b6c75]">
                Total pedidos: <b className="text-white">{pedidosFiltradosEstado.length}</b>
              </div>
            </div>

            {/* Tablero Kanban de 5 Columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
              {/* ────────────────────────────────────────────────────────── */}
              {/* COLUMNA 1: POR VERIFICAR PAGO */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> POR VERIFICAR PAGO
                  </h3>
                  <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    {colVerificarPago.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colVerificarPago.length === 0 ? (
                    <div className="text-center py-8 text-[#6b6c75] text-xs bg-[#16171c]/50 border border-dashed border-[#26272e] rounded-xl p-4">
                      No hay pagos pendientes de verificación.
                    </div>
                  ) : (
                    colVerificarPago.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPedido(p)}
                        className="bg-[#16171c] border border-[#26272e] hover:border-amber-500/50 rounded-xl p-3.5 space-y-2.5 text-xs transition-all cursor-pointer hover:bg-[#1a1b20] group shadow-sm"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#dc2626] text-xs group-hover:underline">#ORD-{p.numero}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            PAGO PENDIENTE
                          </span>
                        </div>

                        <div>
                          <div className="text-white font-semibold">{p.nombreCliente}</div>
                          <div className="text-[11px] text-[#6b6c75]">DNI {p.dniCliente || "—"}</div>
                        </div>

                        {/* Items preview */}
                        {p.items && p.items.length > 0 && (
                          <div className="bg-[#101114] p-2 rounded-lg border border-[#26272e] space-y-1">
                            {p.items.slice(0, 2).map((it, idx) => (
                              <div key={idx} className="text-[11px] text-[#b8b9c0] truncate">
                                <b className="text-amber-400">{it.cantidad}x</b> {it.nombre}
                              </div>
                            ))}
                            {p.items.length > 2 && (
                              <div className="text-[10px] text-[#6b6c75] italic">
                                + {p.items.length - 2} ítem(s) más...
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-white text-sm">{formatPrice(p.total)}</span>
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#26272e] text-[#d7d8dd]">
                              {p.metodoPago === "TRANSFERENCIA" ? "Transferencia" : p.metodoPago === "TARJETA" ? "Tarjeta" : "Efectivo"}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                              p.modalidadEntrega === "MOTOMANDADO"
                                ? "bg-pink-950/40 text-pink-300 border border-pink-800/30"
                                : "bg-amber-950/40 text-amber-300 border border-amber-800/30"
                            }`}>
                              {p.modalidadEntrega === "MOTOMANDADO" ? "Moto" : "Retiro"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPedido(p);
                          }}
                          className="w-full mt-1 py-1.5 bg-[#26272e] hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Revisar comprobante y verificar pago →</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* COLUMNA 2: PENDIENTES DE ARMAR */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> PENDIENTES DE ARMAR
                  </h3>
                  <span className="bg-sky-500/20 text-sky-400 text-xs font-bold px-2 py-0.5 rounded-full border border-sky-500/30">
                    {colPendientesArmar.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colPendientesArmar.length === 0 ? (
                    <div className="text-center py-8 text-[#6b6c75] text-xs bg-[#16171c]/50 border border-dashed border-[#26272e] rounded-xl p-4">
                      No hay pedidos pendientes de armado.
                    </div>
                  ) : (
                    colPendientesArmar.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPedido(p)}
                        className="bg-[#16171c] border border-[#26272e] hover:border-sky-500/50 rounded-xl p-3.5 space-y-2.5 text-xs transition-all cursor-pointer hover:bg-[#1a1b20] group shadow-sm"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#dc2626] text-xs group-hover:underline">#ORD-{p.numero}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            PENDIENTE DE ARMAR
                          </span>
                        </div>

                        <div>
                          <div className="text-white font-semibold">{p.nombreCliente}</div>
                          <div className="text-[11px] text-[#6b6c75]">DNI {p.dniCliente || "—"}</div>
                        </div>

                        {p.items && p.items.length > 0 && (
                          <div className="bg-[#101114] p-2 rounded-lg border border-[#26272e] space-y-1">
                            {p.items.slice(0, 2).map((it, idx) => (
                              <div key={idx} className="text-[11px] text-[#b8b9c0] truncate">
                                <b className="text-sky-400">{it.cantidad}x</b> {it.nombre}
                              </div>
                            ))}
                            {p.items.length > 2 && (
                              <div className="text-[10px] text-[#6b6c75] italic">
                                + {p.items.length - 2} ítem(s) más...
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-white text-sm">{formatPrice(p.total)}</span>
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#26272e] text-[#d7d8dd]">
                              {p.metodoPago === "TRANSFERENCIA" ? "Transferencia" : p.metodoPago === "TARJETA" ? "Tarjeta" : "Efectivo"}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                              p.modalidadEntrega === "MOTOMANDADO"
                                ? "bg-pink-950/40 text-pink-300 border border-pink-800/30"
                                : "bg-amber-950/40 text-amber-300 border border-amber-800/30"
                            }`}>
                              {p.modalidadEntrega === "MOTOMANDADO" ? "Moto" : "Retiro"}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1.5 mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const stockWorker = staffPreparadores.find((s) => s.rol === "ENCARGADO_STOCK")?.id || null;
                              handleCambiarEstadoPedido(p.id, "PREPARANDO", "Ventas envió orden a Stock para preparar", stockWorker);
                            }}
                            disabled={saving}
                            className="flex-1 py-1.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>Mandar a Stock</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPedido(p);
                            }}
                            className="px-2.5 py-1.5 bg-[#26272e] hover:bg-[#35363d] text-white rounded-lg text-[11px] transition-colors"
                          >
                            Detalle →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* COLUMNA 3: EN PREPARACIÓN (STOCK) */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> EN PREPARACIÓN
                  </h3>
                  <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                    {colEnPreparacion.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colEnPreparacion.length === 0 ? (
                    <div className="text-center py-8 text-[#6b6c75] text-xs bg-[#16171c]/50 border border-dashed border-[#26272e] rounded-xl p-4">
                      No hay pedidos en preparación actualmente.
                    </div>
                  ) : (
                    colEnPreparacion.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPedido(p)}
                        className="bg-[#16171c] border border-[#26272e] hover:border-blue-500/50 rounded-xl p-3.5 space-y-2.5 text-xs transition-all cursor-pointer hover:bg-[#1a1b20] group shadow-sm"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#dc2626] text-xs group-hover:underline">#ORD-{p.numero}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            ARMANDO
                          </span>
                        </div>

                        <div>
                          <div className="text-white font-semibold">{p.nombreCliente}</div>
                          <div className="text-[11px] text-[#6b6c75]">DNI {p.dniCliente || "—"}</div>
                        </div>

                        {p.items && p.items.length > 0 && (
                          <div className="bg-[#101114] p-2 rounded-lg border border-[#26272e] space-y-1">
                            {p.items.slice(0, 2).map((it, idx) => (
                              <div key={idx} className="text-[11px] text-[#b8b9c0] truncate">
                                <b className="text-blue-400">{it.cantidad}x</b> {it.nombre}
                              </div>
                            ))}
                            {p.items.length > 2 && (
                              <div className="text-[10px] text-[#6b6c75] italic">
                                + {p.items.length - 2} ítem(s) más...
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-white text-sm">{formatPrice(p.total)}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                            p.modalidadEntrega === "MOTOMANDADO"
                              ? "bg-pink-950/40 text-pink-300 border border-pink-800/30"
                              : "bg-amber-950/40 text-amber-300 border border-amber-800/30"
                          }`}>
                            {p.modalidadEntrega === "MOTOMANDADO" ? "Moto" : "Retiro"}
                          </span>
                        </div>

                        {/* Indicador de preparador */}
                        <div className="text-[11px] text-[#6b6c75] pt-0.5 flex items-center gap-1 border-t border-[#26272e]">
                          <UserCheck className="w-3 h-3 text-blue-400" />
                          <span>Preparador: <b className="text-white">{p.preparadorNombre || "María García"}</b></span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPedido(p);
                          }}
                          className="w-full mt-1 py-1.5 bg-[#26272e] hover:bg-[#35363d] text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <span>Ver detalle de preparación →</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* COLUMNA 4: LISTO PARA ENTREGAR */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> LISTOS PARA ENTREGAR
                  </h3>
                  <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                    {colListosEntrega.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colListosEntrega.length === 0 ? (
                    <div className="text-center py-8 text-[#6b6c75] text-xs bg-[#16171c]/50 border border-dashed border-[#26272e] rounded-xl p-4">
                      No hay pedidos listos esperando entrega.
                    </div>
                  ) : (
                    colListosEntrega.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPedido(p)}
                        className="bg-[#16171c] border border-[#26272e] hover:border-purple-500/50 rounded-xl p-3.5 space-y-2.5 text-xs transition-all cursor-pointer hover:bg-[#1a1b20] group shadow-sm"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#dc2626] text-xs group-hover:underline">#ORD-{p.numero}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            {p.modalidadEntrega === "MOTOMANDADO" ? "LISTO ENTREGA" : "LISTO RETIRO"}
                          </span>
                        </div>

                        <div>
                          <div className="text-white font-semibold">{p.nombreCliente}</div>
                          <div className="text-[11px] text-[#6b6c75]">DNI {p.dniCliente || "—"}</div>
                        </div>

                        {p.items && p.items.length > 0 && (
                          <div className="bg-[#101114] p-2 rounded-lg border border-[#26272e] space-y-1">
                            {p.items.slice(0, 2).map((it, idx) => (
                              <div key={idx} className="text-[11px] text-[#b8b9c0] truncate">
                                <b className="text-purple-400">{it.cantidad}x</b> {it.nombre}
                              </div>
                            ))}
                            {p.items.length > 2 && (
                              <div className="text-[10px] text-[#6b6c75] italic">
                                + {p.items.length - 2} ítem(s) más...
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-white text-sm">{formatPrice(p.total)}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                            p.modalidadEntrega === "MOTOMANDADO"
                              ? "bg-pink-950/40 text-pink-300 border border-pink-800/30"
                              : "bg-amber-950/40 text-amber-300 border border-amber-800/30"
                          }`}>
                            {p.modalidadEntrega === "MOTOMANDADO" ? "🛵 Motomandado" : "🏪 Mostrador"}
                          </span>
                        </div>

                        {p.preparadorNombre && (
                          <div className="text-[11px] text-[#6b6c75] border-t border-[#26272e] pt-1">
                            Preparó: <b className="text-white">{p.preparadorNombre}</b>
                          </div>
                        )}

                        {/* Botón directo de entrega -> Abre el modal de entrega interactivo */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntregaPedido(p);
                          }}
                          className="w-full mt-1 py-1.5 bg-[#16a34a] hover:bg-green-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Entregar pedido →</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* COLUMNA 5: ENTREGADOS */}
              {/* ────────────────────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> ENTREGADOS
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {colEntregados.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colEntregados.length === 0 ? (
                    <div className="text-center py-8 text-[#6b6c75] text-xs bg-[#16171c]/50 border border-dashed border-[#26272e] rounded-xl p-4">
                      No hay pedidos entregados aún.
                    </div>
                  ) : (
                    colEntregados.slice(0, 15).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPedido(p)}
                        className="bg-[#16171c] border border-[#26272e] hover:border-emerald-500/50 rounded-xl p-3.5 space-y-2.5 text-xs transition-all cursor-pointer hover:bg-[#1a1b20] group shadow-sm opacity-90 hover:opacity-100"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#dc2626] text-xs group-hover:underline">#ORD-{p.numero}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            ENTREGADO
                          </span>
                        </div>

                        <div>
                          <div className="text-white font-semibold">{p.nombreCliente}</div>
                          <div className="text-[11px] text-[#6b6c75]">DNI {p.dniCliente || "—"}</div>
                        </div>

                        {p.items && p.items.length > 0 && (
                          <div className="bg-[#101114] p-2 rounded-lg border border-[#26272e] space-y-1">
                            {p.items.slice(0, 2).map((it, idx) => (
                              <div key={idx} className="text-[11px] text-[#b8b9c0] truncate">
                                <b className="text-emerald-400">{it.cantidad}x</b> {it.nombre}
                              </div>
                            ))}
                            {p.items.length > 2 && (
                              <div className="text-[10px] text-[#6b6c75] italic">
                                + {p.items.length - 2} ítem(s) más...
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-white text-sm">{formatPrice(p.total)}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                            p.modalidadEntrega === "MOTOMANDADO"
                              ? "bg-pink-950/40 text-pink-300 border border-pink-800/30"
                              : "bg-amber-950/40 text-amber-300 border border-amber-800/30"
                          }`}>
                            {p.modalidadEntrega === "MOTOMANDADO" ? "Moto" : "Retiro"}
                          </span>
                        </div>

                        {p.notas && (
                          <div className="text-[10px] text-[#6b6c75] italic border-t border-[#26272e] pt-1 truncate">
                            {p.notas}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPedido(p);
                          }}
                          className="w-full mt-1 py-1.5 bg-[#26272e] hover:bg-[#35363d] text-[#b8b9c0] hover:text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <span>Ver detalle →</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VISTA 11: FINANZAS ONLINE (Cierres Diarios y Caja)           */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeView === "finanzas" && user && (
          <FinanzasOnlineView
            user={user}
            role={role}
            showFeedback={showFeedback}
          />
        )}
        {/* ════════════════════════════════════════════════════════════ */}
        {selectedPedido && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#16171c] border border-[#26272e] rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8">
              {/* Header Modal */}
              <div className="flex items-start justify-between border-b border-[#26272e] pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Detalle del Pedido <span className="text-[#dc2626]">#ORD-{selectedPedido.numero}</span>
                    </h2>
                    <EstadoChip estado={selectedPedido.estado} />
                  </div>
                  <p className="text-xs text-[#9a9ba3] mt-1">
                    Ingresado el {new Date(selectedPedido.creadoEn).toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPedido(null)}
                  className="p-1.5 rounded-lg text-[#9a9ba3] hover:text-white hover:bg-[#26272e] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido en 2 Columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tarjeta 1: Cliente & Contacto */}
                <div className="bg-[#1a1b20] border border-[#26272e] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-red-500" /> Datos del Cliente
                    </span>
                    {getWhatsAppLink(selectedPedido.telefonoCliente, selectedPedido.nombreCliente, selectedPedido.numero) && (
                      <a
                        href={getWhatsAppLink(selectedPedido.telefonoCliente, selectedPedido.nombreCliente, selectedPedido.numero)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-colors flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-[#6b6c75]">Nombre y apellido:</span>
                      <div className="text-white font-semibold">{selectedPedido.nombreCliente}</div>
                    </div>
                    <div>
                      <span className="text-[#6b6c75]">DNI:</span>
                      <div className="text-white font-medium">{selectedPedido.dniCliente}</div>
                    </div>
                    <div>
                      <span className="text-[#6b6c75]">Teléfono de contacto:</span>
                      <div className="text-white font-medium">{selectedPedido.telefonoCliente || "No informado"}</div>
                    </div>
                    {selectedPedido.emailCliente && (
                      <div>
                        <span className="text-[#6b6c75]">Email:</span>
                        <div className="text-white font-medium">{selectedPedido.emailCliente}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tarjeta 2: Modalidad, Dirección & Logística */}
                <div className="bg-[#1a1b20] border border-[#26272e] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#26272e]">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-400" /> Logística y pago
                    </span>
                    <span className="text-xs text-white font-bold text-emerald-400">
                      Total: {formatPrice(selectedPedido.total)}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[#6b6c75]">Modalidad de entrega:</span>
                      <div className="text-white font-semibold mt-0.5">
                        {selectedPedido.modalidadEntrega === "MOTOMANDADO"
                          ? "🛵 Motomandado / Moto Uber en el día en Posadas"
                          : "🏪 Retiro en mostrador de tienda"}
                      </div>
                    </div>

                    {selectedPedido.modalidadEntrega === "RETIRO_LOCAL" ? (
                      <div className="bg-[#141519] p-2.5 rounded-lg border border-[#26272e] space-y-1">
                        <span className="text-[#6b6c75] text-[10px] uppercase font-bold tracking-wider">
                          Punto de retiro en tienda:
                        </span>
                        <div className="text-white font-medium flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>Av. Roque Sáenz Peña 1500 · Posadas, Misiones</span>
                        </div>
                      </div>
                    ) : (
                      selectedPedido.direccionEnvio && (
                        <div>
                          <span className="text-[#6b6c75]">Dirección de entrega Posadas:</span>
                          <div className="text-white font-medium bg-[#141519] p-2 rounded-lg border border-[#26272e] mt-0.5 flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{selectedPedido.direccionEnvio}</span>
                          </div>
                        </div>
                      )
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[#6b6c75]">Método de pago:</span>
                        <div className="text-white font-medium mt-0.5">{selectedPedido.metodoPago.replace(/_/g, " ")}</div>
                      </div>
                      <div>
                        <span className="text-[#6b6c75]">Costo de envío:</span>
                        <div className="text-white font-medium mt-0.5">
                          {selectedPedido.costoEnvio > 0 ? formatPrice(selectedPedido.costoEnvio) : "Gratis / Retiro"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Comprobante de Pago y Personal Responsable */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sección Comprobante de Pago */}
                <div className="bg-[#1a1b20] border border-[#26272e] rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 pb-2 border-b border-[#26272e]">
                    <FileText className="w-3.5 h-3.5 text-sky-400" /> Comprobante de Pago
                  </span>

                  {selectedPedido.metodoPago === "TARJETA" ? (
                    <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Pago con Tarjeta Online Aprobado</span>
                      </div>
                      <p className="text-[11px] text-[#9a9ba3] leading-relaxed">
                        Operación confirmada de forma inmediata por pasarela de pagos. No requiere comprobante bancario.
                      </p>
                      {selectedPedido.estado === "CONFIRMADO" && (
                        (user.rol === "ADMINISTRADOR" || user.rol === "ENCARGADO_STOCK") ? (
                          <button
                            type="button"
                            onClick={() => handleCambiarEstadoPedido(selectedPedido.id, "PREPARANDO")}
                            disabled={saving}
                            className="w-full mt-2 py-2 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Pasar a preparación (Stock)
                          </button>
                        ) : (
                          <div className="w-full mt-2 py-2 text-center text-[11px] text-sky-400 bg-sky-950/30 rounded-lg border border-sky-800/30 font-medium flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>En cola para preparación en depósito (Stock)</span>
                          </div>
                        )
                      )}
                    </div>
                  ) : selectedPedido.metodoPago === "EFECTIVO_LOCAL" ? (
                    <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <Store className="w-4 h-4 text-amber-400" />
                        <span>Pago en Efectivo al Retirar</span>
                      </div>
                      <p className="text-[11px] text-[#9a9ba3] leading-relaxed">
                        El cliente abona en efectivo en mostrador al retirar. No requiere comprobante bancario previo.
                      </p>
                      {selectedPedido.estado === "CONFIRMADO" && (
                        (user.rol === "ADMINISTRADOR" || user.rol === "ENCARGADO_STOCK") ? (
                          <button
                            type="button"
                            onClick={() => handleCambiarEstadoPedido(selectedPedido.id, "PREPARANDO")}
                            disabled={saving}
                            className="w-full mt-2 py-2 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Pasar a preparación (Stock)
                          </button>
                        ) : (
                          <div className="w-full mt-2 py-2 text-center text-[11px] text-sky-400 bg-sky-950/30 rounded-lg border border-sky-800/30 font-medium flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>En cola para preparación en depósito (Stock)</span>
                          </div>
                        )
                      )}
                    </div>
                  ) : selectedPedido.comprobanteUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => handleOpenComprobante(selectedPedido.comprobanteUrl, selectedPedido)}
                          className="w-16 h-16 rounded-xl bg-black border border-[#35363d] overflow-hidden cursor-pointer flex-shrink-0 flex items-center justify-center hover:opacity-90 hover:border-amber-400 transition-all shadow"
                          title="Hacé clic para ver el comprobante en visor"
                        >
                          {selectedPedido.comprobanteUrl.toLowerCase().endsWith(".pdf") ? (
                            <div className="w-full h-full bg-red-950/40 border border-red-800/40 flex flex-col items-center justify-center text-red-400">
                              <FileText className="w-6 h-6 mb-0.5" />
                              <span className="text-[9px] font-black uppercase tracking-wider">PDF</span>
                            </div>
                          ) : (
                            <img
                              src={selectedPedido.comprobanteUrl}
                              alt="Comprobante"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full bg-zinc-900 flex flex-col items-center justify-center p-1 text-center"><span class="text-[9px] text-amber-400 font-bold">Doc</span></div>';
                                }
                              }}
                            />
                          )}
                        </div>
                        <div className="text-xs space-y-1.5 flex-1 min-w-0">
                          <span className="text-emerald-400 font-bold block flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            Comprobante de transferencia ({selectedPedido.comprobanteUrl.toLowerCase().endsWith(".pdf") ? "PDF" : "Imagen"})
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenComprobante(selectedPedido.comprobanteUrl, selectedPedido)}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver comprobante</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Botón de Aprobación */}
                      {(selectedPedido.estado === "PENDIENTE" || selectedPedido.estado === "CONFIRMADO") ? (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const targetStock = selectedPedido.preparadorUsuarioId || staffPreparadores.find((s) => s.rol === "ENCARGADO_STOCK")?.id || null;
                              handleCambiarEstadoPedido(selectedPedido.id, "PREPARANDO", "Ventas verificó comprobante y envió orden a Stock", targetStock);
                            }}
                            disabled={saving}
                            className="w-full py-2 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {selectedPedido.estadoPago === "PAGADO"
                              ? "Orden verificada · Enviar a Stock para preparar"
                              : "Comprobante y pedido verificado · Enviar a Stock para preparar"}
                          </button>
                          {selectedPedido.estadoPago !== "PAGADO" && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("¿Rechazar el comprobante? El pedido vuelve a PENDIENTE y se le informará al cliente.")) return;
                                const res = await rechazarComprobantePedidoAction(selectedPedido.id, user.id, "Comprobante rechazado por Ventas");
                                if (res.success) {
                                  showFeedback("success", "Comprobante rechazado. El pedido volvió a PENDIENTE.");
                                  setPedidos((prev) => prev.map((p) => p.id === selectedPedido.id ? { ...p, estado: "PENDIENTE", comprobanteUrl: null } : p));
                                  setSelectedPedido(null);
                                } else {
                                  showFeedback("error", res.error || "No se pudo rechazar el comprobante.");
                                }
                              }}
                              disabled={saving}
                              className="w-full py-2 bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Rechazar comprobante
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-2.5 bg-[#141519] p-3 rounded-xl border border-[#26272e]">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Comprobante pendiente del cliente</span>
                      </div>
                      <p className="text-[11px] text-[#9a9ba3] leading-relaxed">
                        El comprobante lo adjunta el cliente directamente desde la tienda web al pagar o en &quot;Mis Pedidos&quot;. Como empleado de ventas o administrador, podés verificar los repuestos y enviar la orden a Stock:
                      </p>
                      {selectedPedido.estado === "PENDIENTE" && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetStock = selectedPedido.preparadorUsuarioId || staffPreparadores.find((s) => s.rol === "ENCARGADO_STOCK")?.id || null;
                            handleCambiarEstadoPedido(selectedPedido.id, "PREPARANDO", "Ventas verificó pedido y autorizó preparación en Stock", targetStock);
                          }}
                          disabled={saving}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pedido verificado · Enviar a Stock para preparar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Preparador + Notas */}
                <div className="bg-[#1a1b20] border border-[#26272e] rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6b6c75]">Preparado por:</span>
                    <span className="text-white font-semibold">
                      {selectedPedido.preparadorNombre || <span className="text-[#6b6c75] italic">Sin asignar</span>}
                    </span>
                  </div>
                  {selectedPedido.notas && (
                    <div className="pt-2 border-t border-[#26272e]">
                      <span className="text-[#6b6c75] block mb-1">Notas:</span>
                      <div className="text-[11px] text-white bg-[#141519] p-2 rounded border border-[#26272e] italic">
                        {selectedPedido.notas}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabla de Repuestos del Pedido */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white block">
                  Repuestos solicitados ({selectedPedido.items?.length || 0}):
                </span>
                <div className="bg-[#141519] border border-[#26272e] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0f1012] text-[#6b6c75] border-b border-[#26272e]">
                      <tr>
                        {selectedPedido.estado === "PREPARANDO" && (user.rol === "ENCARGADO_STOCK" || user.rol === "ADMINISTRADOR") && (
                          <th className="py-2.5 px-3 text-center w-16">Control</th>
                        )}
                        <th className="py-2.5 px-3">Repuesto</th>
                        <th className="py-2.5 px-3 text-center">Cant</th>
                        <th className="py-2.5 px-3 text-right">Precio Unit</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26272e]">
                      {selectedPedido.items?.map((it, idx) => {
                        const isChecked = !!it.preparado && (it.cantidadPreparada ?? 0) >= it.cantidad;
                        const isItemSaving = !!savingChecklistItems[`${selectedPedido.id}-${it.id}`];

                        return (
                          <tr key={it.id || idx} className="hover:bg-[#1a1b20]">
                            {selectedPedido.estado === "PREPARANDO" && (user.rol === "ENCARGADO_STOCK" || user.rol === "ADMINISTRADOR") && (
                              <td className="py-2 px-3 text-center">
                                {isItemSaving ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 mx-auto" />
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      handleToggleChecklistItem(selectedPedido.id, it.id, !isChecked)
                                    }
                                    disabled={saving || isItemSaving || !!savingChecklistItems[`ped-${selectedPedido.id}`]}
                                    className="rounded bg-[#0f1012] border-[#35363d] text-emerald-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                                  />
                                )}
                              </td>
                            )}
                            <td className="py-2 px-3 text-white font-medium">
                              {it.marca && (
                                <span className="text-[10px] text-red-400 font-bold bg-red-950/40 px-1 py-0.5 rounded mr-1.5">
                                  {it.marca}
                                </span>
                              )}
                              {it.nombre}
                            </td>
                            <td className="py-2 px-3 text-center text-white font-bold">{it.cantidad}</td>
                            <td className="py-2 px-3 text-right text-[#9a9ba3]">{formatPrice(it.precioUnitario)}</td>
                            <td className="py-2 px-3 text-right text-emerald-400 font-bold">{formatPrice(it.subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botones de Cambio de Estado en Modal */}
              <div className="pt-3 border-t border-[#26272e] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPedido(null)}
                  className="px-4 py-2 bg-transparent border border-[#35363d] text-[#b8b9c0] hover:text-white rounded-lg text-xs"
                >
                  Cerrar
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedPedido.estado === "PENDIENTE" && (
                    (user.rol === "ADMINISTRADOR" || user.rol === "ENCARGADO_VENTAS") && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetStock = selectedPedido.preparadorUsuarioId || staffPreparadores.find((s) => s.rol === "ENCARGADO_STOCK")?.id || null;
                          handleCambiarEstadoPedido(
                            selectedPedido.id,
                            "CONFIRMADO",
                            "Ventas/Admin verificó pago y aprobó orden",
                            targetStock
                          );
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Aprobar pago y enviar a Stock
                      </button>
                    )
                  )}

                  {selectedPedido.estado === "CONFIRMADO" && (
                    (user.rol === "ADMINISTRADOR" || user.rol === "ENCARGADO_STOCK") ? (
                      <button
                        type="button"
                        onClick={() => {
                          const targetStock = selectedPedido.preparadorUsuarioId || user.id;
                          handleCambiarEstadoPedido(
                            selectedPedido.id,
                            "PREPARANDO",
                            "Stock inició preparación del pedido",
                            targetStock
                          );
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                      >
                        <Package className="w-4 h-4" />
                        Tomar e iniciar preparación
                      </button>
                    ) : (
                      <span className="px-3 py-2 bg-sky-950/40 border border-sky-800/30 text-sky-400 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>En cola de Stock para armado</span>
                      </span>
                    )
                  )}

                  {selectedPedido.estado === "PREPARANDO" && (
                    (user.rol === "ENCARGADO_STOCK" || user.rol === "ADMINISTRADOR") ? (
                      (() => {
                        const tot = selectedPedido.items?.length || 0;
                        const ckd = selectedPedido.items?.filter((it) => !!it.preparado && (it.cantidadPreparada ?? 0) >= it.cantidad).length || 0;
                        const allOk = tot > 0 && ckd === tot;
                        const ordSav = !!savingChecklistItems[`ped-${selectedPedido.id}`];

                        return (
                          <button
                            type="button"
                            onClick={() => handleFinalizarPreparacion(selectedPedido)}
                            disabled={saving || ordSav || !allOk}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              allOk && !ordSav
                                ? "bg-[#a855f7] hover:bg-purple-600 text-white cursor-pointer"
                                : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 cursor-not-allowed opacity-75"
                            }`}
                          >
                            {ordSav ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Guardando checklist...</span>
                              </>
                            ) : (
                              <span>
                                {allOk
                                  ? "Marcar listo para entrega / retiro"
                                  : `Checklist incompleto (${ckd}/${tot})`}
                              </span>
                            )}
                          </button>
                        );
                      })()
                    ) : (
                      <span className="px-3 py-2 bg-blue-950/40 border border-blue-800/30 text-blue-400 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        En preparación por Stock ({selectedPedido.preparadorNombre || "Stock"})
                      </span>
                    )
                  )}

                  {(selectedPedido.estado === "LISTO_ENTREGA" || selectedPedido.estado === "LISTO_PARA_RETIRAR") && (
                    <button
                      type="button"
                      onClick={() => {
                        const p = selectedPedido;
                        setSelectedPedido(null);
                        handleOpenEntregaModal(p);
                      }}
                      disabled={saving}
                      className="px-4 py-2 bg-[#16a34a] hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {selectedPedido.metodoPago === "EFECTIVO_LOCAL" && selectedPedido.estadoPago !== "PAGADO"
                        ? "Registrar cobro y entregar en mostrador"
                        : "Procesar entrega / despacho"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Despacho y Entrega en Mostrador (Accesible desde Entregas y Pedidos) */}
        {selectedEntregaPedido && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex min-h-full items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl rounded-2xl border border-[#26272e] bg-[#16171c] p-5 sm:p-6 shadow-2xl my-auto max-h-[calc(100vh-2.5rem)] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[#26272e] shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    selectedEntregaPedido.modalidadEntrega === "RETIRO_LOCAL"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  }`}>
                    {selectedEntregaPedido.modalidadEntrega === "RETIRO_LOCAL" ? (
                      <Store className="w-6 h-6" />
                    ) : (
                      <Bike className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-white">
                        #ORD-{selectedEntregaPedido.numero}
                      </h3>
                      <EstadoChip estado={selectedEntregaPedido.estado} />
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#1f2029] text-gray-300 border border-[#2e303d]">
                        {selectedEntregaPedido.modalidadEntrega === "RETIRO_LOCAL" ? "Retiro en local" : "Envío a domicilio"}
                      </span>
                      {selectedEntregaPedido.estadoPago === "PAGADO" ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> PAGADO
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDIENTE DE PAGO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Cliente: <span className="text-gray-200 font-semibold">{selectedEntregaPedido.nombreCliente || "Consumidor Final"}</span>
                      {selectedEntregaPedido.dniCliente && (
                        <span> · DNI registrado: <strong className="text-gray-200">{selectedEntregaPedido.dniCliente}</strong></span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEntregaPedido(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#20222a] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 scrollbar-thin">
                {/* Feedback Banners */}
                {cobroError && (
                  <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span className="leading-relaxed">{cobroError}</span>
                  </div>
                )}
                {cobroSuccess && (
                  <div className="p-3.5 rounded-xl bg-green-950/40 border border-green-800/40 text-green-300 text-xs flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
                    <span className="leading-relaxed">{cobroSuccess}</span>
                  </div>
                )}

                {/* Banner informativo de estado si todavía está en depósito */}
                {(selectedEntregaPedido.estado === "CONFIRMADO" || selectedEntregaPedido.estado === "PREPARANDO" || selectedEntregaPedido.estado === "PENDIENTE") && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-300 text-xs flex items-start gap-2.5">
                    <Package className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="block text-white font-semibold mb-0.5">
                        {selectedEntregaPedido.estado === "PREPARANDO"
                          ? `En preparación por Stock (${selectedEntregaPedido.preparadorNombre || "Personal de depósito"})`
                          : "Pedido en espera de preparación por Stock"}
                      </strong>
                      <span>Este pedido todavía no fue marcado como &apos;Listo para entregar&apos;. Stock debe completar el control y armado antes de autorizar la entrega en mostrador.</span>
                    </div>
                  </div>
                )}

                {/* Resumen de orden y montos */}
                <div className="p-3.5 rounded-xl bg-[#1a1b22] border border-[#26272e] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-semibold">Total del pedido</span>
                    <span className="text-lg font-black text-amber-400">{formatPrice(selectedEntregaPedido.total)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-semibold">Método de pago</span>
                    <span className="text-xs font-bold text-gray-200">
                      {selectedEntregaPedido.metodoPago === "EFECTIVO_LOCAL"
                        ? "Efectivo en mostrador"
                        : selectedEntregaPedido.metodoPago === "TRANSFERENCIA" || selectedEntregaPedido.metodoPago === "TRANSFERENCIA_BANCARIA"
                        ? "Transferencia bancaria previa"
                        : selectedEntregaPedido.metodoPago || "No especificado"}
                    </span>
                  </div>
                  {selectedEntregaPedido.telefonoCliente && (
                    <div>
                      <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-semibold">Contacto</span>
                      <a
                        href={`https://wa.me/${selectedEntregaPedido.telefonoCliente.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {selectedEntregaPedido.telefonoCliente}
                      </a>
                    </div>
                  )}
                </div>

                {/* Paso 1: Verificación de Identidad */}
                {(() => {
                  const dniRegNorm = (selectedEntregaPedido.dniCliente || "").replace(/\D/g, "");
                  const dniIngNorm = codigoRetiroVerificado.replace(/\D/g, "");
                  const hasDniInput = codigoRetiroVerificado.trim().length > 0;
                  const isDniValido = Boolean(
                    hasDniInput &&
                    (dniRegNorm
                      ? dniIngNorm === dniRegNorm
                      : codigoRetiroVerificado.trim().toLowerCase() === (selectedEntregaPedido.dniCliente || "").trim().toLowerCase())
                  );
                  const isDniInvalido = Boolean(hasDniInput && !isDniValido);

                  return (
                    <div className="p-4 rounded-xl bg-[#14151a] border border-[#26272e] space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                        <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                          Paso 1: Verificación de Identidad de quien retira
                        </h4>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">
                          DNI presentado en mostrador <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="dni-verificacion-entrega"
                          autoComplete="off"
                          value={codigoRetiroVerificado}
                          onChange={(e) => {
                            setCodigoRetiroVerificado(e.target.value);
                            setCobroError(null);
                          }}
                          placeholder="Ingresá manualmente el DNI informado por el cliente..."
                          className={`w-full px-3 py-2 bg-[#1b1c24] border rounded-lg text-xs text-white focus:outline-none transition-colors ${
                            isDniValido
                              ? "border-emerald-500/80 focus:border-emerald-400"
                              : isDniInvalido
                              ? "border-red-500/80 focus:border-red-400"
                              : "border-[#2e303d] focus:border-amber-400"
                          }`}
                        />
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px]">
                          <span className="text-gray-400">
                            DNI registrado en compra:{" "}
                            <strong className="text-gray-200">{selectedEntregaPedido.dniCliente || "No especificado"}</strong>
                          </span>
                          {!hasDniInput ? (
                            <span className="text-amber-400/90 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Solicitá e ingresá el DNI para verificar identidad
                            </span>
                          ) : isDniValido ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> DNI verificado: coincide con el cliente
                            </span>
                          ) : (
                            <span className="text-red-400 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-400" /> El DNI no coincide con el registrado en el pedido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Paso 2: Control de repuestos y combos */}
                <div className="p-4 rounded-xl bg-[#14151a] border border-[#26272e] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                        Paso 2: Checklist de Repuestos a Entregar
                      </h4>
                    </div>
                    {selectedEntregaPedido.items && selectedEntregaPedido.items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const allChecked: Record<string, boolean> = {};
                          selectedEntregaPedido.items?.forEach((it) => {
                            allChecked[String(it.id)] = true;
                          });
                          setCheckedEntregaItems(allChecked);
                        }}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                      >
                        Marcar todos
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedEntregaPedido.items && selectedEntregaPedido.items.length > 0 ? (
                      selectedEntregaPedido.items.map((it) => {
                        const isChecked = !!checkedEntregaItems[String(it.id)];
                        return (
                          <label
                            key={it.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-green-950/20 border-green-800/40 text-gray-200"
                                : "bg-[#1b1c24] border-[#2e303d] text-gray-300 hover:border-gray-600"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) =>
                                  setCheckedEntregaItems((prev) => ({
                                    ...prev,
                                    [String(it.id)]: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-[#26272e]"
                              />
                              <div className="truncate">
                                <span className="font-semibold block truncate">
                                  {it.nombre || "Repuesto"}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  Cant: <strong className="text-gray-300">{it.cantidad}</strong> · {formatPrice(it.precioUnitario)} c/u
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-gray-200 shrink-0">
                              {formatPrice(it.subtotal)}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs text-gray-400 italic">No hay ítems registrados en este pedido.</p>
                    )}
                  </div>
                </div>

                {/* Paso 3: Cobro en Mostrador (Efectivo) */}
                {selectedEntregaPedido.metodoPago === "EFECTIVO_LOCAL" && (
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    selectedEntregaPedido.estadoPago === "PAGADO"
                      ? "bg-green-950/20 border-green-800/40"
                      : "bg-amber-950/20 border-amber-600/40"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className={`w-4 h-4 ${
                          selectedEntregaPedido.estadoPago === "PAGADO" ? "text-green-400" : "text-amber-400"
                        }`} />
                        <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                          Paso 3: Cobro en Efectivo en Mostrador
                        </h4>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        selectedEntregaPedido.estadoPago === "PAGADO"
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                      }`}>
                        {selectedEntregaPedido.estadoPago === "PAGADO" ? "COBRADO" : "PENDIENTE DE COBRO"}
                      </span>
                    </div>

                    {selectedEntregaPedido.estadoPago === "PAGADO" ? (
                      <div className="flex items-center gap-2 text-xs text-green-300 bg-green-950/40 p-2.5 rounded-lg border border-green-800/30">
                        <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
                        <span>Cobro completado por <strong>{formatPrice(selectedEntregaPedido.total)}</strong> en mostrador. Podés despachar la mercadería.</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-300 leading-relaxed">
                          El cliente debe abonar <strong className="text-amber-400 font-bold">{formatPrice(selectedEntregaPedido.total)}</strong> en efectivo al retirar los repuestos.
                        </p>
                        {(() => {
                          const dniRegNorm = (selectedEntregaPedido.dniCliente || "").replace(/\D/g, "");
                          const dniIngNorm = codigoRetiroVerificado.replace(/\D/g, "");
                          const isDniValido = Boolean(
                            codigoRetiroVerificado.trim().length > 0 &&
                            (dniRegNorm
                              ? dniIngNorm === dniRegNorm
                              : codigoRetiroVerificado.trim().toLowerCase() === (selectedEntregaPedido.dniCliente || "").trim().toLowerCase())
                          );

                          return (
                            <button
                              type="button"
                              onClick={handleRegistrarCobroMostradorModal}
                              disabled={isSubmittingCobro || !isDniValido}
                              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
                            >
                              {isSubmittingCobro ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Registrando cobro en mostrador...</span>
                                </>
                              ) : !isDniValido ? (
                                <>
                                  <ShieldCheck className="w-4 h-4" />
                                  <span>Validá el DNI en Paso 1 para habilitar cobro</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4" />
                                  <span>Registrar cobro en mostrador ({formatPrice(selectedEntregaPedido.total)})</span>
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Si es Motomandado, aviso de entrega */}
                {selectedEntregaPedido.modalidadEntrega === "MOTOMANDADO" && (
                  <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 text-xs text-blue-300 flex items-start gap-2.5">
                    <Bike className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                    <div>
                      <strong className="block text-white mb-0.5">Envío por Motomandado / Moto Uber</strong>
                      <span>Dirección de destino: <strong className="text-blue-200">{selectedEntregaPedido.direccionEnvio || "Posadas, Misiones"}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="pt-4 border-t border-[#26272e] shrink-0 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEntregaPedido(null)}
                  className="px-4 py-2 rounded-xl border border-[#2e303d] text-gray-300 hover:bg-[#20222a] text-xs font-semibold transition-colors"
                >
                  Cerrar
                </button>
                {(() => {
                  const isRetiro = selectedEntregaPedido.modalidadEntrega === "RETIRO_LOCAL";
                  const dniRegNorm = (selectedEntregaPedido.dniCliente || "").replace(/\D/g, "");
                  const dniIngNorm = codigoRetiroVerificado.replace(/\D/g, "");
                  const isDniValido = Boolean(
                    codigoRetiroVerificado.trim().length > 0 &&
                    (dniRegNorm
                      ? dniIngNorm === dniRegNorm
                      : codigoRetiroVerificado.trim().toLowerCase() === (selectedEntregaPedido.dniCliente || "").trim().toLowerCase())
                  );

                  const isEnPreparacion =
                    selectedEntregaPedido.estado === "PREPARANDO" ||
                    selectedEntregaPedido.estado === "CONFIRMADO" ||
                    selectedEntregaPedido.estado === "PENDIENTE";

                  const isFaltaCobro =
                    selectedEntregaPedido.metodoPago === "EFECTIVO_LOCAL" &&
                    selectedEntregaPedido.estadoPago !== "PAGADO";

                  const canSubmitEntrega =
                    !isSubmittingEntrega &&
                    selectedEntregaPedido.estado !== "ENTREGADO" &&
                    !isEnPreparacion &&
                    !isFaltaCobro &&
                    (!isRetiro || isDniValido);

                  return (
                    <button
                      type="button"
                      onClick={handleConfirmarEntregaModal}
                      disabled={!canSubmitEntrega}
                      className="px-5 py-2 rounded-xl bg-[#16a34a] hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-green-900/20 cursor-pointer"
                    >
                      {isSubmittingEntrega ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Confirmando entrega...</span>
                        </>
                      ) : selectedEntregaPedido.estado === "ENTREGADO" ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Pedido ya entregado</span>
                        </>
                      ) : isEnPreparacion ? (
                        <>
                          <Package className="w-4 h-4" />
                          <span>Esperando preparación de Stock</span>
                        </>
                      ) : isFaltaCobro ? (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Cobro pendiente en Paso 3</span>
                        </>
                      ) : isRetiro && !isDniValido ? (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Validar DNI en Paso 1</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isRetiro
                              ? `Confirmar entrega en mostrador (por ${user?.nombreCompleto || "Carlos López"})`
                              : `Confirmar despacho a Moto Uber (por ${user?.nombreCompleto || "Carlos López"})`}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Comprobante Mejorado (Soporte PDF e Imágenes) */}
        {comprobanteModalUrl && (
          <div
            className="fixed inset-0 z-50 overflow-hidden bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setComprobanteModalUrl(null);
                setComprobanteModalPedido(null);
              }
            }}
          >
            <div className="relative w-full max-w-5xl xl:max-w-6xl h-[90vh] max-h-[90vh] rounded-2xl border border-[#26272e] bg-[#16171c] p-3 sm:p-5 shadow-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#26272e] shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${
                    comprobanteInfo?.esPdf || comprobanteModalUrl.toLowerCase().endsWith(".pdf")
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : "bg-sky-500/10 border-sky-500/20 text-sky-400"
                  }`}>
                    {comprobanteInfo?.esPdf || comprobanteModalUrl.toLowerCase().endsWith(".pdf") ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate">
                        {comprobanteModalPedido ? `Comprobante Orden #ORD-${comprobanteModalPedido.numero}` : "Comprobante de Transferencia"}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        comprobanteInfo?.esPdf || comprobanteModalUrl.toLowerCase().endsWith(".pdf")
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      }`}>
                        {comprobanteInfo?.esPdf || comprobanteModalUrl.toLowerCase().endsWith(".pdf") ? "Documento PDF" : "Imagen"}
                      </span>
                      {comprobanteInfo?.tamanoFormateado && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#20222a] text-gray-300 border border-[#2e303d]">
                          {comprobanteInfo.tamanoFormateado}
                        </span>
                      )}
                    </div>
                    {comprobanteModalPedido && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        Cliente: <strong className="text-gray-200">{comprobanteModalPedido.nombreCliente}</strong> · Total: <strong className="text-amber-400">{formatPrice(comprobanteModalPedido.total)}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <a
                    href={comprobanteModalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#20222a] hover:bg-[#2b2d38] text-xs font-semibold text-gray-200 hover:text-white border border-[#2e303d] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Abrir en otra pestaña"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Abrir en otra pestaña</span>
                  </a>
                  <a
                    href={comprobanteModalUrl}
                    download={comprobanteInfo?.nombreArchivo || (comprobanteModalPedido ? `comprobante-orden-${comprobanteModalPedido.numero}` : "comprobante")}
                    className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#20222a] hover:bg-[#2b2d38] text-xs font-semibold text-gray-200 hover:text-white border border-[#2e303d] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Descargar archivo"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Descargar</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setComprobanteModalUrl(null);
                      setComprobanteModalPedido(null);
                    }}
                    className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#20222a] hover:bg-red-500/20 text-xs font-semibold text-gray-300 hover:text-red-300 border border-[#2e303d] hover:border-red-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Cerrar visor"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Cerrar</span>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 min-h-0 w-full overflow-hidden py-2.5 flex flex-col">
                {loadingComprobanteInfo ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                    <RefreshCw className="w-7 h-7 animate-spin text-sky-400" />
                    <span className="text-xs font-medium">Verificando comprobante en el servidor...</span>
                  </div>
                ) : comprobanteInfo && !comprobanteInfo.existe ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#101115] rounded-xl border border-red-900/30 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="text-sm font-bold text-white">Comprobante no disponible</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {comprobanteInfo.error || "El archivo asociado a este pedido no fue encontrado en el almacenamiento del servidor o fue eliminado."}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center gap-2">
                      <a
                        href={comprobanteModalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#20222a] hover:bg-[#2a2c36] text-xs font-semibold text-gray-200 rounded-lg border border-[#2e303d] flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Reintentar enlace directo</span>
                      </a>
                    </div>
                  </div>
                ) : (comprobanteInfo?.esPdf || comprobanteModalUrl.toLowerCase().endsWith(".pdf")) ? (
                  <div className="flex-1 min-h-0 w-full flex flex-col">
                    <div className="flex-1 min-h-0 w-full rounded-xl overflow-hidden border border-[#26272e] bg-[#0c0d10] shadow-inner flex flex-col">
                      <iframe
                        src={`${comprobanteModalUrl}#toolbar=1&navpanes=0&view=FitH`}
                        className="w-full h-full flex-1 border-0 block"
                        title="Visor de Comprobante PDF"
                      />
                    </div>
                    <div className="pt-2 px-1 text-center text-[11px] text-gray-400 flex flex-wrap items-center justify-center gap-1.5 shrink-0">
                      <span>¿Tu navegador no muestra el PDF interactivo?</span>
                      <a
                        href={comprobanteModalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 underline font-semibold hover:text-sky-300 inline-flex items-center gap-0.5"
                      >
                        <span>Abrir en otra pestaña</span>
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                      <span>o</span>
                      <a
                        href={comprobanteModalUrl}
                        download={comprobanteInfo?.nombreArchivo || (comprobanteModalPedido ? `comprobante-orden-${comprobanteModalPedido.numero}.pdf` : "comprobante.pdf")}
                        className="text-amber-400 underline font-semibold hover:text-amber-300 inline-flex items-center gap-0.5"
                      >
                        <span>descargar archivo</span>
                        <Download className="w-3 h-3 inline" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 w-full flex items-center justify-center bg-black/60 rounded-xl p-3 border border-[#26272e] overflow-auto">
                    <img
                      src={comprobanteModalUrl}
                      alt="Comprobante de pago"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg select-none"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="text-center p-6 text-xs text-gray-400"><p class="font-bold text-red-400 mb-1">No se pudo cargar la imagen del comprobante.</p><p>El formato puede ser incompatible o el archivo no existe en el servidor.</p></div>';
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Footer con acciones rápidas de verificación si el pedido está PENDIENTE o CONFIRMADO */}
              {comprobanteModalPedido && (comprobanteModalPedido.estado === "PENDIENTE" || comprobanteModalPedido.estado === "CONFIRMADO") && (
                <div className="pt-3 border-t border-[#26272e] shrink-0 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-400">
                    Estado: <strong className={comprobanteModalPedido.estadoPago === "PAGADO" ? "text-emerald-400" : "text-amber-400"}>
                      {comprobanteModalPedido.estadoPago === "PAGADO" ? "Pago ya acreditado" : "Pago pendiente de verificación"}
                    </strong>
                  </span>
                  <div className="flex items-center gap-2">
                    {comprobanteModalPedido.estadoPago !== "PAGADO" && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("¿Rechazar el comprobante? El pedido vuelve a PENDIENTE y se notificará al cliente.")) return;
                          const res = await rechazarComprobantePedidoAction(comprobanteModalPedido.id, user.id, "Comprobante rechazado tras revisión en visor");
                          if (res.success) {
                            showFeedback("success", "Comprobante rechazado.");
                            setPedidos((prev) => prev.map((p) => p.id === comprobanteModalPedido.id ? { ...p, estado: "PENDIENTE", comprobanteUrl: null } : p));
                            setComprobanteModalUrl(null);
                            setComprobanteModalPedido(null);
                            setSelectedPedido(null);
                          } else {
                            showFeedback("error", res.error || "No se pudo rechazar.");
                          }
                        }}
                        disabled={saving}
                        className="px-3 py-1.5 bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazar comprobante</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const targetStock = comprobanteModalPedido.preparadorUsuarioId || staffPreparadores.find((s) => s.rol === "ENCARGADO_STOCK")?.id || null;
                        handleCambiarEstadoPedido(comprobanteModalPedido.id, "PREPARANDO", "Ventas verificó comprobante en visor y envió orden a Stock", targetStock);
                        setComprobanteModalUrl(null);
                        setComprobanteModalPedido(null);
                        setSelectedPedido(null);
                      }}
                      disabled={saving}
                      className="px-4 py-1.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{comprobanteModalPedido.estadoPago === "PAGADO" ? "Enviar a Stock" : "Comprobante verificado · Enviar a Stock"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

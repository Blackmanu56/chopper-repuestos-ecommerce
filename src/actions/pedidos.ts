"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export interface ItemPedidoInput {
  id: number;
  nombre?: string;
  marca?: string;
  cantidad: number;
  esCombo?: boolean;
}

export interface CrearPedidoOnlineInput {
  nombre: string;
  dni: string;
  tel: string;
  email?: string;
  direccionEnvio?: string;
  modalidadEntrega: "RETIRO_LOCAL" | "MOTOMANDADO";
  costoEnvio?: number;
  metodoPago: "TRANSFERENCIA" | "EFECTIVO_LOCAL" | "TARJETA";
  items: ItemPedidoInput[];
  notas?: string;
}

export interface PedidoDTO {
  id: number;
  numero: number;
  clienteId: number | null;
  nombreCliente: string;
  dniCliente: string;
  telefonoCliente: string | null;
  emailCliente: string | null;
  direccionEnvio: string | null;
  modalidadEntrega: string;
  costoEnvio: number;
  metodoPago: string;
  estado: string;
  comprobanteUrl: string | null;
  preparadorUsuarioId: number | null;
  preparadorNombre: string | null;
  fechaPreparacion: Date | null;
  total: number;
  notas: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
  items: Array<{
    id: number;
    productoId: number | null;
    comboId: number | null;
    nombre: string;
    marca: string | null;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
}

async function verifyStaff(userId: number): Promise<{ authorized: boolean; rol?: string; error?: string; nombre?: string }> {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true },
    });

    if (!user || !user.activo) {
      return { authorized: false, error: "Usuario inactivo o no encontrado." };
    }

    const rolName = (user.rol?.nombre || "").toUpperCase();
    const isStaff = rolName === "ADMINISTRADOR" || rolName === "ENCARGADO_VENTAS" || rolName === "ENCARGADO_STOCK";

    if (!isStaff) {
      return { authorized: false, error: "No tenés permisos para gestionar pedidos." };
    }

    return { authorized: true, rol: rolName, nombre: user.nombreCompleto };
  } catch (e) {
    console.error("Error verificando staff en pedidos:", e);
    return { authorized: false, error: "Error de verificación de permisos." };
  }
}

/**
 * Crea un pedido online certificado directamente en PostgreSQL
 * Reutiliza o crea el Cliente en la tabla compartida de clientes del SGI
 */
export async function crearPedidoOnlineAction(
  input: CrearPedidoOnlineInput
): Promise<{ success: boolean; pedido?: PedidoDTO; error?: string }> {
  try {
    const cleanNombre = input.nombre.trim();
    const cleanDni = input.dni.trim().replace(/\./g, "").replace(/\s/g, "");
    const cleanTel = input.tel.trim();
    const cleanEmail = input.email?.trim().toLowerCase() || null;
    const cleanDir = input.direccionEnvio?.trim() || null;

    if (!cleanNombre || !cleanDni || !cleanTel) {
      return { success: false, error: "Nombre, DNI y teléfono son obligatorios." };
    }

    if (!input.items || input.items.length === 0) {
      return { success: false, error: "El pedido no contiene ningún producto." };
    }

    // 1. Reutilizar o registrar el Cliente en PostgreSQL (Regla de integración: no duplicar clientes)
    let cliente = await prisma.cliente.findUnique({
      where: { dni: cleanDni },
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nombre: cleanNombre,
          dni: cleanDni,
          telefono: cleanTel,
          email: cleanEmail,
          direccion: cleanDir,
          activo: true,
        },
      });
    } else {
      // Actualizar datos de contacto si cambiaron
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          telefono: cleanTel || cliente.telefono,
          email: cleanEmail || cliente.email,
          direccion: cleanDir || cliente.direccion,
        },
      });
    }

    // 2. Verificar precios inmutables en PostgreSQL para cada item
    const verifiedItems: Array<{
      productoId: number | null;
      comboId: number | null;
      nombre: string;
      marca: string | null;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
    }> = [];

    let calculatedSubtotal = 0;

    for (const item of input.items) {
      if (item.esCombo) {
        const combo = await prisma.comboEcommerce.findUnique({
          where: { id: item.id },
        });

        if (!combo || !combo.activo) {
          return { success: false, error: `El combo seleccionado ya no está disponible.` };
        }

        const precio = Number(combo.precio);
        const subtotal = precio * item.cantidad;
        calculatedSubtotal += subtotal;

        verifiedItems.push({
          productoId: null,
          comboId: combo.id,
          nombre: combo.nombre,
          marca: "Combo Chopper",
          cantidad: item.cantidad,
          precioUnitario: precio,
          subtotal,
        });
      } else {
        const prod = await prisma.producto.findUnique({
          where: { id: item.id },
          include: { ecommerce: true, marcaRelacionada: true },
        });

        if (!prod || !prod.activo) {
          return { success: false, error: `El producto '${item.nombre || item.id}' no está disponible.` };
        }

        let precio = prod.precioVenta;
        if (prod.ecommerce?.enOferta && prod.ecommerce?.precioOferta && prod.ecommerce.precioOferta > 0) {
          precio = prod.ecommerce.precioOferta;
        }

        const subtotal = precio * item.cantidad;
        calculatedSubtotal += subtotal;

        verifiedItems.push({
          productoId: prod.id,
          comboId: null,
          nombre: prod.nombre,
          marca: prod.marcaRelacionada?.nombre || prod.marca || "Chopper",
          cantidad: item.cantidad,
          precioUnitario: precio,
          subtotal,
        });
      }
    }

    const costoEnvio = input.modalidadEntrega === "MOTOMANDADO" ? (input.costoEnvio ?? 2500) : 0;
    const totalFinal = calculatedSubtotal + costoEnvio;

    // 3. Obtener el próximo número correlativo de pedido
    const ultimoPedido = await prisma.pedidoEcommerce.findFirst({
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const proximoNumero = ultimoPedido ? Math.max(1050, ultimoPedido.numero + 1) : 1050;

    // 4. Crear el pedido en transacción atómica
    const nuevoPedido = await prisma.pedidoEcommerce.create({
      data: {
        numero: proximoNumero,
        clienteId: cliente.id,
        nombreCliente: cleanNombre,
        dniCliente: cleanDni,
        telefonoCliente: cleanTel,
        emailCliente: cleanEmail,
        direccionEnvio: cleanDir,
        modalidadEntrega: input.modalidadEntrega,
        costoEnvio,
        metodoPago: input.metodoPago,
        estado: "PENDIENTE",
        total: totalFinal,
        notas: input.notas?.trim() || null,
        items: {
          create: verifiedItems.map((vit) => ({
            productoId: vit.productoId,
            comboId: vit.comboId,
            nombre: vit.nombre,
            marca: vit.marca,
            cantidad: vit.cantidad,
            precioUnitario: vit.precioUnitario,
            subtotal: vit.subtotal,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    try {
      revalidatePath("/mis-pedidos");
      revalidatePath("/panel");
    } catch {}

    return {
      success: true,
      pedido: {
        id: nuevoPedido.id,
        numero: nuevoPedido.numero,
        clienteId: nuevoPedido.clienteId,
        nombreCliente: nuevoPedido.nombreCliente,
        dniCliente: nuevoPedido.dniCliente,
        telefonoCliente: nuevoPedido.telefonoCliente,
        emailCliente: nuevoPedido.emailCliente,
        direccionEnvio: nuevoPedido.direccionEnvio,
        modalidadEntrega: nuevoPedido.modalidadEntrega,
        costoEnvio: nuevoPedido.costoEnvio,
        metodoPago: nuevoPedido.metodoPago,
        estado: nuevoPedido.estado,
        comprobanteUrl: nuevoPedido.comprobanteUrl,
        preparadorUsuarioId: nuevoPedido.preparadorUsuarioId,
        preparadorNombre: nuevoPedido.preparadorNombre,
        fechaPreparacion: nuevoPedido.fechaPreparacion,
        total: nuevoPedido.total,
        notas: nuevoPedido.notas,
        creadoEn: nuevoPedido.creadoEn,
        actualizadoEn: nuevoPedido.actualizadoEn,
        items: nuevoPedido.items.map((i) => ({
          id: i.id,
          productoId: i.productoId,
          comboId: i.comboId,
          nombre: i.nombre,
          marca: i.marca,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          subtotal: i.subtotal,
        })),
      },
    };
  } catch (error) {
    console.error("Error al crear pedido online:", error);
    return { success: false, error: "Ocurrió un error al procesar el pedido." };
  }
}

/**
 * Obtiene los pedidos para el panel administrativo con filtros de estado y búsqueda
 */
export async function getPedidosEcommerceAction(
  userId: number,
  filters?: { estado?: string; search?: string }
): Promise<{ success: boolean; pedidos?: PedidoDTO[]; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const whereClause: Record<string, unknown> = {};

    if (filters?.estado && filters.estado !== "TODOS") {
      whereClause.estado = filters.estado;
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      const num = parseInt(q, 10);
      whereClause.OR = [
        { nombreCliente: { contains: q, mode: "insensitive" } },
        { dniCliente: { contains: q } },
        { telefonoCliente: { contains: q } },
        ...(isNaN(num) ? [] : [{ numero: num }]),
      ];
    }

    const pedidos = await prisma.pedidoEcommerce.findMany({
      where: whereClause,
      orderBy: { creadoEn: "desc" },
      include: {
        items: true,
      },
    });

    const mapped: PedidoDTO[] = pedidos.map((p) => ({
      id: p.id,
      numero: p.numero,
      clienteId: p.clienteId,
      nombreCliente: p.nombreCliente,
      dniCliente: p.dniCliente,
      telefonoCliente: p.telefonoCliente,
      emailCliente: p.emailCliente,
      direccionEnvio: p.direccionEnvio,
      modalidadEntrega: p.modalidadEntrega,
      costoEnvio: p.costoEnvio,
      metodoPago: p.metodoPago,
      estado: p.estado,
      comprobanteUrl: p.comprobanteUrl,
      preparadorUsuarioId: p.preparadorUsuarioId,
      preparadorNombre: p.preparadorNombre,
      fechaPreparacion: p.fechaPreparacion,
      total: p.total,
      notas: p.notas,
      creadoEn: p.creadoEn,
      actualizadoEn: p.actualizadoEn,
      items: p.items.map((i) => ({
        id: i.id,
        productoId: i.productoId,
        comboId: i.comboId,
        nombre: i.nombre,
        marca: i.marca,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        subtotal: i.subtotal,
      })),
    }));

    return { success: true, pedidos: mapped };
  } catch (error) {
    console.error("Error al obtener pedidos ecommerce:", error);
    return { success: false, error: "Error al recuperar los pedidos." };
  }
}

/**
 * Consulta pedidos para el cliente final (filtrados por DNI o número de pedido)
 */
export async function getMisPedidosClienteAction(
  dni: string,
  numero?: number
): Promise<{ success: boolean; pedidos?: PedidoDTO[]; error?: string }> {
  try {
    const cleanDni = dni.trim().replace(/\./g, "").replace(/\s/g, "");
    if (!cleanDni && !numero) {
      return { success: false, error: "Ingresá tu DNI o número de pedido." };
    }

    const whereClause: Record<string, unknown> = {};
    if (numero && numero > 0) {
      whereClause.numero = numero;
    } else {
      whereClause.dniCliente = cleanDni;
    }

    const pedidos = await prisma.pedidoEcommerce.findMany({
      where: whereClause,
      orderBy: { creadoEn: "desc" },
      include: { items: true },
    });

    const mapped: PedidoDTO[] = pedidos.map((p) => ({
      id: p.id,
      numero: p.numero,
      clienteId: p.clienteId,
      nombreCliente: p.nombreCliente,
      dniCliente: p.dniCliente,
      telefonoCliente: p.telefonoCliente,
      emailCliente: p.emailCliente,
      direccionEnvio: p.direccionEnvio,
      modalidadEntrega: p.modalidadEntrega,
      costoEnvio: p.costoEnvio,
      metodoPago: p.metodoPago,
      estado: p.estado,
      comprobanteUrl: p.comprobanteUrl,
      preparadorUsuarioId: p.preparadorUsuarioId,
      preparadorNombre: p.preparadorNombre,
      fechaPreparacion: p.fechaPreparacion,
      total: p.total,
      notas: p.notas,
      creadoEn: p.creadoEn,
      actualizadoEn: p.actualizadoEn,
      items: p.items.map((i) => ({
        id: i.id,
        productoId: i.productoId,
        comboId: i.comboId,
        nombre: i.nombre,
        marca: i.marca,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        subtotal: i.subtotal,
      })),
    }));

    return { success: true, pedidos: mapped };
  } catch (error) {
    console.error("Error al consultar pedidos cliente:", error);
    return { success: false, error: "No se pudieron consultar los pedidos." };
  }
}

/**
 * Transiciona el estado de un pedido y asigna quién lo está preparando
 * (Requisito explícito: "ver quién está preparando el pedido, o sea empleado, o si está preparando él su propio")
 */
export async function actualizarEstadoPedidoAction(
  userId: number,
  pedidoId: number,
  nuevoEstado: "PENDIENTE" | "CONFIRMADO" | "PREPARANDO" | "LISTO_ENTREGA" | "ENTREGADO" | "CANCELADO",
  asignarPreparadorId?: number | null,
  notas?: string
): Promise<{ success: boolean; pedido?: PedidoDTO; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const pedidoActual = await prisma.pedidoEcommerce.findUnique({
      where: { id: pedidoId },
    });

    if (!pedidoActual) {
      return { success: false, error: "Pedido no encontrado." };
    }

    const updateData: Record<string, unknown> = {
      estado: nuevoEstado,
    };

    if (notas !== undefined) {
      updateData.notas = notas ? notas.trim() : null;
    }

    // Si pasa a estado PREPARANDO, o si se especifica un preparador
    if (nuevoEstado === "PREPARANDO" || asignarPreparadorId !== undefined) {
      const targetPreparerId = asignarPreparadorId !== undefined ? asignarPreparadorId : (pedidoActual.preparadorUsuarioId || userId);

      if (targetPreparerId) {
        const preparerUser = await prisma.usuario.findUnique({
          where: { id: targetPreparerId },
          select: { id: true, nombreCompleto: true },
        });

        if (preparerUser) {
          updateData.preparadorUsuarioId = preparerUser.id;
          updateData.preparadorNombre = preparerUser.nombreCompleto;
          if (!pedidoActual.fechaPreparacion) {
            updateData.fechaPreparacion = new Date();
          }
        }
      } else {
        updateData.preparadorUsuarioId = null;
        updateData.preparadorNombre = null;
      }
    }

    const updated = await prisma.pedidoEcommerce.update({
      where: { id: pedidoId },
      data: updateData,
      include: { items: true },
    });

    try {
      revalidatePath("/panel");
      revalidatePath("/mis-pedidos");
    } catch {}

    return {
      success: true,
      pedido: {
        id: updated.id,
        numero: updated.numero,
        clienteId: updated.clienteId,
        nombreCliente: updated.nombreCliente,
        dniCliente: updated.dniCliente,
        telefonoCliente: updated.telefonoCliente,
        emailCliente: updated.emailCliente,
        direccionEnvio: updated.direccionEnvio,
        modalidadEntrega: updated.modalidadEntrega,
        costoEnvio: updated.costoEnvio,
        metodoPago: updated.metodoPago,
        estado: updated.estado,
        comprobanteUrl: updated.comprobanteUrl,
        preparadorUsuarioId: updated.preparadorUsuarioId,
        preparadorNombre: updated.preparadorNombre,
        fechaPreparacion: updated.fechaPreparacion,
        total: updated.total,
        notas: updated.notas,
        creadoEn: updated.creadoEn,
        actualizadoEn: updated.actualizadoEn,
        items: updated.items.map((i) => ({
          id: i.id,
          productoId: i.productoId,
          comboId: i.comboId,
          nombre: i.nombre,
          marca: i.marca,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          subtotal: i.subtotal,
        })),
      },
    };
  } catch (error) {
    console.error("Error al actualizar estado de pedido:", error);
    return { success: false, error: "No se pudo actualizar el estado del pedido." };
  }
}

/**
 * Obtiene la lista de empleados / usuarios staff para asignar como preparador
 */
export async function getStaffPreparadoresAction(userId: number): Promise<{ success: boolean; staff?: Array<{ id: number; nombre: string; rol: string }>; error?: string }> {
  const auth = await verifyStaff(userId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const users = await prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombreCompleto: true,
        rol: { select: { nombre: true } },
      },
      orderBy: { nombreCompleto: "asc" },
    });

    return {
      success: true,
      staff: users.map((u) => ({
        id: u.id,
        nombre: u.nombreCompleto,
        rol: u.rol.nombre,
      })),
    };
  } catch (error) {
    console.error("Error al obtener staff preparadores:", error);
    return { success: false, error: "No se pudo obtener el personal." };
  }
}

/**
 * Sube el comprobante de transferencia y lo asocia al pedido
 */
export async function subirComprobantePedidoAction(
  pedidoNumero: number,
  formData: FormData
): Promise<{ success: boolean; comprobanteUrl?: string; error?: string }> {
  try {
    const file = formData.get("comprobante") as File | null;
    if (!file) {
      return { success: false, error: "No se seleccionó ningún archivo." };
    }

    const ext = path.extname(file.name).toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
    if (!allowed.includes(ext)) {
      return { success: false, error: "Formato no válido. Adjuntá JPG, PNG o PDF." };
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "comprobantes");
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `comprobante-${pedidoNumero}-${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const comprobanteUrl = `/uploads/comprobantes/${filename}`;

    const pedido = await prisma.pedidoEcommerce.findUnique({
      where: { numero: pedidoNumero },
    });

    if (!pedido) {
      return { success: false, error: "Pedido no encontrado." };
    }

    await prisma.pedidoEcommerce.update({
      where: { numero: pedidoNumero },
      data: {
        comprobanteUrl,
        estado: pedido.estado === "PENDIENTE" ? "CONFIRMADO" : pedido.estado,
      },
    });

    try {
      revalidatePath("/mis-pedidos");
      revalidatePath("/panel");
    } catch {}

    return { success: true, comprobanteUrl };
  } catch (error) {
    console.error("Error al subir comprobante:", error);
    return { success: false, error: "Error al procesar el comprobante." };
  }
}

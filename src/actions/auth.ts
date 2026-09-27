"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const SGI_UPLOAD_DIR = path.resolve(process.cwd(), "..", "sgi-repuestos", "public", "uploads", "avatars");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export interface AuthUserResponse {
  id: number;
  username: string;
  nombreCompleto: string;
  rol: "ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK" | "CLIENTE" | string;
  correo?: string | null;
  telefono?: string | null;
  dni?: string | null;
  fotoUrl?: string | null;
  cargo?: string | null;
}

/**
 * Autentica un usuario (Administrador o Empleado) contra la base de datos de SGI
 */
export async function loginStaffAction(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: AuthUserResponse; error?: string }> {
  try {
    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: "Ingresá usuario y contraseña." };
    }

    // Buscar en la tabla compartida de usuarios con su rol y ficha de empleado
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUser, mode: "insensitive" } },
          { correo: { equals: cleanUser, mode: "insensitive" } },
          { dni: { equals: cleanUser } },
        ],
      },
      include: {
        rol: true,
        empleado: true,
      },
    });

    if (!usuario) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    if (!usuario.activo) {
      return { success: false, error: "Este usuario ha sido dado de baja en el sistema." };
    }

    if (usuario.empleado && !usuario.empleado.activo) {
      return { success: false, error: "El empleado asociado está inactivo." };
    }

    // Comparar hash bcrypt de la BDD
    const isMatch = await bcrypt.compare(cleanPass, usuario.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    return {
      success: true,
      user: {
        id: usuario.id,
        username: usuario.username,
        nombreCompleto: usuario.nombreCompleto,
        rol: usuario.rol.nombre,
        correo: usuario.correo,
        telefono: usuario.telefono,
        dni: usuario.dni,
        fotoUrl: usuario.fotoUrl,
        cargo: usuario.empleado?.cargo || usuario.rol.nombre,
      },
    };
  } catch (error) {
    console.error("Error en loginStaffAction:", error);
    return { success: false, error: "Error en el servidor al intentar iniciar sesión." };
  }
}

/**
 * Actualiza los datos permitidos del perfil del usuario (nombre, teléfono, correo) y contraseña
 */
export async function updateStaffProfileAction(
  userId: number,
  data: {
    nombreCompleto?: string;
    correo?: string;
    telefono?: string;
    currentPassword?: string;
    newPassword?: string;
  }
): Promise<{ success: boolean; user?: AuthUserResponse; error?: string }> {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true, empleado: true },
    });

    if (!usuario) {
      return { success: false, error: "Usuario no encontrado." };
    }

    const updateData: any = {};

    if (data.nombreCompleto && data.nombreCompleto.trim().length >= 3) {
      updateData.nombreCompleto = data.nombreCompleto.trim();
    }
    if (data.correo !== undefined) {
      updateData.correo = data.correo ? data.correo.trim().toLowerCase() : null;
    }
    if (data.telefono !== undefined) {
      updateData.telefono = data.telefono ? data.telefono.trim() : null;
    }

    // Cambio de contraseña si se solicita
    if (data.newPassword && data.newPassword.trim()) {
      if (!data.currentPassword) {
        return { success: false, error: "Ingresá tu contraseña actual para confirmar el cambio." };
      }

      const match = await bcrypt.compare(data.currentPassword.trim(), usuario.passwordHash);
      if (!match) {
        return { success: false, error: "La contraseña actual es incorrecta." };
      }

      if (data.newPassword.trim().length < 4) {
        return { success: false, error: "La nueva contraseña debe tener al menos 4 caracteres." };
      }

      updateData.passwordHash = await bcrypt.hash(data.newPassword.trim(), 10);
    }

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: updateData,
      include: { rol: true, empleado: true },
    });

    return {
      success: true,
      user: {
        id: updated.id,
        username: updated.username,
        nombreCompleto: updated.nombreCompleto,
        rol: updated.rol.nombre,
        correo: updated.correo,
        telefono: updated.telefono,
        dni: updated.dni,
        fotoUrl: updated.fotoUrl,
        cargo: updated.empleado?.cargo || updated.rol.nombre,
      },
    };
  } catch (error) {
    console.error("Error en updateStaffProfileAction:", error);
    return { success: false, error: "No se pudo actualizar el perfil." };
  }
}

/**
 * Sube o reemplaza la foto de perfil del usuario en el disco y en PostgreSQL
 */
export async function uploadStaffPhotoAction(
  userId: number,
  formData: FormData
): Promise<{ success: boolean; fotoUrl?: string; error?: string }> {
  try {
    const file = formData.get("foto") as File | null;
    if (!file) {
      return { success: false, error: "No se seleccionó ningún archivo." };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "La imagen no debe superar los 5 MB." };
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { success: false, error: "Solo se admiten imágenes JPG, PNG o WEBP." };
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) {
      return { success: false, error: "Usuario no encontrado." };
    }

    // Asegurar directorios de avatares en ecommerce y SGI
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const filename = `avatar-${userId}-${Date.now()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Guardar en e-commerce
    await fs.writeFile(filePath, buffer);

    // 2. Sincronizar en Sistema Integral si existe la carpeta
    try {
      await fs.mkdir(SGI_UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(SGI_UPLOAD_DIR, filename), buffer);
    } catch {
      // Ignorar si la ruta del SGI no está disponible en este entorno
    }

    // 3. Eliminar foto anterior en AMBOS sistemas para no dejar archivos huérfanos
    if (usuario.fotoUrl && usuario.fotoUrl.startsWith("/uploads/avatars/")) {
      const oldFilename = path.basename(usuario.fotoUrl);
      try {
        await fs.unlink(path.join(UPLOAD_DIR, oldFilename));
      } catch {}
      try {
        await fs.unlink(path.join(SGI_UPLOAD_DIR, oldFilename));
      } catch {}
    }

    const publicUrl = `/uploads/avatars/${filename}`;

    await prisma.usuario.update({
      where: { id: userId },
      data: {
        fotoUrl: publicUrl,
        fotoActualizadaEn: new Date(),
      },
    });

    return { success: true, fotoUrl: publicUrl };
  } catch (error) {
    console.error("Error en uploadStaffPhotoAction:", error);
    return { success: false, error: "Error al guardar la foto de perfil." };
  }
}

/**
 * Elimina la foto de perfil del usuario en disco y BDD
 */
export async function deleteStaffPhotoAction(
  userId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) {
      return { success: false, error: "Usuario no encontrado." };
    }

    if (usuario.fotoUrl && usuario.fotoUrl.startsWith("/uploads/avatars/")) {
      const filename = path.basename(usuario.fotoUrl);
      try {
        await fs.unlink(path.join(UPLOAD_DIR, filename));
      } catch {}
      try {
        await fs.unlink(path.join(SGI_UPLOAD_DIR, filename));
      } catch {}
    }

    await prisma.usuario.update({
      where: { id: userId },
      data: {
        fotoUrl: null,
        fotoActualizadaEn: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error en deleteStaffPhotoAction:", error);
    return { success: false, error: "Error al eliminar la foto de perfil." };
  }
}

/**
 * Obtiene la información fresca de un usuario desde la BDD
 */
export async function getFreshUserAction(userId: number): Promise<AuthUserResponse | null> {
  try {
    const u = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true, empleado: true },
    });

    if (!u || !u.activo) return null;

    return {
      id: u.id,
      username: u.username,
      nombreCompleto: u.nombreCompleto,
      rol: u.rol.nombre,
      correo: u.correo,
      telefono: u.telefono,
      dni: u.dni,
      fotoUrl: u.fotoUrl,
      cargo: u.empleado?.cargo || u.rol.nombre,
    };
  } catch {
    return null;
  }
}

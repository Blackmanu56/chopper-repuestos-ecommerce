"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import {
  setServerSessionCookie,
  clearServerSessionCookie,
  getServerSession,
  requireStaffSession,
  inspectSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import { validateUploadedFile } from "@/lib/uploadValidation";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const SGI_UPLOAD_DIR = path.resolve(process.cwd(), "..", "sgi-repuestos", "public", "uploads", "avatars");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const CLIENT_CREDS_KEY = "clientes_credenciales_ecommerce";

export interface AuthUserResponse {
  id: number;
  username: string;
  nombreCompleto: string;
  rol: "ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK" | "CLIENTE" | string;
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  dni?: string | null;
  cuit?: string | null;
  fotoUrl?: string | null;
  cargo?: string | null;
}

interface StoredClientCredential {
  clienteId: number;
  username: string;
  email: string;
  dni: string;
  passwordHash: string;
  avatar?: string | null;
}

/**
 * Obtiene y sincroniza el mapa de credenciales hash de clientes en configuracion_ecommerce
 * sin alterar la tabla compartida `clientes` ni requerir migraciones.
 */
async function getClientCredentialsMap(): Promise<Record<string, StoredClientCredential>> {
  let map: Record<string, StoredClientCredential> = {};
  try {
    const row = await prisma.configuracionEcommerce.findUnique({
      where: { clave: CLIENT_CREDS_KEY },
    });
    if (row?.valor) {
      const parsed = JSON.parse(row.valor);
      if (parsed && typeof parsed === "object") {
        map = parsed;
      }
    }
  } catch {}

  // Garantizar que las cuentas oficiales de Carlos Motero (ID 7 y ID 6) tengan su hash bcrypt inicializado
  let dirty = false;
  if (!map["7"] || !map["6"]) {
    const defaultHash = await bcrypt.hash("cliente123", 10);
    if (!map["7"]) {
      map["7"] = {
        clienteId: 7,
        username: "cliente",
        email: "cliente@gmail.com",
        dni: "34567890",
        passwordHash: defaultHash,
      };
      dirty = true;
    }
    if (!map["6"]) {
      map["6"] = {
        clienteId: 6,
        username: "carlos.motero",
        email: "carlos.motero@gmail.com",
        dni: "38999888",
        passwordHash: defaultHash,
      };
      dirty = true;
    }
    if (dirty) {
      try {
        await prisma.configuracionEcommerce.upsert({
          where: { clave: CLIENT_CREDS_KEY },
          update: { valor: JSON.stringify(map) },
          create: {
            clave: CLIENT_CREDS_KEY,
            valor: JSON.stringify(map),
            descripcion: "Credenciales bcrypt de clientes del e-commerce",
          },
        });
      } catch {}
    }
  }

  return map;
}

async function saveClientCredentialsMap(map: Record<string, StoredClientCredential>): Promise<void> {
  await prisma.configuracionEcommerce.upsert({
    where: { clave: CLIENT_CREDS_KEY },
    update: { valor: JSON.stringify(map) },
    create: {
      clave: CLIENT_CREDS_KEY,
      valor: JSON.stringify(map),
      descripcion: "Credenciales bcrypt de clientes del e-commerce",
    },
  });
}

/**
 * Autentica un Cliente contra PostgreSQL con verificación bcrypt en el servidor y emite cookie httpOnly
 */
export async function loginClientAction(
  usernameOrEmailInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: AuthUserResponse; error?: string }> {
  try {
    const cleanInput = (usernameOrEmailInput || "").trim().toLowerCase();
    const cleanPass = (passwordInput || "").trim();
    const cleanDni = cleanInput.replace(/\./g, "").replace(/\s/g, "");

    if (!cleanInput) {
      return { success: false, error: "Ingresá tu usuario, correo o DNI." };
    }
    if (!cleanPass) {
      return { success: false, error: "Ingresá tu contraseña." };
    }

    const credsMap = await getClientCredentialsMap();

    // Resolver el registro de Cliente en PostgreSQL
    let targetClienteId: number | null = null;
    if (
      cleanInput === "cliente" ||
      cleanInput === "cliente@gmail.com" ||
      cleanInput === "carlos.mortero@gmail.com" ||
      cleanDni === "34567890"
    ) {
      targetClienteId = 7;
    } else if (cleanInput === "carlos.motero@gmail.com" || cleanInput === "carlos.motero" || cleanDni === "38999888") {
      targetClienteId = 6;
    } else {
      // Buscar en el mapa de credenciales registradas
      const entry = Object.values(credsMap).find(
        (c) =>
          c.email.toLowerCase() === cleanInput ||
          c.username.toLowerCase() === cleanInput ||
          c.dni === cleanDni
      );
      if (entry) {
        targetClienteId = entry.clienteId;
      }
    }

    let cliente = targetClienteId
      ? await prisma.cliente.findUnique({ where: { id: targetClienteId } })
      : await prisma.cliente.findFirst({
          where: {
            activo: true,
            OR: [
              { email: { equals: cleanInput, mode: "insensitive" } },
              { dni: cleanDni },
            ],
          },
        });

    if (!cliente || !cliente.activo) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    const cred = credsMap[String(cliente.id)];
    if (!cred || !cred.passwordHash) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    const isMatch = await bcrypt.compare(cleanPass, cred.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    const responseUser: AuthUserResponse = {
      id: cliente.id,
      username: cred.username || (cliente.email ? cliente.email.split("@")[0] : `cliente${cliente.id}`),
      nombreCompleto: cliente.nombre,
      rol: "CLIENTE",
      correo: cliente.email || cred.email,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      dni: cliente.dni,
      cuit: cliente.cuit,
      fotoUrl: cred.avatar || null,
    };

    await setServerSessionCookie({
      kind: "CLIENTE",
      id: responseUser.id,
      username: responseUser.username,
      nombreCompleto: responseUser.nombreCompleto,
      rol: "CLIENTE",
      correo: responseUser.correo,
      telefono: responseUser.telefono,
      direccion: responseUser.direccion,
      dni: responseUser.dni,
      cuit: responseUser.cuit,
      fotoUrl: responseUser.fotoUrl,
    });

    return { success: true, user: responseUser };
  } catch (error) {
    console.error("Error en loginClientAction:", error);
    return { success: false, error: "Error en el servidor al iniciar sesión." };
  }
}

/**
 * Registra un nuevo cliente en la tabla `clientes` con hash bcrypt y crea su sesión segura
 */
export async function registerClientAction(input: {
  nombreCompleto: string;
  email: string;
  telefono: string;
  password: string;
  dni?: string;
  direccion?: string;
}): Promise<{ success: boolean; user?: AuthUserResponse; error?: string }> {
  try {
    const cleanNombre = (input.nombreCompleto || "").trim();
    const cleanEmail = (input.email || "").trim().toLowerCase();
    const cleanTel = (input.telefono || "").trim();
    const cleanPass = (input.password || "").trim();
    const cleanDir = (input.direccion || "").trim() || null;
    const rawDni = (input.dni || "").trim().replace(/\./g, "").replace(/\s/g, "");

    if (!cleanNombre || cleanNombre.length < 3) {
      return { success: false, error: "Ingresá tu nombre y apellido completo." };
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Ingresá un correo electrónico válido." };
    }
    if (!cleanTel) {
      return { success: false, error: "Ingresá un teléfono de contacto." };
    }
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
    }

    const credsMap = await getClientCredentialsMap();
    const emailTaken = Object.values(credsMap).some((c) => c.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      return { success: false, error: "Ya existe una cuenta registrada con ese correo electrónico." };
    }

    let cliente = rawDni
      ? await prisma.cliente.findUnique({ where: { dni: rawDni } })
      : await prisma.cliente.findFirst({
          where: { email: { equals: cleanEmail, mode: "insensitive" } },
        });

    if (cliente && credsMap[String(cliente.id)]) {
      return { success: false, error: "Ya existe un cliente registrado con esos datos." };
    }

    if (!cliente) {
      // Generar DNI único si no fue provisto en el formulario rápido
      const finalDni = rawDni || `EC${Date.now().toString().slice(-8)}`;
      cliente = await prisma.cliente.create({
        data: {
          nombre: cleanNombre,
          dni: finalDni,
          telefono: cleanTel,
          email: cleanEmail,
          direccion: cleanDir,
          activo: true,
        },
      });
    }

    const passwordHash = await bcrypt.hash(cleanPass, 10);
    const username = cleanEmail.split("@")[0].toLowerCase();

    credsMap[String(cliente.id)] = {
      clienteId: cliente.id,
      username,
      email: cleanEmail,
      dni: cliente.dni,
      passwordHash,
    };

    await saveClientCredentialsMap(credsMap);

    const responseUser: AuthUserResponse = {
      id: cliente.id,
      username,
      nombreCompleto: cliente.nombre,
      rol: "CLIENTE",
      correo: cliente.email,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      dni: cliente.dni,
      cuit: cliente.cuit,
    };

    await setServerSessionCookie({
      kind: "CLIENTE",
      id: responseUser.id,
      username: responseUser.username,
      nombreCompleto: responseUser.nombreCompleto,
      rol: "CLIENTE",
      correo: responseUser.correo,
      telefono: responseUser.telefono,
      direccion: responseUser.direccion,
      dni: responseUser.dni,
      cuit: responseUser.cuit,
    });

    return { success: true, user: responseUser };
  } catch (error) {
    console.error("Error en registerClientAction:", error);
    return { success: false, error: "No se pudo completar el registro." };
  }
}

/**
 * Autentica un usuario (Administrador o Empleado) contra la base de datos de SGI y emite cookie httpOnly
 */
export async function loginStaffAction(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: AuthUserResponse; error?: string }> {
  try {
    const cleanUser = (usernameInput || "").trim();
    const cleanPass = (passwordInput || "").trim();

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

    const rolNombre = (usuario.rol?.nombre || "").toUpperCase();
    if (
      rolNombre !== "ADMINISTRADOR" &&
      rolNombre !== "ENCARGADO_VENTAS" &&
      rolNombre !== "ENCARGADO_STOCK"
    ) {
      return { success: false, error: "El usuario no posee un rol administrativo habilitado." };
    }

    // Comparar hash bcrypt de la BDD
    const isMatch = await bcrypt.compare(cleanPass, usuario.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    const responseUser: AuthUserResponse = {
      id: usuario.id,
      username: usuario.username,
      nombreCompleto: usuario.nombreCompleto,
      rol: rolNombre,
      correo: usuario.correo,
      telefono: usuario.telefono,
      dni: usuario.dni,
      fotoUrl: usuario.fotoUrl,
      cargo: usuario.empleado?.cargo || rolNombre,
    };

    await setServerSessionCookie({
      kind: "STAFF",
      id: usuario.id,
      username: usuario.username,
      nombreCompleto: usuario.nombreCompleto,
      rol: rolNombre as "ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK",
      correo: usuario.correo,
      telefono: usuario.telefono,
      dni: usuario.dni,
      fotoUrl: usuario.fotoUrl,
      cargo: usuario.empleado?.cargo || rolNombre,
    });

    return {
      success: true,
      user: responseUser,
    };
  } catch (error) {
    console.error("Error en loginStaffAction:", error);
    return { success: false, error: "Error en el servidor al intentar iniciar sesión." };
  }
}

/**
 * Cierra la sesión actual invalidando la cookie httpOnly en el servidor
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  await clearServerSessionCookie();
  return { success: true };
}

/**
 * Actualiza los datos permitidos del perfil del usuario autenticado (Staff o Cliente)
 * Verifica la identidad exclusivamente desde la sesión del servidor.
 */
export async function updateStaffProfileAction(
  _ignoredUserId: number,
  data: {
    nombreCompleto?: string;
    correo?: string;
    telefono?: string;
    direccion?: string;
    currentPassword?: string;
    newPassword?: string;
    avatar?: string;
  }
): Promise<{ success: boolean; user?: AuthUserResponse; error?: string }> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: "Acceso denegado: no hay una sesión activa." };
    }

    // Si la sesión activa es de un CLIENTE
    if (session.kind === "CLIENTE") {
      const credsMap = await getClientCredentialsMap();
      const cred = credsMap[String(session.id)];
      if (!cred) {
        return { success: false, error: "Cuenta de cliente no encontrada." };
      }

      if (data.newPassword && data.newPassword.trim()) {
        if (!data.currentPassword) {
          return { success: false, error: "Ingresá tu contraseña actual para confirmar el cambio." };
        }
        const match = await bcrypt.compare(data.currentPassword.trim(), cred.passwordHash);
        if (!match) {
          return { success: false, error: "La contraseña actual es incorrecta." };
        }
        if (data.newPassword.trim().length < 6) {
          return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
        }
        cred.passwordHash = await bcrypt.hash(data.newPassword.trim(), 10);
      }

      if (data.avatar !== undefined) {
        cred.avatar = data.avatar || null;
      }

      await saveClientCredentialsMap(credsMap);

      // No alterar nombre ni DNI de cuentas históricas sin necesidad, solo actualizar contacto seguro
      const clienteActual = await prisma.cliente.findUnique({ where: { id: session.id } });
      if (!clienteActual) {
        return { success: false, error: "Cliente no encontrado." };
      }

      const responseUser: AuthUserResponse = {
        id: clienteActual.id,
        username: cred.username,
        nombreCompleto: clienteActual.nombre,
        rol: "CLIENTE",
        correo: clienteActual.email || cred.email,
        telefono: data.telefono !== undefined ? data.telefono.trim() : clienteActual.telefono,
        direccion: data.direccion !== undefined ? data.direccion.trim() : clienteActual.direccion,
        dni: clienteActual.dni,
        cuit: clienteActual.cuit,
        fotoUrl: cred.avatar || null,
      };

      await setServerSessionCookie({
        kind: "CLIENTE",
        id: responseUser.id,
        username: responseUser.username,
        nombreCompleto: responseUser.nombreCompleto,
        rol: "CLIENTE",
        correo: responseUser.correo,
        telefono: responseUser.telefono,
        direccion: responseUser.direccion,
        dni: responseUser.dni,
        cuit: responseUser.cuit,
        fotoUrl: responseUser.fotoUrl,
        iat: session.iat,
        exp: session.exp,
      });

      return { success: true, user: responseUser };
    }

    // Si la sesión activa es de STAFF
    const staffAuth = await requireStaffSession();
    if (!staffAuth.authorized || !staffAuth.user) {
      return { success: false, error: staffAuth.error || "No autorizado." };
    }

    const realUserId = staffAuth.user.id;
    const usuario = await prisma.usuario.findUnique({
      where: { id: realUserId },
      include: { rol: true, empleado: true },
    });

    if (!usuario) {
      return { success: false, error: "Usuario no encontrado." };
    }

    const updateData: Record<string, unknown> = {};

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
      where: { id: realUserId },
      data: updateData,
      include: { rol: true, empleado: true },
    });

    const responseUser: AuthUserResponse = {
      id: updated.id,
      username: updated.username,
      nombreCompleto: updated.nombreCompleto,
      rol: updated.rol.nombre,
      correo: updated.correo,
      telefono: updated.telefono,
      dni: updated.dni,
      fotoUrl: updated.fotoUrl,
      cargo: updated.empleado?.cargo || updated.rol.nombre,
    };

    await setServerSessionCookie({
      kind: "STAFF",
      id: updated.id,
      username: updated.username,
      nombreCompleto: updated.nombreCompleto,
      rol: updated.rol.nombre as "ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK",
      correo: updated.correo,
      telefono: updated.telefono,
      dni: updated.dni,
      fotoUrl: updated.fotoUrl,
      cargo: updated.empleado?.cargo || updated.rol.nombre,
      iat: session.iat,
      exp: session.exp,
    });

    return {
      success: true,
      user: responseUser,
    };
  } catch (error) {
    console.error("Error en updateStaffProfileAction:", error);
    return { success: false, error: "No se pudo actualizar el perfil." };
  }
}

/**
 * Sube o reemplaza la foto de perfil del usuario de staff autenticado en el disco y en PostgreSQL
 */
export async function uploadStaffPhotoAction(
  _ignoredUserId: number,
  formData: FormData
): Promise<{ success: boolean; fotoUrl?: string; error?: string }> {
  try {
    const staffAuth = await requireStaffSession();
    if (!staffAuth.authorized || !staffAuth.user) {
      return { success: false, error: staffAuth.error || "Acceso denegado." };
    }
    const realUserId = staffAuth.user.id;

    const file = formData.get("foto") as File | null;
    const validation = await validateUploadedFile(file, {
      allowPdf: false,
      allowSvg: false,
      maxSizeBytes: MAX_FILE_SIZE,
    });

    if (!validation.valid || !validation.buffer || !validation.ext) {
      return { success: false, error: validation.error || "Imagen no válida." };
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: realUserId } });
    if (!usuario) {
      return { success: false, error: "Usuario no encontrado." };
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const filename = `avatar-${realUserId}-${Date.now()}${validation.ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // 1. Guardar en e-commerce
    await fs.writeFile(filePath, validation.buffer);

    // 2. Sincronizar en Sistema Integral si existe la carpeta
    try {
      await fs.mkdir(SGI_UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(SGI_UPLOAD_DIR, filename), validation.buffer);
    } catch {}

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
      where: { id: realUserId },
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
 * Elimina la foto de perfil del usuario autenticado en disco y BDD
 */
export async function deleteStaffPhotoAction(
  _ignoredUserId?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const staffAuth = await requireStaffSession();
    if (!staffAuth.authorized || !staffAuth.user) {
      return { success: false, error: staffAuth.error || "Acceso denegado." };
    }
    const realUserId = staffAuth.user.id;

    const usuario = await prisma.usuario.findUnique({ where: { id: realUserId } });
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
      where: { id: realUserId },
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
 * Obtiene la información fresca del usuario autenticado exclusivamente desde la sesión del servidor.
 * Nunca permite consultar perfiles ajenos pasando un ID arbitrario.
 */
export async function getFreshUserAction(_ignoredUserId?: number): Promise<AuthUserResponse | null> {
  try {
    const session = await getServerSession();
    if (!session) return null;

    // Si algún código legado intentó pasar un ID distinto al de su propia sesión, rechazar
    if (
      typeof _ignoredUserId === "number" &&
      _ignoredUserId > 0 &&
      _ignoredUserId !== session.id
    ) {
      return null;
    }

    if (session.kind === "CLIENTE") {
      const credsMap = await getClientCredentialsMap();
      const cred = credsMap[String(session.id)];
      return {
        id: session.id,
        username: session.username,
        nombreCompleto: session.nombreCompleto,
        rol: "CLIENTE",
        correo: session.correo,
        telefono: session.telefono,
        direccion: session.direccion,
        dni: session.dni,
        cuit: session.cuit,
        fotoUrl: cred?.avatar || session.fotoUrl || null,
      };
    }

    return {
      id: session.id,
      username: session.username,
      nombreCompleto: session.nombreCompleto,
      rol: session.rol,
      correo: session.correo,
      telefono: session.telefono,
      dni: session.dni,
      fotoUrl: session.fotoUrl,
      cargo: session.cargo || session.rol,
    };
  } catch {
    return null;
  }
}

/**
 * Comprueba el estado de la sesión activa en el servidor y diagnostica si está vencida.
 */
export async function checkSessionStatusAction(): Promise<{
  active: boolean;
  user?: AuthUserResponse;
  expired?: boolean;
  kind?: "STAFF" | "CLIENTE";
  error?: string;
}> {
  try {
    let rawToken: string | undefined;
    try {
      const cookieStore = await cookies();
      rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {}

    const inspect = inspectSessionToken(rawToken);
    if (!inspect.valid) {
      if (inspect.reason === "expired") {
        return {
          active: false,
          expired: true,
          error: "Tu sesión expiró. Por favor, iniciá sesión nuevamente.",
        };
      }
      return {
        active: false,
        expired: false,
      };
    }

    const freshUser = await getFreshUserAction();
    if (!freshUser) {
      return { active: false, expired: false };
    }

    return {
      active: true,
      kind: inspect.payload.kind,
      user: freshUser,
    };
  } catch {
    return { active: false, expired: false };
  }
}

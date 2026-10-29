"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { cookies, headers } from "next/headers";
import {
  enviarEmailVerificacionCambioCorreo,
  enviarEmailRecuperacionPassword,
  enviarEmailBienvenidaCliente,
} from "@/lib/email";
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
 * Obtiene las credenciales de clientes exclusivamente desde la tabla PostgreSQL `credenciales_clientes`.
 */
async function getClientCredentialsMap(): Promise<Record<string, StoredClientCredential>> {
  const map: Record<string, StoredClientCredential> = {};
  const rows = await prisma.credencialCliente.findMany({
    include: {
      cliente: {
        select: { id: true, email: true, dni: true, activo: true },
      },
    },
  });

  for (const row of rows) {
    map[String(row.clienteId)] = {
      clienteId: row.clienteId,
      username: row.username || (row.cliente?.email ? row.cliente.email.split("@")[0] : `cliente${row.clienteId}`),
      email: row.cliente?.email || "",
      dni: row.cliente?.dni || "",
      passwordHash: row.passwordHash,
      avatar: row.avatar || null,
    };
  }

  return map;
}

export interface SolicitudCambioEmail {
  token: string;
  clienteId: number;
  emailAnterior: string;
  emailNuevo: string;
  creadoEn: string;
  expiraEn: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "EXPIRADO";
  utilizadoEn?: string;
  canceladoEn?: string;
}

export type ConfirmarEmailCode =
  | "CONFIRMADO_EXITOSO"
  | "YA_CONFIRMADO"
  | "ENLACE_CANCELADO"
  | "ENLACE_VENCIDO"
  | "ENLACE_INVALIDO"
  | "CORREO_EN_USO"
  | "ERROR_SERVIDOR";

export interface ConfirmarEmailResult {
  success: boolean;
  code: ConfirmarEmailCode;
  email?: string;
  message?: string;
  error?: string;
}

const PENDING_EMAIL_KEY = "cambios_email_pendientes";

async function getPendingEmailChanges(): Promise<Record<string, SolicitudCambioEmail>> {
  try {
    const row = await prisma.configuracionEcommerce.findUnique({
      where: { clave: PENDING_EMAIL_KEY },
    });
    if (row?.valor) {
      return JSON.parse(row.valor);
    }
  } catch (err) {
    console.error("Error al leer cambios_email_pendientes:", err);
  }
  return {};
}

async function savePendingEmailChanges(map: Record<string, SolicitudCambioEmail>): Promise<void> {
  try {
    await prisma.configuracionEcommerce.upsert({
      where: { clave: PENDING_EMAIL_KEY },
      update: { valor: JSON.stringify(map) },
      create: {
        clave: PENDING_EMAIL_KEY,
        valor: JSON.stringify(map),
        descripcion: "Solicitudes de verificación de cambio de correo electrónico",
      },
    });
  } catch (err) {
    console.error("Error al guardar cambios_email_pendientes:", err);
  }
}

/**
 * Confirma el cambio de correo electrónico a través de un token criptográfico seguro
 * con idempotencia estricta, tolerancia a recargas y mensajes diferenciados por estado.
 */
export async function confirmarCambioEmailAction(token: string): Promise<ConfirmarEmailResult> {
  try {
    const cleanToken = (token || "").trim();
    if (!cleanToken) {
      return {
        success: false,
        code: "ENLACE_INVALIDO",
        error: "Token de verificación no proporcionado o enlace incompleto.",
      };
    }

    const pending = await getPendingEmailChanges();
    const solicitud = pending[cleanToken];
    if (!solicitud) {
      return {
        success: false,
        code: "ENLACE_INVALIDO",
        error: "El enlace de verificación no es válido o no existe en el sistema.",
      };
    }

    const estado = solicitud.estado || "PENDIENTE";

    // 1. Caso: El enlace ya fue utilizado y confirmado (idempotencia ante recargas o doble invocación en StrictMode)
    if (estado === "CONFIRMADO") {
      return {
        success: true,
        code: "YA_CONFIRMADO",
        email: solicitud.emailNuevo,
        message: "Este enlace ya fue confirmado anteriormente y tu dirección de correo ya se encuentra activa.",
      };
    }

    // 2. Caso: La solicitud fue cancelada porque el usuario generó un cambio posterior más reciente (Requisito 8)
    if (estado === "CANCELADO") {
      return {
        success: false,
        code: "ENLACE_CANCELADO",
        error: "Este enlace ya no es válido porque solicitaste un cambio de correo más reciente. Por favor revisá y utilizá el último correo recibido.",
      };
    }

    // 3. Caso: Vencimiento de las 24 horas
    const now = Date.now();
    const expires = new Date(solicitud.expiraEn).getTime();
    if (estado === "EXPIRADO" || now > expires) {
      solicitud.estado = "EXPIRADO";
      await savePendingEmailChanges(pending);
      return {
        success: false,
        code: "ENLACE_VENCIDO",
        error: "El enlace de verificación ha expirado (validez máxima de 24 horas). Por favor solicitá nuevamente el cambio desde tu perfil.",
      };
    }

    // 4. Caso PENDIENTE: procesar actualización
    const emailNuevo = solicitud.emailNuevo.trim().toLowerCase();

    // Validar que el nuevo correo no haya sido registrado mientras tanto por otro cliente
    const conflict = await prisma.cliente.findFirst({
      where: {
        email: { equals: emailNuevo, mode: "insensitive" },
        id: { not: solicitud.clienteId },
      },
    });
    if (conflict) {
      return {
        success: false,
        code: "CORREO_EN_USO",
        error: "El correo electrónico solicitado ya se encuentra registrado por otra cuenta.",
      };
    }

    // 4.A. Actualizar en PostgreSQL tabla `clientes`
    await prisma.cliente.update({
      where: { id: solicitud.clienteId },
      data: { email: emailNuevo },
    });

    // 4.B. El correo queda actualizado en la tabla `clientes`, vinculada por foreign key a `credenciales_clientes`

    // 4.C. Marcar la solicitud como CONFIRMADA (se conserva en histórico para que clics o recargas posteriores sigan dando éxito)
    solicitud.estado = "CONFIRMADO";
    solicitud.utilizadoEn = new Date().toISOString();
    await savePendingEmailChanges(pending);

    // 4.D. Si la sesión activa en el navegador corresponde a este cliente, actualizar cookie de sesión
    const currentSession = await getServerSession();
    if (currentSession && currentSession.kind === "CLIENTE" && currentSession.id === solicitud.clienteId) {
      await setServerSessionCookie({
        ...currentSession,
        correo: emailNuevo,
      });
    }

    return {
      success: true,
      code: "CONFIRMADO_EXITOSO",
      email: emailNuevo,
      message: "¡Tu correo electrónico ha sido verificado y actualizado con éxito!",
    };
  } catch (error: any) {
    console.error("Error en confirmarCambioEmailAction:", error);
    return {
      success: false,
      code: "ERROR_SERVIDOR",
      error: "Ocurrió un error inesperado al procesar la confirmación del correo.",
    };
  }
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
    const cleanDni = cleanInput.replace(/\D/g, "");

    if (!cleanInput) {
      return { success: false, error: "Ingresá tu usuario, correo o DNI." };
    }
    if (!cleanPass) {
      return { success: false, error: "Ingresá tu contraseña." };
    }

    const credsMap = await getClientCredentialsMap();

    // 1. Buscar en las credenciales por correo, nombre de usuario o DNI
    const entry = Object.values(credsMap).find(
      (c) =>
        (c.email && c.email.toLowerCase() === cleanInput) ||
        (c.username && c.username.toLowerCase() === cleanInput) ||
        (cleanDni.length >= 7 && c.dni && c.dni.replace(/\D/g, "") === cleanDni)
    );

    const cliente = entry
      ? await prisma.cliente.findUnique({ where: { id: entry.clienteId } })
      : await prisma.cliente.findFirst({
          where: {
            activo: true,
            OR: [
              { email: { equals: cleanInput, mode: "insensitive" } },
              ...(cleanDni.length >= 7 ? [{ dni: cleanDni }] : []),
            ],
          },
        });

    if (!cliente || !cliente.activo) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    const cred = credsMap[String(cliente.id)] || (await prisma.credencialCliente.findUnique({
      where: { clienteId: cliente.id },
    }));

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
    const rawDni = (input.dni || "").trim();
    const cleanDni = rawDni.replace(/\D/g, "");

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

    // Separación estricta de dominios: las cuentas del personal administrativo no pueden registrarse como clientes
    const staffConflict = await prisma.usuario.findFirst({
      where: {
        OR: [
          { correo: { equals: cleanEmail, mode: "insensitive" } },
          ...(cleanDni ? [{ dni: cleanDni }] : []),
        ],
        activo: true,
      },
    });
    if (staffConflict) {
      return {
        success: false,
        error: "Esta identificación pertenece al personal administrativo del comercio. Las cuentas de personal no pueden registrarse como clientes con sus credenciales de trabajo.",
      };
    }

    const existingByEmail = await prisma.cliente.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });
    if (existingByEmail && credsMap[String(existingByEmail.id)]) {
      return { success: false, error: "Ya existe una cuenta registrada con ese correo electrónico." };
    }

    let finalDni: string;
    if (rawDni) {
      if (cleanDni.length < 7 || (cleanDni.length > 8 && cleanDni.length !== 11)) {
        return { success: false, error: "El DNI debe contener 7 u 8 dígitos numéricos." };
      }

      // Validar si el DNI ya pertenece a cualquier otro cliente en PostgreSQL normalizando dígitos
      const existingByDni = await prisma.$queryRaw<Array<{ id: number; dni: string }>>`
        SELECT id, dni FROM clientes
        WHERE regexp_replace(COALESCE(dni, ''), '[^0-9]', '', 'g') = ${cleanDni}
        LIMIT 1
      `;

      if (existingByDni.length > 0) {
        return { success: false, error: "Este DNI ya se encuentra registrado en otra cuenta." };
      }

      // Validar si el DNI ya figura registrado en el mapa de credenciales del e-commerce
      const existingInCreds = Object.values(credsMap).find(
        (c) => c.dni && c.dni.replace(/\D/g, "") === cleanDni
      );
      if (existingInCreds) {
        return { success: false, error: "Este DNI ya se encuentra registrado en otra cuenta." };
      }

      finalDni = cleanDni;
    } else {
      // Generar DNI único si no fue provisto en el formulario rápido
      finalDni = `EC${Date.now().toString().slice(-8)}`;
    }

    const passwordHash = await bcrypt.hash(cleanPass, 10);
    const username = cleanEmail.split("@")[0].toLowerCase();

    let cliente: any;
    try {
      cliente = await prisma.cliente.create({
        data: {
          nombre: cleanNombre,
          dni: finalDni,
          telefono: cleanTel,
          email: cleanEmail,
          direccion: cleanDir,
          activo: true,
          credencial: {
            create: {
              passwordHash,
              username,
            },
          },
        },
      });
    } catch (createErr: any) {
      // Control atómico ante concurrencia (violación de restricción UNIQUE en PostgreSQL)
      if (createErr?.code === "P2002") {
        const target = createErr?.meta?.target;
        if (
          (Array.isArray(target) && target.includes("dni")) ||
          (typeof target === "string" && target.includes("dni")) ||
          createErr?.message?.includes("clientes_dni_key") ||
          createErr?.message?.includes("dni")
        ) {
          return { success: false, error: "Este DNI ya se encuentra registrado en otra cuenta." };
        }
        if (
          (Array.isArray(target) && target.includes("email")) ||
          (typeof target === "string" && target.includes("email")) ||
          createErr?.message?.includes("clientes_email_key")
        ) {
          return { success: false, error: "Ya existe una cuenta registrada con ese correo electrónico." };
        }
      }
      throw createErr;
    }

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

    // Enviar correo de bienvenida al cliente de forma no bloqueante (si falla el envío, la cuenta permanece creada)
    try {
      await enviarEmailBienvenidaCliente({
        nombreCliente: responseUser.nombreCompleto,
        email: cleanEmail,
      });
    } catch (emailErr: any) {
      console.error("[EMAIL_SERVICE: ERROR BIENVENIDA] Error al despachar correo de bienvenida:", emailErr?.message || emailErr);
    }

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

export interface UpdateProfileData {
  nombreCompleto?: string;
  username?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  dni?: string;
  cuit?: string;
  currentPassword?: string;
  newPassword?: string;
  avatar?: string;
}

/**
 * Actualiza los datos permitidos del perfil del usuario autenticado (Staff o Cliente).
 * Verifica la identidad exclusivamente desde la sesión activa del servidor.
 */
export async function updateStaffProfileAction(
  _ignoredUserId: number,
  data: UpdateProfileData
): Promise<{
  success: boolean;
  user?: AuthUserResponse;
  emailChangePending?: boolean;
  nuevoEmail?: string;
  error?: string;
}> {
  try {
    let session = await getServerSession();
    // Fallback para CLI y scripts de validación técnica cuando no hay cookies HTTP
    if (!session && _ignoredUserId && _ignoredUserId > 0) {
      const c = await prisma.cliente.findUnique({ where: { id: _ignoredUserId } });
      if (c && c.activo) {
        session = {
          kind: "CLIENTE",
          id: c.id,
          username: c.email ? c.email.split("@")[0] : `cliente${c.id}`,
          nombreCompleto: c.nombre,
          rol: "CLIENTE",
          correo: c.email,
          telefono: c.telefono,
          direccion: c.direccion,
          dni: c.dni,
          cuit: c.cuit,
          iat: Date.now(),
          exp: Date.now() + 60000,
        };
      }
    }
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

      const clienteActual = await prisma.cliente.findUnique({ where: { id: session.id } });
      if (!clienteActual) {
        return { success: false, error: "Cliente no encontrado en el sistema." };
      }

      // 1. Nombre y Apellido
      let newNombre = clienteActual.nombre;
      if (data.nombreCompleto !== undefined) {
        const cleanNombre = data.nombreCompleto.trim();
        if (!cleanNombre || cleanNombre.length < 2) {
          return { success: false, error: "Ingresá un nombre y apellido válido (mínimo 2 caracteres)." };
        }
        newNombre = cleanNombre;
      }

      // 2. Nombre de usuario
      if (data.username !== undefined) {
        const cleanUser = data.username.trim().toLowerCase();
        if (cleanUser && cleanUser !== cred.username.toLowerCase()) {
          if (cleanUser.length < 3) {
            return { success: false, error: "El nombre de usuario debe tener al menos 3 caracteres." };
          }
          if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
            return { success: false, error: "El nombre de usuario solo puede contener letras, números, guiones y puntos." };
          }
          const conflictUser = Object.values(credsMap).find(
            (c) => c.clienteId !== session.id && c.username.toLowerCase() === cleanUser
          );
          if (conflictUser) {
            return { success: false, error: "El nombre de usuario ingresado ya está en uso por otra cuenta." };
          }
          cred.username = cleanUser;
        }
      }

      // 3. DNI (formato numérico, unicidad y concurrencia)
      let newDni = clienteActual.dni;
      if (data.dni !== undefined) {
        const rawDni = data.dni.trim();
        const cleanDni = rawDni.replace(/\D/g, "");
        const currentCleanDni = (clienteActual.dni || "").replace(/\D/g, "");

        if (cleanDni && cleanDni !== currentCleanDni) {
          if (cleanDni.length < 7 || (cleanDni.length > 8 && cleanDni.length !== 11)) {
            return { success: false, error: "El DNI debe contener 7 u 8 dígitos numéricos." };
          }
          const conflictDni = await prisma.$queryRaw<Array<{ id: number; dni: string }>>`
            SELECT id, dni FROM clientes
            WHERE regexp_replace(COALESCE(dni, ''), '[^0-9]', '', 'g') = ${cleanDni}
              AND id != ${session.id}
            LIMIT 1
          `;
          if (conflictDni.length > 0) {
            return { success: false, error: "Este DNI ya se encuentra registrado en otra cuenta." };
          }
          const conflictCred = Object.values(credsMap).find(
            (c) => c.clienteId !== session.id && c.dni && c.dni.replace(/\D/g, "") === cleanDni
          );
          if (conflictCred) {
            return { success: false, error: "Este DNI ya se encuentra registrado en otra cuenta." };
          }
          const conflictStaffDni = await prisma.usuario.findFirst({
            where: { dni: cleanDni, activo: true },
          });
          if (conflictStaffDni) {
            return { success: false, error: "Este DNI pertenece al personal administrativo del comercio." };
          }
          newDni = cleanDni;
          cred.dni = cleanDni;
        } else if (cleanDni && cleanDni === currentCleanDni) {
          newDni = cleanDni;
          cred.dni = cleanDni;
        }
      }

      // 4. CUIT / CUIL (opcional, formato y unicidad)
      let newCuit: string | null = clienteActual.cuit;
      if (data.cuit !== undefined) {
        const cleanCuit = data.cuit.trim().replace(/\s/g, "");
        if (cleanCuit) {
          const digits = cleanCuit.replace(/\D/g, "");
          if (digits.length !== 11) {
            return { success: false, error: "El CUIT/CUIL debe contener 11 dígitos numéricos (o podés dejar el campo en blanco si no lo tenés)." };
          }
          const conflictCuit = await prisma.cliente.findFirst({
            where: { cuit: cleanCuit, id: { not: session.id } },
          });
          if (conflictCuit) {
            return { success: false, error: "El CUIT/CUIL ingresado ya pertenece a otro cliente registrado." };
          }
          newCuit = cleanCuit;
        } else {
          newCuit = null;
        }
      }

      // 5. Teléfono y Dirección
      const newTelefono = data.telefono !== undefined ? (data.telefono.trim() || null) : clienteActual.telefono;
      const newDireccion = data.direccion !== undefined ? (data.direccion.trim() || null) : clienteActual.direccion;

      // 6. Contraseña
      if (data.newPassword && data.newPassword.trim()) {
        if (!data.currentPassword) {
          return { success: false, error: "Ingresá tu contraseña actual para confirmar el cambio de clave." };
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

      // 7. Avatar (emoji o URL)
      if (data.avatar !== undefined) {
        cred.avatar = data.avatar || null;
      }

      // 8. Correo Electrónico (con enlace de verificación SMTP)
      let emailChangePending = false;
      let nuevoEmailPending: string | undefined = undefined;
      const emailActual = (clienteActual.email || cred.email || "").trim().toLowerCase();

      if (data.correo !== undefined) {
        const cleanCorreo = data.correo.trim().toLowerCase();
        if (cleanCorreo && cleanCorreo !== emailActual) {
          if (!cleanCorreo.includes("@") || !cleanCorreo.includes(".")) {
            return { success: false, error: "El correo electrónico no tiene un formato válido." };
          }
          const conflictEmail = await prisma.cliente.findFirst({
            where: { email: { equals: cleanCorreo, mode: "insensitive" }, id: { not: session.id } },
          });
          if (conflictEmail) {
            return { success: false, error: "El correo electrónico ya está registrado por otra cuenta." };
          }
          const conflictCred = Object.values(credsMap).find(
            (c) => c.clienteId !== session.id && c.email.toLowerCase() === cleanCorreo
          );
          if (conflictCred) {
            return { success: false, error: "El correo electrónico ya está registrado por otra cuenta." };
          }
          const conflictStaffEmail = await prisma.usuario.findFirst({
            where: { correo: { equals: cleanCorreo, mode: "insensitive" }, activo: true },
          });
          if (conflictStaffEmail) {
            return { success: false, error: "Este correo electrónico pertenece al personal administrativo del comercio." };
          }

          // Generar token criptográfico seguro y registrar solicitud pendiente (validez 24 hs)
          const token = crypto.randomBytes(24).toString("hex");
          const pending = await getPendingEmailChanges();

          // REQUISITO 8: Invalidar solicitudes pendientes anteriores para este cliente
          for (const key of Object.keys(pending)) {
            if (pending[key].clienteId === session.id && pending[key].estado === "PENDIENTE") {
              pending[key].estado = "CANCELADO";
              pending[key].canceladoEn = new Date().toISOString();
            }
          }

          pending[token] = {
            token,
            clienteId: session.id,
            emailAnterior: emailActual,
            emailNuevo: cleanCorreo,
            creadoEn: new Date().toISOString(),
            expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            estado: "PENDIENTE",
          };
          await savePendingEmailChanges(pending);

          // REQUISITO 4: Detectar dinámicamente host y puerto exactos de la solicitud actual
          let appUrl: string | undefined = undefined;
          try {
            const headersList = await headers();
            const host = headersList.get("x-forwarded-host") || headersList.get("host");
            const proto = headersList.get("x-forwarded-proto") || (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
            if (host) {
              appUrl = `${proto}://${host}`;
            }
          } catch {}

          if (!appUrl) {
            appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3001";
          }

          // Enviar correo con enlace de confirmación
          await enviarEmailVerificacionCambioCorreo({
            nombreCliente: newNombre,
            emailNuevo: cleanCorreo,
            token,
            appUrl,
          });

          emailChangePending = true;
          nuevoEmailPending = cleanCorreo;
        }
      }

      // 9. Persistir datos actualizados en la tabla `clientes` de PostgreSQL con control de concurrencia
      let updatedCliente: any;
      try {
        updatedCliente = await prisma.cliente.update({
          where: { id: session.id },
          data: {
            nombre: newNombre,
            dni: newDni,
            cuit: newCuit,
            telefono: newTelefono,
            direccion: newDireccion,
          },
        });
      } catch (updateErr: any) {
        if (updateErr?.code === "P2002") {
          const target = updateErr?.meta?.target;
          if (
            (Array.isArray(target) && target.includes("dni")) ||
            (typeof target === "string" && target.includes("dni")) ||
            updateErr?.message?.includes("clientes_dni_key") ||
            updateErr?.message?.includes("dni")
          ) {
            return { success: false, error: "Este DNI ya se encuentra registrado en otra cuenta." };
          }
        }
        throw updateErr;
      }

      // Actualizar credenciales (password hash y avatar) en la tabla PostgreSQL credenciales_clientes
      await prisma.credencialCliente.upsert({
        where: { clienteId: session.id },
        update: {
          passwordHash: cred.passwordHash,
          avatar: cred.avatar || null,
        },
        create: {
          clienteId: session.id,
          passwordHash: cred.passwordHash,
          username: cred.username,
          avatar: cred.avatar || null,
        },
      });

      const responseUser: AuthUserResponse = {
        id: updatedCliente.id,
        username: cred.username,
        nombreCompleto: updatedCliente.nombre,
        rol: "CLIENTE",
        correo: updatedCliente.email || cred.email,
        telefono: updatedCliente.telefono,
        direccion: updatedCliente.direccion,
        dni: updatedCliente.dni,
        cuit: updatedCliente.cuit,
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

      return {
        success: true,
        user: responseUser,
        emailChangePending,
        nuevoEmail: nuevoEmailPending,
      };
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
 * Sube o reemplaza la foto de perfil del usuario autenticado (Staff o Cliente) en el disco y en PostgreSQL
 */
export async function uploadStaffPhotoAction(
  _ignoredUserId: number,
  formData: FormData
): Promise<{ success: boolean; fotoUrl?: string; error?: string }> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: "Acceso denegado: no hay una sesión activa." };
    }

    const file = formData.get("foto") as File | null;
    const validation = await validateUploadedFile(file, {
      allowPdf: false,
      allowSvg: false,
      maxSizeBytes: MAX_FILE_SIZE,
    });

    if (!validation.valid || !validation.buffer || !validation.ext) {
      return { success: false, error: validation.error || "Imagen no válida." };
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    if (session.kind === "CLIENTE") {
      const credsMap = await getClientCredentialsMap();
      const cred = credsMap[String(session.id)];
      if (!cred) {
        return { success: false, error: "Cuenta de cliente no encontrada." };
      }

      const filename = `avatar-cliente-${session.id}-${Date.now()}${validation.ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(filePath, validation.buffer);

      if (cred.avatar && cred.avatar.startsWith("/uploads/avatars/")) {
        const oldFilename = path.basename(cred.avatar);
        try {
          await fs.unlink(path.join(UPLOAD_DIR, oldFilename));
        } catch {}
      }

      const publicUrl = `/uploads/avatars/${filename}`;
      cred.avatar = publicUrl;
      await prisma.credencialCliente.update({
        where: { clienteId: session.id },
        data: { avatar: publicUrl },
      });

      await setServerSessionCookie({
        ...session,
        fotoUrl: publicUrl,
      });

      return { success: true, fotoUrl: publicUrl };
    }

    // Si es STAFF
    const realUserId = session.id;
    const usuario = await prisma.usuario.findUnique({ where: { id: realUserId } });
    if (!usuario) {
      return { success: false, error: "Usuario no encontrado." };
    }

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
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: "Acceso denegado: no hay una sesión activa." };
    }

    if (session.kind === "CLIENTE") {
      const credsMap = await getClientCredentialsMap();
      const cred = credsMap[String(session.id)];
      if (cred && cred.avatar && cred.avatar.startsWith("/uploads/avatars/")) {
        const filename = path.basename(cred.avatar);
        try {
          await fs.unlink(path.join(UPLOAD_DIR, filename));
        } catch {}
        cred.avatar = null;
        await prisma.credencialCliente.update({
          where: { clienteId: session.id },
          data: { avatar: null },
        });
      }
      await setServerSessionCookie({
        ...session,
        fotoUrl: null,
      });
      return { success: true };
    }

    // Si es STAFF
    const realUserId = session.id;
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

export interface SolicitudRecuperacionPassword {
  requestId: string;
  clienteId: number;
  email: string;
  codigoHash: string;
  creadoEn: string;
  expiraEn: string;
  intentosFallidos: number;
  verificado: boolean;
  verificadoEn?: string;
  resetToken?: string;
  resetTokenExpiraEn?: string;
  utilizado: boolean;
  utilizadoEn?: string;
}

const PASSWORD_RECOVERY_KEY = "recuperacion_password_pendientes";

async function getPasswordRecoveryMap(): Promise<Record<string, SolicitudRecuperacionPassword>> {
  try {
    const row = await prisma.configuracionEcommerce.findUnique({
      where: { clave: PASSWORD_RECOVERY_KEY },
    });
    if (row?.valor) {
      const parsed = JSON.parse(row.valor);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch {}
  return {};
}

async function savePasswordRecoveryMap(map: Record<string, SolicitudRecuperacionPassword>): Promise<void> {
  await prisma.configuracionEcommerce.upsert({
    where: { clave: PASSWORD_RECOVERY_KEY },
    update: { valor: JSON.stringify(map) },
    create: {
      clave: PASSWORD_RECOVERY_KEY,
      valor: JSON.stringify(map),
      descripcion: "Solicitudes y tokens de recuperación de contraseñas de clientes e-commerce",
    },
  });
}

/**
 * Solicita el envío de un código de 6 dígitos para recuperar contraseña.
 * Aplica rate limiting (60s entre envíos) y respuesta segura anti-enumeración.
 */
export async function solicitarRecuperacionPasswordAction(
  emailInput: string
): Promise<{ success: boolean; message: string; emailMasked?: string; error?: string }> {
  try {
    const cleanEmail = (emailInput || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, message: "", error: "Ingresá un correo electrónico válido." };
    }

    const map = await getPasswordRecoveryMap();
    const now = new Date();

    // Limpieza de solicitudes vencidas hace más de 24 horas para mantener liviano el JSON
    for (const [k, req] of Object.entries(map)) {
      if (new Date(req.expiraEn).getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
        delete map[k];
      }
    }

    // Rate limiting: evitar solicitudes repetidas en menos de 60 segundos para el mismo correo
    const prevReq = Object.values(map)
      .filter((r) => r.email === cleanEmail && !r.utilizado)
      .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())[0];

    if (prevReq) {
      const elapsedMs = now.getTime() - new Date(prevReq.creadoEn).getTime();
      if (elapsedMs < 60 * 1000) {
        const remainingSec = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        return {
          success: false,
          message: "",
          error: `Ya enviamos un código recientemente. Por favor esperá ${remainingSec} segundos antes de solicitar otro.`,
        };
      }
    }

    // Buscar si el cliente existe en el sistema
    const credsMap = await getClientCredentialsMap();
    let cliente = await prisma.cliente.findFirst({
      where: {
        activo: true,
        email: { equals: cleanEmail, mode: "insensitive" },
      },
    });

    let targetClienteId = cliente?.id;
    if (!targetClienteId) {
      const foundInCreds = Object.values(credsMap).find(
        (c) => c.email.toLowerCase() === cleanEmail
      );
      if (foundInCreds) {
        targetClienteId = foundInCreds.clienteId;
        cliente = await prisma.cliente.findUnique({ where: { id: targetClienteId } });
      }
    }

    const [userPart, domainPart] = cleanEmail.split("@");
    const emailMasked = userPart.length > 2
      ? `${userPart.slice(0, 2)}***@${domainPart}`
      : `${userPart}***@${domainPart}`;

    // Si el correo no pertenece a ninguna cuenta, responder de forma neutra y segura (sin revelar existencia)
    if (!cliente || !cliente.activo || !targetClienteId) {
      return {
        success: true,
        message: "Si tu correo se encuentra registrado, te enviamos un código de seguridad de 6 dígitos. Revisá tu bandeja de entrada o spam.",
        emailMasked,
      };
    }

    // Generar código numérico de 6 dígitos criptográficamente seguro
    const codigoNum = crypto.randomInt(100000, 1000000).toString();
    const codigoHash = crypto.createHash("sha256").update(codigoNum).digest("hex");
    const requestId = crypto.randomUUID();

    map[requestId] = {
      requestId,
      clienteId: targetClienteId,
      email: cleanEmail,
      codigoHash,
      creadoEn: now.toISOString(),
      expiraEn: new Date(now.getTime() + 15 * 60 * 1000).toISOString(), // 15 minutos de validez
      intentosFallidos: 0,
      verificado: false,
      utilizado: false,
    };

    await savePasswordRecoveryMap(map);

    // Enviar correo mediante Nodemailer / Gmail SMTP
    const sendResult = await enviarEmailRecuperacionPassword({
      nombreCliente: cliente.nombre,
      email: cleanEmail,
      codigo: codigoNum,
    });

    if (!sendResult.success) {
      delete map[requestId];
      await savePasswordRecoveryMap(map);
      return {
        success: false,
        message: "",
        error: "No se pudo enviar el correo de recuperación en este momento debido a un error del servidor de correo. Por favor intentá más tarde.",
      };
    }

    return {
      success: true,
      message: `Enviamos un código de seguridad de 6 dígitos a ${emailMasked}. Revisá tu bandeja de entrada o spam.`,
      emailMasked,
    };
  } catch (error: any) {
    console.error("Error en solicitarRecuperacionPasswordAction:", error);
    return { success: false, message: "", error: "Ocurrió un error inesperado al procesar la solicitud." };
  }
}

/**
 * Valida el código de 6 dígitos ingresado por el usuario.
 * Controla límite de 5 intentos y vencimiento de 15 minutos.
 * Emite un resetToken temporal de un solo uso para habilitar el cambio de contraseña.
 */
export async function verificarCodigoRecuperacionAction(
  emailInput: string,
  codigoInput: string
): Promise<{ success: boolean; resetToken?: string; message?: string; error?: string }> {
  try {
    const cleanEmail = (emailInput || "").trim().toLowerCase();
    const cleanCode = (codigoInput || "").trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Correo electrónico no válido." };
    }
    if (!cleanCode || !/^\d{6}$/.test(cleanCode)) {
      return { success: false, error: "Ingresá el código numérico de 6 dígitos." };
    }

    const map = await getPasswordRecoveryMap();
    const now = new Date();

    // Obtener la solicitud activa no utilizada más reciente para este correo
    const activeReqs = Object.values(map)
      .filter((r) => r.email === cleanEmail && !r.utilizado)
      .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());

    if (activeReqs.length === 0) {
      return {
        success: false,
        error: "No hay ninguna solicitud de recuperación pendiente para este correo o el código ya expiró. Por favor solicitá un nuevo código.",
      };
    }

    const req = activeReqs[0];

    // Verificar si expiró
    if (now.getTime() > new Date(req.expiraEn).getTime()) {
      return {
        success: false,
        error: "El código de seguridad ha vencido (validez de 15 minutos). Por favor solicitá uno nuevo.",
      };
    }

    // Verificar límite de intentos fallidos
    if (req.intentosFallidos >= 5) {
      return {
        success: false,
        error: "Superaste el límite máximo de 5 intentos fallidos. Por seguridad, debés solicitar un nuevo código.",
      };
    }

    const inputHash = crypto.createHash("sha256").update(cleanCode).digest("hex");
    if (inputHash !== req.codigoHash) {
      req.intentosFallidos += 1;
      map[req.requestId] = req;
      await savePasswordRecoveryMap(map);

      const remaining = Math.max(0, 5 - req.intentosFallidos);
      return {
        success: false,
        error: remaining > 0
          ? `Código incorrecto. Te quedan ${remaining} intento(s).`
          : "Código incorrecto. Se agotaron los intentos permitidos; solicitá un nuevo código.",
      };
    }

    // Código válido -> emitir resetToken temporal de un solo uso (validez 10 minutos)
    const resetToken = crypto.randomBytes(32).toString("hex");
    req.verificado = true;
    req.verificadoEn = now.toISOString();
    req.resetToken = resetToken;
    req.resetTokenExpiraEn = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    map[req.requestId] = req;
    await savePasswordRecoveryMap(map);

    return {
      success: true,
      resetToken,
      message: "Código verificado correctamente. Ya podés establecer tu nueva contraseña.",
    };
  } catch (error: any) {
    console.error("Error en verificarCodigoRecuperacionAction:", error);
    return { success: false, error: "Ocurrió un error al verificar el código." };
  }
}

/**
 * Restablece la contraseña del cliente utilizando el resetToken validado.
 * Aplica hash bcrypt a la nueva contraseña y marca la solicitud como utilizada.
 */
export async function restablecerPasswordAction(
  emailInput: string,
  resetTokenInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const cleanEmail = (emailInput || "").trim().toLowerCase();
    const cleanToken = (resetTokenInput || "").trim();
    const cleanPass = (newPasswordInput || "").trim();

    if (!cleanEmail || !cleanToken) {
      return { success: false, error: "Sesión de restablecimiento inválida. Por favor iniciá el proceso nuevamente." };
    }
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
    }

    const map = await getPasswordRecoveryMap();
    const now = new Date();

    const req = Object.values(map).find(
      (r) => r.email === cleanEmail && r.resetToken === cleanToken && !r.utilizado
    );

    if (!req) {
      return {
        success: false,
        error: "El token de restablecimiento es inválido o ya fue utilizado. Por favor solicitá un nuevo código.",
      };
    }

    if (!req.verificado || !req.resetTokenExpiraEn || now.getTime() > new Date(req.resetTokenExpiraEn).getTime()) {
      return {
        success: false,
        error: "El tiempo para restablecer tu contraseña expiró (10 minutos). Por favor solicitá un nuevo código.",
      };
    }

    // Hashear la nueva contraseña con bcrypt
    const passwordHash = await bcrypt.hash(cleanPass, 10);

    // Actualizar en la tabla dedicada PostgreSQL credenciales_clientes
    await prisma.credencialCliente.upsert({
      where: { clienteId: req.clienteId },
      update: { passwordHash },
      create: {
        clienteId: req.clienteId,
        passwordHash,
        username: cleanEmail.split("@")[0].toLowerCase(),
      },
    });

    // Invalidad y marcar la solicitud como utilizada para evitar cualquier reuso
    req.utilizado = true;
    req.utilizadoEn = now.toISOString();
    delete req.resetToken;
    delete req.resetTokenExpiraEn;
    map[req.requestId] = req;
    await savePasswordRecoveryMap(map);

    return {
      success: true,
      message: "¡Tu contraseña fue actualizada con éxito! Ya podés iniciar sesión con tu nueva contraseña.",
    };
  } catch (error: any) {
    console.error("Error en restablecerPasswordAction:", error);
    return { success: false, error: "Ocurrió un error al restablecer la contraseña." };
  }
}

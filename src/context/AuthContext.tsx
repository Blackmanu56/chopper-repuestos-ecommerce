"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  loginClientAction,
  registerClientAction,
  loginStaffAction,
  logoutAction,
  updateStaffProfileAction,
  uploadStaffPhotoAction,
  deleteStaffPhotoAction,
  getFreshUserAction,
  checkSessionStatusAction,
} from "@/actions/auth";

export function isStaffRole(rol?: string | null): boolean {
  if (!rol) return false;
  const upper = rol.toUpperCase();
  return (
    upper === "ADMINISTRADOR" ||
    upper === "ENCARGADO_VENTAS" ||
    upper === "ENCARGADO_STOCK"
  );
}

export interface UserSession {
  id: number;
  username: string;
  nombreCompleto: string;
  rol: "ADMINISTRADOR" | "ENCARGADO_VENTAS" | "ENCARGADO_STOCK" | "CLIENTE" | string;
  correo: string;
  avatar?: string;
  telefono?: string;
  direccion?: string;
  dni?: string;
  cuit?: string;
  cargo?: string;
}

interface AuthContextType {
  user: UserSession | null;
  isStaff: boolean;
  isHydrating: boolean;
  login: (username: string, pass: string) => Promise<boolean>;
  loginClient: (usernameOrEmail: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerClient: (data: {
    nombreCompleto: string;
    email: string;
    telefono: string;
    password: string;
    dni?: string;
    direccion?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginStaff: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (
    data: Partial<UserSession> & { currentPassword?: string; newPassword?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  uploadProfilePhoto: (file: File) => Promise<{ success: boolean; fotoUrl?: string; error?: string }>;
  removeProfilePhoto: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  sessionExpiredNotice: string | null;
  clearSessionExpiredNotice: () => void;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  isProfileOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isStaff: false,
  isHydrating: true,
  login: async () => false,
  loginClient: async () => ({ success: false }),
  registerClient: async () => ({ success: false }),
  loginStaff: async () => ({ success: false }),
  updateUserProfile: async () => ({ success: false }),
  uploadProfilePhoto: async () => ({ success: false }),
  removeProfilePhoto: async () => ({ success: false }),
  logout: async () => {},
  sessionExpiredNotice: null,
  clearSessionExpiredNotice: () => {},
  isLoginOpen: false,
  openLogin: () => {},
  closeLogin: () => {},
  isProfileOpen: false,
  openProfile: () => {},
  closeProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  useEffect(() => {
    // Limpiar cualquier rastro legado de credenciales en texto plano en localStorage
    try {
      localStorage.removeItem("chopper_clients");
    } catch {}

    // Verificar si en la URL viene ?sessionExpired=true
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("sessionExpired") === "true") {
        setSessionExpiredNotice(
          "Tu sesión ha expirado por límite de tiempo. Por favor, iniciá sesión nuevamente."
        );
        setIsLoginOpen(true);
        try {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        } catch {}
      }
    }

    // Hidratación inicial rápida para evitar parpadeo visual mientras el servidor valida la cookie httpOnly
    try {
      const saved = localStorage.getItem("chopper_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed?.rol) {
          setUser(parsed);
        }
      }
    } catch {
      localStorage.removeItem("chopper_user");
    }

    // Validación real contra la sesión firmada httpOnly del servidor
    checkSessionStatusAction()
      .then((status) => {
        if (status.active && status.user) {
          const freshSession: UserSession = {
            id: status.user.id,
            username: status.user.username,
            nombreCompleto: status.user.nombreCompleto,
            rol: status.user.rol,
            correo: status.user.correo || "",
            telefono: status.user.telefono || undefined,
            direccion: status.user.direccion || undefined,
            dni: status.user.dni || undefined,
            cuit: status.user.cuit || undefined,
            avatar: status.user.fotoUrl || undefined,
            cargo: status.user.cargo || undefined,
          };
          setUser(freshSession);
          localStorage.setItem("chopper_user", JSON.stringify(freshSession));
        } else {
          // Si no hay cookie httpOnly válida en el servidor, invalidar caché visual
          setUser(null);
          localStorage.removeItem("chopper_user");
          if (status.expired) {
            setSessionExpiredNotice(
              status.kind === "STAFF"
                ? "Tu sesión de personal ha expirado tras 24 horas. Por favor, volvé a iniciar sesión."
                : "Tu sesión ha expirado tras 7 días. Por favor, iniciá sesión nuevamente."
            );
            setIsLoginOpen(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsHydrating(false);
      });
  }, []);

  /**
   * Inicio de sesión real de Clientes verificado en el servidor (bcryptjs + cookie httpOnly)
   */
  const loginClient = async (
    usernameOrEmail: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const clean = (usernameOrEmail || "").trim();
    const cleanPass = (pass || "").trim();

    if (!clean) return { success: false, error: "Ingresá tu usuario o correo" };
    if (!cleanPass) return { success: false, error: "Ingresá tu contraseña" };

    try {
      const res = await loginClientAction(clean, cleanPass);
      if (res.success && res.user) {
        const sessionUser: UserSession = {
          id: res.user.id,
          username: res.user.username,
          nombreCompleto: res.user.nombreCompleto,
          rol: "CLIENTE",
          correo: res.user.correo || clean,
          telefono: res.user.telefono || undefined,
          direccion: res.user.direccion || undefined,
          dni: res.user.dni || undefined,
          cuit: res.user.cuit || undefined,
          avatar: res.user.fotoUrl || undefined,
        };
        setUser(sessionUser);
        localStorage.setItem("chopper_user", JSON.stringify(sessionUser));
        setIsLoginOpen(false);
        return { success: true };
      }
      return { success: false, error: res.error || "Usuario o contraseña incorrectos." };
    } catch (err) {
      console.error("Error al autenticar cliente:", err);
      return { success: false, error: "Error de comunicación con el servidor." };
    }
  };

  /**
   * Registro real de Clientes en servidor con hash bcrypt y sesión httpOnly
   */
  const registerClient = async (data: {
    nombreCompleto: string;
    email: string;
    telefono: string;
    password: string;
    dni?: string;
    direccion?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await registerClientAction(data);
      if (res.success && res.user) {
        const sessionUser: UserSession = {
          id: res.user.id,
          username: res.user.username,
          nombreCompleto: res.user.nombreCompleto,
          rol: "CLIENTE",
          correo: res.user.correo || data.email,
          telefono: res.user.telefono || data.telefono,
          direccion: res.user.direccion || data.direccion,
          dni: res.user.dni || data.dni,
          cuit: res.user.cuit || undefined,
        };
        setUser(sessionUser);
        localStorage.setItem("chopper_user", JSON.stringify(sessionUser));
        return { success: true };
      }
      return { success: false, error: res.error || "No se pudo crear la cuenta." };
    } catch (err) {
      console.error("Error al registrar cliente:", err);
      return { success: false, error: "Error de comunicación con el servidor." };
    }
  };

  /**
   * Inicio de sesión de Administradores y Empleados contra la base de datos real del SGI
   */
  const loginStaff = async (
    username: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim();
    const cleanPass = pass.trim();

    if (!cleanUser) {
      return { success: false, error: "Ingresá el usuario de empleado o administrador" };
    }
    if (!cleanPass) {
      return { success: false, error: "Ingresá tu contraseña de acceso" };
    }

    try {
      const dbRes = await loginStaffAction(cleanUser, cleanPass);
      if (dbRes.success && dbRes.user) {
        const sessionUser: UserSession = {
          id: dbRes.user.id,
          username: dbRes.user.username,
          nombreCompleto: dbRes.user.nombreCompleto,
          rol: dbRes.user.rol,
          correo: dbRes.user.correo || `${dbRes.user.username}@chopperrepuestos.com`,
          telefono: dbRes.user.telefono || undefined,
          dni: dbRes.user.dni || undefined,
          avatar: dbRes.user.fotoUrl || undefined,
          cargo: dbRes.user.cargo || undefined,
        };
        setUser(sessionUser);
        localStorage.setItem("chopper_user", JSON.stringify(sessionUser));
        setIsLoginOpen(false);
        return { success: true };
      }

      if (dbRes.error) {
        return { success: false, error: dbRes.error };
      }
    } catch (err) {
      console.error("Error al autenticar en BDD:", err);
    }

    return {
      success: false,
      error: "Usuario o contraseña incorrectos.",
    };
  };

  const login = async (username: string, pass: string): Promise<boolean> => {
    const staffRes = await loginStaff(username, pass);
    if (staffRes.success) return true;
    const clientRes = await loginClient(username, pass);
    return clientRes.success;
  };

  /**
   * Actualización de perfil validada en el servidor (Staff o Cliente)
   */
  const updateUserProfile = async (
    data: Partial<UserSession> & { currentPassword?: string; newPassword?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "No hay sesión activa." };

    const res = await updateStaffProfileAction(user.id, {
      nombreCompleto: data.nombreCompleto,
      correo: data.correo,
      telefono: data.telefono,
      direccion: data.direccion,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      avatar: data.avatar,
    });

    if (!res.success) {
      return { success: false, error: res.error || "Error al actualizar perfil." };
    }

    if (res.user) {
      const updated: UserSession = {
        ...user,
        nombreCompleto: res.user.nombreCompleto,
        correo: res.user.correo || user.correo,
        telefono: res.user.telefono || user.telefono,
        direccion: res.user.direccion || user.direccion,
        avatar: res.user.fotoUrl || user.avatar,
        cargo: res.user.cargo || user.cargo,
      };
      setUser(updated);
      localStorage.setItem("chopper_user", JSON.stringify(updated));
      return { success: true };
    }

    return { success: true };
  };

  /**
   * Subida de foto de perfil
   */
  const uploadProfilePhoto = async (
    file: File
  ): Promise<{ success: boolean; fotoUrl?: string; error?: string }> => {
    if (!user) return { success: false, error: "No hay sesión activa." };

    if (user.rol !== "CLIENTE") {
      const formData = new FormData();
      formData.append("foto", file);
      const res = await uploadStaffPhotoAction(user.id, formData);
      if (res.success && res.fotoUrl) {
        const updated = { ...user, avatar: res.fotoUrl };
        setUser(updated);
        localStorage.setItem("chopper_user", JSON.stringify(updated));
        return { success: true, fotoUrl: res.fotoUrl };
      }
      return { success: false, error: res.error || "No se pudo subir la foto." };
    }

    // Para cliente, guardar como dataURL validado en el servidor
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === "string") {
          const dataUrl = reader.result;
          await updateStaffProfileAction(user.id, { avatar: dataUrl });
          const updated = { ...user, avatar: dataUrl };
          setUser(updated);
          localStorage.setItem("chopper_user", JSON.stringify(updated));
          resolve({ success: true, fotoUrl: dataUrl });
        } else {
          resolve({ success: false, error: "Error al procesar la imagen." });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeProfilePhoto = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "No hay sesión activa." };

    if (user.rol !== "CLIENTE") {
      const res = await deleteStaffPhotoAction(user.id);
      if (res.success) {
        const updated = { ...user, avatar: undefined };
        setUser(updated);
        localStorage.setItem("chopper_user", JSON.stringify(updated));
        return { success: true };
      }
      return { success: false, error: res.error || "No se pudo eliminar la foto." };
    }

    await updateStaffProfileAction(user.id, { avatar: "" });
    const updated = { ...user, avatar: undefined };
    setUser(updated);
    localStorage.setItem("chopper_user", JSON.stringify(updated));
    return { success: true };
  };

  const logout = async () => {
    try {
      await logoutAction();
    } catch {}
    setUser(null);
    localStorage.removeItem("chopper_user");
    localStorage.removeItem("chopper_clients");
    setIsProfileOpen(false);
    setIsLoginOpen(false);
    setSessionExpiredNotice(null);
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/panel")) {
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isStaff: isStaffRole(user?.rol),
        isHydrating,
        login,
        loginClient,
        registerClient,
        loginStaff,
        updateUserProfile,
        uploadProfilePhoto,
        removeProfilePhoto,
        logout,
        sessionExpiredNotice,
        clearSessionExpiredNotice: () => setSessionExpiredNotice(null),
        isLoginOpen,
        openLogin: () => setIsLoginOpen(true),
        closeLogin: () => {
          setIsLoginOpen(false);
          setSessionExpiredNotice(null);
        },
        isProfileOpen,
        openProfile: () => setIsProfileOpen(true),
        closeProfile: () => setIsProfileOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

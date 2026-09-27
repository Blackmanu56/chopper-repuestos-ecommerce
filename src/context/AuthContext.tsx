"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  loginStaffAction,
  updateStaffProfileAction,
  uploadStaffPhotoAction,
  getFreshUserAction,
} from "@/actions/auth";

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
  login: (username: string, pass: string) => Promise<boolean>;
  loginClient: (usernameOrEmail: string, pass: string) => { success: boolean; error?: string };
  loginStaff: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (
    data: Partial<UserSession> & { currentPassword?: string; newPassword?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  uploadProfilePhoto: (file: File) => Promise<{ success: boolean; fotoUrl?: string; error?: string }>;
  logout: () => void;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  isProfileOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  loginClient: () => ({ success: false }),
  loginStaff: async () => ({ success: false }),
  updateUserProfile: async () => ({ success: false }),
  uploadProfilePhoto: async () => ({ success: false }),
  logout: () => {},
  isLoginOpen: false,
  openLogin: () => {},
  closeLogin: () => {},
  isProfileOpen: false,
  openProfile: () => {},
  closeProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("chopper_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);

        // Si es un usuario de staff, sincronizar con la BDD en segundo plano
        if (parsed?.id && parsed.rol !== "CLIENTE") {
          getFreshUserAction(parsed.id).then((fresh) => {
            if (fresh) {
              const freshSession: UserSession = {
                id: fresh.id,
                username: fresh.username,
                nombreCompleto: fresh.nombreCompleto,
                rol: fresh.rol,
                correo: fresh.correo || "",
                telefono: fresh.telefono || "",
                dni: fresh.dni || "",
                avatar: fresh.fotoUrl || undefined,
                cargo: fresh.cargo || undefined,
              };
              setUser(freshSession);
              localStorage.setItem("chopper_user", JSON.stringify(freshSession));
            }
          });
        }
      } catch (e) {
        localStorage.removeItem("chopper_user");
      }
    }
  }, []);

  const loginClient = (usernameOrEmail: string, pass: string): { success: boolean; error?: string } => {
    const clean = usernameOrEmail.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!clean) return { success: false, error: "Ingresá tu usuario o correo" };
    if (!cleanPass) return { success: false, error: "Ingresá tu contraseña" };

    // 1. Cliente oficial de demostración de Chopper Posadas
    if (clean === "cliente@gmail.com" || clean === "cliente") {
      if (cleanPass !== "cliente123") {
        return { success: false, error: "Contraseña incorrecta. Usá: cliente123" };
      }
      const sessionUser: UserSession = {
        id: 101,
        username: "cliente",
        nombreCompleto: "Carlos Motero",
        rol: "CLIENTE",
        correo: "cliente@gmail.com",
        telefono: "376 524-3554",
        direccion: "Calle Félix de Azara 1890, Posadas, Misiones",
        dni: "34.567.890",
        cuit: "20-34567890-4",
      };
      setUser(sessionUser);
      localStorage.setItem("chopper_user", JSON.stringify(sessionUser));
      setIsLoginOpen(false);
      return { success: true };
    }

    // 2. Clientes guardados en localStorage
    try {
      const stored = localStorage.getItem("chopper_clients");
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find(
          (c: any) =>
            (c.email?.toLowerCase() === clean || c.username?.toLowerCase() === clean) &&
            c.password === cleanPass
        );
        if (found) {
          const sessionUser: UserSession = {
            id: found.id || Date.now(),
            username: found.username || clean.split("@")[0],
            nombreCompleto: found.nombre || found.nombreCompleto || clean.split("@")[0],
            rol: "CLIENTE",
            correo: found.email || clean,
            telefono: found.telefono,
            direccion: found.direccion,
          };
          setUser(sessionUser);
          localStorage.setItem("chopper_user", JSON.stringify(sessionUser));
          setIsLoginOpen(false);
          return { success: true };
        }
      }
    } catch (e) {}

    // 3. Fallback genérico para registro rápido
    const usernameOnly = clean.includes("@") ? clean.split("@")[0] : clean;
    const sessionUser: UserSession = {
      id: Date.now(),
      username: usernameOnly.toLowerCase(),
      nombreCompleto: usernameOnly.charAt(0).toUpperCase() + usernameOnly.slice(1),
      rol: "CLIENTE",
      correo: clean.includes("@") ? clean : `${usernameOnly.toLowerCase()}@gmail.com`,
    };

    setUser(sessionUser);
    localStorage.setItem("chopper_user", JSON.stringify(sessionUser));
    setIsLoginOpen(false);
    return { success: true };
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

    // 1. Verificación directa contra PostgreSQL con bcryptjs
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
    const clientRes = loginClient(username, pass);
    return clientRes.success;
  };

  /**
   * Actualización de perfil con soporte para persistencia en BDD (Staff) o local (Cliente)
   */
  const updateUserProfile = async (
    data: Partial<UserSession> & { currentPassword?: string; newPassword?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "No hay sesión activa." };

    // Si es personal o admin, actualizar en PostgreSQL
    if (user.rol !== "CLIENTE") {
      const res = await updateStaffProfileAction(user.id, {
        nombreCompleto: data.nombreCompleto,
        correo: data.correo,
        telefono: data.telefono,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (!res.success) {
        return { success: false, error: res.error || "Error al actualizar perfil en la base de datos." };
      }

      if (res.user) {
        const updated: UserSession = {
          ...user,
          nombreCompleto: res.user.nombreCompleto,
          correo: res.user.correo || user.correo,
          telefono: res.user.telefono || user.telefono,
          avatar: res.user.fotoUrl || user.avatar,
          cargo: res.user.cargo || user.cargo,
        };
        setUser(updated);
        localStorage.setItem("chopper_user", JSON.stringify(updated));
        return { success: true };
      }
    }

    // Si es cliente
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem("chopper_user", JSON.stringify(updated));
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

    // Para cliente, guardar como base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          const updated = { ...user, avatar: reader.result };
          setUser(updated);
          localStorage.setItem("chopper_user", JSON.stringify(updated));
          resolve({ success: true, fotoUrl: reader.result });
        } else {
          resolve({ success: false, error: "Error al procesar la imagen." });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("chopper_user");
    setIsProfileOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginClient,
        loginStaff,
        updateUserProfile,
        uploadProfilePhoto,
        logout,
        isLoginOpen,
        openLogin: () => setIsLoginOpen(true),
        closeLogin: () => setIsLoginOpen(false),
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

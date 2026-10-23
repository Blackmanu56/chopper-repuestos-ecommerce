"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { TiendaConfig, getConfiguracionAction } from "@/actions/configuracion";

export const DEFAULT_CONFIG: TiendaConfig = {
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
  cuotas_habilitadas: true,
  cuotas_cantidad: 3,
  cuotas_sin_interes: true,
  cuotas_recargo_porcentaje: 0,
};

export interface InfoFinanciacion {
  habilitadas: boolean;
  cuotas: number;
  sinInteres: boolean;
  recargoPorcentaje: number;
  totalFinanciado: number;
  valorCuota: number;
  textoCuotas: string;
}

interface ConfigContextType {
  config: TiendaConfig;
  updateConfig: (newConfig: Partial<TiendaConfig>) => void;
  reloadConfig: () => Promise<void>;
  shouldShowAhorroBadge: (ahorro: number) => boolean;
  calcularCuotas: (precio: number) => InfoFinanciacion;
}

const defaultFinanciacion: InfoFinanciacion = {
  habilitadas: true,
  cuotas: 3,
  sinInteres: true,
  recargoPorcentaje: 0,
  totalFinanciado: 0,
  valorCuota: 0,
  textoCuotas: "3 cuotas sin interés",
};

const ConfigContext = createContext<ConfigContextType>({
  config: DEFAULT_CONFIG,
  updateConfig: () => {},
  reloadConfig: async () => {},
  shouldShowAhorroBadge: () => true,
  calcularCuotas: () => defaultFinanciacion,
});

export function ConfigProvider({
  children,
  initialConfig,
}: {
  children: React.ReactNode;
  initialConfig?: TiendaConfig;
}) {
  const [config, setConfig] = useState<TiendaConfig>(initialConfig || DEFAULT_CONFIG);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    } else {
      getConfiguracionAction().then((fresh) => {
        if (fresh) setConfig(fresh);
      });
    }
  }, [initialConfig]);

  const reloadConfig = useCallback(async () => {
    try {
      const fresh = await getConfiguracionAction();
      if (fresh) setConfig(fresh);
    } catch (e) {
      console.error("Error al recargar configuración de tienda:", e);
    }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<TiendaConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const shouldShowAhorroBadge = useCallback(
    (ahorro: number) => {
      if (!config.mostrar_ahorro) return false;
      if (config.ocultar_ahorro_cero && ahorro <= 0) return false;
      return ahorro > 0;
    },
    [config.mostrar_ahorro, config.ocultar_ahorro_cero]
  );

  const calcularCuotas = useCallback(
    (precio: number): InfoFinanciacion => {
      const habilitadas = config.cuotas_habilitadas ?? true;
      const cuotas = Math.max(1, config.cuotas_cantidad || 3);
      const sinInteres = config.cuotas_sin_interes ?? true;
      const recargoPorcentaje = sinInteres ? 0 : Math.max(0, config.cuotas_recargo_porcentaje || 0);

      const totalFinanciado = sinInteres
        ? precio
        : Math.round(precio * (1 + recargoPorcentaje / 100));
      const valorCuota = Math.round(totalFinanciado / cuotas);

      const textoCuotas = sinInteres
        ? `${cuotas} cuotas sin interés de $${valorCuota.toLocaleString("es-AR")}`
        : `${cuotas} cuotas fijas de $${valorCuota.toLocaleString("es-AR")}`;

      return {
        habilitadas,
        cuotas,
        sinInteres,
        recargoPorcentaje,
        totalFinanciado,
        valorCuota,
        textoCuotas,
      };
    },
    [
      config.cuotas_habilitadas,
      config.cuotas_cantidad,
      config.cuotas_sin_interes,
      config.cuotas_recargo_porcentaje,
    ]
  );

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateConfig,
        reloadConfig,
        shouldShowAhorroBadge,
        calcularCuotas,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}

# CONTEXTO_COMPLETO_ECOMMERCE.md

> Documento de contexto técnico y funcional del e-commerce **Chopper Repuestos**.
> Generado mediante relevamiento de solo lectura del código fuente. No se modificó nada.
> Fecha del relevamiento: 12 de octubre de 2026.

---

## 1. Información general

### 1.1 Nombre y objetivo

- **Nombre del proyecto**: `chopper-repuestos-ecommerce` (package.json).
- **Objetivo**: tienda online (e-commerce) de repuestos para motos de la casa **Chopper Repuestos** (Posadas, Misiones, Argentina). Permite a clientes consultar el catálogo, armar carrito, generar pedidos online con envío (motomandado) o retiro en local, y personal administrativo gestionar pedidos, catálogo, ofertas y combos desde un panel.

### 1.2 Tecnologías, frameworks y versiones

| Componente | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | ^16.3.3 |
| UI Library | React | 19.2.4 |
| Lenguaje | TypeScript | 5.7.3 (strict: true) |
| Estilos | Tailwind CSS | ^4.2.0 (v4, con `@theme` y dark mode por clase) |
| ORM | Prisma Client | ^7.8.0 (con driver adapter `@prisma/adapter-pg`) |
| Base de datos | PostgreSQL (Supabase) | pooler Supabase (pgbouncer) |
| Driver PG | `pg` | ^8.21.0 |
| Hash de contraseñas | `bcryptjs` | ^3.0.3 |
| Iconos | `lucide-react` | ^0.564.0 |
| Utilidades | `clsx`, `tailwind-merge`, `dotenv` | varias |
| Dev tooling | `tsx` (scripts), `eslint` (^9), `eslint-config-next` | — |

**NO se usan**: NextAuth, JWT libs (`jose`/`jsonwebtoken`), zod, Mercado Pago SDK, Nodemailer/Resend, Stripe, ningún cliente HTTP (`fetch`/`axios` no aparecen en el código).

### 1.3 Arquitectura general

- **Monolito Next.js App Router** con Server Actions (`"use server"`) como backend. **No hay APIs REST propias** salvo un único route handler para avatares.
- **Sin capa de sesión server-side**: la autenticación vive casi completamente en `localStorage` del navegador (ver sección 5).
- **Patrón de datos ecommerce sobre tablas compartidas con el sistema interno SGI** (`../sgi-repuestos`): se usan las tablas `usuarios`, `roles`, `clientes`, `productos`, `categorias`, `marcas` compartidas, más tablas propias del ecommerce (`pedidos_ecommerce`, `productos_ecommerce`, `combos_ecommerce`, `configuracion_ecommerce`).
- El schema de Prisma es un **monolito compartido con el SGI**: 34 modelos, de los cuales solo **14 son usados** por esta app; los otros 20 (cajas, compras, ventas, solicitudes, notificaciones, etc.) pertenecen al sistema interno.

### 1.4 Organización de carpetas

```
ecommerce/
├── package.json              # scripts: dev (puerto 3001), build, start, lint
├── next.config.ts            # VACÍO (objeto vacío, sin headers ni images)
├── prisma.config.ts          # url desde DIRECT_URL || DATABASE_URL
├── tsconfig.json             # strict, alias @/* → ./src/*
├── .env.example              # DATABASE_URL, DIRECT_URL, JWT_SECRET (sin uso real)
├── prisma/
│   └── schema.prisma         # 724 líneas, 34 modelos (sin migraciones ni seed)
├── public/                   # logos, marcas SVG, imágenes de combos, avatares, uploads
├── scripts/                  # seeds/demo (se corren con npx tsx)
│   ├── check-and-seed.ts
│   ├── seed-demo-orders.ts
│   ├── seed-display-data.ts
│   ├── seed-more-sales.ts
│   ├── seed-test-orders.ts
│   └── verify-orders.ts
├── scratch/                  # gitignored: tests de auditoría y seeds internos
└── src/
    ├── actions/              # Server Actions (el "backend")
    │   ├── auth.ts           # 268 líneas — login staff, perfil, fotos
    │   ├── commercial.ts     # 751 líneas — catálogo, ofertas, marcas, categorías
    │   ├── combos.ts         # 486 líneas — CRUD de combos
    │   ├── configuracion.ts  # ~425 líneas — config tienda, etiquetas, auditoría
    │   ├── ecommerce.ts      # 229 líneas — lecturas públicas (productos, categorías)
    │   └── pedidos.ts        # 806 líneas — creación, estados, comprobantes
    ├── app/                  # App Router (páginas)
    │   ├── layout.tsx        # ThemeProvider > AuthProvider > CartProvider
    │   ├── page.tsx          # home
    │   ├── carrito/page.tsx
    │   ├── checkout/page.tsx       # 697 líneas
    │   ├── confirmacion/page.tsx   # huérfano (nada lo referencia)
    │   ├── comprobante/page.tsx    # stub → redirect a /panel
    │   ├── mis-pedidos/page.tsx    # 912 líneas
    │   ├── ofertas/ (page + OfertasClient)  # catálogo completo
    │   ├── producto/[id]/ (page + ProductDetailClient 819 líneas)
    │   ├── combos/ y combo/[id]/   # detalle de combos
    │   ├── panel/page.tsx           # 5.628 líneas — TODO el admin en un solo archivo
    │   ├── nosotros/page.tsx        # 524 líneas (contacto redirige acá)
    │   ├── contacto/page.tsx        # stub → redirect a /nosotros#contacto
    │   └── uploads/avatars/[file]/route.ts  # ÚNICO route handler
    ├── components/
    │   ├── layout/           # Header, Footer, LoginModal, UserProfileModal, CategoryDrawer, AppLayoutWrapper, FloatingWhatsApp
    │   ├── home/             # HeroBanners, OfertasSection, MasVendidosSection, MarcasCarrusel, CombosSection, FaqSection
    │   └── products/         # ProductCard, CategoryFilter
    ├── context/
    │   ├── AuthContext.tsx   # sesión en localStorage
    │   ├── CartContext.tsx   # carrito + pedidos "fantasma" en localStorage
    │   └── ThemeContext.tsx  # dark/light
    ├── data/combos.ts        # combos hardcodeados (fallback)
    └── lib/prisma.ts         # singleton Prisma 7 con adapter-pg
```

### 1.5 Dependencias

Producción: `@prisma/adapter-pg`, `@prisma/client`, `@types/bcryptjs`, `bcryptjs`, `clsx`, `dotenv`, `lucide-react`, `next`, `pg`, `react`, `react-dom`, `tailwind-merge`.
Dev: `@tailwindcss/postcss`, `@types/*`, `eslint`, `eslint-config-next`, `postcss`, `prisma`, `tailwindcss`, `tsx`, `typescript`.

### 1.6 Base de datos y ORM

- **PostgreSQL vía Supabase**: `DATABASE_URL` (pooler transaccional, puerto 6543) y `DIRECT_URL` (directo, puerto 5432, para migraciones).
- **Prisma 7 con driver adapter** (sin `url` en el datasource de schema):

```ts
// src/lib/prisma.ts
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ["warn", "error"] });
```

- Singleton global para dev. No existe `prisma/migrations/` ni `seed.ts` en el repo (los datos base vienen del SGI o de los scripts en `scripts/`).

### 1.7 Servicios externos e integraciones

- **Supabase**: solo como PostgreSQL gestionada. No se usan Auth ni Storage de Supabase.
- **WhatsApp**: enlace estático `wa.me/5493765243554` (componente `FloatingWhatsApp` y botones varios). No es una API.
- **OpenStreetMap**: iframe embebido en `/nosotros`.
- **NO hay**: pasarelas de pago, proveedores de email, webhooks, cron, CDNs configuradas, analytics.

### 1.8 Configuración del entorno

Variables (solo nombres; `.gitignore` excluye `.env`):

| Variable | Uso |
|---|---|
| `DATABASE_URL` | conexión Prisma (adapter-pg) — `src/lib/prisma.ts` |
| `DIRECT_URL` | migraciones / fallback — `prisma.config.ts` |
| `JWT_SECRET` | **definida en .env.example pero NUNCA usada en el código** |

Comandos: `npm run dev` (puerto 3001), `npm run build`, `npm run start`, `npm run lint`. No hay scripts de test ni de migración.

### 1.9 Estado general

- Repo git en `github.com/Blackmanu56/chopper-repuestos-ecommerce`, rama `main`, 8 commits (26–28 sep 2026), árbol limpio. Desarrollo intensivo de ~2 días, luego inactivo ~2 semanas.
- Sin tests, sin CI, sin configuración de despliegue (no hay vercel.json/Dockerfile).
- ~17.500 líneas de código en `src/`; 32% concentradas en `panel/page.tsx`.

---

## 2. Base de datos

### 2.1 Conexión

`src/lib/prisma.ts` exporta un singleton `prisma` (Prisma 7 + `PrismaPg` adapter sobre `DATABASE_URL`). Todas las queries son Prisma Client; no hay SQL crudo ni librerías de query builder.

### 2.2 Enumeraciones definidas

`EstadoProducto` (ACTIVO/INACTIVO), `MotivoEstadoProducto`, `OrigenPagoCompra`, `TipoCuentaFinanciera`, `TipoMovimientoFinanciero`, `TipoMovimientoProducto`, `TipoSolicitudStock`, `EstadoSolicitud`, `TipoNotificacion` (11 valores). **Ninguna de estas enums se usa para el flujo ecommerce** — los estados de pedido y de producto ecommerce son strings libres.

### 2.3 Modelos USADOS por el ecommerce (14)

| Modelo | Tabla | Rol en el ecommerce |
|---|---|---|
| `Usuario` | usuarios | Staff autenticado (login, preparadores, audit) |
| `Rol` | roles | `nombre` (ADMINISTRADOR, ENCARGADO_VENTAS, ENCARGADO_STOCK). Campo `permisos` existe pero **nunca se lee** |
| `Empleado` | empleados | Ficha laboral, 1:1 opcional con Usuario (usada en login/perfil) |
| `Cliente` | clientes | Comprador online. `dni` unique. Relación opcional con PedidoEcommerce |
| `Categoria` | categorías | Catálogo |
| `Producto` | productos | Catálogo + stock (`cantidad`), precios (`precioCompra`/`precioVenta`), `marca`, `imagen`, `activo` |
| `Marca` | marcas | Catálogo + logos en carrusel |
| `ProductoEcommerce` | productos_ecommerce | Overlay comercial: `publicadoOnline`, `enOferta`, `precioOferta`, `destacado`, `recomendado`, `badgePromo` |
| `ComboEcommerce` / `ComboItemEcommerce` | combos_ecommerce / combo_items_ecommerce | Combos de productos con precio propio |
| `PedidoEcommerce` | pedidos_ecommerce | Pedido online (ver detalle abajo) |
| `DetallePedidoEcommerce` | detalle_pedidos_ecommerce | Items del pedido (producto o combo, precio congelado) |
| `ConfiguracionEcommerce` | configuracion_ecommerce | Key-value: config de tienda + JSON de auditoría (`historial_auditoria`) + etiquetas de oferta (`etiquetas_oferta`) |
| `MovimientoProducto` | movimientos_producto | Auditoría de stock (baja por venta, reposición por cancelación) |

### 2.4 Modelos NO usados por el ecommerce (20 — heredados del SGI)

`PagoCompra`, `Proveedor` (aunque `Producto.proveedorId` es **requerido** en schema), `Venta`, `DetalleVenta`, `Caja`, `MovimientoCaja`, `Compra`, `DetalleCompra`, `SolicitudReposicion`, `SolicitudStock`, `SolicitudCaja`, `SolicitudPrecio`, `Notificacion`, `PreferenciaNotificacion`, `ProductoFavorito`, `HistorialEstado`, `CuentaFinanciera`, `MovimientoFinanciero`, `AjustePrecio`, `AjustePrecioDetalle`. Grep verificado: cero referencias en `src/`.

### 2.5 Modelo central: PedidoEcommerce

```prisma
model PedidoEcommerce {
  id                  Int      @id @default(autoincrement())
  numero              Int      @unique          // número de pedido (piso 1050)
  clienteId           Int?                        // FK → Cliente (nullable)
  nombreCliente       String                      // copia desnormalizada
  dniCliente          String
  telefonoCliente     String?
  emailCliente        String?                     // almacenado pero NUNCA usado para enviar correos
  direccionEnvio      String?
  modalidadEntrega    String                      // "RETIRO_LOCAL" | "MOTOMANDADO"
  costoEnvio          Float     @default(0.0)
  metodoPago          String                      // "TRANSFERENCIA" | "TARJETA" | "EFECTIVO_LOCAL"
  estado              String     @default("PENDIENTE")
  comprobanteUrl      String?
  preparadorUsuarioId Int?                         // FK → Usuario
  preparadorNombre    String?
  fechaPreparacion    DateTime?
  total               Float
  notas               String?
  creadoEn            DateTime @default(now())
  actualizadoEn       DateTime @updatedAt
  items               DetallePedidoEcommerce[]
}
```

`estado`, `metodoPago` y `modalidadEntrega` son **strings libres** (no enums). No existe tabla de historial de estados de pedidos (el `HistorialEstado` del schema es para estados de *producto* del SGI y no se usa).

### 2.6 Relaciones clave

- `Cliente 1—N PedidoEcommerce` (`onDelete: SetNull`).
- `Usuario 1—N PedidoEcommerce` (como preparador, `preparadorUsuarioId`).
- `PedidoEcommerce 1—N DetallePedidoEcommerce` (cascade delete).
- `DetallePedidoEcommerce` → `Producto?` y `ComboEcommerce?` (ambos opcionales, `SetNull`).
- `Producto 1—1 ProductoEcommerce` (overlay), `Producto N—N ComboEcommerce` vía `ComboItemEcommerce`.
- `Usuario N—1 Rol`. `Empleado 1—1 Usuario` (opcional).
- **No hay relación entre `Usuario` y `Cliente`**: son mundos separados (staff vs comprador).

---

## 3. Módulos y funcionalidades

### 3.1 Inicio y página principal — PARCIALMENTE IMPLEMENTADO

- **Archivo**: `src/app/page.tsx` (server component, 48 líneas) + `src/components/home/*`.
- **Qué hace**: compone Hero (banners hardcodeados), OfertasSection, CombosSection, MasVendidosSection, MarcasCarrusel, FaqSection.
- **Datos**: productos de `getProducts()`; combos de DB con fallback hardcodeado.
- **Problemas reales**:
  - `OfertasSection` **fabrica datos fake**: inventa % de ahorro y precio "original" para productos que no están en oferta (fórmula `precio * (0.15 + (idx%3)*0.05)`).
  - `MasVendidosSection` **inventa rating y reseñas** (`4.7 + (idx%3)*0.1`, `12 + idx*5`) — no hay ventas reales detrás.
  - El search param `cat` que escribe `CategoryFilter` en la URL **nunca se lee** en home.
  - FAQ: 14 items hardcodeados.

### 3.2 Catálogo de productos — IMPLEMENTADO

- **Archivos**: `src/actions/ecommerce.ts` (`getProducts`, `getProductById`, `getCategories`), `src/app/ofertas/page.tsx` + `OfertasClient.tsx`, `ProductCard.tsx`.
- **Cómo funciona**: el server component de `/ofertas` trae TODOS los productos + combos de DB; `OfertasClient` filtra todo en el cliente (`useMemo`): búsqueda de texto, categorías/marcas multiselección, precio min/max, orden, toggles "solo stock"/"solo ofertas".
- **Visibilidad**: `Producto.activo = true` y (`ecommerce: null` o `publicadoOnline: true`).
- **Precio**: `precio = enOferta ? precioOferta : precioVenta`; se calcula `descuentoPorcentaje`.
- **Detalle** (`producto/[id]`): galería de 4 fotos **hardcodeadas por familia**, bloque de precio con matemática de marketing (`precioEfectivo = precio*0.9`, `precioLista = precio*1.25`, solo visual), selector de cantidad, botones "Agregar al carrito" y "Comprar ahora". Reseñas: estado local con 3 reseñas fake; nunca se persisten.
- **Modelos**: `Producto`, `ProductoEcommerce`, `Categoria`, `Marca`, `ComboEcommerce`.

### 3.3 Categorías y marcas — PARCIALMENTE IMPLEMENTADO

- **DB**: `getCategories()` cuenta productos visibles por categoría. Marcas: `getMarcasPublicasAction` para el carrusel del home.
- **CategoryDrawer (menú hamburguesa)**: las categorías del drawer están **totalmente hardcodeadas** (7 grupos) y cada subcategoría linkea a `/ofertas?q=<texto>` (búsqueda de texto, no filtro real por categoría). Incluye un link muerto "Subir Comprobante → /panel?tab=comprobante" (el panel no lee query params y es solo staff).
- **CRUD admin**: crear categoría (`crearCategoriaAction`), CRUD completo de marcas con logos (`crearMarcaAction`, `actualizarLogoMarcaAction`, `editarMarcaCompletaAction`, `toggleMarcaAction`).

### 3.4 Buscador y filtros — IMPLEMENTADO

- Header: búsqueda desktop → navega a `/ofertas?q=...`.
- `/ofertas`: filtros client-side completos (texto, categorías, marcas, precio, orden, solo ofertas, solo stock). La búsqueda matchea nombre, marca, código y nombre de categoría (case-insensitive).

### 3.5 Carrito de compras — IMPLEMENTADO (solo cliente)

- **Archivo**: `src/context/CartContext.tsx`.
- **Persistencia**: `localStorage["choper_cart"]`. **No hay carrito en base de datos.**
- **Items**: `{ id, nombre, marca, categoriaNombre, precio, cantidad, stock, imagen?, esCombo? }`.
- **Operaciones**: `addToCart` (rechaza stock ≤ 0, suma cantidad con tope de stock), `updateQuantity`, `removeFromCart`, `clearCart`, derived `totalItems`/`subtotal`.
- **Página** `/carrito`: render puro del contexto, botones +/-, resumen (muestra "Retiro en local — Gratis" fijo), link a checkout.

### 3.6 Checkout — IMPLEMENTADO (con simulación de pago)

- **Archivo**: `src/app/checkout/page.tsx` (697 líneas, client).
- **Flujo paso a paso**:
  1. Al montar llama `validarPreciosServerAction` (re-valida precio/stock/publicación en server).
  2. Formulario: nombre*, dni*, tel*, email*, dirección (solo si MOTOMANDADO), radio de forma de pago; campos condicionales de tarjeta (simulada) o archivo comprobante (transferencia).
  3. Submit `handleConfirmar`: re-valida precios, aplica regla (EFECTIVO_LOCAL ⇒ fuerza RETIRO_LOCAL), llama **`crearPedidoOnlineAction`**, si hay comprobante de transferencia llama `subirComprobantePedidoAction`, replica en el localStorage del contexto (`crearPedido`), limpia carrito y redirige a `/mis-pedidos?num=...`.
- **Validaciones server-side en creación**: nombre/dni/tel no vacíos (DNI limpia puntos y espacios), items no vacíos, re-lectura de cada producto/combo desde DB, re-resolución de precios. **NO re-valida stock** (ver problemas).
- **Validaciones client-side**: solo atributos HTML `required` + redirección si el carrito está vacío. Sin validación JS de formato DNI/email/tarjeta.
- **`/confirmacion` está huérfano**: nada linkea ahí; lee el localStorage y muestra una dirección hardcodeada incorrecta.

### 3.7 Pedidos — IMPLEMENTADO

- **Creación**: `crearPedidoOnlineAction` (`src/actions/pedidos.ts:93`).
  1. Upsert de `Cliente` por DNI (compartido con SGI).
  2. Re-verificación de precios items → `verifiedItems` y subtotal calculado en server (totales **nunca** se confían del cliente).
  3. `costoEnvio = MOTOMANDADO ? (input.costoEnvio ?? 2500) : 0`; `total = subtotal + costoEnvio`.
  4. `numero`: último número + 1 con piso 1050 (calculado **fuera** de la transacción).
  5. `$transaction`: crea `PedidoEcommerce` + `DetallePedidoEcommerce` anidados; **descuenta stock inmediatamente** (método de pago que sea) con `MovimientoProducto` de auditoría (`usuarioId: 1` hardcodeado); combos descuentan cada componente.
- **Consulta staff**: `getPedidosEcommerceAction` con filtros.
- **Consulta cliente**: `getMisPedidosClienteAction(dni, numero?)` — busca por `dniCliente` o por número exacto.
- **Cancelación**: solo staff, dentro de `actualizarEstadoPedidoAction` (estado → CANCELADO): repone stock y registra movimiento `REPOSICION_DIRECTA`. **No existe lógica de reembolso/devolución.**

### 3.8 Pagos — PARCIALMENTE IMPLEMENTADO (todo simulado/manual)

Ver sección 7 completa. Resumen: transferencia manual con comprobante, tarjeta 100% simulada (auto-aprueba), efectivo como reserva de retiro. **No hay pasarela real. Mercado Pago es solo texto de marketing.**

### 3.9 Comprobantes — PARCIALMENTE IMPLEMENTADO

- **Upload**: `subirComprobantePedidoAction(pedidoNumero, formData)` (`pedidos.ts:749`). Extensiones permitidas: jpg/jpeg/png/webp/pdf. Guarda en `public/uploads/comprobantes/comprobante-{numero}-{timestamp}{ext}`. Actualiza `comprobanteUrl` y **sobrescribe** `notas` con texto fijo. Sin autenticación.
- **Verificación**: staff (ENCARGADO_VENTAS/ADMINISTRADOR) revisa en el panel → "Comprobante y pedido verificado" (→ PREPARANDO) o "Rechazar comprobante" (→ PENDIENTE, borra URL). **Bug**: el panel pasa los argumentos invertidos en el rechazo (ver sección 14).
- `/comprobante` es un stub que redirige a `/panel?tab=comprobante` (link roto).

### 3.10 Envíos y entregas — PARCIALMENTE IMPLEMENTADO

- `modalidadEntrega`: `"RETIRO_LOCAL"` o `"MOTOMANDADO"` (string libre).
- `costoEnvio`: **fijo hardcodeado $2.500** para motomandado (constante en checkout y fallback en server). Sin zonas, sin cálculo de distancia, sin configuración.
- Regla: EFECTIVO_LOCAL ⇒ retiro en local obligatorio; MOTOMANDADO ⇒ pago no puede ser efectivo (se fuerza transferencia).
- `direccionEnvio`: requerida solo con motomandado, se guarda en el pedido y se upsertea en `Cliente.direccion`. Sin validación geográfica.
- **Modal de entrega del panel** puede marcar como entregado pedidos aún en PENDIENTE/CONFIRMADO/PREPARANDO (salto de estado forzado).

### 3.11 Clientes — IMPLEMENTADO (compartido con SGI)

- Tabla `Cliente` (nombre, dni unique, telefono, direccion, email, cuit). Creado/actualizado automáticamente en el checkout por DNI. El panel tiene visibilidad de clientes a través de los pedidos; no hay módulo独立 de gestión de clientes en el ecommerce.

### 3.12 Empleados / Administradores / Usuarios y roles — IMPLEMENTADO (staff)

- Roles en DB: `ADMINISTRADOR`, `ENCARGADO_VENTAS`, `ENCARGADO_STOCK`. El rol `CLIENTE` es solo una constante del frontend; no existe como fila de `Rol`.
- Permisos por acción (cada archivo tiene su verificador): `verifyStaff` (pedidos, combos, configuración) acepta los 3 roles exactos; `verifyCommercialStaff` (commercial.ts) es más laxo: `rolName.includes("ADMIN") || rolName.includes("VENTAS")` (match por subcadena).
- El campo `permisos` de `Rol` está muerto (0 usos).
- UI del panel asigna vistas por rol: VENTAS→"venta", STOCK→"stock", ADMIN→"admin".

### 3.13 Autenticación y sesiones — PARCIALMENTE IMPLEMENTADO (crítico)

Ver sección 5. Resumen: staff con login real contra DB (bcrypt) pero **sin sesión firmada** (userId vive en localStorage y las actions lo reciben del cliente); clientes con autenticación **completamente falsa** en el navegador.

### 3.14 Inventario y stock — IMPLEMENTADO

- Stock = `Producto.cantidad`. Se muestra en detalle (selector acotado) y ProductCard ("Agotado" si ≤ 0).
- Descuento al crear el pedido (inmediato, todos los métodos de pago). Reposición al cancelar.
- Auditoría vía `MovimientoProducto` (tipo VENTA / REPOSICION_DIRECTA). Nota: el `usuarioId` del movimiento es `1` hardcodeado.
- El panel de stock (vista STOCK) permite tareas de inventario sobre el catálogo.

### 3.15 Ofertas y promociones — IMPLEMENTADO

- Flags en `ProductoEcommerce`: `enOferta`, `precioOferta`, `badgePromo`, `ordenOferta`.
- Admin: oferta individual en el upsert de producto + oferta por lote (`aplicarOfertaLoteAction`/`quitarOfertaLoteAction`).
- Etiquetas de oferta personalizables (CRUD persistido como JSON en `ConfiguracionEcommerce` key `etiquetas_oferta`).

### 3.16 Combos — IMPLEMENTADO (doble fuente de verdad)

- **DB**: `ComboEcommerce` + `ComboItemEcommerce` (CRUD admin en `combos.ts`, detalle público `getComboByIdAction`).
- **Fallback hardcodeado**: `src/data/combos.ts` (`COMBOS_DATA`, IDs 9001–9003, `COMBOS_CATEGORY_ID = 9999` mágico). Si la DB está vacía, el home y el catálogo muestran los combos fake (con **stock sintético de piso 10**).
- Los combos se agregan al carrito como producto sintético (`esCombo: true`) y al crear el pedido descuentan sus componentes.

### 3.17 Banners — PARCIALMENTE IMPLEMENTADO

- `HeroBanners`: banners estáticos en código (linkean a `/ofertas?marca=...`). No hay entidad de banner en DB ni CRUD.

### 3.18 Configuración general — IMPLEMENTADO

- `ConfiguracionEcommerce` (key-value). `getConfiguracionAction`/`updateConfiguracionAction` + `DEFAULT_CONFIG` (nombre, logo, dirección, WhatsApp, flags UI como `mostrar_banner_promocion`).
- Identidad visual admin (vista "identidad"): logo vía `uploadLogoAction`.
- **La auditoría del panel se guarda como JSON en la key `historial_auditoria`** (tope 50 entradas, con 3 entradas demo hardcodeadas como fallback) — no es una tabla real.

### 3.19 Imágenes y archivos — PARCIALMENTE IMPLEMENTADO

- Avatares staff: `uploadStaffPhotoAction` escribe en `public/uploads/avatars/` y **espeja al repo hermano** `../sgi-repuestos/...` (acoplamiento). Route handler `uploads/avatars/[file]/route.ts` sirve con `path.basename()` y auto-sincroniza desde el SGI.
- Avatares clientes: base64 en localStorage.
- Comprobantes: `public/uploads/comprobantes/` (públicos, sin auth).
- Logos/marcas/productos: subidas vía `uploadMediaAction`/`actualizarLogoMarcaAction` a `public/`.
- **Riesgo**: escritura en runtime sobre `public/` funciona en dev pero **rompe en serverless (FS de solo lectura)** y expone comprobantes públicamente.
- `next.config.ts` vacío: sin `images` configurado; se usa `<img>` crudo.

### 3.20 Perfil de usuario — PARCIALMENTE IMPLEMENTADO

- Staff: `UserProfileModal` → cambio de contraseña real (`updateStaffProfileAction`, valida contraseña actual, min 4 caracteres, bcrypt) y foto (`uploadStaffPhotoAction`/`deleteStaffPhotoAction`).
- Clientes: perfil en localStorage; avatar base64; sin persistencia en DB.

### 3.21 Reportes y estadísticas — NO IMPLEMENTADO

- Solo 4 tarjetas KPI en el panel (contadores `.length` de pedidos cargados: Total, En Preparación, Preparados, Entregados) y contadores en la vista de auditoría.
- Sin ingresos, sin gráficos, sin rangos de fechas, sin exportación.

### 3.22 Notificaciones y correos — NO IMPLEMENTADO

- **Cero infraestructura de email**: sin nodemailer/resend/sendgrid/smtp en package.json ni en código; sin `fetch` a APIs de mail. `emailCliente` se guarda en el pedido pero nunca se usa.
- Modelos `Notificacion` y `PreferenciaNotificacion` existen en el schema (heredados del SGI) pero **ningún código del ecommerce los toca** (grep verificado: 0 matches).
- Existe un `FloatingWhatsApp` (link estático) y nada más.

---

## 4. Flujos completos

### 4.1 Registro e inicio de sesión

**Staff:**
1. `LoginModal.handleStaffLogin` → `AuthContext.loginStaff` → `loginStaffAction` (`auth.ts:28`).
2. Busca por username/correo/dni (case-insensitive), valida `activo` (usuario y empleado), compara con bcrypt.
3. Devuelve `{ id, username, nombreCompleto, rol, dni, correo, telefono, fotoUrl, cargo }` → se guarda en `localStorage["chopper_user"]` (texto plano) → redirect a `/panel`.

**Cliente:**
1. `LoginModal.handleLogin` → `loginClient` (AuthContext, 100% client-side):
   - Cuenta demo hardcodeada `cliente@gmail.com` / `cliente123` (comparación en claro; el error literalmente devuelve "Usá: cliente123").
   - O busca en `localStorage["chopper_clients"]` (passwords en claro).
   - **Fallback: acepta CUALQUIER credencial** y fabrica un usuario con `id: Date.now()`.
2. Registro (`handleRegister`): solo llama `loginClient` — **no persiste nada**, descarta teléfono/email del formulario.
3. Recuperación de contraseña: **simulada** (muestra código de 6 dígitos sin enviar nada; acepta cualquier código ≥ 4 dígitos). No hay backend de reset.

### 4.2 Navegación del cliente

Home → catálogo (`/ofertas`, filtros client-side) → detalle de producto/combo → `addToCart` (carrito en localStorage) → `/carrito` → `/checkout` → `crearPedidoOnlineAction` → redirección a `/mis-pedidos?num=...`. Menú: Ofertas, Combos, Nosotros, Mis Pedidos, buscador, carrito con badge, login/perfil.

### 4.3 Compra completa (carrito → pedido)

1. Cliente agrega items (stock acotado en cliente).
2. Checkout: formulario + `validarPreciosServerAction` (server re-valida precios/stock/publicación y devuelve warnings).
3. `handleConfirmar`: regla efectivo⇒retiro; `crearPedidoOnlineAction`:
   - upsert Cliente por DNI → re-verifica precios → calcula totales → genera `numero` → `$transaction` (pedido + items + descuento de stock + auditoría).
4. Si transferencia con archivo: `subirComprobantePedidoAction` (queda PENDIENTE, notas fijas).
5. Espejo en localStorage del navegador + `clearCart()` → `/mis-pedidos?num=`.

### 4.4 Métodos de pago y validación

| Método (`metodoPago`) | Selección | Registro | Pasarela | Comprobante | Validación | Aprobación | Estado inicial |
|---|---|---|---|---|---|---|---|
| `TRANSFERENCIA` | Radio checkout | Datos estáticos del banco mostrados (alias CHOPPER.REPUESTOS, CBU Banco Macro) | **No** | Opcional (archivo imagen/PDF) | Solo que el archivo exista | **Manual** por ENCARGADO_VENTAS/ADMIN en panel | `PENDIENTE` |
| `TARJETA` (débito/crédito/"Mercado Pago") | Radio checkout | Formulario de tarjeta **que nunca se envía al server**; botón de tarjeta ficticia de prueba | **No — simulación total** | No | Ninguna real | **Auto-aprobada** (simulada) | `CONFIRMADO` (con nota falsa "aprobado por pasarela online") |
| `EFECTIVO_LOCAL` | Radio checkout | Genera orden de compra `OC-{numero}` | No | No | No | Cobro físico en mostrador | `CONFIRMADO` (nota: pendiente de cobro en caja) |

- **Rechazo de transferencia**: `rechazarComprobantePedidoAction` → vuelve a `PENDIENTE`, borra `comprobanteUrl` y agrega nota de rechazo. **Bug de argumentos invertidos** desde el panel.
- **Mercado Pago NO está integrado**: 0 matches de SDK/API/webhook en todo el repo; solo texto de marketing en checkout y FAQ.

### 4.5 Estados y gestión de pedidos (staff)

- Campo: `PedidoEcommerce.estado` (string, default `PENDIENTE`).
- **Estados operativos reales en código** (6, no 5):
  1. `PENDIENTE` — nuevos / a verificar pago
  2. `CONFIRMADO` — pago verificado o auto-aprobado
  3. `PREPARANDO` — en preparación por stock
  4. `LISTO_ENTREGA` — listos para entregar (el panel también tolera el legacy `LISTO_PARA_RETIRAR`)
  5. `ENTREGADO` — entregados
  6. `CANCELADO` — terminal (repon stock)
- La UI de "Mis pedidos" remapea para mostrar: `ENTREGADO→"RETIRADO"`, `LISTO_ENTREGA→"LISTO_PARA_RETIRAR"`. El localStorage paralelo usa aún otro dialecto (`LISTO_PARA_RETIRAR`, `RETIRADO`).
- **Transiciones**: creación (PENDIENTE o CONFIRMADO según método); staff `→PREPARANDO` (asigna preparador ENCARGADO_STOCK, setea `fechaPreparacion`); `→LISTO_ENTREGA`/`LISTO_PARA_RETIRAR` según modalidad; `→ENTREGADO`; `→CANCELADO` (repone stock); rechazo de comprobante `→PENDIENTE`.
- **Cambio de estado**: `actualizarEstadoPedidoAction(userId, pedidoId, nuevoEstado, asignarPreparadorId?, notas?)` — guard `verifyStaff` (3 roles). **Sin matriz de transiciones**: cualquier estado puede saltar a cualquier estado (el panel incluso entrega pedidos aún en PENDIENTE).
- **Quién**: solo staff autenticado (en teoría; en la práctica las actions confían en un userId del cliente — ver seguridad).
- **Historial**: **no hay tabla de historial de estados de pedidos**. Solo el JSON de auditoría (`historial_auditoria`, tope 50) y la columna `notas` (que se sobrescribe con facilidad).
- **Consulta cliente**: `/mis-pedidos` muestra timeline (25/50/75/100%), filtros por tab, nombre del preparador, link WhatsApp, "repetir pedido". **Botones de acción del cliente** ("Marcar como Entregado", "Registrar Cobro", "Cancelar") solo cambian el **localStorage**, nunca la DB.

### 4.6 Preparación y entrega

- Al pasar a PREPARANDO se asigna un preparador (`getStaffPreparadoresAction` lista candidatos). El panel tiene vista Kanban por estado (`estado_pedidos`) y vista de preparación.
- Modal de entrega del panel: puede marcar entregado (incluye pedidos en estados intermedios — salto forzado). El costo/envío y dirección quedan registrados en el pedido.

### 4.7 Administración de productos y stock

- Catálogo panel: `upsertCommercialProductAction` (alta/edición), oferta por lote, `uploadMediaAction`, crear categorías, CRUD de marcas con logo.
- Stock: edición del campo `cantidad` del producto; cada venta/cancelación genera `MovimientoProducto`. El `Proveedor` es requerido en el schema pero no tiene UI en esta app (los productos vienen sembrados desde el SGI).

### 4.8 Gestión de usuarios y permisos

- Alta de usuarios/roles NO está en este ecommerce (se hace desde el SGI sobre las tablas compartidas). El panel solo consume `Usuario`/`Rol`/`Empleado` para login, preparadores y auditoría.

---

## 5. Frontend y diseño

### 5.1 Estructura de páginas

Storefront: `/` (home), `/ofertas` (catálogo), `/producto/[id]`, `/combos` (redirect) y `/combos/[id]`, `/combo/[id]` (alias), `/carrito`, `/checkout`, `/mis-pedidos`, `/nosotros` (+ `/contacto` stub), `/confirmacion` (huérfano), `/comprobante` (stub). Admin: `/panel` (una sola ruta, vistas por estado React `activeView`, sin routing).

### 5.2 Componentes reutilizables

- Layout: `Header`, `Footer`, `CategoryDrawer`, `AppLayoutWrapper` (shell oscuro para `/panel` sin footer), `FloatingWhatsApp`, `LoginModal`, `UserProfileModal`.
- Home: `HeroBanners`, `OfertasSection`, `MasVendidosSection`, `MarcasCarrusel`, `CombosSection`, `FaqSection`.
- Productos: `ProductCard`, `CategoryFilter`.

### 5.3 Navegación y layouts

- Root layout: `ThemeProvider → AuthProvider → CartProvider → AppLayoutWrapper`.
- `/panel` usa un shell oscuro full-screen (`bg-[#0f1012]`, sin footer). El resto: `main max-w-7xl` + Footer + WhatsApp flotante.

### 5.4 Estilos

- Tailwind v4 con `@theme` (brand `#d62828`, hover `#b91c1c`) y dark mode por clase (`@custom-variant dark`).
- **Deuda técnica**: ~590 de 709 líneas de `globals.css` son overrides `html.light ... !important` que pelean con las utilidades de Tailwind (por componentes que hardcodean clases `dark:`/`text-slate-*`).

### 5.5 Formularios y modales

- LoginModal (tabs staff/cliente/recuperación), UserProfileModal (datos + contraseña + foto), checkout (formulario largo con secciones condicionales), formularios CRUD del panel (productos, marcas, combos, etiquetas), modal de entrega, modal de calificación (local).

### 5.6 Responsive

- Header con buscador colapsable en mobile, CategoryDrawer lateral, grid de productos responsive, panel admin con sidebar. Patrón general mobile-first con Tailwind.

### 5.7 Organización panel vs tienda

- Tienda: rutas App Router con server components para datos + client components para interacción.
- Panel: **un único client component de 5.628 líneas con ~88 `useState`** y vistas conmutadas (`pedidos`, `estado_pedidos`, `catalogo`, `marcas`, `combos`, `etiquetas`, `identidad`, `auditoria`, `entrega`, `preparacion`).

---

## 6. Backend y seguridad

### 6.1 APIs y endpoints

- **Un solo route handler**: `GET src/app/uploads/avatars/[file]/route.ts` (gentleman: sirve avatares, fallback a `../sgi-repuestos`, `path.basename`, `Cache-Control` anual).
- **Todo lo demás son Server Actions** ("use server"), públicamente invocables:

| Archivo | Exportaciones |
|---|---|
| `auth.ts` | `loginStaffAction`, `updateStaffProfileAction`, `uploadStaffPhotoAction`, `deleteStaffPhotoAction`, `getFreshUserAction` |
| `pedidos.ts` | `crearPedidoOnlineAction`, `getPedidosEcommerceAction`, `getMisPedidosClienteAction`, `actualizarEstadoPedidoAction`, `getStaffPreparadoresAction`, `subirComprobantePedidoAction`, `rechazarComprobantePedidoAction` |
| `commercial.ts` | `getCommercialProductsAction`, `upsertCommercialProductAction`, `getCategoriasAdminAction`, `crearCategoriaAction`, `getMarcasAdminAction`, `getMarcasPublicasAction`, `crearMarcaAction`, `actualizarLogoMarcaAction`, `editarMarcaCompletaAction`, `toggleMarcaAction`, `toggleMultiplesMarcasAction`, `validarPreciosServerAction`, `aplicarOfertaLoteAction`, `quitarOfertaLoteAction` |
| `combos.ts` | `getPublicCombosAction`, `getComboByIdAction`, `getAllCombosAdminAction`, `upsertComboAction`, `toggleComboEstadoAction`, `eliminarComboAction` |
| `configuracion.ts` | `getConfiguracionAction`, `updateConfiguracionAction`, `uploadLogoAction`, `uploadMediaAction`, `getEtiquetasOfertaAction`, `crearEtiquetaOfertaAction`, `toggleEtiquetaOfertaAction`, `editarEtiquetaOfertaAction`, `getAuditoriaLogsAction`, `registrarAuditoriaAction` |
| `ecommerce.ts` | `getCategories`, `getProducts`, `getProductById` |

### 6.2 Autenticación y autorización

- **Staff**: login real con bcrypt; el `userId` resultante se guarda en `localStorage` y **las server actions lo reciben como argumento del cliente**. `verifyStaff(userId)` solo chequea que ese ID sea de un rol staff en DB. **No hay cookie, ni JWT, ni middleware** → cualquier persona puede invocar `actualizarEstadoPedidoAction(1, ...)` desde la consola y actuar como admin (IDOR / escalada de privilegios).
- **Clientes**: sin autenticación real (fallback que acepta cualquier cosa; passwords en claro en localStorage).
- **Guard de UI del panel**: solo `useEffect` client-side que redirige si no hay `user` en localStorage (inyectable). Sin `middleware.ts`.
- `JWT_SECRET` existe en el env pero **no se usa**.

### 6.3 Validaciones del servidor

- Sin zod ni librería de validación. Solo: `trim`, limpieza de DNI (puntos/espacios), re-lectura y re-precificación de items en server, allowlist de extensiones en subidas, `path.basename` contra path traversal, `sanitizeModulo` para el log de auditoría. Mínimo de contraseña: 4 caracteres.

### 6.4 Subida y almacenamiento de archivos

- Avatares staff y comprobantes se escriben en `public/uploads/` en runtime (+ espejo a `../sgi-repuestos`). Comprobantes quedan **públicos**. Validación solo por extensión (sin magic bytes).

### 6.5 Manejo de errores

- Server actions con try/catch y mensajes de error en español para el usuario; los estados de carga/error se manejan en cada client component. Sin logging estructurado ni monitoreo.

### 6.6 Amenazas ausentes

Sin rate limiting, sin CSRF (más allá del mismo-origin de server actions), sin security headers (`next.config.ts` vacío), sin protección contra enumeración de DNI/pedidos.

---

## 7. Métodos y validación de pagos (detalle)

Ya tablado en 4.4. Puntos clave para futuras modificaciones:

- El "pago con tarjeta" **escribe en la DB** (`pedidos.ts:222-224`) una nota afirmando que una pasarela aprobó un cobro que **nunca ocurrió**. El pedido nace `CONFIRMADO`.
- La UI avisa que el comprobante de transferencia podrá adjuntarse después desde "Mis Pedidos", pero **`mis-pedidos` no tiene UI de subida** (solo checkout y panel la usan).
- `cuotas` se acepta en el input pero **no se persiste** (solo se inyecta en el string de notas).
- Quién aprueba transferencias: ENCARGADO_VENTAS / ADMINISTRADOR desde el panel (revisión del comprobante).
- Estados de pago vs estado operativo: **están mezclados en el mismo campo `estado` del pedido**. `PENDIENTE` ≈ "pago por verificar"; `CONFIRMADO` ≈ "pago OK"; no hay campo `estadoPago` separado.

---

## 8. Gestión y estados de pedidos (detalle)

- Valores internos exactos: `PENDIENTE`, `CONFIRMADO`, `PREPARANDO`, `LISTO_ENTREGA`, `ENTREGADO`, `CANCELADO` (+ legacy tolerado `LISTO_PARA_RETIRAR` en panel; dialecto extra en localStorage: `RETIRADO`).
- El usuario menciona 5 estados operativos; en el código hay **6** porque `CONFIRMADO` existe como etapa real entre "por verificar" y "armar".
- Sin historial persistente de transiciones, sin validador de máquina de estados, sin distinción estructurada pago vs operativo, sin webhooks.
- Distinción envío/retiro: sí, vía `modalidadEntrega` + `costoEnvio` + lógica de exclusividad con efectivo.

---

## 9. Modalidades de entrega

- `RETIRO_LOCAL`: costo 0, dirección no requerida.
- `MOTOMANDADO`: costo fijo $2.500, dirección requerida, pago por transferencia o tarjeta (nunca efectivo).
- Sin zonas, sin cálculo automático, sin integración con logística. El costo es configurable "a medias": el cliente puede enviar `costoEnvio` pero el UI siempre manda 2500.

---

## 10. Panel administrativo

- **Archivo**: `src/app/panel/page.tsx` (5.628 líneas, ~88 useState, vistas por `activeView`).
- **Vistas**: pedidos (default, con KPIs y filtros), estado_pedidos (Kanban), catálogo (productos/ofertas/descuentos por lote), marcas, combos, etiquetas de oferta, identidad (config de tienda), auditoría, entrega, preparación.
- **Funciones**: ver/gestionar pedidos, cambiar estados, verificar o rechazar comprobantes, asignar preparadores, CRUD de productos/marcas/categorías/combos/etiquetas, ofertas por lote, subida de imágenes/logos, config de tienda, ver auditoría JSON.
- **No tiene**: reportes con métricas reales, gestión de usuarios, módulo de clientes independiente, notificaciones, ajustes de envío.
- **Acceso**: sin guard server-side de página; la seguridad depende de que cada action verifique `userId` (que el cliente controla).

---

## 11. Funcionalidades actuales del cliente

- Explorar catálogo con filtros, ver ofertas/combos, buscar.
- Carrito en navegador, checkout con 3 métodos de pago (2 simulados/manuales).
- Consultar sus pedidos por DNI o número (`/mis-pedidos`) con timeline y estado.
- Perfil y avatar locales (localStorage).
- Contacto por WhatsApp/mailto.
- **No puede**: crear cuenta real, recuperar contraseña, subir comprobante desde mis pedidos, cancelar/devolver (los botones solo tocan el localStorage), recibir notificaciones.

---

## 12. Correos y notificaciones existentes

- **NO IMPLEMENTADO**: cero proveedores de email, cero envíos, cero plantillas, cero registro de correos.
- **Modelos DB listos pero sin uso**: `Notificacion` (con enum de 11 tipos, índice `[usuarioId, leida]`) y `PreferenciaNotificacion`.
- **Infraestructura reutilizable para futuras notificaciones**: las server actions de cambio de estado (`actualizarEstadoPedidoAction`) y creación (`crearPedidoOnlineAction`) son los puntos naturales de enganche; `emailCliente` ya se persiste en el pedido.

---

## 13. Archivos y funciones relevantes (mapa técnico)

| Funcionalidad | Archivo | Funciones/claves principales |
|---|---|---|
| Conexión DB | `src/lib/prisma.ts` | singleton `prisma` (PrismaPg adapter) |
| Config Prisma | `prisma.config.ts` | `DIRECT_URL`/`DATABASE_URL` |
| Schema | `prisma/schema.prisma` | 34 modelos; ecommerce usa 14 |
| Login staff | `src/actions/auth.ts` | `loginStaffAction`, `updateStaffProfileAction`, `uploadStaffPhotoAction`, `deleteStaffPhotoAction`, `getFreshUserAction` |
| Sesión cliente (falsa) | `src/context/AuthContext.tsx` | `loginClient`, `handleRegister` (en LoginModal), localStorage `chopper_user` |
| Carrito | `src/context/CartContext.tsx` | `addToCart`, `updateQuantity`, `crearPedido` (localStorage), key `choper_cart` |
| Lecturas catálogo | `src/actions/ecommerce.ts` | `getProducts`, `getProductById`, `getCategories` |
| Catálogo admin | `src/actions/commercial.ts` | `upsertCommercialProductAction`, `validarPreciosServerAction`, ofertas por lote, marcas/categorías |
| Pedidos | `src/actions/pedidos.ts` | `crearPedidoOnlineAction` (93), `actualizarEstadoPedidoAction` (530), `getMisPedidosClienteAction` (460), `subirComprobantePedidoAction` (749), `rechazarComprobantePedidoAction` (807), `verifyStaff` (64) |
| Checkout | `src/app/checkout/page.tsx` | `handleConfirmar`, simulación de tarjeta, reglas efectivo/retiro |
| Mis pedidos | `src/app/mis-pedidos/page.tsx` | query por DNI/número, timeline, fallback localStorage |
| Panel admin | `src/app/panel/page.tsx` | ~5.628 líneas; vistas `activeView`; KPIs; Kanban; verificación de comprobantes |
| Combos | `src/actions/combos.ts` + `src/data/combos.ts` | CRUD DB + fallback hardcodeado `COMBOS_DATA` |
| Configuración/auditoría | `src/actions/configuracion.ts` | key-value + `historial_auditoria` JSON + etiquetas |
| Avatares | `src/app/uploads/avatars/[file]/route.ts` | route handler con sync a SGI |
| Home | `src/app/page.tsx` + `src/components/home/*` | secciones con datos fabricados en cliente |
| Seeds/demo | `scripts/*.ts`, `scratch/*.ts` | pedidos demo, combos, tests de auditoría (pass admin/1234) |

---

## 14. Problemas detectados (priorizados)

### ALTA

1. **Sin sesión server-side / IDOR total en actions** (`AuthContext.tsx`, todas las actions): el `userId` lo controla el cliente; cualquiera puede ejecutar acciones de staff con `userId: 1` desde la consola. Bloquea cualquier RBAC real.
2. **Autenticación de clientes falsa** (`AuthContext.tsx:157`): fallback que acepta cualquier credencial; contraseñas en claro en localStorage; el error de login de la cuenta demo revela la password.
3. **Pagos con tarjeta auto-aprobados sin pasarela** (`pedidos.ts:222-224`): la DB afirma un cobro inexistente; el pedido nace CONFIRMADO.
4. **Stock no re-validado en la creación del pedido** (`crearPedidoOnlineAction`): el checkout envía cantidades sin topear pese a que `validarPreciosServerAction` las limita; permite pedidos por encima del stock real.
5. **Acceso a pedidos solo por DNI** (`getMisPedidosClienteAction`, `mis-pedidos/page.tsx`): cualquiera que conozca/advine un DNI ve los pedidos ajenos; sin verificación de identidad.
6. **Subida de comprobantes sin autenticación** (`subirComprobantePedidoAction`): cualquiera con el número de pedido adjunta archivos (y pisa `notas`); archivos quedan públicos en `/public/uploads/comprobantes`.

### MEDIA

7. **Bug de argumentos invertidos** al rechazar comprobante: `panel/page.tsx:5783` llama `rechazarComprobantePedidoAction(pedidoId, userId, ...)` pero la firma es `(userId, pedidoId, motivo)` (`pedidos.ts:807`).
8. **Doble verdad de pedidos**: espejo en `localStorage["choper_pedidos"]` (con 3 pedidos demo sembrados) vs `PedidoEcommerce` en Postgres; los botones de estado de "Mis pedidos" solo mutan el localStorage.
9. **`/confirmacion` huérfano** con dirección de la tienda hardcodeada y incorrecta.
10. **Sin máquina de estados**: cualquier salto entre estados permitido; el modal de entrega fuerza ENTREGADO desde PENDIENTE.
11. **Sin historial de estados de pedidos** (solo JSON de auditoría de 50 entradas en config).
12. **Datos fabricados en home** (ratings, reseñas, descuentos inventados) — riesgo para la credibilidad de la tesis si se demuestra.
13. **Acoplamiento al repo hermano SGI** en subida/servicio de avatares y esquema compartido; escritura en `public/` en runtime (rompe en serverless).
14. **`numero` de pedido generado fuera de la transacción** (carrera entre checkouts; el unique es la única red de seguridad).
15. **`commercial.ts` con guard laxo** (`includes("ADMIN")`) vs igualdad exacta en el resto — inconsistencia de permisos.
16. **Credenciales demo visibles** en `scratch/test-fase1.ts` (admin/1234, etc.) y en mensajes de error.

### BAJA

17. `panel/page.tsx` monolítico de 5.628 líneas (mantenibilidad).
18. Schema con 20 modelos muertos para esta app; `Proveedor` requerido sin UI.
19. Doble fuente de verdad de combos (DB + hardcodeado) con stock sintético 10.
20. Home ignora el param `cat`; CategoryDrawer hardcodeado con link muerto a `/panel?tab=comprobante`.
21. `globals.css` con ~590 líneas de `!important` para el tema claro.
22. Sin tests, CI, ni config de despliegue; `next.config.ts` vacío; sin `loading/error/not-found`.
23. `cuotas` no persistido; reseñas/calificaciones del cliente no persistidas.
24. Sin cancelación automática de órdenes vencidas (la UI lo promete, no hay cron).

---

## 15. Recomendaciones técnicas (orden sugerido)

1. **Sesiones reales primero** (cookies httpOnly firmadas con `JWT_SECRET` ya disponible, o Auth.js): todo lo demás (RBAC, rate limit, IDOR) depende de esto.
2. Capa de validación con **zod** en todas las server actions.
3. **Máquina de estados** explícita para `PedidoEcommerce.estado` + tabla de historial (`pedido_estado_historial` con actor, fecha, estado anterior/nuevo).
4. Separar **estado de pago** (`estadoPago`) del **estado operativo** del pedido.
5. Re-validar **stock dentro de la transacción** de creación del pedido (o `updateMany` condicional con cantidad ≥ pedida).
6. Partir `panel/page.tsx` en módulos (pedidos, kanban, catálogo, settings, auditoría) con split container/presentacional.
7. Para la tesis: **Gmail SMTP + Nodemailer** en server actions (crear pedido, cambio a CONFIRMADO/PREPARANDO/LISTO/ENTREGADO), con idempotencia (evitar duplicados) y registro de envíos/errores; credenciales solo en `.env`.
8. Mercado Pago: si se necesita demo real, integrar Preferencias/Checkout API en server; si no, renombrar la opción simulada para no afirmar cobros falsos.
9. Endurecer uploads (magic bytes, carpeta fuera de `public/` o storage gestionada) y desacoplar del repo SGI.
10. Agregar tests (vitest/playwright) sobre `pedidos.ts` y `auth.ts` antes de tocar el flujo de compra.

---

## 16. Propuesta de implementación de notificaciones y seguimiento (sin programar)

### A. Correos con Gmail + Nodemailer

- Punto de enganche natural: `crearPedidoOnlineAction` (pedido recibido / por verificar), `actualizarEstadoPedidoAction` (CONFIRMADO, PREPARANDO, LISTO_ENTREGA, ENTREGADO, CANCELADO), `rechazarComprobantePedidoAction`.
- Reutilizar `PedidoEcommerce.emailCliente` (ya persistido).
- Infra a crear: cliente Nodemailer singleton con SMTP de Gmail (app password) vía `.env`; plantillas HTML simples en español; tabla `pedido_email_log` (pedidoId, tipo, estado, enviadoEn, error) para evitar duplicados (unicidad por pedido+tipo+estado) y auditar fallos.
- El envío debe ser **best-effort**: el cambio de estado no debe fallar si el correo falla (try/catch + log).

### B. Seguimiento para el cliente

- Ya existe la base: `/mis-pedidos` + `getMisPedidosClienteAction`. Mejoras mínimas: historial de estados (nueva tabla), y endurecer el acceso (código de acceso por pedido o sesión real) para evitar enumeración por DNI.

### C. Adaptación según pago y entrega

- Separar `estadoPago` (VERIFICADO/RECHAZADO/PENDIENTE) del estado operativo; el flujo de transferencia solo avanza a PREPARANDO cuando `estadoPago = VERIFICADO`; el flujo de efectivo avanza al cobro en mostrador al entregar.

### D. Seguridad y confiabilidad

- Idempotencia de correos vía log con clave única; reintentos acotados con backoff; credenciales solo en env; guard server-side de roles (sobre sesiones reales, no userId del cliente); verificación de propiedad de pedido al consultar; y política "estado primero, correo después con retry" para no perder transiciones.

---

## 17. Preguntas o decisiones pendientes

1. ¿El ecommerce debe seguir compartiendo tablas con el SGI o conviene un schema propio recortado (14 modelos)?
2. ¿Los 5 estados del negocio incluyen `CONFIRMADO` como etapa visible o se oculta al cliente (hoy se remapea)?
3. ¿Se quiere pasarela real (Mercado Pago) para la tesis o basta la simulación con transparencia en la UI?
4. ¿El costo de envío debe ser configurable (ConfiguracionEcommerce) y por zona?
5. ¿Se persisten reseñas/calificaciones de productos o se eliminan las fake del detalle?
6. ¿Se implementa cancelación automática de órdenes no pagadas (cron) o solo manual?
7. ¿Se mantiene la cuenta demo de cliente o se elimina al implementar registro real?
8. ¿El panel debe estar en el mismo deployment o separarse?

---

*Fin del documento. Generado por relevamiento de solo lectura; ninguna verificación de runtime contra la base de datos en vivo fue realizada (todo se derivó del código fuente y el schema). Los estados de datos demo (pedidos sembrados, usuarios admin/1234) provienen de los scripts de seed del repo.*

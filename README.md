# Real Herramientas Stock

Control de stock único para los dos canales de venta (Mercado Libre y la web propia).
Next.js + TypeScript + Tailwind, con Google Sheets como base de datos y deploy en Vercel.

Producción: https://real-herramientas-stock.vercel.app

## Estado

| Etapa | Contenido | Estado |
|---|---|---|
| 1 | Proyecto base, repo y deploy en Vercel | Lista |
| 2 | Conexión con el Sheet e importación del relevamiento | Pendiente |
| 3 | Panel de stock y registro de movimientos | Pendiente |
| 4 | Dashboard de métricas | Pendiente |
| 5 | Exportación a Excel, login y ajustes finales | Pendiente |

## Instalación local

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local   # completar las variables
npm run dev                  # http://localhost:3000
```

## Estructura

```
src/
  app/
    (app)/dashboard/   panel de métricas
    (app)/stock/       tabla de control de stock
    (app)/importar/    carga inicial del relevamiento
  components/          componentes de UI
  lib/                 acceso a datos y reglas de stock
scripts/               script que crea la estructura del Sheet
docs/                  pruebas manuales
```

## Configuración del Sheet y credenciales

Se documenta en la etapa 2.

## Deploy en Vercel

1. En Vercel, **Add New → Project** e importar este repo de GitHub.
2. Framework: Next.js (se detecta solo). No hace falta cambiar comandos.
3. Cargar las variables de `.env.example` en **Settings → Environment Variables**.
4. Cada push a `main` se publica automáticamente.

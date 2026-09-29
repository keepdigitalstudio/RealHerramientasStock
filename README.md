# Real Herramientas Stock

Control de stock único para los dos canales de venta (Mercado Libre y la web propia).
Next.js + TypeScript + Tailwind, con Google Sheets como base de datos y deploy en Vercel.

Producción: https://real-herramientas-stock.vercel.app

## Estado

| Etapa | Contenido | Estado |
|---|---|---|
| 1 | Proyecto base, repo y deploy en Vercel | Lista |
| 2 | Conexión con el Sheet e importación del relevamiento | Lista |
| 3 | Panel de stock y registro de movimientos | Lista |
| 4 | Dashboard de métricas | Pendiente |
| 5 | Exportación a Excel, login y ajustes finales | Pendiente |

## Instalación local

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local   # completar las variables (ver abajo)
npm run dev                  # http://localhost:3000
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run setup-sheet` | Crea las pestañas y encabezados del Sheet de datos (no borra nada) |
| `npm run sample-relevamiento` | Genera en `samples/` dos Excel de prueba: uno válido y uno con errores |
| `node scripts/env-from-key.mjs` | Arma `.env.local` desde `secrets/service-account.json` |

## Estructura

```
src/
  app/
    (app)/dashboard/   panel de métricas
    (app)/stock/       tabla de stock, detalle con historial, alta y edición
    (app)/importar/    carga inicial del relevamiento
  components/          componentes de UI
  lib/sheets/          cliente de Google Sheets y estructura de las pestañas
  lib/import/          lectura y validación del relevamiento, y carga inicial
  lib/stock/           productos, movimientos, estados y anulaciones
  proxy.ts             protección temporal con usuario y contraseña
scripts/               crear el Sheet, generar Excel de prueba, armar .env.local
samples/               Excel de prueba con datos ficticios
docs/                  pruebas manuales
```

## Configuración del Sheet y credenciales

La app guarda todo en un Google Sheet propio (**no** en el Excel del relevamiento), con
cuatro pestañas:

| Pestaña | Contenido |
|---|---|
| Productos | Una fila por SKU: stock actual, mínimo, ubicaciones, IDs de Mercado Libre y web |
| Movimientos | Log de todos los ingresos y egresos. Nunca se borra; el stock se puede recalcular desde acá |
| Stock_inicial | Copia intacta de las filas del relevamiento importado |
| Usuarios | Usuarios de la app (etapa 5) |

No editar estas pestañas a mano: todo cambio de stock tiene que pasar por la app.

### Pasos

1. **Sheet:** crear un Google Sheet vacío y copiar su ID (lo que está entre `/d/` y `/edit` en la URL).
2. **Proyecto de Google Cloud:** en <https://console.cloud.google.com>, crear un proyecto y
   habilitar la **Google Sheets API**.
3. **Cuenta de servicio:** en *IAM y administración → Cuentas de servicio*, crear una sin roles.
   En *Claves → Agregar clave → JSON*, descargar la clave y guardarla como
   `secrets/service-account.json` (la carpeta `secrets/` está en `.gitignore`).
4. **Compartir el Sheet** con el email de la cuenta de servicio, como **Editor**.
5. Poner el ID en `.env.local` (`GOOGLE_SHEET_ID=...`) y correr
   `node scripts/env-from-key.mjs` para completar las demás variables de Google.
6. Correr `npm run setup-sheet` para crear las pestañas.

La clave privada es una contraseña: no pegarla en chats, mails ni en el repo. Si se filtra,
borrarla en Google Cloud y crear una nueva.

### Importación del relevamiento

En **Importar** se sube el Excel del relevamiento (desde Google Sheets: *Archivo → Descargar →
Microsoft Excel*). Se leen las pestañas cuyo nombre empieza con `Conteo`, buscando la fila de
encabezados por nombre (Fecha, Zona, Módulo, Nivel, Marca, SKU, Descripción, Cajas cerradas,
Unid./caja, Unid. sueltas, Total, Observaciones). No se usa `Resumen_SKU`: sus fórmulas no
sobreviven la descarga como .xlsx.

- El stock de cada SKU es la suma de todas sus filas (`cajas × unid./caja + sueltas`).
- Los SKU se comparan sin distinguir mayúsculas ni espacios extra.
- **Errores** (bloquean): fila sin SKU, cantidades no enteras o negativas, cajas sin unid./caja,
  un mismo SKU con marcas distintas.
- **Advertencias** (hay que tildar que se revisaron): Total de la planilla distinto del calculado,
  filas con total 0, descripciones distintas para un SKU, el mismo SKU cargado varias veces en la
  misma ubicación, recuentos con diferencia en la pestaña `Recuentos`.
- La importación inicial se hace una sola vez (con Productos vacío) y escribe las tres pestañas
  en una operación atómica. Cada SKU recibe un movimiento de ingreso con motivo `inicial`.

## Stock y movimientos

- **Estado:** *Sin stock* con 0 o menos; *Bajo* cuando hay un mínimo cargado y el stock llega a
  ese mínimo o menos; *OK* en el resto.
- **Movimientos:** ingreso (compra, reposición, devolución, ajuste) o egreso (venta, rotura,
  pérdida, ajuste). Las ventas piden canal (Mercado Libre o web); las devoluciones lo admiten
  opcionalmente.
- El stock solo cambia con movimientos. Cada movimiento y el nuevo stock del producto se guardan
  en una sola operación atómica.
- **Anular:** registra el movimiento inverso con motivo `anulacion`; el original queda en el
  historial marcado como anulado. El stock inicial y las anulaciones no se anulan.
- **Dar de baja** un producto lo oculta de la tabla y bloquea sus movimientos, pero conserva el
  historial. El SKU no se puede cambiar.

### Concurrencia

La app está pensada para una persona a la vez, así que no usa un candado externo. Igual se
cubren los casos que pasan con un solo usuario:

- **Envíos duplicados** (doble toque, reintentos por mala conexión): cada formulario genera un
  identificador al abrirse; si el mismo movimiento llega dos veces, se guarda una sola.
- **Stock desactualizado en pantalla** (dos pestañas o dispositivos): antes de guardar se relee el
  stock del Sheet y se calcula sobre ese valor; si cambió desde que se abrió el formulario, se pide
  confirmación.
- Un egreso que deja el stock negativo también pide confirmación y queda marcado en el historial.

Si más adelante la usan varias personas al mismo tiempo, conviene sumar un candado por SKU
(por ejemplo con Upstash Redis) en `registerMovement`.

## Deploy en Vercel

1. En Vercel, **Add New → Project** e importar este repo de GitHub.
2. Framework: Next.js (se detecta solo). No hace falta cambiar comandos.
3. Cargar las variables de `.env.example` en **Settings → Environment Variables**
   (se puede pegar un archivo `.env` entero). `GOOGLE_PRIVATE_KEY` va en una línea con `\n`.
4. Cada push a `main` se publica automáticamente. Después de cambiar variables hay que
   volver a desplegar (*Deployments → ⋯ → Redeploy*).

Hasta que exista el login (etapa 5), el sitio está protegido con usuario y contraseña del
navegador (`BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`). Si faltan en Vercel, el sitio responde
503 en vez de quedar abierto.

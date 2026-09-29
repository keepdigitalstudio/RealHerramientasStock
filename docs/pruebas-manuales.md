# Pruebas manuales

## Etapa 1 — Proyecto base

- [ ] `/` redirige a `/dashboard`.
- [ ] El menú lleva a Dashboard, Stock e Importar y marca la sección activa.
- [ ] En el celular (≈390 px) el encabezado se ve completo y el menú no desborda la pantalla.
- [ ] El deploy en Vercel responde en la URL pública.

## Etapa 2 — Sheet e importación

Preparar los archivos de prueba con `npm run sample-relevamiento` (quedan en `samples/`).

Protección temporal
- [ ] Al entrar al sitio publicado, el navegador pide usuario y contraseña.
- [ ] Con datos incorrectos no deja entrar; con los correctos, sí.

Validaciones (subir `samples/relevamiento-con-errores.xlsx`)
- [ ] Muestra 5 errores: fila sin SKU, cantidad inválida ("dos"), cajas sin unid./caja,
      cantidad negativa y `BEL-MEC-06` con dos marcas.
- [ ] Muestra advertencias: Total que no coincide, fila con total 0, descripciones distintas,
      doble carga en la misma ubicación y un recuento con diferencia.
- [ ] No aparece el botón de confirmar.

Otros archivos
- [ ] Un archivo que no es .xlsx (por ejemplo un .csv o un PDF) muestra un mensaje claro.
- [ ] La plantilla del relevamiento vacía avisa que no hay nada para importar.

Importación correcta (subir `samples/relevamiento-ok.xlsx`)
- [ ] Resumen: 5 filas leídas, 4 SKUs, 75 unidades, 0 errores.
- [ ] `BEL-MEC-06` figura con 27 unidades y dos ubicaciones (A-A01-1, B-B01-3).
- [ ] Al confirmar: mensaje "Importación completa". En el Sheet, Productos tiene 4 filas,
      Movimientos 4 (motivo `inicial`) y Stock_inicial 5.
- [ ] Al volver a subir cualquier archivo, avisa que ya hay productos cargados y no deja confirmar.
- [ ] En el celular, el resumen y la tabla se leen bien y el botón de confirmar queda visible.
- [ ] Borrar las filas de prueba del Sheet (dejar los encabezados) antes de importar el relevamiento real.

## Etapa 3 — Stock y movimientos

Tabla
- [ ] Muestra SKU, producto, stock, mínimo y estado de cada producto, con color discreto
      (verde OK, ámbar Bajo, rojo Sin stock).
- [ ] La búsqueda encuentra por SKU, descripción, marca y ubicación.
- [ ] Los filtros de estado y marca funcionan, y se combinan con la búsqueda.
- [ ] Al tocar cada encabezado se ordena; al tocarlo de nuevo se invierte el orden.
- [ ] "Agrupar variantes" junta los productos con el mismo producto base y muestra su stock total.
- [ ] En el celular la tabla pasa a tarjetas y la pantalla no se desplaza hacia los costados.

Movimientos
- [ ] Ingreso por compra de 5: el stock sube 5 y aparece en el historial con fecha y hora.
- [ ] Venta: obliga a elegir canal (Mercado Libre o web). Rotura/pérdida no muestran canal.
- [ ] "Stock después" muestra el resultado antes de guardar.
- [ ] Un egreso mayor al stock pide confirmación; al cancelar, el stock no cambia; al confirmar,
      queda negativo y el historial lo marca.
- [ ] Doble toque rápido en "Guardar" registra un solo movimiento.
- [ ] Con el producto abierto en dos pestañas: registrar un movimiento en una y después otro en la
      segunda sin recargar → avisa que el stock cambió.
- [ ] Anular un movimiento: el stock vuelve al valor anterior, el original queda tachado y no se
      puede anular de nuevo.

Productos
- [ ] Editar: cambiar producto base, variante, mínimo, ubicaciones e IDs; el stock no es editable.
- [ ] Con mínimo mayor o igual al stock, el estado pasa a Bajo.
- [ ] Alta con un SKU existente (aunque cambien mayúsculas o espacios) muestra un error.
- [ ] Alta con stock inicial: aparece en la tabla y su historial tiene el movimiento "Stock inicial".
- [ ] Dar de baja: desaparece de la tabla (aparece con "Ver dados de baja") y no permite movimientos.

## Etapa 4 — Dashboard

- [ ] "Stock hoy" coincide con la tabla de Stock (productos activos, unidades, bajo el mínimo,
      sin stock). Al tocar "Bajo el mínimo" o "Sin stock" se abre la tabla filtrada.
- [ ] Al cambiar el período (7 / 30 / 90 días / 1 año) cambian las fechas, las ventas y los
      gráficos; la tarjeta "Stock hoy" no cambia.
- [ ] Registrar una venta por Mercado Libre y otra por web: suben "Unidades vendidas", las
      tarjetas de cada canal, la barra del día en "Ventas por canal" y "Más vendidos".
- [ ] Anular una de esas ventas: deja de contar en todas las métricas.
- [ ] Un ingreso por compra aparece en "Ingresos y egresos"; el stock inicial de la importación no.
- [ ] Al pasar el mouse (o tocar en el celular) una barra o la línea, el tooltip muestra los valores.
- [ ] "Ver tabla" en cada gráfico muestra los mismos números.
- [ ] Con pocos días de historial: "Se agotan pronto" avisa que la estimación todavía no es
      confiable y "Stock inmovilizado" indica desde qué fecha se calcula.
- [ ] En el celular todo se lee en una columna y no hay desplazamiento lateral.

## Etapa 5 — Login, permisos y exportación

Login
- [ ] Sin sesión, cualquier pantalla lleva al login; después de ingresar vuelve a la pantalla pedida.
- [ ] Usuario o contraseña incorrectos muestran "Usuario o contraseña incorrectos".
- [ ] El usuario se acepta con mayúsculas o espacios de más.
- [ ] "Salir" cierra la sesión y vuelve al login.

Operador (`real`)
- [ ] El menú muestra solo Dashboard y Stock; no aparecen "Nuevo producto" ni "Editar producto".
- [ ] Entrar a mano a `/importar`, `/usuarios` o `/stock/nuevo` lleva al Dashboard.
- [ ] Un egreso que deja el stock negativo se rechaza con un mensaje claro.
- [ ] Los movimientos registrados figuran con el nombre del operador en el historial.

Admin
- [ ] Ve Importar y Usuarios.
- [ ] Usuarios: cambiar la contraseña de `real` y entrar con la nueva.
- [ ] Crear un usuario de prueba, ingresar con él, desactivarlo y comprobar que ya no puede
      registrar movimientos (ni volver a ingresar).
- [ ] No se puede desactivar a sí mismo.

Exportación
- [ ] Stock → Exportar → Stock actual: baja `stock-AAAA-MM-DD.xlsx` con una fila por producto y
      los mismos números que la tabla.
- [ ] Movimientos de un rango: baja un Excel solo con los movimientos de esas fechas; los egresos
      tienen cantidad negativa y los anulados figuran como tales.
- [ ] Abrir los archivos en Excel y en Google Sheets: encabezado verde fijo y filtros.

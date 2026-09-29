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

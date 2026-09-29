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

# Manual de uso

`manual.html` es la fuente del manual (`../Manual-Real-Herramientas-Stock.pdf`). Las capturas
están en `img/`; las del Dashboard usan datos de ejemplo para mostrar los gráficos completos.

Para regenerar el PDF después de editar el HTML:

1. `npm install playwright-core pypdf` (y Microsoft Edge instalado).
2. `node render-pdf.mjs` → genera `_cover.pdf` (portada, sin márgenes) y `_body.pdf` (resto, con
   número de página).
3. Unir las dos partes (portada primero) con pypdf o cualquier herramienta de PDF.

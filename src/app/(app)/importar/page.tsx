import { ImportForm } from "./import-form";

export default function ImportarPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Importar relevamiento</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Subí el Excel del relevamiento. Se leen las pestañas <b>Conteo_*</b>, se suma el stock
          de cada SKU y antes de guardar ves un resumen con errores y advertencias. Desde Google
          Sheets: Archivo → Descargar → Microsoft Excel (.xlsx).
        </p>
      </div>
      <ImportForm />
    </section>
  );
}

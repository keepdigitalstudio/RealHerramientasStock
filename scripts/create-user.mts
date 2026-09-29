// Crea un usuario en la pestaña Usuarios. La contraseña se pasa por variable de entorno
// para que no quede en el historial de la terminal ni se imprima.
// Uso:
//   NEW_USER_PASSWORD='...' npm run create-user -- --login keep@ejemplo.com --nombre Keep --rol admin
import { parseArgs } from "node:util";
import { createUser } from "../src/lib/auth/users";

const { values } = parseArgs({
  options: {
    login: { type: "string" },
    nombre: { type: "string" },
    rol: { type: "string", default: "operador" },
  },
});

const password = process.env.NEW_USER_PASSWORD ?? "";
if (!values.login || !values.nombre || !password) {
  console.error("Faltan datos: --login, --nombre y la variable NEW_USER_PASSWORD son obligatorios.");
  process.exit(1);
}
if (values.rol !== "admin" && values.rol !== "operador") {
  console.error('El rol tiene que ser "admin" u "operador".');
  process.exit(1);
}

await createUser({ login: values.login, nombre: values.nombre, rol: values.rol, password });
console.log(`✔ Usuario ${values.login} (${values.rol}) creado.`);

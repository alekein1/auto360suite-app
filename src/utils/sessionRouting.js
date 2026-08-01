export function resolveRootRouteForUser(user) {
  const tipoUsuario = String(user?.tipo_usuario || "").toUpperCase();
  const rolDb = String(user?.rol || "").toLowerCase();
  const tipoTecnico = String(user?.tipo_tecnico || "").toUpperCase();

  if (tipoUsuario === "ADMIN") {
    return "Admin";
  }

  if (
    rolDb === "legalizacion_contratos" ||
    tipoTecnico.includes("LEGALIZACION") ||
    tipoTecnico.includes("LEGALIZACIÓN")
  ) {
    return "Legalizacion";
  }

  if (tipoUsuario === "TECNICO") {
    if (tipoTecnico.includes("IDENTIFICACIÓN")) {
      return "Identificacion";
    }

    if (tipoTecnico.includes("AUTO SERVICIOS")) {
      return "AutoServicio";
    }
  }

  return "Home";
}

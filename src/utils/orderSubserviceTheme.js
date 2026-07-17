function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getOrderSubserviceTheme(subserviceName) {
  const normalized = normalizeText(subserviceName);

  if (normalized.includes("verificacion")) {
    return {
      backgroundColor: "#dbeafe",
      borderColor: "#60a5fa",
      textColor: "#1d4ed8",
    };
  }

  if (normalized.includes("historial")) {
    return {
      backgroundColor: "#dcfce7",
      borderColor: "#4ade80",
      textColor: "#166534",
    };
  }

  if (
    normalized.includes("constancia") ||
    normalized.includes("legalizacion") ||
    normalized.includes("contrato")
  ) {
    return {
      backgroundColor: "#fef3c7",
      borderColor: "#f59e0b",
      textColor: "#92400e",
    };
  }

  if (normalized.includes("certificado")) {
    return {
      backgroundColor: "#fee2e2",
      borderColor: "#f87171",
      textColor: "#b91c1c",
    };
  }

  if (normalized.includes("precompra")) {
    return {
      backgroundColor: "#fce7f3",
      borderColor: "#f472b6",
      textColor: "#be185d",
    };
  }

  if (normalized.includes("mecanica")) {
    return {
      backgroundColor: "#ede9fe",
      borderColor: "#8b5cf6",
      textColor: "#6d28d9",
    };
  }

  return {
    backgroundColor: "#e0e7ff",
    borderColor: "#818cf8",
    textColor: "#3730a3",
  };
}

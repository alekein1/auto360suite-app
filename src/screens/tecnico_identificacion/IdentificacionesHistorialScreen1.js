import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import * as IntentLauncher from "expo-intent-launcher";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";

const API = "https://api360suite.pqautoexpert.ec/api";
const ADMIN_IDENTIFICACION_EMAIL = "pq.ec593@gmail.com";

// =========================
// Helpers
// =========================
function money2(v) {
  const n = Number(v);
  if (Number.isFinite(n)) return n.toFixed(2);
  return "0.00";
}

function formatDateEC(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  try {
    return d.toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function badgeStyleByEstado(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "finalizada") return { bg: "#16a34a", fg: "#fff", text: "FINALIZADA" };
  if (e === "en_proceso") return { bg: "#f59e0b", fg: "#111827", text: "EN PROCESO" };
  return { bg: "#6b7280", fg: "#fff", text: String(estado || "OTRO").toUpperCase() };
}

function vehicleLabel(row) {
  const vehiculo = String(row?.vehiculo || "").trim();
  if (vehiculo && vehiculo !== "—") return vehiculo;

  return [row?.marca, row?.modelo]
    .map((value) => String(value || "").trim())
    .filter((value) => value && value !== "—")
    .join(" ") || "—";
}

// =========================
// Screen
// =========================
export default function IdentificacionesHistorialScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState(null);

  const [registros, setRegistros] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;

  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [enviandoWhatsappId, setEnviandoWhatsappId] = useState(null);

  useEffect(() => {
    SecureStore.getItemAsync("usuario")
      .then((storedUser) => {
        if (storedUser) setUsuario(JSON.parse(storedUser));
      })
      .catch((error) => {
        console.log("Usuario identificacion warning:", error.message);
      });
    cargarIdentificaciones();
  }, []);

  const correoUsuario = String(
    usuario?.correo || usuario?.email || usuario?.usuario || ""
  ).toLowerCase();
  const esAdminIdentificacion = correoUsuario === ADMIN_IDENTIFICACION_EMAIL;

  async function getToken() {
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      navigation?.replace?.("Login");
      throw new Error("Token no encontrado");
    }
    return token;
  }

  async function cargarIdentificaciones() {
    try {
      setLoading(true);

      const token = await getToken();
      const res = await fetch(`${API}/identificacion/listar`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      const list = json?.identificaciones || [];

      setRegistros(list);
      setPaginaActual(1);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error cargando identificaciones");
    } finally {
      setLoading(false);
    }
  }

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return registros;

    return (registros || []).filter((r) => {
      const placa = String(r?.placa || "").toLowerCase();
      const cedula = String(r?.cedula || "").toLowerCase();
      const solicitante = String(r?.solicitante || "").toLowerCase();
      const marca = String(r?.marca || "").toLowerCase();
      const modelo = String(r?.modelo || "").toLowerCase();
      const vehiculo = String(r?.vehiculo || "").toLowerCase();
      const cert = String(r?.numero_certificado || "").toLowerCase();
      const orden = String(r?.id_orden || "").toLowerCase();
      return (
        placa.includes(t) ||
        cedula.includes(t) ||
        solicitante.includes(t) ||
        marca.includes(t) ||
        modelo.includes(t) ||
        vehiculo.includes(t) ||
        cert.includes(t) ||
        orden.includes(t)
      );
    });
  }, [registros, busqueda]);

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(registrosFiltrados.length / registrosPorPagina));
  }, [registrosFiltrados.length]);

  const datosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    return registrosFiltrados.slice(inicio, fin);
  }, [registrosFiltrados, paginaActual]);

  useEffect(() => {
    if (paginaActual > totalPaginas) setPaginaActual(1);
  }, [totalPaginas]);

  async function verPDF(id_orden) {
    try {
      if (!esAdminIdentificacion) {
        Alert.alert("No permitido", "Solo el administrador puede imprimir este PDF.");
        return;
      }

      setGenerandoPdf(true);

      const token = await getToken();
      const url = `${API}/identificacion/pdf/${id_orden}`;

      const fileUri =
        FileSystem.documentDirectory +
        `identificacion_${id_orden}_${Date.now()}.pdf`;

      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Platform.OS === "ios") {
        navigation.navigate("PdfPreview", {
          uri: download.uri,
          title: `PDF Orden #${id_orden}`,
        });
        return;
      }

      try {
        if (Platform.OS === "android") {
          const contentUri = await FileSystem.getContentUriAsync(download.uri);

          await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
            data: contentUri,
            type: "application/pdf",
            flags: 1,
          });
        } else {
          Alert.alert("PDF listo", `Guardado en: ${download.uri}`);
        }
      } catch (openError) {
        console.log(openError);

        if (!(await Sharing.isAvailableAsync())) {
          Alert.alert("PDF listo", `Guardado en: ${download.uri}`);
          return;
        }

        Alert.alert(
          "Vista previa no disponible",
          "El PDF se descargó correctamente. Puedes compartirlo si deseas abrirlo con otra aplicación.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Compartir",
              onPress: () => {
                Sharing.shareAsync(download.uri).catch((shareError) => {
                  console.log(shareError);
                  Alert.alert("Error", "No se pudo compartir el PDF");
                });
              },
            },
          ]
        );
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo generar/abrir el PDF");
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function enviarIdentificacionWhatsapp(id_orden) {
    if (!esAdminIdentificacion) {
      Alert.alert("No permitido", "Solo el administrador puede enviar esta certificación por WhatsApp.");
      return;
    }

    Alert.alert(
      "WhatsApp",
      `¿Enviar la certificación de la orden ${id_orden} por WhatsApp?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          onPress: async () => {
            try {
              setEnviandoWhatsappId(id_orden);
              const token = await getToken();

              const res = await fetch(`${API}/identificacion/pdf/${id_orden}/whatsapp`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
              });

              const json = await res.json().catch(() => ({}));

              if (!res.ok || !json.ok) {
                throw new Error(json.mensaje || "No se pudo enviar la certificación por WhatsApp.");
              }

              Alert.alert("WhatsApp", "Certificación enviada por WhatsApp correctamente.");
            } catch (e) {
              console.log(e);
              Alert.alert("WhatsApp", e.message || "No se pudo enviar la certificación por WhatsApp.");
            } finally {
              setEnviandoWhatsappId(null);
            }
          },
        },
      ]
    );
  }

  function editarOrden(id_orden) {
    // ⚠️ Ajusta el nombre si tu pantalla de edición tiene otro route name.
    // Si NO tienes pantalla de edición aún, comenta esta línea.
    navigation.navigate("Identificacion", { id_orden });
  }

  function regresarInicio() {
    navigation.navigate("HomeIdentificacion");
  }

  function Pagination() {
    if (totalPaginas <= 1) return null;

    const maxVisible = 5;
    let start = Math.max(1, paginaActual - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > totalPaginas) {
      end = totalPaginas;
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];
    pages.push({ type: "prev", page: paginaActual - 1, disabled: paginaActual === 1 });

    if (start > 1) {
      pages.push({ type: "page", page: 1, active: paginaActual === 1 });
      if (start > 2) pages.push({ type: "dots" });
    }

    for (let p = start; p <= end; p++) pages.push({ type: "page", page: p, active: p === paginaActual });

    if (end < totalPaginas) {
      if (end < totalPaginas - 1) pages.push({ type: "dots" });
      pages.push({ type: "page", page: totalPaginas, active: paginaActual === totalPaginas });
    }

    pages.push({ type: "next", page: paginaActual + 1, disabled: paginaActual === totalPaginas });

    return (
      <View style={styles.paginationWrap}>
        {pages.map((it, idx) => {
          if (it.type === "dots") {
            return (
              <View key={`dots-${idx}`} style={styles.pageDots}>
                <Text style={styles.pageDotsText}>…</Text>
              </View>
            );
          }

          const label = it.type === "prev" ? "«" : it.type === "next" ? "»" : String(it.page);

          return (
            <TouchableOpacity
              key={`${it.type}-${it.page}-${idx}`}
              style={[
                styles.pageBtn,
                it.active && styles.pageBtnActive,
                it.disabled && styles.pageBtnDisabled,
              ]}
              onPress={() => {
                if (it.disabled) return;
                setPaginaActual(it.page);
              }}
              disabled={it.disabled}
            >
              <Text style={[styles.pageBtnText, it.active && styles.pageBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={{ marginTop: 10 }}>Cargando identificaciones...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>📄 Identificación Vehicular</Text>
              <Text style={styles.cardHeaderSubtitle}>Registros generados</Text>
            </View>

            <TouchableOpacity style={styles.btnHeader} onPress={regresarInicio}>
              <Text style={styles.btnHeaderText}>⬅ Inicio</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={busqueda}
              onChangeText={(t) => {
                setBusqueda(t);
                setPaginaActual(1);
              }}
              placeholder="🔍 Buscar por placa, marca, modelo, cédula, orden o certificado..."
              placeholderTextColor="#6b7280"
            />
          </View>

          {/* List */}
          <View style={{ padding: 12 }}>
            {datosPagina.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No hay registros</Text>
              </View>
            ) : (
              datosPagina.map((r, idx) => {
                const badge = badgeStyleByEstado(r?.estado_orden);
                const vehiculo = vehicleLabel(r);

                return (
                  <View key={`${r?.id_orden}-${idx}`} style={styles.itemCard}>
                    {(() => {
                      const enviandoWhatsapp = enviandoWhatsappId === r?.id_orden;

                      return (
                        <>
                    {/* Top row */}
                    <View style={styles.itemTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>
                          {r?.placa || "SIN PLACA"} • Orden #{r?.id_orden}
                        </Text>
                        <Text style={styles.itemSub}>
                          Vehículo: <Text style={{ fontWeight: "900" }}>{vehiculo}</Text>
                        </Text>
                        <Text style={styles.itemSub}>
                          Certificado: <Text style={{ fontWeight: "900" }}>{r?.numero_certificado || "-"}</Text>
                        </Text>
                      </View>

                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.text}</Text>
                      </View>
                    </View>

                    {/* Middle info (minimal) */}
                    <View style={styles.itemGrid}>
                      <View style={styles.kv}>
                        <Text style={styles.k}>Marca / Modelo</Text>
                        <Text style={styles.v}>{vehiculo}</Text>
                      </View>

                      <View style={styles.kv}>
                        <Text style={styles.k}>Cédula</Text>
                        <Text style={styles.v}>{r?.cedula || "-"}</Text>
                      </View>

                      <View style={styles.kv}>
                        <Text style={styles.k}>Solicitante</Text>
                        <Text style={styles.v}>{r?.solicitante || "-"}</Text>
                      </View>

                      <View style={styles.kv}>
                        <Text style={styles.k}>Fecha</Text>
                        <Text style={styles.v}>{formatDateEC(r?.fecha)}</Text>
                      </View>
                    </View>

                    {/* Actions (always visible) */}
                    <View style={styles.actionsRow}>
                      {esAdminIdentificacion && (
                        <TouchableOpacity
                          style={[styles.btnAction, styles.btnOutlinePrimary]}
                          onPress={() => verPDF(r?.id_orden)}
                          disabled={generandoPdf}
                        >
                          <Text style={styles.btnActionTextPrimary}>
                            {generandoPdf ? "Generando..." : "🖨 Ver PDF"}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {esAdminIdentificacion && (
                        <TouchableOpacity
                          style={[styles.btnAction, styles.btnSuccess]}
                          onPress={() => enviarIdentificacionWhatsapp(r?.id_orden)}
                          disabled={enviandoWhatsapp || generandoPdf}
                        >
                          <Text style={styles.btnActionTextLight}>
                            {enviandoWhatsapp ? "Enviando..." : "📲 WhatsApp"}
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnWarning]}
                        onPress={() => editarOrden(r?.id_orden)}
                      >
                        <Text style={styles.btnActionTextDark}>✏️ Editar</Text>
                      </TouchableOpacity>
                    </View>
                        </>
                      );
                    })()}
                  </View>
                );
              })
            )}
          </View>

          <Pagination />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =========================
// Styles (minimal + pro)
// =========================
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f6f9" },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  card: {
    margin: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  cardHeader: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardHeaderTitle: { color: "#fff", fontWeight: "900", fontSize: 15 },
  cardHeaderSubtitle: { color: "#cbd5e1", fontWeight: "800", fontSize: 12, marginTop: 2 },

  btnHeader: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnHeaderText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  searchRow: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontWeight: "700",
    color: "#111827",
  },

  emptyBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  emptyText: { fontWeight: "900", color: "#6b7280" },

  itemCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eef2f7",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },

  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  itemTitle: { fontWeight: "900", color: "#111827", fontSize: 14 },
  itemSub: { marginTop: 4, fontWeight: "800", color: "#475569", fontSize: 12 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeText: { fontWeight: "900", fontSize: 10 },

  itemGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },

  kv: {
    flexGrow: 1,
    minWidth: "30%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#eef2f7",
  },
  k: { fontSize: 11, fontWeight: "900", color: "#64748b" },
  v: { marginTop: 2, fontSize: 13, fontWeight: "900", color: "#111827" },

  actionsRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  btnAction: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  btnOutlinePrimary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  btnActionTextPrimary: { color: "#2563eb", fontWeight: "900", fontSize: 12 },

  btnWarning: { backgroundColor: "#f59e0b" },
  btnSuccess: { backgroundColor: "#16a34a" },
  btnActionTextDark: { color: "#111827", fontWeight: "900", fontSize: 12 },
  btnActionTextLight: { color: "#fff", fontWeight: "900", fontSize: 12 },

  paginationWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#eef2f7",
  },

  pageBtn: {
    minWidth: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
  },
  pageBtnActive: {
    backgroundColor: "#111d4d",
    borderColor: "#111d4d",
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontWeight: "900", color: "#111827" },
  pageBtnTextActive: { color: "#fff" },

  pageDots: {
    minWidth: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pageDotsText: { fontWeight: "900", color: "#6b7280" },
});

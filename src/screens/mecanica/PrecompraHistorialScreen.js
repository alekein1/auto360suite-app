import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";

const API = "https://api360suite.pqautoexpert.ec/api";

function safeText(v) {
  if (v === undefined || v === null) return "—";
  const s = String(v).trim();
  return s.length ? s : "—";
}

function money(n) {
  const x = Number(n || 0);
  if (Number.isNaN(x)) return "0.00";
  return x.toFixed(2);
}

function fechaEC(f) {
  if (!f) return "—";
  try {
    return new Date(f).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function PrecompraHistorialScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState(null);
  const [actionId, setActionId] = useState(null);

  const [historial, setHistorial] = useState([]);
  const [modo, setModo] = useState("pendientes");
  const [busqueda, setBusqueda] = useState("");
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginasServidor, setTotalPaginasServidor] = useState(1);

  // paginación
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;
  const totalPaginas = totalPaginasServidor;
  const datosPagina = historial;

  useEffect(() => {
    cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, pagina]);

  async function authHeaders() {
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      navigation?.replace?.("Login");
      throw new Error("Token no encontrado");
    }
    return { Authorization: `Bearer ${token}` };
  }

  async function cargarHistorial({ resetPage = false } = {}) {
    try {
      setLoading(true);
      const nextPage = resetPage ? 1 : pagina;

      const query = [
        ["estado", modo],
        ["page", String(nextPage)],
        ["limit", String(porPagina)],
        ["q", busqueda.trim()],
      ]
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&");

      const res = await fetch(`${API}/precompra/listar?${query}`, {
        headers: await authHeaders(),
      });

      const json = await res.json();

      const arr = Array.isArray(json?.historial) ? json.historial : [];
      setHistorial(arr);
      setTotalRegistros(Number(json?.total || arr.length));
      setTotalPaginasServidor(Math.max(1, Number(json?.total_pages || 1)));
      if (resetPage) setPagina(1);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo cargar el historial de precompra.");
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  }

  function buscar() {
    setPagina(1);
    cargarHistorial({ resetPage: true });
  }

  function cambiarModo(nextModo) {
    setModo(nextModo);
    setPagina(1);
    setBusqueda("");
  }

  async function finalizarPrecompra(item) {
    Alert.alert(
      "Finalizar precompra",
      `¿Finalizar la orden #${item.id_orden}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Finalizar",
          onPress: async () => {
            try {
              setActionId(item.id_orden);
              const res = await fetch(`${API}/precompra/finalizar/${item.id_precompra}`, {
                method: "PUT",
                headers: await authHeaders(),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok || !json.ok) throw new Error(json.msg || "No se pudo finalizar.");
              Alert.alert("Listo", "Precompra finalizada correctamente.");
              cargarHistorial();
            } catch (error) {
              console.log(error);
              Alert.alert("Error", error.message || "No se pudo finalizar.");
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  }

  async function eliminarPrecompra(item) {
    Alert.alert(
      "Eliminar orden",
      `Se eliminará la orden #${item.id_orden} y sus datos de precompra. ¿Continuar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setActionId(item.id_orden);
              const res = await fetch(`${API}/precompra/orden/${item.id_orden}`, {
                method: "DELETE",
                headers: await authHeaders(),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok || !json.ok) throw new Error(json.msg || "No se pudo eliminar.");
              Alert.alert("Eliminada", "Orden de precompra eliminada correctamente.");
              cargarHistorial();
            } catch (error) {
              console.log(error);
              Alert.alert("Error", error.message || "No se pudo eliminar.");
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  }

  async function verPDFPrecompra(item) {
    const idOrden = item?.id_orden;
    if (!idOrden) return Alert.alert("Error", "ID de orden inválido");

    try {
      setPrintingId(idOrden);

      const headers = await authHeaders();
      const url = `${API}/precompra/pdf/${idOrden}`;

      // ✅ descarga con headers (sin FileReader)
      const fileUri =
        FileSystem.documentDirectory +
        `precompra_${idOrden}_${Date.now()}.pdf`;

      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers,
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("PDF listo", `Guardado en: ${download.uri}`);
        return;
      }

      await Sharing.shareAsync(download.uri);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo generar/abrir el PDF.");
    } finally {
      setPrintingId(null);
    }
  }

  function Pagination() {
    if (totalPaginas <= 1) return null;

    return (
      <View style={styles.pager}>
        <TouchableOpacity
          style={[styles.pagerBtn, pagina === 1 && { opacity: 0.5 }]}
          disabled={pagina === 1}
          onPress={() => setPagina((p) => Math.max(1, p - 1))}
        >
          <Text style={styles.pagerBtnText}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.pagerText}>
          Página {pagina} / {totalPaginas}
        </Text>

        <TouchableOpacity
          style={[
            styles.pagerBtn,
            pagina === totalPaginas && { opacity: 0.5 },
          ]}
          disabled={pagina === totalPaginas}
          onPress={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
        >
          <Text style={styles.pagerBtnText}>▶</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={{ marginTop: 10, fontWeight: "800" }}>
            Cargando precompras…
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.h1}>📄 Gestión Precompra</Text>
          <Text style={styles.h2}>
            Total registros: {totalRegistros}
          </Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, modo === "pendientes" && styles.tabActive]}
            onPress={() => cambiarModo("pendientes")}
          >
            <Text style={[styles.tabText, modo === "pendientes" && styles.tabTextActive]}>Pendientes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, modo === "finalizadas" && styles.tabActive]}
            onPress={() => cambiarModo("finalizadas")}
          >
            <Text style={[styles.tabText, modo === "finalizadas" && styles.tabTextActive]}>Finalizadas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por cliente, cédula, placa, orden..."
            placeholderTextColor="#94a3b8"
            returnKeyType="search"
            onSubmitEditing={buscar}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={buscar}>
            <Text style={styles.searchBtnText}>Buscar</Text>
          </TouchableOpacity>
        </View>

        {/* Botones arriba */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnDark]}
            onPress={() => navigation?.goBack?.()}
          >
            <Text style={styles.btnText}>⬅ Regresar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => cargarHistorial()}
          >
            <Text style={styles.btnText}>⟳ Recargar</Text>
          </TouchableOpacity>
        </View>

        <Pagination />

        {/* Lista */}
        {datosPagina.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.muted}>No hay registros</Text>
          </View>
        ) : (
          datosPagina.map((h, idx) => {
            const numero = (pagina - 1) * porPagina + idx + 1;

            return (
              <View key={`${h.id_orden}-${idx}`} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardIndex}>#{numero}</Text>
                  <Text style={styles.cardTitle}>
                    {safeText(h.cliente_nombre)}
                  </Text>
                </View>

                <View style={styles.grid}>
                  <View style={styles.cell}>
                    <Text style={styles.k}>Cédula</Text>
                    <Text style={styles.v}>{safeText(h.cedula)}</Text>
                  </View>

                  <View style={styles.cell}>
                    <Text style={styles.k}>Placa</Text>
                    <Text style={styles.v}>{safeText(h.placa)}</Text>
                  </View>

                  <View style={styles.cell}>
                    <Text style={styles.k}>Servicio</Text>
                    <Text style={styles.v}>{safeText(h.servicio)}</Text>
                  </View>

                  <View style={styles.cell}>
                    <Text style={styles.k}>Subservicio</Text>
                    <Text style={styles.v}>{safeText(h.subservicio)}</Text>
                  </View>

                  <View style={styles.cell}>
                    <Text style={styles.k}>N° Informe</Text>
                    <Text style={styles.v}>{safeText(h.numero_informe)}</Text>
                  </View>

                  <View style={styles.cell}>
                    <Text style={styles.k}>Fecha</Text>
                    <Text style={styles.v}>{fechaEC(h.fecha_revision)}</Text>
                  </View>
                </View>

                <View style={styles.totalBar}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>${money(h.total_final)}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.btnBig,
                    styles.btnOutline,
                    printingId === h.id_orden && { opacity: 0.7 },
                  ]}
                  onPress={() => verPDFPrecompra(h)}
                  disabled={printingId === h.id_orden}
                >
                  <Text style={styles.btnOutlineText}>
                    {printingId === h.id_orden ? "Generando..." : "🖨 Ver PDF"}
                  </Text>
                </TouchableOpacity>

                {modo === "pendientes" && (
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.finishBtn, actionId === h.id_orden && { opacity: 0.6 }]}
                      disabled={actionId === h.id_orden}
                      onPress={() => finalizarPrecompra(h)}
                    >
                      <Text style={styles.actionBtnText}>Finalizar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn, actionId === h.id_orden && { opacity: 0.6 }]}
                      disabled={actionId === h.id_orden}
                      onPress={() => eliminarPrecompra(h)}
                    >
                      <Text style={styles.actionBtnText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        <Pagination />

        <View style={{ height: Platform.OS === "ios" ? 18 : 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f6f9", padding: 16 },
  scroll: { flex: 1 },

  header: { marginBottom: 12 },
  h1: { fontSize: 18, fontWeight: "900", color: "#111d4d" },
  h2: { marginTop: 4, fontWeight: "800", color: "#6b7280" },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#111d4d",
  },
  tabText: {
    color: "#475569",
    fontWeight: "900",
  },
  tabTextActive: {
    color: "#fff",
  },

  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe2ea",
    borderRadius: 12,
    paddingHorizontal: 12,
    color: "#111827",
    fontWeight: "800",
  },
  searchBtn: {
    backgroundColor: "#debb3c",
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#111d4d",
    fontWeight: "900",
  },

  topRow: { flexDirection: "row", gap: 10, marginBottom: 12 },

  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDark: { backgroundColor: "#111827" },
  btnPrimary: { backgroundColor: "#111d4d" },
  btnText: { color: "#fff", fontWeight: "900" },

  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  pagerBtn: {
    backgroundColor: "#111d4d",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pagerBtnText: { color: "#fff", fontWeight: "900" },
  pagerText: { fontWeight: "900", color: "#111d4d" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 6,
    borderLeftColor: "#111d4d",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  cardIndex: { fontWeight: "900", color: "#6b7280" },
  cardTitle: { flex: 1, fontWeight: "900", color: "#111d4d" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: {
    width: "48%",
    backgroundColor: "#f2f4f8",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e6eaf0",
  },
  k: { fontSize: 11, fontWeight: "900", color: "#6b7280" },
  v: { marginTop: 2, fontWeight: "900", color: "#111827" },

  totalBar: {
    marginTop: 10,
    backgroundColor: "#111d4d",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { color: "#cbd5e1", fontWeight: "900" },
  totalValue: { color: "#fff", fontWeight: "900", fontSize: 16 },

  btnBig: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: "#111d4d",
    backgroundColor: "#fff",
  },
  btnOutlineText: { color: "#111d4d", fontWeight: "900" },

  pendingActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  finishBtn: {
    backgroundColor: "#15803d",
  },
  deleteBtn: {
    backgroundColor: "#b91c1c",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "900",
  },

  emptyBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e6eaf0",
    alignItems: "center",
  },
  muted: { color: "#6b7280", fontWeight: "800" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

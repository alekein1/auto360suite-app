import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";

const API = "https://api360suite.pqautoexpert.ec/api";
const REGISTROS_POR_PAGINA = 10;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

async function authHeaders() {
  const token = await SecureStore.getItemAsync("token");
  return { Authorization: `Bearer ${token}` };
}

export default function LegalizacionesHistorialScreen({ navigation }) {
  const [registros, setRegistros] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarLegalizaciones();
  }, []);

  async function cargarLegalizaciones() {
    try {
      setLoading(true);
      const res = await fetch(`${API}/legalizaciones/listar`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.mensaje || "No se pudo cargar.");
      setRegistros(data.data || []);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message || "No se pudieron cargar las legalizaciones");
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await cargarLegalizaciones();
    setRefreshing(false);
  }

  const filtrados = useMemo(() => {
    const term = normalize(busqueda);
    if (!term) return registros;
    return registros.filter((item) => {
      const index = normalize([
        item.id_orden,
        item.placa,
        item.cliente_nombre,
        item.cliente_cedula,
        item.comprador_nombre,
        item.cedula_comprador,
        item.vendedor_nombre,
        item.cedula_vendedor,
        item.estado,
      ].filter(Boolean).join(" "));
      return index.includes(term);
    });
  }, [registros, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / REGISTROS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const datosPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * REGISTROS_POR_PAGINA;
    return filtrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [filtrados, paginaSegura]);

  function cambiarPagina(next) {
    setPagina(Math.min(Math.max(1, next), totalPaginas));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={styles.loadingText}>Cargando legalizaciones...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Legalizaciones guardadas</Text>
            <Text style={styles.subtitle}>Busca, edita o finaliza contratos legalizados.</Text>
          </View>
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate("HomeLegalizacion")}>
            <Text style={styles.homeBtnText}>Inicio</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por placa, cliente, comprador, vendedor o estado..."
            value={busqueda}
            onChangeText={(text) => {
              setBusqueda(text);
              setPagina(1);
            }}
          />
          <Text style={styles.counter}>{filtrados.length} resultados · {paginaSegura}/{totalPaginas}</Text>
        </View>

        {datosPagina.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>No hay legalizaciones que coincidan con la búsqueda.</Text>
          </View>
        ) : (
          datosPagina.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placa}>{item.placa || "SIN PLACA"}</Text>
                  <Text style={styles.client}>{item.cliente_nombre || "Cliente no registrado"}</Text>
                </View>
                <View style={[styles.statusBadge, item.estado === "FINALIZADO" ? styles.statusDone : styles.statusOpen]}>
                  <Text style={styles.statusText}>{item.estado || "EN PROCESO"}</Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Orden #{item.id_orden}</Text>
                <Text style={styles.infoText}>Comprador: {item.comprador_nombre || item.cedula_comprador || "—"}</Text>
                <Text style={styles.infoText}>Vendedor: {item.vendedor_nombre || item.cedula_vendedor || "—"}</Text>
                <Text style={styles.infoText}>Valor: ${money(item.valor_total)} · Abono: ${money(item.abono)} · Saldo: ${money(item.saldo)}</Text>
                <Text style={styles.infoText}>Guardado: {formatDate(item.fecha_guardado || item.updated_at)}</Text>
                <Text style={styles.infoText}>Guía: {item.guia_envio_path ? "Subida" : "Pendiente"} · PDF: {item.contrato_legalizado_pdf_path ? "Subido" : "Pendiente"}</Text>
              </View>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate("LegalizacionOrden", { id_orden: item.id_orden })}
              >
                <Text style={styles.editBtnText}>Editar / continuar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, paginaSegura === 1 && styles.pageBtnDisabled]}
            disabled={paginaSegura === 1}
            onPress={() => cambiarPagina(paginaSegura - 1)}
          >
            <Text style={styles.pageBtnText}>Anterior</Text>
          </TouchableOpacity>
          <Text style={styles.pageText}>{paginaSegura} / {totalPaginas}</Text>
          <TouchableOpacity
            style={[styles.pageBtn, paginaSegura === totalPaginas && styles.pageBtnDisabled]}
            disabled={paginaSegura === totalPaginas}
            onPress={() => cambiarPagina(paginaSegura + 1)}
          >
            <Text style={styles.pageBtnText}>Siguiente</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f4f7" },
  content: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f2f4f7" },
  loadingText: { marginTop: 12, color: "#111d4d", fontWeight: "800" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  title: { color: "#111d4d", fontSize: 24, fontWeight: "900" },
  subtitle: { marginTop: 4, color: "#667085", fontWeight: "700", lineHeight: 19 },
  homeBtn: { backgroundColor: "#111d4d", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  homeBtnText: { color: "#fff", fontWeight: "900" },
  searchBox: { backgroundColor: "#fff", borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#e5e7eb" },
  searchInput: { backgroundColor: "#f8fafc", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontWeight: "700", borderWidth: 1, borderColor: "#dbe3ef" },
  counter: { marginTop: 8, color: "#111d4d", fontWeight: "900" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 18, padding: 20, alignItems: "center" },
  emptyTitle: { color: "#111d4d", fontSize: 18, fontWeight: "900" },
  emptyText: { marginTop: 8, color: "#667085", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 12, borderLeftWidth: 5, borderLeftColor: "#debb3c", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  placa: { color: "#111d4d", fontSize: 19, fontWeight: "900" },
  client: { marginTop: 4, color: "#111827", fontWeight: "800" },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  statusOpen: { backgroundColor: "#fff7ed" },
  statusDone: { backgroundColor: "#dcfce7" },
  statusText: { color: "#111d4d", fontSize: 11, fontWeight: "900" },
  infoBox: { marginTop: 12, backgroundColor: "#f8fafc", borderRadius: 12, padding: 12 },
  infoText: { color: "#334155", fontWeight: "700", marginBottom: 4 },
  editBtn: { marginTop: 12, backgroundColor: "#111d4d", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  editBtnText: { color: "#fff", fontWeight: "900" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 10 },
  pageBtn: { backgroundColor: "#111d4d", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { color: "#fff", fontWeight: "900" },
  pageText: { color: "#111d4d", fontWeight: "900" },
});

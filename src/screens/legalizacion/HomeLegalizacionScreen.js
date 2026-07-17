import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { unregisterDevicePushNotifications } from "../../services/pushNotifications";

const API = "https://api360suite.pqautoexpert.ec/api";

function isLegalizacion(subservicio = "") {
  const text = String(subservicio).toLowerCase();
  return text.includes("legalizacion") || text.includes("legalización") || text.includes("contrato");
}

function parseVehicleData(raw) {
  let vehiculo = raw;
  if (typeof raw === "string") {
    try {
      vehiculo = JSON.parse(raw);
    } catch {
      vehiculo = {};
    }
  }

  if (!vehiculo || typeof vehiculo !== "object") vehiculo = {};

  return {
    marca: vehiculo.marca || "-",
    modelo: vehiculo.modelo || "",
    anio: vehiculo.anio || vehiculo.anio_fabricacion || "-",
    color: vehiculo.color || "-",
  };
}

function formatClock(value) {
  if (!value) return "--:--";
  return value.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
}

export default function HomeLegalizacionScreen({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const welcomeName = useMemo(() => {
    return `${usuario?.nombres || ""} ${usuario?.apellidos || ""}`.trim();
  }, [usuario]);

  const totales = useMemo(() => {
    return {
      asignadas: ordenes.filter((o) => o.estado_orden === "asignada").length,
      enProceso: ordenes.filter((o) => o.estado_orden === "en_proceso").length,
      total: ordenes.length,
    };
  }, [ordenes]);

  const fetchOrdenes = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          navigation.replace("Login");
          return;
        }

        const response = await fetch(`${API}/tecnico/ordenes`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (!silent) Alert.alert("Error", data?.error || "No se pudieron cargar las órdenes");
          return;
        }

        setOrdenes((data?.ordenes || []).filter((orden) => isLegalizacion(orden.subservicio_nombre)));
        setLastUpdated(new Date());
      } catch (error) {
        console.log(error);
        if (!silent) Alert.alert("Error", "Error al conectar con el servidor");
      }
    },
    [navigation]
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const storedUser = await SecureStore.getItemAsync("usuario");
        if (storedUser && mounted) setUsuario(JSON.parse(storedUser));
        if (mounted) await fetchOrdenes();
      } catch {
        Alert.alert("Error", "No se pudo cargar la información inicial");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [fetchOrdenes]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchOrdenes({ silent: true });
      const interval = setInterval(() => {
        if (active) fetchOrdenes({ silent: true });
      }, 10000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [fetchOrdenes])
  );

  async function cerrarSesion() {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token) await unregisterDevicePushNotifications(token).catch(() => {});
    } finally {
      await SecureStore.deleteItemAsync("expo_push_token");
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("usuario");
      navigation.getParent?.()?.replace("Welcome") || navigation.replace("Welcome");
    }
  }

  async function iniciarOrden(orden) {
    Alert.alert("Iniciar legalización", `¿Desea iniciar la orden #${orden.id_orden}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Iniciar",
        onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync("token");
            const response = await fetch(`${API}/legalizaciones/iniciar/${orden.id_orden}`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.ok) {
              throw new Error(data.mensaje || "No se pudo iniciar la legalización");
            }

            navigation.navigate("LegalizacionOrden", { id_orden: orden.id_orden });
          } catch (error) {
            console.log(error);
            Alert.alert("Error", error.message || "No se pudo iniciar la orden");
          }
        },
      },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchOrdenes();
    setRefreshing(false);
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
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <Text style={styles.heroEyebrow}>Legalización de contratos</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={cerrarSesion}>
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>{welcomeName ? `Bienvenida, ${welcomeName}` : "Bienvenida"}</Text>
          <Text style={styles.heroSubtitle}>
            Gestione órdenes notariales, datos de comprador y vendedor, pagos y archivos de seguimiento.
          </Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Actualización automática cada 10s · {formatClock(lastUpdated)}</Text>
          </View>
        </View>

        <View style={styles.menuRow}>
          <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate("LegalizacionesHistorial")}>
            <Text style={styles.menuTitle}>Legalizaciones guardadas</Text>
            <Text style={styles.menuSubtitle}>Editar, subir guía o finalizar contratos legalizados.</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{totales.total}</Text>
            <Text style={styles.metricLabel}>Total</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{totales.asignadas}</Text>
            <Text style={styles.metricLabel}>Asignadas</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{totales.enProceso}</Text>
            <Text style={styles.metricLabel}>En proceso</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Órdenes de legalización</Text>
          <Text style={styles.sectionHint}>Solo aparecen contratos/legalizaciones asignadas a este rol.</Text>
        </View>

        {ordenes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No hay órdenes disponibles</Text>
            <Text style={styles.emptyText}>Cuando el administrador asigne legalizaciones aparecerán aquí.</Text>
          </View>
        ) : (
          ordenes.map((orden) => {
            const vehiculo = parseVehicleData(orden.datos_vehiculo);
            return (
              <View key={orden.id_orden} style={styles.orderCard}>
                <View style={styles.orderTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.placa}>{orden.placa || "SIN PLACA"}</Text>
                    <Text style={styles.orderClient}>
                      {orden.nombre_cliente} {orden.apellido_cliente}
                    </Text>
                  </View>
                  <View style={styles.orderIdPill}>
                    <Text style={styles.orderIdText}>#{orden.id_orden}</Text>
                  </View>
                </View>
                <Text style={styles.orderCode}>{orden.codigo || "Sin código"}</Text>
                <View style={styles.vehicleBox}>
                  <Text style={styles.vehicleLine}>{vehiculo.marca} {vehiculo.modelo}</Text>
                  <Text style={styles.vehicleMeta}>Año {vehiculo.anio} · Color {vehiculo.color}</Text>
                  <Text style={styles.subservice}>{orden.subservicio_nombre || "Legalización"}</Text>
                </View>
                <TouchableOpacity style={styles.startButton} onPress={() => iniciarOrden(orden)}>
                  <Text style={styles.startButtonText}>Iniciar</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f4f7" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f2f4f7" },
  loadingText: { marginTop: 12, color: "#111d4d", fontWeight: "800" },
  heroCard: {
    backgroundColor: "#111d4d",
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  heroHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  heroEyebrow: { color: "#debb3c", fontWeight: "900", fontSize: 12, textTransform: "uppercase", flexShrink: 1 },
  logoutBtn: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  logoutText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  heroTitle: { marginTop: 10, color: "#fff", fontSize: 26, fontWeight: "900" },
  heroSubtitle: { marginTop: 8, color: "#d7def4", lineHeight: 21, fontWeight: "600" },
  liveBadge: { marginTop: 16, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  liveDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: "#34d399", marginRight: 8 },
  liveText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  menuRow: { marginTop: 16 },
  menuCard: { backgroundColor: "#fff", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  menuTitle: { color: "#111d4d", fontSize: 17, fontWeight: "900" },
  menuSubtitle: { marginTop: 6, color: "#667085", fontWeight: "600", lineHeight: 19 },
  metricsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  metricCard: { flex: 1, backgroundColor: "#fff", borderRadius: 18, paddingVertical: 16, alignItems: "center", borderTopWidth: 5, borderTopColor: "#debb3c" },
  metricValue: { color: "#111d4d", fontSize: 28, fontWeight: "900" },
  metricLabel: { color: "#667085", fontWeight: "800", marginTop: 5 },
  sectionHeader: { marginTop: 22, marginBottom: 12 },
  sectionTitle: { color: "#111d4d", fontSize: 20, fontWeight: "900" },
  sectionHint: { marginTop: 4, color: "#667085", fontWeight: "600" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 18, padding: 20, alignItems: "center" },
  emptyTitle: { color: "#111d4d", fontSize: 18, fontWeight: "900" },
  emptyText: { marginTop: 8, color: "#667085", textAlign: "center", lineHeight: 20 },
  orderCard: { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 12, borderLeftWidth: 5, borderLeftColor: "#debb3c", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  orderTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  placa: { color: "#111d4d", fontWeight: "900", fontSize: 19 },
  orderClient: { marginTop: 4, color: "#111827", fontWeight: "800" },
  orderIdPill: { backgroundColor: "#f8fafc", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  orderIdText: { color: "#111d4d", fontWeight: "900" },
  orderCode: { marginTop: 4, color: "#667085", fontWeight: "700" },
  vehicleBox: { marginTop: 12, backgroundColor: "#f8fafc", borderRadius: 12, padding: 12 },
  vehicleLine: { color: "#111827", fontWeight: "900" },
  vehicleMeta: { marginTop: 4, color: "#667085", fontWeight: "700" },
  subservice: { marginTop: 8, color: "#111d4d", fontWeight: "900" },
  startButton: { marginTop: 12, backgroundColor: "#111d4d", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  startButtonText: { color: "#fff", fontWeight: "900" },
});

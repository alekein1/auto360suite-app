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
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { getOrderSubserviceTheme } from "../../utils/orderSubserviceTheme";
import { unregisterDevicePushNotifications } from "../../services/pushNotifications";

const API = "https://api360suite.pqautoexpert.ec/api";

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
    anio: vehiculo.anio || "-",
    pais: vehiculo.pais || vehiculo.pais_origen || "-",
  };
}

function normalizeModulo(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function formatClock(dateValue) {
  if (!dateValue) return "--:--";

  try {
    return new Date(dateValue).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

function normalizeEstado(value) {
  return String(value || "").trim().toLowerCase();
}

function MetricCard({ label, value, accent }) {
  return (
    <View style={[styles.metricCard, { borderTopColor: accent }]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MenuCard({ title, subtitle, dark, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.menuCard, dark ? styles.menuCardDark : styles.menuCardGold]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Text style={[styles.menuTitle, dark ? styles.menuTitleLight : styles.menuTitleDark]}>
        {title}
      </Text>
      <Text
        style={[
          styles.menuSubtitle,
          dark ? styles.menuSubtitleLight : styles.menuSubtitleDark,
        ]}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeMecanicaScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState({
    asignadas: 0,
    proceso: 0,
    finalizadas: 0,
  });

  const authHeaders = useCallback(async () => {
    const token = await SecureStore.getItemAsync("token");

    if (!token) {
      navigation.replace("Login");
      return null;
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }, [navigation]);

  const cargarOrdenes = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const headers = await authHeaders();
        if (!headers) return;

        const res = await fetch(`${API}/mecanica/listar-ordenes`, {
          headers,
        });

        const json = await res.json().catch(() => ({}));

        if (!json?.ok) {
          setOrdenes([]);
          setStats({
            asignadas: 0,
            proceso: 0,
            finalizadas: 0,
          });

          if (!silent && json?.error) {
            Alert.alert("Error", json.error);
          }
          return;
        }

        const lista = Array.isArray(json?.ordenes)
          ? json.ordenes.filter((o) => normalizeEstado(o?.estado_orden || o?.estado) === "asignada")
          : [];
        const totales = json?.totales || {};

        setOrdenes(lista);
        setStats({
          asignadas: Number(totales.asignadas ?? lista.length ?? 0),
          proceso: Number(totales.en_proceso ?? 0),
          finalizadas: Number(totales.finalizadas ?? 0),
        });
        setLastUpdated(new Date());
      } catch (e) {
        console.log(e);
        if (!silent) {
          Alert.alert("Error", "No se pudieron cargar las ordenes de mecanica");
        }
      }
    },
    [authHeaders]
  );

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await cargarOrdenes();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [cargarOrdenes]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      cargarOrdenes({ silent: true });

      const interval = setInterval(() => {
        if (active) {
          cargarOrdenes({ silent: true });
        }
      }, 10000);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [cargarOrdenes])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarOrdenes();
    setRefreshing(false);
  }, [cargarOrdenes]);

  async function cerrarSesion() {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        await unregisterDevicePushNotifications(token).catch(() => {});
      }
    } finally {
      await SecureStore.deleteItemAsync("expo_push_token");
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("usuario");
      const rootNavigation = navigation.getParent?.();
      if (rootNavigation) rootNavigation.replace("Welcome");
      else navigation.replace("Welcome");
    }
  }

  const pendingCount = useMemo(() => ordenes.length, [ordenes]);

  async function confirmarInicio(orden) {
    Alert.alert(
      "Iniciar orden",
      `¿Desea iniciar la orden #${orden.id_orden}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Iniciar",
          onPress: () => iniciarOrden(orden),
        },
      ]
    );
  }

  async function iniciarOrden(orden) {
    try {
      const headers = await authHeaders();
      if (!headers) return;

      const modulo = normalizeModulo(orden?.subservicio_nombre);

      if (modulo.includes("precompra")) {
        navigation.navigate("PrecompraOrden", { id_orden: orden.id_orden });
        return;
      }

      const res = await fetch(`${API}/mecanica/iniciar/${orden.id_orden}`, {
        method: "PUT",
        headers,
      });

      if (!res.ok) {
        Alert.alert("Error", "No se pudo iniciar la orden de mecanica");
        return;
      }

      navigation.navigate("MecanicaOrden", { id_orden: orden.id_orden });
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo iniciar la orden");
    }
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
          <Text style={styles.heroEyebrow}>Modulo Mecanica</Text>
          <TouchableOpacity
            style={styles.heroLogoutBtn}
            onPress={cerrarSesion}
            activeOpacity={0.9}
          >
            <Text style={styles.heroLogoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.heroTitle}>Ordenes Tecnicas Asignadas</Text>
        <Text style={styles.heroSubtitle}>
          Controle mecanica y precompra desde un solo panel con actualizacion continua.
        </Text>

        <View style={styles.liveRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Actualizacion automatica cada 10s</Text>
          </View>
          <Text style={styles.liveTime}>Ultima: {formatClock(lastUpdated)}</Text>
        </View>
      </View>

      <View style={styles.menuGrid}>
        <MenuCard
          title="🧰 Historial Mecanica"
          subtitle="Ordenes finalizadas y reportes"
          dark
          onPress={() => navigation.navigate("MecanicaHistorial")}
        />
        <MenuCard
          title="📄 Gestión Precompra"
          subtitle="Pendientes, finalizadas, eliminar y PDF"
          onPress={() => navigation.navigate("PrecompraHistorial")}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Resumen operativo</Text>
        <Text style={styles.sectionHint}>
          Hay {pendingCount} orden{pendingCount === 1 ? "" : "es"} activa{pendingCount === 1 ? "" : "s"} en este tablero.
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <MetricCard label="Asignadas" value={stats.asignadas} accent="#111d4d" />
        <MetricCard label="En proceso" value={stats.proceso} accent="#debb3c" />
        <MetricCard label="Finalizadas" value={stats.finalizadas} accent="#16a34a" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ordenes pendientes</Text>
        <Text style={styles.sectionHint}>Deslice para refrescar o espere la sincronizacion automatica.</Text>
      </View>

      {loading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator size="small" color="#111d4d" />
          <Text style={styles.emptyTitle}>Cargando ordenes...</Text>
          <Text style={styles.emptyText}>
            El panel ya esta listo; estamos sincronizando las asignaciones.
          </Text>
        </View>
      ) : ordenes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No tiene ordenes asignadas</Text>
          <Text style={styles.emptyText}>
            Cuando lleguen nuevas asignaciones de mecanica o precompra apareceran aqui.
          </Text>
        </View>
      ) : (
        ordenes.map((orden) => {
          const vehiculo = parseVehicleData(orden?.datos_vehiculo);
          const subserviceTheme = getOrderSubserviceTheme(orden?.subservicio_nombre);

          return (
            <View key={orden.id_orden} style={styles.orderCard}>
              <View style={styles.orderTopRow}>
                <View style={styles.orderTopLeft}>
                  <Text style={styles.placa}>{orden.placa || "SIN PLACA"}</Text>
                  <Text style={styles.orderClient}>
                    {orden.nombre_cliente} {orden.apellido_cliente}
                  </Text>
                </View>

                <View style={styles.orderIdPill}>
                  <Text style={styles.orderIdText}>#{orden.id_orden}</Text>
                </View>
              </View>

              <Text style={styles.orderCode}>{orden.codigo || "Sin codigo"}</Text>

              <View style={styles.vehicleBox}>
                <Text style={styles.vehicleLine}>🚗 {vehiculo.marca} {vehiculo.modelo}</Text>
                <Text style={styles.vehicleLine}>📅 {vehiculo.anio}</Text>
                <Text style={styles.vehicleLine}>🌍 {vehiculo.pais}</Text>
              </View>

              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.subBadge,
                    {
                      backgroundColor: subserviceTheme.backgroundColor,
                      borderColor: subserviceTheme.borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.subBadgeText,
                      { color: subserviceTheme.textColor },
                    ]}
                  >
                    {orden.subservicio_nombre || "Subservicio"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.startButton}
                onPress={() => confirmarInicio(orden)}
                activeOpacity={0.9}
              >
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
  screen: {
    flex: 1,
    backgroundColor: "#f2f4f7",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f4f7",
  },
  loadingText: {
    marginTop: 12,
    color: "#111d4d",
    fontWeight: "700",
  },
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
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroEyebrow: {
    color: "#debb3c",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  heroLogoutBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroLogoutText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  heroTitle: {
    marginTop: 8,
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#d7def4",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  liveRow: {
    marginTop: 16,
    gap: 10,
  },
  liveBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#34d399",
    marginRight: 8,
  },
  liveText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  liveTime: {
    color: "#c7d2fe",
    fontWeight: "700",
    fontSize: 12,
  },
  menuGrid: {
    marginTop: 16,
    gap: 12,
  },
  menuCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  menuCardDark: {
    backgroundColor: "#111d4d",
  },
  menuCardGold: {
    backgroundColor: "#debb3c",
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  menuTitleLight: {
    color: "#fff",
  },
  menuTitleDark: {
    color: "#111d4d",
  },
  menuSubtitle: {
    marginTop: 6,
    fontWeight: "600",
    lineHeight: 19,
  },
  menuSubtitleLight: {
    color: "#d7def4",
  },
  menuSubtitleDark: {
    color: "#4a5568",
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#111d4d",
    fontSize: 20,
    fontWeight: "900",
  },
  sectionHint: {
    marginTop: 4,
    color: "#667085",
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    borderTopWidth: 5,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metricValue: {
    color: "#111d4d",
    fontSize: 30,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 6,
    color: "#667085",
    fontWeight: "700",
    textAlign: "center",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyTitle: {
    color: "#111d4d",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 8,
    color: "#667085",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 5,
    borderLeftColor: "#111d4d",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  orderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  orderTopLeft: {
    flex: 1,
  },
  placa: {
    color: "#111d4d",
    fontSize: 22,
    fontWeight: "900",
  },
  orderClient: {
    marginTop: 4,
    color: "#111827",
    fontWeight: "800",
    fontSize: 15,
  },
  orderIdPill: {
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  orderIdText: {
    color: "#111d4d",
    fontWeight: "900",
  },
  orderCode: {
    marginTop: 6,
    color: "#667085",
    fontWeight: "700",
  },
  vehicleBox: {
    marginTop: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
  },
  vehicleLine: {
    color: "#334155",
    fontWeight: "700",
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  subBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    alignSelf: "flex-start",
  },
  subBadgeText: {
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  startButton: {
    marginTop: 16,
    backgroundColor: "#111d4d",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
});

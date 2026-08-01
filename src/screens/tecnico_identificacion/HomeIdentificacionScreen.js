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

const API_URL = "https://api360suite.pqautoexpert.ec/api";

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

function MetricCard({ label, value, accent }) {
  return (
    <View style={[styles.metricCard, { borderTopColor: accent }]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MenuCard({ title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.9}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function HomeIdentificacionScreen({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [totales, setTotales] = useState({
    asignadas: 0,
    en_proceso: 0,
    finalizadas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const welcomeName = useMemo(() => {
    const nombres = usuario?.nombres || "";
    const apellidos = usuario?.apellidos || "";
    return `${nombres} ${apellidos}`.trim();
  }, [usuario]);
  const fetchOrdenes = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const token = await SecureStore.getItemAsync("token");

        if (!token) {
          navigation.replace("Login");
          return;
        }

        const response = await fetch(`${API_URL}/tecnico/ordenes`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (!silent) {
            Alert.alert("Error", data?.error || "No se pudieron cargar las ordenes");
          }
          return;
        }

        setOrdenes(data?.ordenes || []);
        setTotales({
          asignadas: Number(data?.totales?.asignadas || 0),
          en_proceso: Number(data?.totales?.en_proceso || 0),
          finalizadas: Number(data?.totales?.finalizadas || 0),
        });
        setLastUpdated(new Date());
      } catch (error) {
        console.log(error);
        if (!silent) {
          Alert.alert("Error", "Error al conectar con el servidor");
        }
      }
    },
    [navigation]
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const storedUser = await SecureStore.getItemAsync("usuario");
        if (storedUser && mounted) {
          setUsuario(JSON.parse(storedUser));
        }

        if (mounted) {
          await fetchOrdenes();
        }
      } catch (error) {
        console.log(error);
        Alert.alert("Error", "No se pudo cargar la informacion inicial");
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
        if (active) {
          fetchOrdenes({ silent: true });
        }
      }, 10000);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [fetchOrdenes])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrdenes();
    setRefreshing(false);
  }, [fetchOrdenes]);

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
      if (rootNavigation) {
        rootNavigation.replace("Welcome");
      } else {
        navigation.replace("Welcome");
      }
    }
  }

  async function confirmarInicio(orden) {
    Alert.alert(
      "Iniciar orden",
      `¿Desea iniciar la orden #${orden.id_orden}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Iniciar",
          onPress: () => iniciarIdentificacion(orden.id_orden, orden.subservicio_nombre),
        },
      ]
    );
  }

  async function iniciarIdentificacion(idOrden, subservicio = "") {
    const modulo = String(subservicio).trim().toLowerCase();

    try {
      if (modulo.includes("verificación") || modulo.includes("verificacion")) {
        await iniciarProceso("/identificacion-nueva/iniciar/" + idOrden, {
          lugar: "RIOBAMBA OFICINA",
          tipo_revision: "preventiva",
          condicion: "compra",
        });
        navigation.navigate("IdentificacionNueva", { id_orden: idOrden });
        return;
      }

      if (modulo.includes("historial")) {
        await iniciarProceso(`/historial/iniciar/${idOrden}`);
        navigation.navigate("HistorialVehicular", { id_orden: idOrden });
        return;
      }

      if (modulo.includes("certificado")) {
        Alert.alert(
          "Modulo pendiente",
          "Certificado Unico Vehicular aun no esta disponible en esta app."
        );
        return;
      }

      if (
        modulo.includes("constancia") ||
        modulo.includes("legalizacion") ||
        modulo.includes("legalización")
      ) {
        await iniciarProceso(`/contratos/iniciar/${idOrden}`);
        navigation.navigate("Contrato", { id_orden: idOrden });
        return;
      }

      Alert.alert("Aviso", "No se reconocio el subservicio de esta orden");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo iniciar el proceso");
    }
  }

  async function iniciarProceso(url, body = null) {
    const token = await SecureStore.getItemAsync("token");

    if (!token) {
      navigation.replace("Login");
      return;
    }

    const response = await fetch(`${API_URL}${url}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error("Error iniciando el proceso");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={styles.loadingText}>Cargando panel...</Text>
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
          <Text style={styles.heroEyebrow}>Panel Tecnico</Text>
          <TouchableOpacity
            style={styles.heroLogoutBtn}
            onPress={cerrarSesion}
            activeOpacity={0.9}
          >
            <Text style={styles.heroLogoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.heroTitle}>
          {welcomeName ? `Bienvenido, ${welcomeName}` : "Bienvenido"}
        </Text>
        <Text style={styles.heroSubtitle}>
          Monitoree sus ordenes y arranque el trabajo apenas ingresen nuevas asignaciones.
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
          title="📘 Identificaciones antiguas"
          subtitle="Historial anterior y reimpresiones"
          onPress={() => navigation.navigate("IdentificacionesHistorial")}
        />
        <MenuCard
          title="📗 Identificaciones nuevas"
          subtitle="Historial del nuevo modulo"
          onPress={() => navigation.navigate("IdentificacionesNuevasHistorial")}
        />
        <MenuCard
          title="📙 Historial Vehicular"
          subtitle="Consulta registros de historial"
          onPress={() => navigation.navigate("HistorialRegistros")}
        />
        <MenuCard
          title="📒 Contratos y Constancias"
          subtitle="Revise documentos emitidos"
          onPress={() => navigation.navigate("ContratosHistorial")}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Resumen de ordenes</Text>
        <Text style={styles.sectionHint}>Deslice hacia abajo para actualizar manualmente.</Text>
      </View>

      <View style={styles.metricsRow}>
        <MetricCard label="Asignadas" value={totales.asignadas} accent="#111d4d" />
        <MetricCard label="En proceso" value={totales.en_proceso} accent="#debb3c" />
        <MetricCard label="Finalizadas" value={totales.finalizadas} accent="#16a34a" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ordenes de Trabajo</Text>
        <Text style={styles.sectionHint}>Vista en tiempo real de sus pendientes tecnicos.</Text>
      </View>

      {ordenes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No hay ordenes disponibles</Text>
          <Text style={styles.emptyText}>
            Cuando el sistema le asigne nuevas ordenes apareceran aqui automaticamente.
          </Text>
        </View>
      ) : (
        ordenes.map((orden) => {
          const vehiculo = parseVehicleData(orden.datos_vehiculo);
          const subserviceTheme = getOrderSubserviceTheme(orden.subservicio_nombre);

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
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  menuTitle: {
    color: "#111d4d",
    fontSize: 17,
    fontWeight: "900",
  },
  menuSubtitle: {
    marginTop: 6,
    color: "#667085",
    fontWeight: "600",
    lineHeight: 19,
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

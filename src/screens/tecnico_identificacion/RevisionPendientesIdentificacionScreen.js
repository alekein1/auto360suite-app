import React, { useCallback, useEffect, useState } from "react";
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

const API = "https://api360suite.pqautoexpert.ec/api";

function money(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? `$${numberValue.toFixed(2)}` : "$0.00";
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value).slice(0, 10);
  }
}

export default function RevisionPendientesIdentificacionScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendientes, setPendientes] = useState([]);
  const [total, setTotal] = useState(0);

  const cargarPendientes = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const token = await SecureStore.getItemAsync("token");

        if (!token) {
          navigation?.replace?.("Login");
          return;
        }

        const res = await fetch(`${API}/identificacion/revision/pendientes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (!silent) {
            Alert.alert(
              "No se pudo cargar",
              json?.error || "La bandeja de revisión solo está disponible para el administrador."
            );
          }
          return;
        }

        setPendientes(json?.pendientes || []);
        setTotal(Number(json?.total || 0));
      } catch (error) {
        console.log(error);
        if (!silent) Alert.alert("Error", "No se pudo conectar con el servidor");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigation]
  );

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  useFocusEffect(
    useCallback(() => {
      cargarPendientes({ silent: true });
    }, [cargarPendientes])
  );

  function abrirRevision(item) {
    navigation.navigate("Identificacion", { id_orden: item.id_orden });
  }

  async function onRefresh() {
    setRefreshing(true);
    await cargarPendientes();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={styles.loadingText}>Cargando revisiones...</Text>
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
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Bandeja del administrador</Text>
          <Text style={styles.title}>Revisión de Identificación</Text>
          <Text style={styles.subtitle}>
            {total} verificación{total === 1 ? "" : "es"} pendiente{total === 1 ? "" : "s"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate("HomeIdentificacion")}
        >
          <Text style={styles.headerButtonText}>Inicio</Text>
        </TouchableOpacity>
      </View>

      {pendientes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Sin revisiones pendientes</Text>
          <Text style={styles.emptyText}>
            Cuando un técnico envíe una verificación a revisión, aparecerá aquí.
          </Text>
        </View>
      ) : (
        pendientes.map((item) => (
          <TouchableOpacity
            key={`${item.id_identificacion}-${item.id_orden}`}
            style={styles.itemCard}
            onPress={() => abrirRevision(item)}
            activeOpacity={0.9}
          >
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.placa}>{item.placa || "SIN PLACA"}</Text>
                <Text style={styles.orden}>Orden #{item.id_orden}</Text>
              </View>
              <View style={styles.totalPill}>
                <Text style={styles.totalPillText}>{money(item.total_final)}</Text>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Text style={styles.label}>Técnico</Text>
                <Text style={styles.value}>{item.tecnico || item.tecnico_correo || "-"}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.label}>Solicitante</Text>
                <Text style={styles.value}>{item.solicitante || "-"}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.label}>Fecha</Text>
                <Text style={styles.value}>{formatDate(item.fecha)}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.label}>Vehículo</Text>
                <Text style={styles.value}>
                  {item.vehiculo || [item.marca, item.modelo].filter(Boolean).join(" ") || "-"}
                </Text>
              </View>
            </View>

            {!!item.conclusiones && (
              <Text style={styles.conclusiones} numberOfLines={3}>
                {item.conclusiones}
              </Text>
            )}
          </TouchableOpacity>
        ))
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
  scroll: { flex: 1 },
  content: {
    padding: 16,
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
    fontWeight: "800",
  },
  header: {
    backgroundColor: "#111d4d",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  eyebrow: {
    color: "#debb3c",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 6,
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 6,
    color: "#d7def4",
    fontWeight: "800",
  },
  headerButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerButtonText: {
    color: "#111d4d",
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#111d4d",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 8,
    color: "#667085",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#debb3c",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  placa: {
    color: "#111d4d",
    fontSize: 22,
    fontWeight: "900",
  },
  orden: {
    marginTop: 4,
    color: "#667085",
    fontWeight: "800",
  },
  totalPill: {
    backgroundColor: "#ecfdf3",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  totalPillText: {
    color: "#027a48",
    fontWeight: "900",
  },
  infoGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoBox: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
  },
  label: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  value: {
    marginTop: 4,
    color: "#111827",
    fontWeight: "900",
  },
  conclusiones: {
    marginTop: 12,
    color: "#475569",
    fontWeight: "700",
    lineHeight: 19,
  },
});

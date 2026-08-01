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
  const [finalizando, setFinalizando] = useState(false);
  const [pendientes, setPendientes] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
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
        setSeleccionados(new Set());
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

  function toggleSeleccion(item) {
    setSeleccionados((actual) => {
      const next = new Set(actual);
      const id = Number(item.id_orden);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleTodos() {
    if (seleccionados.size === pendientes.length) {
      setSeleccionados(new Set());
      return;
    }

    setSeleccionados(new Set(pendientes.map((item) => Number(item.id_orden))));
  }

  async function finalizarSeleccionadas() {
    const ids_orden = Array.from(seleccionados);

    if (ids_orden.length === 0) {
      Alert.alert("Seleccione verificaciones", "Marque una o varias verificaciones para finalizar.");
      return;
    }

    Alert.alert(
      "Finalizar verificaciones",
      `Se finalizarán ${ids_orden.length} verificación${ids_orden.length === 1 ? "" : "es"} seleccionada${ids_orden.length === 1 ? "" : "s"}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Finalizar",
          style: "destructive",
          onPress: async () => {
            try {
              setFinalizando(true);
              const token = await SecureStore.getItemAsync("token");

              if (!token) {
                navigation?.replace?.("Login");
                return;
              }

              const res = await fetch(`${API}/identificacion/revision/finalizar-masivo`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids_orden }),
              });
              const json = await res.json().catch(() => ({}));

              if (!res.ok) {
                throw new Error(json?.mensaje || json?.error || "No se pudo finalizar.");
              }

              Alert.alert("Listo", json?.mensaje || "Verificaciones finalizadas.");
              await cargarPendientes({ silent: true });
            } catch (error) {
              Alert.alert("Error", error.message || "No se pudo finalizar.");
            } finally {
              setFinalizando(false);
            }
          },
        },
      ]
    );
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
        <>
          <View style={styles.bulkBar}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={toggleTodos}
              disabled={finalizando}
            >
              <Text style={styles.selectAllText}>
                {seleccionados.size === pendientes.length ? "Quitar selección" : "Seleccionar todo"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.finishButton,
                (seleccionados.size === 0 || finalizando) && styles.finishButtonDisabled,
              ]}
              onPress={finalizarSeleccionadas}
              disabled={seleccionados.size === 0 || finalizando}
            >
              {finalizando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.finishButtonText}>Finalizar {seleccionados.size}</Text>
              )}
            </TouchableOpacity>
          </View>

          {pendientes.map((item) => {
            const selected = seleccionados.has(Number(item.id_orden));

            return (
              <View
                key={`${item.id_identificacion}-${item.id_orden}`}
                style={[styles.listRow, selected && styles.listRowSelected]}
              >
                <TouchableOpacity
                  style={[styles.checkBox, selected && styles.checkBoxSelected]}
                  onPress={() => toggleSeleccion(item)}
                  disabled={finalizando}
                  activeOpacity={0.8}
                >
                  {selected && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rowContent}
                  onPress={() => abrirRevision(item)}
                  disabled={finalizando}
                  activeOpacity={0.85}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.placa} numberOfLines={1}>
                      {item.placa || "SIN PLACA"}
                    </Text>
                    <Text style={styles.orden} numberOfLines={1}>
                      Orden #{item.id_orden} · {formatDate(item.fecha)}
                    </Text>
                    <Text style={styles.value} numberOfLines={1}>
                      {item.solicitante || "-"}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.vehiculo || [item.marca, item.modelo].filter(Boolean).join(" ") || "-"}
                    </Text>
                  </View>

                  <View style={styles.rowSide}>
                    <Text style={styles.amount}>{money(item.total_final)}</Text>
                    <Text style={styles.tech} numberOfLines={1}>
                      {item.tecnico || item.tecnico_correo || "-"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
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
  bulkBar: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectAllButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  selectAllText: {
    color: "#111d4d",
    fontSize: 13,
    fontWeight: "900",
  },
  finishButton: {
    minWidth: 118,
    backgroundColor: "#111d4d",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  finishButtonDisabled: {
    backgroundColor: "#98a2b3",
  },
  finishButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
  listRow: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e4e7ec",
  },
  listRowSelected: {
    borderColor: "#debb3c",
    backgroundColor: "#fffaf0",
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#98a2b3",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxSelected: {
    backgroundColor: "#111d4d",
    borderColor: "#111d4d",
  },
  checkMark: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  rowContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  placa: {
    color: "#111d4d",
    fontSize: 17,
    fontWeight: "900",
  },
  orden: {
    marginTop: 2,
    color: "#667085",
    fontSize: 12,
    fontWeight: "800",
  },
  value: {
    marginTop: 3,
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },
  meta: {
    marginTop: 2,
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  rowSide: {
    width: 86,
    alignItems: "flex-end",
  },
  amount: {
    color: "#027a48",
    fontSize: 14,
    fontWeight: "900",
  },
  tech: {
    marginTop: 4,
    color: "#667085",
    fontSize: 11,
    fontWeight: "800",
  },
});

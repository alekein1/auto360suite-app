import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";

const API = "https://api360suite.pqautoexpert.ec/api";

export default function OrdenesEnProcesoScreen() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ======================
     INIT
  ====================== */
  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const token = await SecureStore.getItemAsync("token");

    if (!token) {
      Alert.alert("Sesión expirada", "Vuelva a iniciar sesión");
      return;
    }

    await cargarOrdenes(token);
    setLoading(false);
  };

  /* ======================
     CARGAR ÓRDENES EN PROCESO
  ====================== */
  const cargarOrdenes = async (token) => {
    try {
      const res = await fetch(`${API}/orden/en_proceso`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      setOrdenes(json.ok ? json.ordenes : []);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar las órdenes");
    }
  };

  /* ======================
     FORMATEAR FECHA
  ====================== */
  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    const d = new Date(fecha);
    return (
      d.toLocaleDateString("es-EC") +
      " " +
      d.toLocaleTimeString("es-EC")
    );
  };

  /* ======================
     RENDER ITEM
  ====================== */
  const renderOrden = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>ID:</Text>
        <Text style={styles.value}>{item.id_orden}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Cliente:</Text>
        <Text style={styles.value}>{item.nombre_cliente}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Placa:</Text>
        <Text style={styles.value}>{item.placa}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Servicio:</Text>
        <Text style={styles.value}>{item.servicio}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Subservicio:</Text>
        <Text style={styles.value}>{item.subservicio ?? "-"}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.estado}>en_proceso</Text>
        <Text style={styles.fecha}>
          {formatearFecha(item.fecha_inicio)}
        </Text>
      </View>
    </View>
  );

  /* ======================
     LOADING
  ====================== */
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text>Cargando órdenes…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ENCABEZADO */}
      <Text style={styles.title}>🟣 Órdenes en Proceso</Text>
      <Text style={styles.subtitle}>
        Órdenes actualmente en proceso de reparación
      </Text>

      {ordenes.length === 0 ? (
        <View style={styles.empty}>
          <Text>No hay órdenes en proceso</Text>
        </View>
      ) : (
        <FlatList
          data={ordenes}
          keyExtractor={(item) => item.id_orden.toString()}
          renderItem={renderOrden}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </View>
  );
}

/* ======================
   ESTILOS (MISMO LOOK)
====================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    paddingTop: 40,
    paddingHorizontal: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111d4d",
    marginBottom: 4,
  },

  subtitle: {
    color: "#666",
    marginBottom: 15,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    elevation: 3,
  },

  row: {
    flexDirection: "row",
    marginBottom: 4,
  },

  label: {
    fontWeight: "700",
    color: "#111d4d",
    width: 95,
  },

  value: {
    flex: 1,
    color: "#333",
  },

  footer: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  estado: {
    backgroundColor: "#f1c40f",
    color: "#111",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
  },

  fecha: {
    fontSize: 12,
    color: "#666",
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  empty: {
    alignItems: "center",
    marginTop: 40,
  },
});
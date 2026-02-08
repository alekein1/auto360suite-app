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

export default function OrdenesFinalizadasScreen() {
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
     CARGAR FINALIZADAS
  ====================== */
  const cargarOrdenes = async (token) => {
    try {
      const res = await fetch(`${API}/orden/finalizadas`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      setOrdenes(json.ok ? json.ordenes : []);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar las órdenes finalizadas");
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
        <Text style={styles.estado}>finalizada</Text>
      </View>

      <View style={styles.fechas}>
        <Text style={styles.fecha}>
          Inicio: {formatearFecha(item.fecha_inicio)}
        </Text>
        <Text style={styles.fecha}>
          Fin: {formatearFecha(item.fecha_fin)}
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
      {/* ENCABEZADO BAJADO */}
      <Text style={styles.title}>✅ Órdenes Finalizadas</Text>
      <Text style={styles.subtitle}>
        Listado de órdenes que ya fueron completadas
      </Text>

      {ordenes.length === 0 ? (
        <View style={styles.empty}>
          <Text>No hay órdenes finalizadas</Text>
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
   ESTILOS (TÍTULO MÁS ABAJO)
====================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    paddingTop: 80, // 👈 AQUÍ BAJAMOS EL TÍTULO
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
    alignItems: "flex-start",
  },

  estado: {
    backgroundColor: "#2ecc71",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
  },

  fechas: {
    marginTop: 6,
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
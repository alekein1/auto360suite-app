import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";

const API = "https://api360suite.pqautoexpert.ec/api";

export default function OrdenesAsignadasScreen() {
  const [token, setToken] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ======================
     INIT
  ====================== */
  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const t = await SecureStore.getItemAsync("token");
    if (!t) {
      Alert.alert("Sesión expirada", "Vuelva a iniciar sesión");
      return;
    }
    setToken(t);
    await cargarOrdenes(t);
    setLoading(false);
  };

  /* ======================
     CARGAR ÓRDENES
  ====================== */
  const cargarOrdenes = async (t) => {
    try {
      const res = await fetch(`${API}/orden/asignadas`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const json = await res.json();
      setOrdenes(json.ok ? json.ordenes : []);
    } catch (err) {
      Alert.alert("Error", "No se pudieron cargar las órdenes");
    }
  };

  /* ======================
     ELIMINAR ORDEN
  ====================== */
const eliminarOrden = (idOrden) => {
  if (!token) {
    Alert.alert("Error", "Token no disponible. Vuelva a ingresar.");
    return;
  }

  Alert.alert(
    "Eliminar orden",
    `⚠️ ¿Desea eliminar la orden #${idOrden}?\n\nEsto eliminará:\n• Orden\n• Proforma\n• Ticket`,
    [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(
              `${API}/orden/asignadas/${idOrden}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const data = await res.json();

            // 👇 MOSTRAR ERROR REAL DEL BACKEND
            if (!res.ok || !data.ok) {
              Alert.alert("Error", data?.msg || "No se pudo eliminar la orden");
              return;
            }

            Alert.alert("✅ Eliminado", data.msg);

            // 🔄 refrescar lista
            cargarOrdenes(token);

          } catch (error) {
            Alert.alert("Error", "Error de conexión con el servidor");
          }
        },
      },
    ]
  );
};

  /* ======================
     FORMATEAR FECHA
  ====================== */
  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    const d = new Date(fecha);
    return d.toLocaleDateString("es-EC") + " " + d.toLocaleTimeString("es-EC");
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

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.estado}>{item.estado_orden}</Text>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => eliminarOrden(item.id_orden)}
        >
          <Text style={styles.deleteText}>🗑️ Eliminar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.fecha}>{formatearFecha(item.fecha_inicio)}</Text>
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
      <Text style={styles.title}>🔧 Órdenes Asignadas</Text>
      <Text style={styles.subtitle}>
        Órdenes actualmente asignadas o en proceso
      </Text>

      {ordenes.length === 0 ? (
        <View style={styles.empty}>
          <Text>No hay órdenes disponibles</Text>
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
   ESTILOS
====================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    paddingTop: 80,     // 👈 BAJA TODO EL CONTENIDO
    paddingHorizontal: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111d4d",
    marginBottom: 8,
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
    backgroundColor: "#111d4d",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
  },

  deleteBtn: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },

  deleteText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  fecha: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
    textAlign: "right",
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
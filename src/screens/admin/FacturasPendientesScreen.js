import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

const API = "https://api360suite.pqautoexpert.ec/api";

export default function FacturasPendientesScreen({ navigation }) {
  const [token, setToken] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);

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
    await cargarFacturas(t);
    setLoading(false);
  };

  const cargarFacturas = async (t) => {
    try {
      const res = await fetch(`${API}/factura/listar-pendientes`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const json = await res.json();
      setFacturas(json.ok ? json.facturas : []);
    } catch {
      Alert.alert("Error", "No se pudieron cargar las facturas");
    }
  };

  const renderFactura = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.bold}>ID: {item.id_factura}</Text>
      <Text>Cliente: {item.razon_social}</Text>
      <Text>
        Identificación: {item.identificacion} ({item.tipo_identificacion})
      </Text>

      <Text style={styles.service}>{item.servicio || "—"}</Text>
      <Text>{item.subservicio || "—"}</Text>

      <Text>Subtotal: ${Number(item.subtotal).toFixed(2)}</Text>
      <Text>IVA: ${Number(item.iva).toFixed(2)}</Text>

      <Text style={styles.total}>
        Total: ${Number(item.total).toFixed(2)}
      </Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>Pendiente</Text>
      </View>

      <TouchableOpacity
        style={styles.btn}
        onPress={() =>
          navigation.navigate("FinalizarFactura", {
            id_factura: item.id_factura,
          })
        }
      >
        <Text style={styles.btnText}>✔ Finalizar</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#111d4d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📑 Facturas Pendientes</Text>
      <Text style={styles.subtitle}>
        Facturas generadas pero aún no emitidas
      </Text>

      {facturas.length === 0 ? (
        <Text style={styles.empty}>No existen facturas pendientes</Text>
      ) : (
        <FlatList
          data={facturas}
          keyExtractor={(item) => item.id_factura.toString()}
          renderItem={renderFactura}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    paddingTop: 70, // ✅ COMO PEDISTE
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111d4d",
  },
  subtitle: {
    color: "#666",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    elevation: 3,
  },
  bold: {
    fontWeight: "800",
    color: "#111d4d",
  },
  service: {
    fontWeight: "700",
    marginTop: 6,
  },
  total: {
    fontWeight: "800",
    marginTop: 6,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#ffc107",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  badgeText: {
    fontWeight: "bold",
    fontSize: 12,
  },
  btn: {
    backgroundColor: "#111d4d",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  empty: {
    textAlign: "center",
    color: "#666",
    marginTop: 40,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
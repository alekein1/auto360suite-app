import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DashboardAdmin({ navigation }) {
  const [open, setOpen] = useState({
    proformas: false,
    ordenes: false,
    tecnicos: false,
    facturacion: false,
  });

  const toggle = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen({ ...open, [key]: !open[key] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* HEADER */}
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <Image
              source={require("../../../assets/logo_prin.png")}
              style={styles.logo}
            />
            <View>
              <Text style={styles.title}>Panel Administrativo</Text>
              <Text style={styles.subtitle}>
                Auto360Suite · PQ Multiservicios
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => navigation.replace("Welcome")}
          >
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* PROFORMAS */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggle("proformas")}
          >
            <Text style={styles.cardTitle}>📄 Proformas</Text>
            <Text style={styles.arrow}>{open.proformas ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {open.proformas && (
            <View style={styles.subMenu}>
              <TouchableOpacity
  onPress={() => navigation.navigate("ClientesFrecuentes")}
>
  <Text style={styles.subItem}>● Crear Clientes Frecuentes</Text>
</TouchableOpacity>
              <TouchableOpacity
  onPress={() => navigation.navigate("ProformaDirecta")}
>
  <Text style={styles.subItem}>Crear Proforma Directa</Text>
</TouchableOpacity>
            </View>
          )}
        </View>

        {/* ÓRDENES */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggle("ordenes")}
          >
            <Text style={styles.cardTitle}>📑 Órdenes</Text>
            <Text style={styles.arrow}>{open.ordenes ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {open.ordenes && (
            <View style={styles.subMenu}>
              <TouchableOpacity
  onPress={() => navigation.navigate("OrdenesAsignadas")}
>
  <Text style={styles.subItem}>📄 Asignadas</Text>
</TouchableOpacity>
              <TouchableOpacity
  onPress={() => navigation.navigate("OrdenesProceso")}
>
  <Text style={styles.subItem}>📄 En Proceso</Text>
</TouchableOpacity>
              <TouchableOpacity
  onPress={() => navigation.navigate("OrdenesFinalizadas")}
>
  <Text style={styles.subItem}>📄 Finalizadas</Text>
</TouchableOpacity>
            </View>
          )}
        </View>

        {/* TÉCNICOS */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggle("tecnicos")}
          >
            <Text style={styles.cardTitle}>🛠 Técnicos</Text>
            <Text style={styles.arrow}>{open.tecnicos ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {open.tecnicos && (
            <View style={styles.subMenu}>

              <TouchableOpacity
  onPress={() => navigation.navigate("GestionTecnicos")}
>
  <Text style={styles.subItem}>➕ Gestionar Técnico</Text>
</TouchableOpacity>
              <Text style={styles.subItem}>⚙ Asignación</Text>
            </View>
          )}
        </View>

        {/* FACTURACIÓN */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => toggle("facturacion")}
          >
            <Text style={styles.cardTitle}>🧾 Facturación</Text>
            <Text style={styles.arrow}>{open.facturacion ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {open.facturacion && (
            <View style={styles.subMenu}>
              <Text style={styles.subItem}>📄 Pendientes</Text>
              <Text style={styles.subItem}>🧾 Factura Manual</Text>
              <Text style={styles.subItem}>📄 Finalizadas</Text>
            </View>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f6f9",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginTop: 15,
    marginBottom: 25,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  logo: {
    width: 46,
    height: 46,
    resizeMode: "contain",
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111d4d",
  },

  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
  },

  logoutBtn: {
    backgroundColor: "#e74c3c",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,

    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111d4d",
  },

  arrow: {
    fontSize: 14,
    color: "#111d4d",
    fontWeight: "bold",
  },

  subMenu: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },

  subItem: {
    paddingVertical: 8,
    paddingLeft: 6,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
});
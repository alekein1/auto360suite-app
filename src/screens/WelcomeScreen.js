import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

export default function WelcomeScreen({ navigation }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f7f9fc" }}>
      
      {/* HERO */}
      <View style={styles.hero}>
        <Image
          source={require("../../assets/logo_prin.png")}
          style={styles.logo}
        />
        <Text style={styles.heroTitle}>PQ MULTISERVICIOS</Text>
        <Text style={styles.heroSubtitle}>
          Sistema integral PQ · Investigación · Técnica · Servicios
        </Text>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => alert("Agendar Ticket (pronto)")}
        >
          <Text style={styles.btnText}>Agendar Ticket</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.btnText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* SERVICIOS */}
      <View style={styles.servicesSection}>
        <Text style={styles.sectionTitle}>Nuestros Servicios</Text>
        <Text style={styles.sectionSubtitle}>
          Soluciones completas en criminalística, identificación vehicular, autoservicios y detailing.
        </Text>

        <View style={styles.grid}>
          <View style={styles.serviceBox}>
            <Image
              source={require("../../assets/criminalistica.png")}
              style={styles.serviceImg}
            />
            <Text style={styles.serviceTitle}>Criminalística y Ciencias Forenses</Text>
          </View>

          <View style={styles.serviceBox}>
            <Image
              source={require("../../assets/identificacion.png")}
              style={styles.serviceImg}
            />
            <Text style={styles.serviceTitle}>Identificación Vehicular</Text>
          </View>

          <View style={styles.serviceBox}>
            <Image
              source={require("../../assets/autoservicios.png")}
              style={styles.serviceImg}
            />
            <Text style={styles.serviceTitle}>Auto Servicios</Text>
          </View>

          <View style={styles.serviceBox}>
            <Image
              source={require("../../assets/detailing.png")}
              style={styles.serviceImg}
            />
            <Text style={styles.serviceTitle}>Detailing</Text>
          </View>
        </View>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={{ color: "#fff", textAlign: "center" }}>
          © 2024 Master Repair · Soluciones Informáticas y de Ciberseguridad
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#111d4d",
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    marginTop: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginVertical: 10,
  },
  btn: {
    backgroundColor: "#debb3c",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 12,
  },
  btnText: {
    color: "#111d4d",
    fontWeight: "bold",
  },
  servicesSection: {
    padding: 30,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111d4d",
  },
  sectionSubtitle: {
    textAlign: "center",
    marginVertical: 10,
    fontSize: 14,
    color: "#444",
  },
  grid: {
    marginTop: 20,
    width: "100%",
  },
  serviceBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  serviceImg: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginBottom: 10,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
  },
  footer: {
    backgroundColor: "#111d4d",
    padding: 20,
    marginTop: 20,
  },
});
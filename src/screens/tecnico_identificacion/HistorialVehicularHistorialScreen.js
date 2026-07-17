import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";

const API = "https://api360suite.pqautoexpert.ec/api";

/* =========================
Helpers
========================= */

function money(v) {
  const n = Number(v);
  if (Number.isFinite(n)) return n.toFixed(2);
  return "0.00";
}

function formatDateEC(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function badgeEstado(estado) {
  const e = String(estado || "").toLowerCase();

  if (e === "finalizada")
    return { bg: "#16a34a", text: "FINALIZADA" };

  if (e === "en_proceso")
    return { bg: "#f59e0b", text: "EN PROCESO" };

  return { bg: "#6b7280", text: "OTRO" };
}

function vehicleLabel(row) {
  const vehiculo = String(row?.vehiculo || "").trim();
  if (vehiculo && vehiculo !== "—") return vehiculo;

  return [row?.marca, row?.modelo]
    .map((value) => String(value || "").trim())
    .filter((value) => value && value !== "—")
    .join(" ") || "—";
}

/* =========================
Screen
========================= */

export default function HistorialVehicularHistorialScreen({ navigation }) {

  const [loading, setLoading] = useState(true);
  const [historiales, setHistoriales] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;

  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [enviandoWhatsappId, setEnviandoWhatsappId] = useState(null);

  useEffect(() => {
    cargarHistoriales();
  }, []);

  async function getToken() {
    const token = await SecureStore.getItemAsync("token");

    if (!token) {
      navigation.replace("Login");
      throw new Error("Token no encontrado");
    }

    return token;
  }

  async function cargarHistoriales() {
    try {

      setLoading(true);

      const token = await getToken();

      const res = await fetch(`${API}/historial/listar`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      const lista = (json?.historiales || []).filter(Boolean);

      setHistoriales(lista);
      setPaginaActual(1);

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
  FILTRO
  ========================= */

  const historialesFiltrados = useMemo(() => {

    const t = busqueda.trim().toLowerCase();

    if (!t) return historiales;

    return historiales.filter(h =>
      String(h?.placa || "").toLowerCase().includes(t) ||
      String(h?.cedula || "").toLowerCase().includes(t) ||
      String(h?.solicitante || "").toLowerCase().includes(t) ||
      String(h?.marca || "").toLowerCase().includes(t) ||
      String(h?.modelo || "").toLowerCase().includes(t) ||
      String(h?.vehiculo || "").toLowerCase().includes(t) ||
      String(h?.id_orden || "").toLowerCase().includes(t)
    );

  }, [busqueda, historiales]);

  /* =========================
  PAGINACIÓN
  ========================= */

  const totalPaginas = Math.max(
    1,
    Math.ceil(historialesFiltrados.length / registrosPorPagina)
  );

  const datosPagina = useMemo(() => {

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;

    return historialesFiltrados.slice(inicio, fin);

  }, [historialesFiltrados, paginaActual]);

  useEffect(() => {
    if (paginaActual > totalPaginas) setPaginaActual(1);
  }, [totalPaginas]);

  /* =========================
  PDF NORMAL
  ========================= */

  async function verPDF(idOrden) {

    try {

      setGenerandoPdf(true);

      const token = await getToken();

      const url = `${API}/historial/pdf/${idOrden}`;

      const fileUri =
        FileSystem.documentDirectory +
        `historial_${idOrden}_${Date.now()}.pdf`;

      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("PDF descargado", download.uri);
        return;
      }

      await Sharing.shareAsync(download.uri);

    } catch (error) {
      Alert.alert("Error", "No se pudo generar el PDF");
    } finally {
      setGenerandoPdf(false);
    }
  }

  /* =========================
  PDF PREMIUM
  ========================= */

  async function verPDFPremium(idOrden) {

    try {

      setGenerandoPdf(true);

      const token = await getToken();

      const url = `${API}/historial/premium/${idOrden}`;

      const fileUri =
        FileSystem.documentDirectory +
        `historial_premium_${idOrden}_${Date.now()}.pdf`;

      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await Sharing.shareAsync(download.uri);

    } catch (error) {
      Alert.alert("Error", "No se pudo generar el PDF Premium");
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function enviarHistorialWhatsapp(idOrden) {
    Alert.alert(
      "WhatsApp",
      `¿Enviar el historial de la orden ${idOrden} por WhatsApp?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          onPress: async () => {
            try {
              setEnviandoWhatsappId(idOrden);
              const token = await getToken();

              const response = await fetch(`${API}/historial/pdf/${idOrden}/whatsapp`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
              });

              const data = await response.json().catch(() => ({}));

              if (!response.ok || data.ok === false) {
                throw new Error(data.mensaje || "No se pudo enviar el historial por WhatsApp.");
              }

              Alert.alert("WhatsApp", "Historial enviado por WhatsApp correctamente.");
            } catch (error) {
              console.log(error);
              Alert.alert("WhatsApp", error.message || "No se pudo enviar el historial por WhatsApp.");
            } finally {
              setEnviandoWhatsappId(null);
            }
          },
        },
      ]
    );
  }

  /* =========================
  LOADER
  ========================= */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Cargando historial...</Text>
      </View>
    );
  }

  /* =========================
  RENDER
  ========================= */

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>

      <ScrollView style={styles.scroll}>

        <View style={styles.card}>

          <Text style={styles.title}>
            📄 Historial Vehicular
          </Text>

          <TextInput
            style={styles.search}
            placeholder="Buscar por placa, nombre, marca, modelo, cédula u orden..."
            value={busqueda}
            onChangeText={(t) => {
              setBusqueda(t);
              setPaginaActual(1);
            }}
          />

          {datosPagina.length === 0 ? (

            <Text style={{ textAlign: "center" }}>
              No hay registros
            </Text>

          ) : (

            datosPagina.map((h, idx) => {

              const badge = badgeEstado(h?.estado_orden);
              const vehiculo = vehicleLabel(h);
              const enviandoWhatsapp = enviandoWhatsappId === h?.id_orden;

              return (

                <View key={`${h?.id_orden}-${idx}`} style={styles.item}>

                  <Text style={styles.placa}>
                    🚗 {h?.placa || "SIN PLACA"}
                  </Text>

                  <Text>
                    Orden #{h?.id_orden}
                  </Text>

                  <Text style={styles.vehiculo}>
                    Marca / Modelo: {vehiculo}
                  </Text>

                  <Text>
                    Cédula: {h?.cedula}
                  </Text>

                  <Text>
                    Solicitante: {h?.solicitante || "—"}
                  </Text>

                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={styles.badgeText}>
                      {badge.text}
                    </Text>
                  </View>

                  <Text>
                    Fecha: {formatDateEC(h?.fecha)}
                  </Text>

                  <View style={styles.actions}>

                    <TouchableOpacity
                      style={styles.btnPrimary}
                      onPress={() => verPDF(h?.id_orden)}
                    >
                      <Text style={styles.btnText}>
                        🖨 Normal
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnWarning}
                      onPress={() => verPDFPremium(h?.id_orden)}
                    >
                      <Text style={styles.btnTextDark}>
                        ⭐ Premium
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnSuccess}
                      onPress={() => enviarHistorialWhatsapp(h?.id_orden)}
                      disabled={enviandoWhatsapp}
                    >
                      <Text style={styles.btnText}>
                        {enviandoWhatsapp ? "Enviando..." : "📲 WhatsApp"}
                      </Text>
                    </TouchableOpacity>

                  </View>

                </View>

              );

            })

          )}

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

/* =========================
STYLES
========================= */

const styles = StyleSheet.create({

screen: {
flex: 1,
backgroundColor: "#f5f7fb",
},

scroll: {
flex: 1,
},

center: {
flex: 1,
justifyContent: "center",
alignItems: "center",
},

card: {
margin: 15,
backgroundColor: "#fff",
borderRadius: 12,
padding: 15,
},

title: {
fontWeight: "900",
fontSize: 16,
marginBottom: 10,
},

search: {
borderWidth: 1,
borderColor: "#ddd",
padding: 10,
borderRadius: 10,
marginBottom: 10,
},

item: {
borderWidth: 1,
borderColor: "#eee",
borderRadius: 10,
padding: 12,
marginBottom: 10,
},

placa: {
fontWeight: "900",
fontSize: 14,
},

vehiculo: {
marginTop: 4,
fontWeight: "800",
color: "#334155",
},

badge: {
marginTop: 5,
padding: 5,
borderRadius: 5,
alignSelf: "flex-start",
},

badgeText: {
color: "#fff",
fontWeight: "900",
},

actions: {
flexDirection: "row",
flexWrap: "wrap",
gap: 10,
marginTop: 10,
},

btnPrimary: {
flex: 1,
minWidth: "30%",
backgroundColor: "#2563eb",
padding: 10,
borderRadius: 8,
alignItems: "center",
},

btnWarning: {
flex: 1,
minWidth: "30%",
backgroundColor: "#f59e0b",
padding: 10,
borderRadius: 8,
alignItems: "center",
},

btnSuccess: {
flex: 1,
minWidth: "30%",
backgroundColor: "#16a34a",
padding: 10,
borderRadius: 8,
alignItems: "center",
},

btnText: {
color: "#fff",
fontWeight: "900",
},

btnTextDark: {
color: "#111",
fontWeight: "900",
},

});

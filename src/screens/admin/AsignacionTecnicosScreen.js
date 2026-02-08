import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Picker } from "@react-native-picker/picker";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";

const API = "https://api360suite.pqautoexpert.ec/api";

export default function AsignacionTecnicosScreen() {
  const [token, setToken] = useState(null);

  const [servicios, setServicios] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [asignados, setAsignados] = useState([]);

  const [servicioSel, setServicioSel] = useState("");
  const [tecnicoSel, setTecnicoSel] = useState("");

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
    await Promise.all([
      cargarServicios(t),
      cargarTecnicos(t),
    ]);
    setLoading(false);
  };

  /* ======================
     SERVICIOS
  ====================== */
  const cargarServicios = async (t) => {
    try {
      const res = await fetch(`${API}/tickets/services`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setServicios(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los servicios");
    }
  };

  /* ======================
     TECNICOS
  ====================== */
  const cargarTecnicos = async (t) => {
    try {
      const res = await fetch(`${API}/usuarios`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      const activos = data.filter(
        (u) => u.rol === "tecnico" && u.estado == 1
      );
      setTecnicos(activos);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los técnicos");
    }
  };

  /* ======================
     ASIGNADOS POR SERVICIO
  ====================== */
  const cargarAsignados = async (idServicio) => {
    try {
      const res = await fetch(
        `${API}/asginacion/servicio/${idServicio}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setAsignados(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los asignados");
    }
  };

  /* ======================
     ASIGNAR TECNICO
  ====================== */
  const asignarTecnico = async () => {
    if (!servicioSel || !tecnicoSel) {
      Alert.alert("Error", "Seleccione servicio y técnico");
      return;
    }

    try {
      const res = await fetch(`${API}/asginacion/asignar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_usuario: tecnicoSel,
          id_service: servicioSel,
        }),
      });

      const json = await res.json();
      Alert.alert("✅", json.mensaje || "Asignado correctamente");
      cargarAsignados(servicioSel);
    } catch {
      Alert.alert("Error", "No se pudo asignar");
    }
  };

  /* ======================
     RENDER ASIGNADO
  ====================== */
  const renderAsignado = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>
        {item.nombres} {item.apellidos}
      </Text>
      <Text style={styles.text}>📧 {item.correo}</Text>
      <Text style={styles.text}>📞 {item.telefono || "-"}</Text>
      <Text style={styles.estado}>
        Estado: {item.estado == 1 ? "Activo" : "Inactivo"}
      </Text>
    </View>
  );

  /* ======================
     LOADING
  ====================== */
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#111d4d" />
      </View>
    );
  }

  /* ======================
     UI
  ====================== */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛠 Asignación de Técnicos</Text>
      <Text style={styles.subtitle}>
        Asigne técnicos a servicios disponibles
      </Text>

      {/* FORM */}
      <View style={styles.form}>

        <View style={styles.pickerBox}>
          <Picker
            selectedValue={servicioSel}
            onValueChange={(v) => {
              setServicioSel(v);
              if (v) cargarAsignados(v);
            }}
          >
            <Picker.Item label="Seleccione servicio..." value="" />
            {servicios.map((s) => (
              <Picker.Item key={s.id} label={s.nombre} value={s.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerBox}>
          <Picker
            selectedValue={tecnicoSel}
            onValueChange={(v) => setTecnicoSel(v)}
          >
            <Picker.Item label="Seleccione técnico..." value="" />
            {tecnicos.map((t) => (
              <Picker.Item
                key={t.id}
                label={`${t.nombres} ${t.apellidos}`}
                value={t.id}
              />
            ))}
          </Picker>
        </View>

        <TouchableOpacity style={styles.btnMain} onPress={asignarTecnico}>
          <Text style={styles.btnText}>➕ Asignar Técnico</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA */}
      <Text style={styles.listTitle}>👷 Técnicos Asignados</Text>

      {asignados.length === 0 ? (
        <Text style={styles.empty}>No hay técnicos asignados</Text>
      ) : (
        <FlatList
          data={asignados}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAsignado}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </View>
  );
}

/* ======================
   STYLES
====================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    paddingTop: 80,
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
  form: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    elevation: 3,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  btnMain: {
    backgroundColor: "#111d4d",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  listTitle: {
    fontWeight: "800",
    color: "#111d4d",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  name: {
    fontWeight: "800",
    color: "#111d4d",
  },
  text: {
    fontSize: 13,
    color: "#333",
  },
  estado: {
    marginTop: 4,
    fontWeight: "bold",
    fontSize: 12,
    color: "#555",
  },
  empty: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from "react-native";

const API = "https://api360suite.pqautoexpert.ec/api";

/* =====================================================
   🧩 HEADER FUERA DEL COMPONENTE (CLAVE DEL FIX)
===================================================== */
const ClientesHeader = ({
  cedula,
  setCedula,
  nombres,
  setNombres,
  apellidos,
  setApellidos,
  telefono,
  setTelefono,
  direccion,
  setDireccion,
  email,
  setEmail,
  buscarCedula,
  guardarPersona,
}) => (
  <View style={styles.header}>
    <Text style={styles.title}>Clientes Frecuentes</Text>
    <Text style={styles.subtitle}>
      Crear personas y consultar datos desde Registro Civil
    </Text>

    <TextInput
      placeholder="Cédula"
      style={styles.input}
      value={cedula}
      onChangeText={setCedula}
    />

    <TouchableOpacity style={styles.btnSecondary} onPress={buscarCedula}>
      <Text style={styles.btnText}>🔍 Buscar Cédula</Text>
    </TouchableOpacity>

    <TextInput
      placeholder="Nombres"
      style={styles.input}
      value={nombres}
      onChangeText={setNombres}
    />

    <TextInput
      placeholder="Apellidos"
      style={styles.input}
      value={apellidos}
      onChangeText={setApellidos}
    />

    <TextInput
      placeholder="Teléfono"
      style={styles.input}
      value={telefono}
      onChangeText={setTelefono}
      keyboardType="phone-pad"
    />

    <TextInput
      placeholder="Dirección"
      style={styles.input}
      value={direccion}
      onChangeText={setDireccion}
    />

    <TextInput
      placeholder="Email"
      style={styles.input}
      value={email}
      onChangeText={setEmail}
      keyboardType="email-address"
      autoCapitalize="none"
    />

    <TouchableOpacity style={styles.btnMain} onPress={guardarPersona}>
      <Text style={styles.btnText}>💾 Guardar Cliente</Text>
    </TouchableOpacity>

    <Text style={styles.listTitle}>Clientes Registrados</Text>
  </View>
);

/* =====================================================
   📌 COMPONENTE PRINCIPAL
===================================================== */
export default function ClientesFrecuentesScreen() {
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const [cedula, setCedula] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");

  const [personas, setPersonas] = useState([]);

  useEffect(() => {
    cargarSesion();
  }, []);

  const cargarSesion = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert("Sesión expirada", "Vuelva a iniciar sesión");
        return;
      }

      setAuthToken(token);
      await cargarPersonas(token);
    } catch {
      Alert.alert("Error", "No se pudo recuperar la sesión");
    } finally {
      setLoading(false);
    }
  };

  const cargarPersonas = async (token) => {
    try {
      const res = await fetch(`${API}/personas/listar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setPersonas(json.personas || []);
    } catch {
      Alert.alert("Error", "No se pudo cargar clientes");
    }
  };

  const buscarCedula = async () => {
    if (cedula.length < 10) {
      Alert.alert("Error", "Ingrese una cédula válida");
      return;
    }

    try {
      const res = await fetch(
        `${API}/personas/consultar/cedula/${cedula}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const json = await res.json();

      if (!json.ok) {
        Alert.alert("Aviso", "No se encontraron datos");
        return;
      }

      setNombres(json.nombres || "");
      setApellidos(json.apellidos || "");
    } catch {
      Alert.alert("Error", "Error consultando Registro Civil");
    }
  };

  const guardarPersona = async () => {
    try {
      const res = await fetch(`${API}/personas/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          cedula,
          nombres,
          apellidos,
          telefono,
          direccion,
          email,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        Alert.alert("Error", "No se pudo guardar");
        return;
      }

      Alert.alert("Éxito", "Cliente guardado");
      limpiarFormulario();
      cargarPersonas(authToken);
    } catch {
      Alert.alert("Error", "Error al guardar cliente");
    }
  };

  const limpiarFormulario = () => {
    setCedula("");
    setNombres("");
    setApellidos("");
    setTelefono("");
    setDireccion("");
    setEmail("");
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Cargando clientes...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={personas}
      keyExtractor={(item) => item.id.toString()}
      ListHeaderComponent={
        <ClientesHeader
          cedula={cedula}
          setCedula={setCedula}
          nombres={nombres}
          setNombres={setNombres}
          apellidos={apellidos}
          setApellidos={setApellidos}
          telefono={telefono}
          setTelefono={setTelefono}
          direccion={direccion}
          setDireccion={setDireccion}
          email={email}
          setEmail={setEmail}
          buscarCedula={buscarCedula}
          guardarPersona={guardarPersona}
        />
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={styles.itemText}>
            {item.nombres} {item.apellidos}
          </Text>
          <Text style={styles.itemSub}>{item.cedula}</Text>
        </View>
      )}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
      removeClippedSubviews={false}
    />
  );
}

/* =====================================================
   🎨 ESTILOS (SIN CAMBIOS FUNCIONALES)
===================================================== */
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f4f6f9",
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111d4d",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  btnMain: {
    backgroundColor: "#111d4d",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  btnSecondary: {
    backgroundColor: "#555",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  listTitle: {
    marginTop: 30,
    fontSize: 16,
    fontWeight: "700",
    color: "#111d4d",
  },
  item: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  itemText: {
    fontWeight: "600",
    color: "#111d4d",
  },
  itemSub: {
    fontSize: 13,
    color: "#777",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ScrollView,
} from "react-native";

const API = "https://api360suite.pqautoexpert.ec/api"; // tu API real
const token = ""; // luego lo leeremos de SecureStore

export default function ClientesFrecuentesScreen() {
  const [cedula, setCedula] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");
  const [personas, setPersonas] = useState([]);

  useEffect(() => {
    cargarPersonas();
  }, []);

  // 🔍 BUSCAR CÉDULA
  const buscarCedula = async () => {
    if (cedula.length < 10) {
      Alert.alert("Error", "Ingrese una cédula válida");
      return;
    }

    try {
      const res = await fetch(
        `${API}/personas/consultar/cedula/${cedula}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const json = await res.json();

      if (!json.ok) {
        Alert.alert(
          "Aviso",
          "No se encontraron datos. Ingrese manualmente."
        );
        return;
      }

      setNombres(json.nombres || "");
      setApellidos(json.apellidos || "");
    } catch (err) {
      Alert.alert("Error", "Error consultando API externa");
    }
  };

  // 💾 GUARDAR PERSONA
  const guardarPersona = async () => {
    const body = {
      cedula,
      nombres,
      apellidos,
      telefono,
      direccion,
      email,
    };

    try {
      const res = await fetch(`${API}/personas/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!json.ok) {
        Alert.alert("Error", "Error guardando persona");
        return;
      }

      Alert.alert("Éxito", "Persona guardada correctamente");
      limpiarFormulario();
      cargarPersonas();
    } catch (err) {
      Alert.alert("Error", "No se pudo guardar la persona");
    }
  };

  // 📋 LISTAR PERSONAS
  const cargarPersonas = async () => {
    try {
      const res = await fetch(`${API}/personas/listar`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      setPersonas(json.personas || []);
    } catch (err) {
      console.log("Error listando personas");
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>👤 Clientes Frecuentes</Text>
      <Text style={styles.subtitle}>
        Crear personas y consultar datos desde Registro Civil
      </Text>

      {/* FORMULARIO */}
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
      />

      <TouchableOpacity style={styles.btnMain} onPress={guardarPersona}>
        <Text style={styles.btnText}>💾 Guardar Cliente</Text>
      </TouchableOpacity>

      {/* LISTADO */}
      <Text style={styles.listTitle}>📋 Clientes Registrados</Text>

      <FlatList
        data={personas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemText}>
              {item.nombres} {item.apellidos}
            </Text>
            <Text style={styles.itemSub}>{item.cedula}</Text>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f9",
    padding: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111d4d",
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
    fontWeight: "700",
    fontSize: 16,
    color: "#111d4d",
    marginBottom: 10,
  },

  item: {
    backgroundColor: "#fff",
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
});
import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Picker } from "@react-native-picker/picker";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";

const API = "https://api360suite.pqautoexpert.ec/api";

export default function GestionUsuariosScreen() {
  const [token, setToken] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // FORM
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("");
  const [contrasena, setContrasena] = useState("");

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
    await cargarUsuarios(t);
    setLoading(false);
  };

  /* ======================
     LISTAR USUARIOS
  ====================== */
  const cargarUsuarios = async (t) => {
    try {
      const res = await fetch(`${API}/usuarios`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los usuarios");
    }
  };

  /* ======================
     CREAR USUARIO
  ====================== */
  const crearUsuario = async () => {
    if (!nombres || !apellidos || !correo || !rol || !contrasena) {
      Alert.alert("Error", "Complete todos los campos obligatorios");
      return;
    }

    try {
      const res = await fetch(`${API}/usuarios`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombres,
          apellidos,
          correo,
          telefono,
          rol,
          contrasena,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        Alert.alert("Error", json.error || "No se pudo crear usuario");
        return;
      }

      Alert.alert("✅ Usuario creado");
      setNombres("");
      setApellidos("");
      setCorreo("");
      setTelefono("");
      setRol("");
      setContrasena("");
      cargarUsuarios(token);

    } catch {
      Alert.alert("Error", "Error de conexión");
    }
  };

  /* ======================
     ELIMINAR USUARIO
  ====================== */
  const eliminarUsuario = (id) => {
    Alert.alert(
      "Eliminar usuario",
      "¿Desea eliminar este usuario?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${API}/usuarios/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Usuario eliminado");
              cargarUsuarios(token);
            } catch {
              Alert.alert("Error", "No se pudo eliminar");
            }
          },
        },
      ]
    );
  };

  /* ======================
     RENDER USUARIO
  ====================== */
  const renderUsuario = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>
        {item.nombres} {item.apellidos}
      </Text>
      <Text style={styles.text}>📧 {item.correo}</Text>
      <Text style={styles.text}>📞 {item.telefono || "-"}</Text>
      <Text style={styles.text}>Rol: {item.rol}</Text>
      <Text style={styles.estado}>
        Estado: {item.estado == 1 ? "Activo" : "Inactivo"}
      </Text>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => eliminarUsuario(item.id)}
      >
        <Text style={styles.deleteText}>🗑 Eliminar</Text>
      </TouchableOpacity>
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
      <Text style={styles.title}>👤 Gestión de Usuarios</Text>
      <Text style={styles.subtitle}>
        Crear y administrar usuarios del sistema
      </Text>

      {/* FORM */}
      <View style={styles.form}>
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
          placeholder="Correo"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={correo}
          onChangeText={setCorreo}
        />

        <TextInput
          placeholder="Teléfono"
          style={styles.input}
          keyboardType="phone-pad"
          value={telefono}
          onChangeText={setTelefono}
        />

        {/* PICKER BIEN ESTILIZADO */}
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={rol}
            onValueChange={(value) => setRol(value)}
          >
            <Picker.Item label="Seleccione rol..." value="" />
            <Picker.Item label="Administrador" value="administrador" />
            <Picker.Item label="Técnico" value="tecnico" />
          </Picker>
        </View>

        <TextInput
          placeholder="Contraseña"
          style={styles.input}
          secureTextEntry
          value={contrasena}
          onChangeText={setContrasena}
        />

        <TouchableOpacity style={styles.btnMain} onPress={crearUsuario}>
          <Text style={styles.btnText}>➕ Crear Usuario</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA */}
      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUsuario}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
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
    paddingTop: 40,
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

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
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
    fontSize: 14,
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
    color: "#333",
    fontSize: 13,
  },

  estado: {
    marginTop: 4,
    fontWeight: "bold",
    fontSize: 12,
    color: "#555",
  },

  deleteBtn: {
    backgroundColor: "#dc3545",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },

  deleteText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
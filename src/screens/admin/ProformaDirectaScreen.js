import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

const API = "https://api360suite.pqautoexpert.ec/api";

export default function ProformaDirectaScreen() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ======================
     CLIENTE / VEHÍCULO
  ====================== */
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [placa, setPlaca] = useState("");

  const [personas, setPersonas] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  /* ======================
     SERVICIOS
  ====================== */
  const [services, setServices] = useState([]);
  const [subservices, setSubservices] = useState([]);
  const [idService, setIdService] = useState(null);
  const [idSubservice, setIdSubservice] = useState(null);
  const [showServices, setShowServices] = useState(false);
  const [showSubservices, setShowSubservices] = useState(false);

  /* ======================
     ÍTEMS
  ====================== */
  const [itemDesc, setItemDesc] = useState("");
  const [itemCant, setItemCant] = useState("1");
  const [itemPrecio, setItemPrecio] = useState("");
  const [items, setItems] = useState([]);

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
    await cargarServicios(t);
    setLoading(false);
  };

  const auth = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  /* ======================
     BUSCAR PERSONA
  ====================== */
  const buscarPersonaBD = async (text) => {
    setCedula(text);
    if (text.length < 3) {
      setShowDropdown(false);
      return;
    }

    const res = await fetch(`${API}/proformadir/buscar/${text}`, {
      headers: auth(),
    });
    const data = await res.json();
    setPersonas(data.resultados || []);
    setShowDropdown(true);
  };

  const seleccionarPersona = (p) => {
    setCedula(p.cedula);
    setNombre(p.nombres);
    setApellido(p.apellidos);
    setTelefono(p.telefono || "");
    setDireccion(p.direccion || "");
    setShowDropdown(false);
  };

  /* ======================
     SERVICIOS
  ====================== */
  const cargarServicios = async (t) => {
    const res = await fetch(`${API}/tickets/services`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    setServices(await res.json());
  };

  const seleccionarServicio = async (s) => {
    setIdService(s);
    setIdSubservice(null);
    setShowServices(false);

    const res = await fetch(`${API}/tickets/subservices/${s.id}`, {
      headers: auth(),
    });
    setSubservices(await res.json());
  };

  const seleccionarSubservicio = (ss) => {
    setIdSubservice(ss);
    setShowSubservices(false);
  };

  /* ======================
     ÍTEMS
  ====================== */
  const agregarItem = () => {
    if (!itemDesc || !itemPrecio) {
      Alert.alert("Error", "Complete descripción y precio");
      return;
    }

    setItems([
      ...items,
      {
        descripcion: itemDesc,
        cantidad: Number(itemCant),
        precio_unitario: Number(itemPrecio),
        total: Number(itemCant) * Number(itemPrecio),
      },
    ]);

    setItemDesc("");
    setItemCant("1");
    setItemPrecio("");
  };

  const total = items.reduce((s, i) => s + i.total, 0);

  /* ======================
     GUARDAR PROFORMA
  ====================== */
  const guardarProforma = async () => {
    const body = {
      nombre_cliente: nombre,
      apellido_cliente: apellido,
      telefono_cliente: telefono,
      direccion,
      placa,
      numero_cedula: cedula,
      id_service: idService?.id,
      id_subservice: idSubservice?.id,
      items,
    };

    const res = await fetch(`${API}/proformadir`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      Alert.alert("Error", "No se pudo crear la proforma");
      return;
    }

    Alert.alert(
      "✔ Proforma creada",
      "¿Crear otro servicio con los mismos datos?",
      [
        {
          text: "No",
          style: "cancel",
          onPress: limpiarTodo,
        },
        {
          text: "Sí",
          onPress: () => {
            setItems([]);
            setIdService(null);
            setIdSubservice(null);
          },
        },
      ]
    );
  };

  const limpiarTodo = () => {
    setCedula("");
    setNombre("");
    setApellido("");
    setTelefono("");
    setDireccion("");
    setPlaca("");
    setItems([]);
    setIdService(null);
    setIdSubservice(null);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Cargando…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="always">

        <Text style={styles.title}>🚀 Crear Proforma Directa</Text>
        <Text style={styles.subtitle}>Todo en un solo paso</Text>

        {/* CLIENTE */}
        <Text style={styles.section}>👤 Cliente</Text>

        <TextInput style={styles.input} placeholder="Cédula" value={cedula} onChangeText={buscarPersonaBD} />
        {showDropdown &&
          personas.map((p) => (
            <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => seleccionarPersona(p)}>
              <Text>{p.cedula} - {p.nombres}</Text>
            </TouchableOpacity>
          ))}

        <TextInput style={styles.input} placeholder="Nombre" value={nombre} onChangeText={setNombre} />
        <TextInput style={styles.input} placeholder="Apellido" value={apellido} onChangeText={setApellido} />
        <TextInput style={styles.input} placeholder="Teléfono" value={telefono} onChangeText={setTelefono} />
        <TextInput style={styles.input} placeholder="Dirección" value={direccion} onChangeText={setDireccion} />
        <TextInput style={styles.input} placeholder="Placa" value={placa} onChangeText={setPlaca} autoCapitalize="characters" />

        {/* SERVICIO */}
        <Text style={styles.section}>🔧 Servicio</Text>

        <TouchableOpacity style={styles.selector} onPress={() => setShowServices(!showServices)}>
          <Text>{idService ? idService.nombre : "Seleccione servicio"}</Text>
        </TouchableOpacity>

        {showServices &&
          services.map((s) => (
            <TouchableOpacity key={s.id} style={styles.dropdownItem} onPress={() => seleccionarServicio(s)}>
              <Text>{s.nombre}</Text>
            </TouchableOpacity>
          ))}

        {idService && (
          <>
            <TouchableOpacity style={styles.selector} onPress={() => setShowSubservices(!showSubservices)}>
              <Text>{idSubservice ? idSubservice.nombre : "Seleccione subservicio"}</Text>
            </TouchableOpacity>

            {showSubservices &&
              subservices.map((ss) => (
                <TouchableOpacity key={ss.id} style={styles.dropdownItem} onPress={() => seleccionarSubservicio(ss)}>
                  <Text>{ss.nombre}</Text>
                </TouchableOpacity>
              ))}
          </>
        )}

        {/* ÍTEMS */}
        <Text style={styles.section}>🧾 Ítems</Text>

        <View style={styles.cardItem}>
          <TextInput style={styles.inputBig} placeholder="Descripción" value={itemDesc} onChangeText={setItemDesc} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput style={[styles.inputBig, { flex: 1 }]} placeholder="Cant." keyboardType="numeric" value={itemCant} onChangeText={setItemCant} />
            <TextInput style={[styles.inputBig, { flex: 1 }]} placeholder="Precio" keyboardType="numeric" value={itemPrecio} onChangeText={setItemPrecio} />
          </View>
          <TouchableOpacity style={styles.btnMain} onPress={agregarItem}>
            <Text style={styles.btnText}>➕ Añadir Ítem</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.total}>Total: {total.toFixed(2)} USD</Text>

        <TouchableOpacity style={styles.btnMain} onPress={guardarProforma}>
          <Text style={styles.btnText}>🚀 Guardar Proforma</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ======================
   ESTILOS
====================== */
const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#f4f6f9" },
  title: { fontSize: 22, fontWeight: "900", color: "#111d4d", marginTop: 20 },
  subtitle: { color: "#666", marginBottom: 20 },
  section: { marginTop: 25, fontWeight: "700", color: "#111d4d" },
  input: { backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 10 },
  selector: { backgroundColor: "#fff", padding: 14, borderRadius: 10, marginBottom: 10 },
  inputBig: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 10, fontSize: 16 },
  btnMain: { backgroundColor: "#111d4d", padding: 14, borderRadius: 12, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  dropdownItem: { padding: 10, backgroundColor: "#eee" },
  total: { marginTop: 15, fontSize: 18, fontWeight: "bold" },
  cardItem: { backgroundColor: "#fff", padding: 15, borderRadius: 14 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
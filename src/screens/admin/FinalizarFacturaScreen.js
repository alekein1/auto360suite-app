import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as SecureStore from "expo-secure-store";

const API = "https://api360suite.pqautoexpert.ec/api";

export default function FinalizarFacturaScreen({ route, navigation }) {
  const { id_factura } = route.params;

  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // ESTADO PRINCIPAL
  // =========================
  const [establecimientos, setEstablecimientos] = useState([]);
  const [idEstablecimiento, setIdEstablecimiento] = useState(null);

  const [cliente, setCliente] = useState({
    identificacion: "",
    tipo_identificacion: "CEDULA",
    razon_social: "",
    direccion: "",
    telefono: "",
    correo: ""
  });

  const [items, setItems] = useState([]);
  const [observacion, setObservacion] = useState("");
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [descuentoTotal, setDescuentoTotal] = useState(0);

  // =========================
  // INIT
  // =========================
  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const t = await SecureStore.getItemAsync("token");
    setToken(t);
    await Promise.all([
      cargarEstablecimientos(t),
      cargarFactura(t)
    ]);
    setLoading(false);
  };

  // =========================
  // CARGAR ESTABLECIMIENTOS
  // =========================
  const cargarEstablecimientos = async (t) => {
    const res = await fetch(`${API}/factura/listar-establecimientos`, {
      headers: { Authorization: `Bearer ${t}` }
    });
    const json = await res.json();
    setEstablecimientos(json.establecimientos || []);
  };

  // =========================
  // CARGAR FACTURA
  // =========================
  const cargarFactura = async (t) => {
    const res = await fetch(`${API}/factura/traerfactura/${id_factura}`, {
      headers: { Authorization: `Bearer ${t}` }
    });
    const json = await res.json();
    if (!json.ok) return;

    const f = json.factura;

    setCliente({
      identificacion: f.identificacion || "",
      tipo_identificacion: f.tipo_identificacion || "CEDULA",
      razon_social: f.razon_social || "",
      direccion: f.direccion || "",
      telefono: f.telefono || "",
      correo: f.correo || ""
    });

    setObservacion(f.observacion || "");
    setFormaPago(f.forma_pago || "EFECTIVO");

    if (json.detalles?.length) {
      setItems(
        json.detalles.map(d => ({
          servicio: d.servicio || "",
          subservicio: d.subservicio || "",
          descripcion: d.descripcion || "",
          cantidad: Number(d.cantidad),
          precio: Number(d.precio_unit),
          descuento: Number(d.descuento || 0)
        }))
      );
    } else {
      setItems([{
        servicio: "",
        subservicio: "",
        descripcion: "",
        cantidad: 1,
        precio: Number(f.total) || 0,
        descuento: 0
      }]);
    }
  };

  // =========================
  // ITEMS
  // =========================
  const agregarItem = () => {
    setItems([...items, {
      servicio: "",
      subservicio: "",
      descripcion: "",
      cantidad: 1,
      precio: 0,
      descuento: 0
    }]);
  };

  const eliminarItem = (i) => {
    setItems(items.filter((_, index) => index !== i));
  };

  const actualizarItem = (i, campo, valor) => {
    const copia = [...items];
    copia[i][campo] = valor;
    setItems(copia);
  };

  // =========================
  // TOTALES
  // =========================
  const calcularTotales = () => {
    let subtotal = 0;
    let iva = 0;

    items.forEach(i => {
      const base = (i.cantidad * i.precio) - i.descuento;
      subtotal += base * 0.85;
      iva += base * 0.15;
    });

    const total = subtotal + iva - Number(descuentoTotal || 0);
    return { subtotal, iva, total };
  };

  const { subtotal, iva, total } = calcularTotales();

  // =========================
  // FINALIZAR FACTURA
  // =========================
  const finalizarFactura = async () => {
    const payload = {
      id_establecimiento: idEstablecimiento,
      ...cliente,
      observacion,
      forma_pago: formaPago,
      subtotal,
      iva,
      descuento_total: Number(descuentoTotal),
      total,
      estado_sri: "APROBADA",
      items
    };

    const res = await fetch(`${API}/factura/finalizar/${id_factura}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.ok) {
      Alert.alert("Error", "No se pudo finalizar la factura");
      return;
    }

    Alert.alert("✔ Factura finalizada");
    navigation.goBack();
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  // =========================
  // UI
  // =========================
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Finalizar Factura #{id_factura}</Text>

      <Text style={styles.section}>Establecimiento</Text>
      <Picker selectedValue={idEstablecimiento} onValueChange={setIdEstablecimiento}>
        <Picker.Item label="Seleccione..." value={null} />
        {establecimientos.map(e => (
          <Picker.Item
            key={e.id}
            label={`${e.razon_social} ${e.cod_establecimiento}-${e.cod_punto_emision}`}
            value={e.id}
          />
        ))}
      </Picker>

      <Text style={styles.section}>Cliente</Text>
      {Object.keys(cliente).map(k => (
        <TextInput
          key={k}
          placeholder={k.replace("_", " ").toUpperCase()}
          value={cliente[k]}
          onChangeText={v => setCliente({ ...cliente, [k]: v })}
          style={styles.input}
        />
      ))}

      <Text style={styles.section}>Ítems de la Factura</Text>
      {items.map((i, idx) => (
        <View key={idx} style={styles.card}>
          <TextInput
            placeholder="Servicio"
            value={i.servicio}
            onChangeText={v => actualizarItem(idx, "servicio", v)}
            style={styles.input}
          />
          <TextInput
            placeholder="Subservicio"
            value={i.subservicio}
            onChangeText={v => actualizarItem(idx, "subservicio", v)}
            style={styles.input}
          />
          <TextInput
            placeholder="Descripción"
            value={i.descripcion}
            onChangeText={v => actualizarItem(idx, "descripcion", v)}
            style={styles.input}
          />
          <TextInput
            placeholder="Cantidad"
            keyboardType="numeric"
            value={String(i.cantidad)}
            onChangeText={v => actualizarItem(idx, "cantidad", Number(v))}
            style={styles.input}
          />
          <TextInput
            placeholder="Precio"
            keyboardType="numeric"
            value={String(i.precio)}
            onChangeText={v => actualizarItem(idx, "precio", Number(v))}
            style={styles.input}
          />
          <TextInput
            placeholder="Descuento"
            keyboardType="numeric"
            value={String(i.descuento)}
            onChangeText={v => actualizarItem(idx, "descuento", Number(v))}
            style={styles.input}
          />

          <TouchableOpacity onPress={() => eliminarItem(idx)}>
            <Text style={styles.delete}>Eliminar ítem</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity onPress={agregarItem}>
        <Text style={styles.add}>➕ Agregar ítem</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Observación</Text>
      <TextInput
        multiline
        numberOfLines={4}
        value={observacion}
        onChangeText={setObservacion}
        style={[styles.input, { height: 100 }]}
      />

      <Text style={styles.section}>Forma de Pago</Text>
      <Picker selectedValue={formaPago} onValueChange={setFormaPago}>
        <Picker.Item label="Efectivo" value="EFECTIVO" />
        <Picker.Item label="Transferencia" value="TRANSFERENCIA" />
        <Picker.Item label="Tarjeta" value="TARJETA" />
      </Picker>

      <Text style={styles.section}>Totales</Text>
      <Text>Subtotal: ${subtotal.toFixed(2)}</Text>
      <Text>IVA 15%: ${iva.toFixed(2)}</Text>
      <Text>Total Final: ${total.toFixed(2)}</Text>

      <TouchableOpacity style={styles.btn} onPress={finalizarFactura}>
        <Text style={styles.btnText}>✔ Guardar Cambios y Finalizar Factura</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// =========================
// STYLES
// =========================
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f5f7fa" },
  title: { fontSize: 22, fontWeight: "900", marginBottom: 20 },
  section: { marginTop: 20, fontWeight: "bold" },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginVertical: 6
  },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginVertical: 6
  },
  add: { color: "#debb3c", marginVertical: 10, fontWeight: "bold" },
  delete: { color: "red", marginTop: 6 },
  btn: {
    backgroundColor: "#111d4d",
    padding: 16,
    borderRadius: 10,
    marginVertical: 30
  },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" }
});
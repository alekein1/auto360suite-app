import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as SecureStore from "expo-secure-store";

const API = "https://api360suite.pqautoexpert.ec/api";

function money(value) {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return "0.00";
  return number.toFixed(2);
}

function confirmar(titulo, mensaje) {
  return new Promise((resolve) => {
    Alert.alert(titulo, mensaje, [
      { text: "No", style: "cancel", onPress: () => resolve(false) },
      { text: "Si", onPress: () => resolve(true) },
    ]);
  });
}

export default function FacturaManualScreen({ navigation }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [idEstablecimiento, setIdEstablecimiento] = useState(null);
  const [cliente, setCliente] = useState({
    identificacion: "",
    tipo_identificacion: "CEDULA",
    razon_social: "",
    direccion: "",
    telefono: "",
    correo: "",
  });
  const [observacion, setObservacion] = useState("");
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [descuentoTotal, setDescuentoTotal] = useState("0");
  const [items, setItems] = useState([
    { descripcion: "", cantidad: "1", precio: "", descuento: "0" },
  ]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const t = await SecureStore.getItemAsync("token");
      if (!t) {
        Alert.alert("Sesion expirada", "Vuelva a iniciar sesion");
        navigation.goBack();
        return;
      }

      setToken(t);
      await cargarEstablecimientos(t);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo cargar factura manual");
    } finally {
      setLoading(false);
    }
  }

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async function cargarEstablecimientos(t) {
    const res = await fetch(`${API}/factura/listar-establecimientos`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const json = await res.json().catch(() => ({}));
    const rows = json.establecimientos || [];

    setEstablecimientos(rows);
    if (rows.length) setIdEstablecimiento(rows[0].id);
  }

  function actualizarCliente(campo, valor) {
    setCliente((prev) => ({ ...prev, [campo]: valor }));
  }

  function actualizarItem(index, campo, valor) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [campo]: valor };
      return next;
    });
  }

  function agregarItem() {
    setItems((prev) => [
      ...prev,
      { descripcion: "", cantidad: "1", precio: "", descuento: "0" },
    ]);
  }

  function eliminarItem(index) {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  const totales = useMemo(() => {
    let subtotal = 0;
    let iva = 0;

    items.forEach((item) => {
      const cantidad = Number(item.cantidad || 1);
      const precioConIva = Number(item.precio || 0);
      const descuento = Number(item.descuento || 0);
      const totalLinea = Math.max(0, cantidad * precioConIva - descuento);
      const subtotalLinea = totalLinea / 1.15;

      subtotal += subtotalLinea;
      iva += totalLinea - subtotalLinea;
    });

    const total = subtotal + iva - Number(descuentoTotal || 0);

    return { subtotal, iva, total };
  }, [items, descuentoTotal]);

  async function procesarFacturaSri(idFactura) {
    const res = await fetch(`${API}/factura/sri/procesar/${idFactura}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        correo_destino: cliente.correo,
        enviar_correo: Boolean(cliente.correo),
      }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      throw new Error(json.mensaje || "La factura se creo, pero no se autorizo en el SRI");
    }

    return json;
  }

  async function enviarRideWhatsapp(idFactura) {
    const res = await fetch(`${API}/factura/sri/ride/${idFactura}/whatsapp`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ telefono: cliente.telefono }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      throw new Error(json.mensaje || "No se pudo enviar el RIDE por WhatsApp");
    }

    return json;
  }

  async function guardarFactura() {
    if (!idEstablecimiento) {
      Alert.alert("Atencion", "Seleccione un establecimiento");
      return;
    }

    if (!cliente.identificacion || !cliente.razon_social) {
      Alert.alert("Atencion", "Ingrese identificacion y razon social");
      return;
    }

    const detalles = items
      .filter((item) => item.descripcion && Number(item.precio || 0) > 0)
      .map((item) => ({
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad || 1),
        precio: Number(item.precio || 0),
        descuento: Number(item.descuento || 0),
      }));

    if (!detalles.length) {
      Alert.alert("Atencion", "Agregue al menos un item con precio");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        id_establecimiento: idEstablecimiento,
        ...cliente,
        observacion,
        forma_pago: formaPago,
        descuento_total: Number(descuentoTotal || 0),
        items: detalles,
      };

      const res = await fetch(`${API}/factura/manual`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        Alert.alert("Error", json.msg || json.error || "No se pudo crear la factura");
        return;
      }

      Alert.alert("Factura creada", `Factura ${json.numeroFactura || json.id_factura}`);

      const enviarSri = await confirmar("SRI", "Desea enviar esta factura al SRI ahora?");
      if (enviarSri) {
        await procesarFacturaSri(json.id_factura);
        Alert.alert("SRI", "Factura autorizada por el SRI.");

        const enviarWhatsapp = await confirmar(
          "WhatsApp",
          "Desea enviar el RIDE al WhatsApp del cliente?"
        );

        if (enviarWhatsapp) {
          await enviarRideWhatsapp(json.id_factura);
          Alert.alert("WhatsApp", "RIDE enviado por WhatsApp correctamente");
        }
      }

      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message || "No se pudo guardar la factura");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={styles.loadingText}>Cargando factura manual...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Factura Manual</Text>

      <View style={styles.card}>
        <Text style={styles.section}>Establecimiento</Text>
        <Picker selectedValue={idEstablecimiento} onValueChange={setIdEstablecimiento}>
          {establecimientos.map((establecimiento) => (
            <Picker.Item
              key={establecimiento.id}
              label={`${establecimiento.razon_social} ${establecimiento.cod_establecimiento}-${establecimiento.cod_punto_emision}`}
              value={establecimiento.id}
            />
          ))}
        </Picker>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Cliente</Text>
        <TextInput
          style={styles.input}
          placeholder="Identificacion"
          value={cliente.identificacion}
          onChangeText={(value) => actualizarCliente("identificacion", value)}
          keyboardType="numeric"
        />
        <Picker
          selectedValue={cliente.tipo_identificacion}
          onValueChange={(value) => actualizarCliente("tipo_identificacion", value)}
        >
          <Picker.Item label="Cedula" value="CEDULA" />
          <Picker.Item label="RUC" value="RUC" />
          <Picker.Item label="Pasaporte" value="PASAPORTE" />
        </Picker>
        <TextInput
          style={styles.input}
          placeholder="Razon social"
          value={cliente.razon_social}
          onChangeText={(value) => actualizarCliente("razon_social", value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Direccion"
          value={cliente.direccion}
          onChangeText={(value) => actualizarCliente("direccion", value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Telefono"
          value={cliente.telefono}
          onChangeText={(value) => actualizarCliente("telefono", value)}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Correo"
          value={cliente.correo}
          onChangeText={(value) => actualizarCliente("correo", value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Items</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <TextInput
              style={styles.input}
              placeholder="Descripcion"
              value={item.descripcion}
              onChangeText={(value) => actualizarItem(index, "descripcion", value)}
            />
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              value={String(item.cantidad)}
              onChangeText={(value) => actualizarItem(index, "cantidad", value)}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Precio con IVA"
              value={String(item.precio)}
              onChangeText={(value) => actualizarItem(index, "precio", value)}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Descuento"
              value={String(item.descuento)}
              onChangeText={(value) => actualizarItem(index, "descuento", value)}
              keyboardType="decimal-pad"
            />

            {items.length > 1 && (
              <TouchableOpacity onPress={() => eliminarItem(index)}>
                <Text style={styles.delete}>Eliminar item</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.secondaryBtn} onPress={agregarItem}>
          <Text style={styles.secondaryText}>Anadir item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Forma de pago</Text>
        <Picker selectedValue={formaPago} onValueChange={setFormaPago}>
          <Picker.Item label="Efectivo" value="EFECTIVO" />
          <Picker.Item label="Transferencia" value="TRANSFERENCIA" />
          <Picker.Item label="Tarjeta" value="TARJETA" />
        </Picker>

        <TextInput
          style={styles.input}
          placeholder="Descuento total"
          value={String(descuentoTotal)}
          onChangeText={setDescuentoTotal}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Observacion"
          value={observacion}
          onChangeText={setObservacion}
          multiline
        />

        <Text style={styles.total}>Subtotal: ${money(totales.subtotal)}</Text>
        <Text style={styles.total}>IVA 15%: ${money(totales.iva)}</Text>
        <Text style={styles.totalStrong}>Total: ${money(totales.total)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, saving && styles.btnDisabled]}
        onPress={guardarFactura}
        disabled={saving}
      >
        <Text style={styles.primaryText}>{saving ? "Guardando..." : "Crear factura"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  content: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 36,
    gap: 14,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    marginTop: 12,
    color: "#111d4d",
    fontWeight: "800",
  },
  title: {
    color: "#111d4d",
    fontSize: 24,
    fontWeight: "900",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  section: {
    color: "#111d4d",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe2ea",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    color: "#111827",
    fontWeight: "700",
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  itemCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  delete: {
    color: "#b91c1c",
    fontWeight: "900",
    textAlign: "center",
  },
  total: {
    color: "#111827",
    fontWeight: "800",
    marginTop: 4,
  },
  totalStrong: {
    color: "#111d4d",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: "#111d4d",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#111d4d",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: "#111d4d",
    fontWeight: "900",
  },
  btnDisabled: {
    opacity: 0.65,
  },
});

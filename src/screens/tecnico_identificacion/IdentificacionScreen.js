import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as ImageManipulator from "expo-image-manipulator";
import { SafeAreaView } from "react-native-safe-area-context";
import useLockOrderBackNavigation from "../../hooks/useLockOrderBackNavigation";
import { unregisterDevicePushNotifications } from "../../services/pushNotifications";

const API = "https://api360suite.pqautoexpert.ec/api";
const ADMIN_IDENTIFICACION_EMAIL = "pq.ec593@gmail.com";

const TIPOS_FOTOS = [
  { tipo: "vehiculo", nombre: "Foto(s) Vehículo" },
  { tipo: "motor", nombre: "Foto(s) Motor" },
  { tipo: "chasis", nombre: "Foto(s) Chasis" },
  { tipo: "plaquilla_referencial", nombre: "Plaquilla Referencial" },
  { tipo: "placa_vin", nombre: "Placa VIN" },
  { tipo: "adhesivo_seguridad", nombre: "Adhesivo Seguridad" },
  { tipo: "lectura_ecu", nombre: "Lectura ECU" },
];

const CAMPOS_MANUALES_VEHICULO = [
  { key: "placa", placeholder: "Placa" },
  { key: "marca", placeholder: "Marca" },
  { key: "modelo", placeholder: "Modelo" },
  { key: "anio", placeholder: "Año" },
  { key: "pais_origen", placeholder: "País de origen" },
  { key: "numero_motor", placeholder: "Número de motor" },
  { key: "numero_chasis", placeholder: "Número de chasis" },
];

const emptyVehiculo = {
  placa: "",
  marca: "",
  modelo: "",
  anio: "",
  pais_origen: "",
  numero_motor: "",
  numero_chasis: "",
  manual: false,
};

export default function IdentificacionScreen({ route, navigation }) {
  useLockOrderBackNavigation();
  const { id_orden } = route.params;

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [estadoOrden, setEstadoOrden] = useState("");

  const [placa, setPlaca] = useState("");
  const [cedula, setCedula] = useState("");
  const [cedulaDueno, setCedulaDueno] = useState("");

  const [observaciones, setObservaciones] = useState("");
  const [conclusiones, setConclusiones] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const [totalProforma, setTotalProforma] = useState(0);
  const [totalFinal, setTotalFinal] = useState(0);
  

  const [clienteData, setClienteData] = useState({
    nombres: "",
    apellidos: "",
    telefono_manual: "",
    direccion_manual: "",
  });

  const [vehiculoData, setVehiculoData] = useState(emptyVehiculo);
  const [manualVisible, setManualVisible] = useState(false);

  const [fotosDetalle, setFotosDetalle] = useState([]);
  const [fotosExtra, setFotosExtra] = useState([]);
  const [serviciosExtra, setServiciosExtra] = useState([]);

  const [newDescByTipo, setNewDescByTipo] = useState({});
  const [descFotoExistente, setDescFotoExistente] = useState({});
  const [fotoExtraNombre, setFotoExtraNombre] = useState("");
  const [fotoExtraDescripcion, setFotoExtraDescripcion] = useState("");
  const [extraDesc, setExtraDesc] = useState("");
  const [extraValor, setExtraValor] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const correoUsuario = String(
    usuario?.correo || usuario?.email || usuario?.usuario || ""
  ).toLowerCase();
  const esAdminIdentificacion = correoUsuario === ADMIN_IDENTIFICACION_EMAIL;

  async function getToken() {
    const token = await SecureStore.getItemAsync("token");
    if (!token) throw new Error("Token no encontrado");
    return token;
  }

  function irInicio() {
    navigation?.navigate?.("HomeIdentificacion");
  }

  async function cerrarSesion() {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        await unregisterDevicePushNotifications(token).catch(() => {});
      }
    } finally {
      await SecureStore.deleteItemAsync("expo_push_token");
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("usuario");
      const rootNavigation = navigation.getParent?.();
      if (rootNavigation) {
        rootNavigation.replace("Welcome");
      } else {
        navigation.replace("Welcome");
      }
    }
  }

  function authHeader(token) {
    return { Authorization: `Bearer ${token}` };
  }

  function asNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function isBlank(value) {
    return String(value ?? "").trim() === "";
  }

  function normalizeVehiculoFromApi(v = {}, extra = {}) {
    return {
      placa: v.placa || extra.placa || "",
      marca: v.marca || "",
      modelo: v.modelo || "",
      anio:
        v.anio ||
        v.anio_fabricacion ||
        extra.anio ||
        extra.anio_fabricacion ||
        "",
      pais_origen: v.pais_origen || extra.pais_origen || "",
      numero_motor:
        v.numero_motor || v.motor || extra.numero_motor || extra.motor || "",
      numero_chasis:
        v.numero_chasis || v.chasis || extra.numero_chasis || extra.chasis || "",
      manual: !!extra.manual,
    };
  }

  async function cargarContactoTicket(token) {
    const res = await fetch(`${API}/identificacion/contacto/${id_orden}`, {
      headers: authHeader(token),
    });

    const data = await res.json();

    if (data?.ok && data?.persona) {
      const p = data.persona;
      setClienteData({
        nombres: p.nombres || "",
        apellidos: p.apellidos || "",
        telefono_manual: p.telefono || "",
        direccion_manual: p.direccion || "",
      });
    }
  }

  async function cargarDatos() {
    try {
      setLoading(true);
      const token = await getToken();
      const storedUser = await SecureStore.getItemAsync("usuario");

      if (storedUser) {
        setUsuario(JSON.parse(storedUser));
      }

      await cargarContactoTicket(token);

      const res = await fetch(`${API}/identificacion/${id_orden}`, {
        headers: authHeader(token),
      });

      const ident = await res.json();

      setPlaca(ident.placa ?? "");
      setCedula(ident.cedula ?? "");
      setObservaciones(ident.observaciones ?? "");
      setConclusiones(ident.conclusiones ?? "");
      setEstadoOrden(ident.estado_orden ?? ident.estadoOrden ?? "");

      setTotalProforma(asNumber(ident.total_proforma));
      setTotalFinal(asNumber(ident.total_final));

      if (ident.datos_vehiculo) {
        try {
          const parsed = JSON.parse(ident.datos_vehiculo);
          setVehiculoData({
            placa: parsed.placa || "",
            marca: parsed.marca || "",
            modelo: parsed.modelo || "",
            anio: parsed.anio || "",
            pais_origen: parsed.pais_origen || "",
            numero_motor: parsed.numero_motor || "",
            numero_chasis: parsed.numero_chasis || "",
            manual: !!parsed.manual,
          });
          setManualVisible(!!parsed.manual);
        } catch (e) {
          console.log("Error parsing datos_vehiculo", e);
        }
      }

      const detalle = ident.fotos_detalle || [];
      setFotosDetalle(detalle);

      const descMap = {};
      detalle.forEach((f) => {
        descMap[f.id] = f.descripcion || "";
      });
      setDescFotoExistente(descMap);

      setFotosExtra(ident.fotos_extra || []);
      setServiciosExtra(ident.servicios_extra || []);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }

  async function consultarANT() {
    try {
      if (!placa.trim()) {
        Alert.alert("Aviso", "Ingrese la placa");
        return;
      }

      const token = await getToken();
      let url = `${API}/identificacion/consultar/ant/${placa.trim()}`;

      if (cedulaDueno.trim()) {
        url += `?cedula=${encodeURIComponent(cedulaDueno.trim())}`;
      }

      const res = await fetch(url, { headers: authHeader(token) });
      const json = await res.json();

      if (json.requiereCedula === true) {
        Alert.alert("Aviso", "Ingrese la cédula del dueño para continuar");
        return;
      }

      if (!json.ok || !json.vehiculo) {
        setManualVisible(true);
        setVehiculoData({
          placa: placa.trim(),
          marca: "",
          modelo: "",
          anio: "",
          pais_origen: "",
          numero_motor: "",
          numero_chasis: "",
          manual: true,
        });
        Alert.alert("Aviso", "No se encontraron datos del vehículo. Ingrese manualmente.");
        return;
      }

      setVehiculoData(normalizeVehiculoFromApi(json.vehiculo));
      setManualVisible(false);

      if (json.propietario?.cedula) {
        setCedulaDueno(String(json.propietario.cedula));
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error consultando ANT");
    }
  }

  async function consultarSRIBasico() {
    try {
      if (!placa.trim()) {
        Alert.alert("Aviso", "Ingrese la placa");
        return;
      }

      const token = await getToken();
      const res = await fetch(`${API}/identificacion/consultar/sri-basico/${placa.trim()}`, {
        headers: authHeader(token),
      });

      const json = await res.json();

      if (!json.ok || !json.vehiculo) {
        Alert.alert("Aviso", json.mensaje || "No se encontraron datos");
        return;
      }

      setVehiculoData(
        normalizeVehiculoFromApi(json.vehiculo, {
          placa: placa.trim(),
          manual: true,
        })
      );

      setManualVisible(true);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error consultando SRI");
    }
  }

  async function consultarBloqueosBasico() {
    try {
      if (!placa.trim()) {
        Alert.alert("Aviso", "Ingrese la placa");
        return;
      }

      const token = await getToken();
      const res = await fetch(`${API}/identificacion/consultar/bloqueos/${placa.trim()}`, {
        headers: authHeader(token),
      });

      const json = await res.json();

      if (!json.ok || !json.vehiculo) {
        Alert.alert("Aviso", json.mensaje || "No se encontraron datos");
        return;
      }

      setVehiculoData(
        normalizeVehiculoFromApi(json.vehiculo, {
          placa: placa.trim(),
          manual: false,
        })
      );

      setManualVisible(false);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error consultando bloqueos");
    }
  }

  async function consultarANTPro() {
    try {
      if (!placa.trim()) {
        Alert.alert("Aviso", "Ingrese la placa");
        return;
      }

      const token = await getToken();
      const res = await fetch(`${API}/identificacion/consultar/ant-pro/${placa.trim()}`, {
        headers: authHeader(token),
      });

      const json = await res.json();

      if (!json.ok || !json.vehiculo) {
        Alert.alert("Aviso", json.mensaje || "No se encontraron datos");
        return;
      }

      setVehiculoData(
        normalizeVehiculoFromApi(json.vehiculo, {
          placa: placa.trim(),
          manual: false,
        })
      );

      setManualVisible(false);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error consultando ANT PRO");
    }
  }

  async function rotarImagen(uri) {
    return ImageManipulator.manipulateAsync(
      uri,
      [{ rotate: 90 }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
  }

  async function pedirPermisosImagen() {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    const gal = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cam.granted || gal.granted;
  }

  function getPickerOptions(origen) {
    if (Platform.OS === "android") {
      return {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        shape: "rectangle",
      };
    }

    if (origen === "gallery") {
      return {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      };
    }

    return {
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    };
  }

  async function normalizarImagenSeleccionada(asset) {
    if (!asset?.uri) {
      return null;
    }

    if (Platform.OS === "android") {
      const extension =
        asset.fileName?.split(".").pop() || asset.mimeType?.split("/").pop() || "jpg";

      return {
        ...asset,
        fileName: asset.fileName || `foto_${Date.now()}.${extension}`,
        mimeType: asset.mimeType || "image/jpeg",
      };
    }

    const fixedImage = await ImageManipulator.manipulateAsync(
      asset.uri,
      [],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      ...asset,
      uri: fixedImage.uri,
      fileName: asset.fileName || `foto_${Date.now()}.jpg`,
      mimeType: "image/jpeg",
    };
  }

  async function seleccionarImagen(origen = "camera") {
    const ok = await pedirPermisosImagen();

    if (!ok) {
      Alert.alert("Permiso requerido", "Debe permitir cámara o galería");
      return null;
    }

    const pickerOptions = getPickerOptions(origen);

    if (origen === "gallery") {
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (result.canceled) return null;
      return normalizarImagenSeleccionada(result.assets?.[0]);
    }

    const result = await ImagePicker.launchCameraAsync(pickerOptions);

    if (result.canceled) return null;
    return normalizarImagenSeleccionada(result.assets?.[0]);
  }

  function pedirOrigenImagen(callback) {
    Alert.alert(
      "Seleccionar imagen",
      "¿Desea tomar foto o escoger de galería?",
      [
        { text: "Cámara", onPress: () => callback("camera") },
        { text: "Galería", onPress: () => callback("gallery") },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }

async function subirFotoObligatoria(tipo, origen = "camera") {
  try {
    const asset = await seleccionarImagen(origen);
    if (!asset) return;

    setPreviewImage({
      ...asset,
      tipo,
    });

  } catch (e) {
    console.log(e);
    Alert.alert("Error", "No se pudo seleccionar la foto");
  }
}

async function subirImagenFinal(preview) {
  try {
    const token = await getToken();
    const form = new FormData();

    form.append("foto", {
      uri: preview.uri,
      name: preview.fileName || `foto_${preview.tipo}.jpg`,
      type: preview.mimeType || "image/jpeg",
    });

    form.append("descripcion", newDescByTipo[preview.tipo] || "");

    const res = await fetch(`${API}/identificacion/${id_orden}/foto/${preview.tipo}`, {
      method: "POST",
      headers: authHeader(token),
      body: form,
    });

    if (!res.ok) {
      Alert.alert("Error", "Error subiendo la foto");
      return;
    }

    setPreviewImage(null);
    await cargarDatos();

  } catch (e) {
    console.log(e);
    Alert.alert("Error", "No se pudo subir");
  }
}

  async function subirFotoExtra(origen = "camera") {
    try {
      const asset = await seleccionarImagen(origen);
      if (!asset) return;

      const token = await getToken();
      const form = new FormData();

      form.append("foto", {
        uri: asset.uri,
        name: asset.fileName || `foto_extra_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
      form.append("nombre", fotoExtraNombre || "");
      form.append("descripcion", fotoExtraDescripcion || "");

      const res = await fetch(`${API}/identificacion/${id_orden}/foto-extra`, {
        method: "POST",
        headers: authHeader(token),
        body: form,
      });

      if (!res.ok) {
        Alert.alert("Error", "No se pudo subir la foto extra");
        return;
      }

      setFotoExtraNombre("");
      setFotoExtraDescripcion("");
      await cargarDatos();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo subir la foto extra");
    }
  }

  async function eliminarFotoObligatoria(id) {
    try {
      const token = await getToken();

      const res = await fetch(`${API}/identificacion/foto/${id}`, {
        method: "DELETE",
        headers: authHeader(token),
      });

      if (!res.ok) {
        Alert.alert("Error", "No se pudo eliminar la foto");
        return;
      }

      await cargarDatos();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo eliminar la foto");
    }
  }

  async function eliminarFotoExtra(id) {
    try {
      const token = await getToken();

      const res = await fetch(`${API}/identificacion/foto-extra/${id}`, {
        headers: authHeader(token),
      });

      if (!res.ok) {
        Alert.alert("Error", "No se pudo eliminar la foto extra");
        return;
      }

      await cargarDatos();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo eliminar la foto extra");
    }
  }

  async function guardarDescripciones() {
    try {
      const token = await getToken();

      for (const fotoId of Object.keys(descFotoExistente)) {
        await fetch(`${API}/identificacion/foto-detalle/${fotoId}`, {
          method: "PUT",
          headers: {
            ...authHeader(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            descripcion: descFotoExistente[fotoId] || "",
          }),
        });
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function agregarExtra() {
    try {
      if (!extraDesc.trim() || !extraValor.trim()) {
        Alert.alert("Aviso", "Complete descripción y valor");
        return;
      }

      const token = await getToken();

      const res = await fetch(`${API}/identificacion/${id_orden}/extra`, {
        method: "POST",
        headers: {
          ...authHeader(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          descripcion: extraDesc.trim(),
          valor: extraValor.trim(),
        }),
      });

      if (!res.ok) {
        Alert.alert("Error", "No se pudo agregar el extra");
        return;
      }

      setExtraDesc("");
      setExtraValor("");
      await cargarDatos();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo agregar el extra");
    }
  }

  async function eliminarExtra(id) {
    try {
      const token = await getToken();

      const res = await fetch(`${API}/identificacion/extra/${id}`, {
        method: "DELETE",
        headers: authHeader(token),
      });

      if (!res.ok) {
        Alert.alert("Error", "No se pudo eliminar el extra");
        return;
      }

      await cargarDatos();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo eliminar el extra");
    }
  }

  async function guardarIdentificacion() {
    const token = await getToken();

    const nombreCompleto =
      `${clienteData.nombres || ""} ${clienteData.apellidos || ""}`.trim();

    const datosCedulaPayload = {
      nombre: nombreCompleto,
      direccion_manual: clienteData.direccion_manual || "",
      telefono_manual: clienteData.telefono_manual || "",
    };

    const vehiculoPayload = manualVisible
      ? {
          placa: vehiculoData.placa || placa,
          marca: vehiculoData.marca || "",
          modelo: vehiculoData.modelo || "",
          anio: vehiculoData.anio || "",
          pais_origen: vehiculoData.pais_origen || "",
          numero_motor: vehiculoData.numero_motor || "",
          numero_chasis: vehiculoData.numero_chasis || "",
          manual: true,
        }
      : {
          ...vehiculoData,
          placa: vehiculoData.placa || placa,
          manual: !!vehiculoData.manual,
        };

    const payload = {
      placa: placa ?? "",
      cedula: cedula ?? "",
      observaciones: observaciones ?? "",
      datos_cedula: datosCedulaPayload,
      datos_vehiculo: vehiculoPayload,
    };

    const res = await fetch(`${API}/identificacion/${id_orden}`, {
      method: "PUT",
      headers: {
        ...authHeader(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error("No se pudo guardar");
    }
  }

  async function finalizarIdentificacion() {
    const token = await getToken();

    await guardarDescripciones();

    const res = await fetch(`${API}/identificacion/finalizar/${id_orden}`, {
      method: "PUT",
      headers: {
        ...authHeader(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conclusiones: conclusiones || "",
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || "Error al finalizar");
    }

    return json;
  }

  async function guardarYFinalizarIdentificacion() {
    try {
      setGuardando(true);

      await guardarIdentificacion();
      const resultado = await finalizarIdentificacion();

      if (resultado?.requiere_revision === true) {
        Alert.alert(
          "Enviado a revisión",
          resultado?.mensaje || "Verificación enviada a revisión del administrador.",
          [
            {
              text: "OK",
              onPress: () => navigation?.navigate?.("HomeIdentificacion"),
            },
          ]
        );
        return;
      }

      Alert.alert("Éxito", "Identificación guardada y finalizada correctamente");
      await cargarDatos();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", e.message || "No se pudo guardar y finalizar");
    } finally {
      setGuardando(false);
    }
  }

  async function imprimirIdentificacion() {
    try {
      if (!esAdminIdentificacion) {
        Alert.alert("No permitido", "Solo el administrador puede imprimir este PDF.");
        return;
      }

      setGenerandoPdf(true);
      const token = await getToken();

      const url = `${API}/identificacion/pdf/${id_orden}`;
      const fileUri =
        FileSystem.documentDirectory + `identificacion_${id_orden}_${Date.now()}.pdf`;

      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: authHeader(token),
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("PDF generado", download.uri);
        return;
      }

      await Sharing.shareAsync(download.uri);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo generar el PDF");
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function enviarIdentificacionWhatsapp() {
    try {
      if (!esAdminIdentificacion) {
        Alert.alert("No permitido", "No tienes permiso para enviar esta certificación por WhatsApp.");
        return;
      }

      if (String(estadoOrden || "").toLowerCase() !== "finalizada") {
        Alert.alert("Aviso", "Primero finalice la verificación.");
        return;
      }

      setEnviandoWhatsapp(true);
      const token = await getToken();

      const res = await fetch(`${API}/identificacion/pdf/${id_orden}/whatsapp`, {
        method: "POST",
        headers: {
          ...authHeader(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telefono: clienteData.telefono_manual || "",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.mensaje || "No se pudo enviar la certificación por WhatsApp.");
      }

      Alert.alert("WhatsApp", "Certificación enviada por WhatsApp correctamente.");
    } catch (e) {
      console.log(e);
      Alert.alert("WhatsApp", e.message || "No se pudo enviar la certificación por WhatsApp.");
    } finally {
      setEnviandoWhatsapp(false);
    }
  }

  const fotosAgrupadas = useMemo(() => {
    const map = {};
    TIPOS_FOTOS.forEach((t) => {
      map[t.tipo] = fotosDetalle.filter((f) => f.tipo === t.tipo);
    });
    return map;
  }, [fotosDetalle]);

  const camposManualesPendientes = useMemo(() => {
    return CAMPOS_MANUALES_VEHICULO.filter((campo) => isBlank(vehiculoData[campo.key]));
  }, [vehiculoData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={{ marginTop: 10 }}>Cargando identificación...</Text>
      </View>
    );
  }

  if (previewImage) {
  return (
    <View style={styles.center}>
      <Image
        source={{ uri: previewImage.uri }}
        resizeMode="contain"
        style={{ width: 300, height: 300, borderRadius: 12 }}
      />

      <TouchableOpacity
        style={[styles.btn, styles.btnWarning, { marginTop: 20 }]}
        onPress={async () => {
          const nueva = await rotarImagen(previewImage.uri);
          setPreviewImage((prev) => ({
            ...prev,
            uri: nueva.uri,
            fileName: `foto_${Date.now()}.jpg`,
            mimeType: "image/jpeg",
          }));
        }}
      >
        <Text style={styles.btnText}>🔄 Girar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.btnSuccess, { marginTop: 10 }]}
        onPress={() => subirImagenFinal(previewImage)}
      >
        <Text style={styles.btnText}>✅ Usar Foto</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.btnDanger, { marginTop: 10 }]}
        onPress={() => setPreviewImage(null)}
      >
        <Text style={styles.btnText}>❌ Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

  return (
    <SafeAreaView style={styles.safeRoot} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      >
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.topActions}>
        <TouchableOpacity style={[styles.topActionBtn, styles.backActionBtn]} onPress={irInicio}>
          <Text style={styles.backActionText}>⬅ Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topActionBtn, styles.logoutActionBtn]}
          onPress={cerrarSesion}
        >
          <Text style={styles.logoutActionText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>🔍 Verificación de Series</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📘 Datos para Identificación</Text>

        <TextInput
          style={styles.input}
          placeholder="Placa"
          value={placa}
          onChangeText={setPlaca}
        />

        <TextInput
          style={styles.input}
          placeholder="Cédula del solicitante"
          value={cedula}
          onChangeText={setCedula}
        />

        <TextInput
          style={styles.input}
          placeholder="Cédula del dueño del vehículo"
          value={cedulaDueno}
          onChangeText={setCedulaDueno}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🔎 Consultas Vehículo</Text>

        <View style={styles.buttonGrid}>
          <TouchableOpacity style={[styles.btn, styles.btnWarning]} onPress={consultarSRIBasico}>
            <Text style={styles.btnTextDark}>⚡ Datos Básicos (SRI)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnDark]} onPress={consultarBloqueosBasico}>
            <Text style={styles.btnText}>🚫 Bloqueos Básico</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🧑 Datos del Solicitante</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoLine}>Nombres: {clienteData.nombres || "-"}</Text>
          <Text style={styles.infoLine}>Apellidos: {clienteData.apellidos || "-"}</Text>
          <Text style={styles.infoLine}>Teléfono: {clienteData.telefono_manual || "-"}</Text>
          <Text style={styles.infoLine}>Dirección: {clienteData.direccion_manual || "-"}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🚗 Datos del Vehículo</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoLine}>Placa: {vehiculoData.placa || "-"}</Text>
          <Text style={styles.infoLine}>Marca: {vehiculoData.marca || "-"}</Text>
          <Text style={styles.infoLine}>Modelo: {vehiculoData.modelo || "-"}</Text>
          <Text style={styles.infoLine}>Año: {vehiculoData.anio || "-"}</Text>
          <Text style={styles.infoLine}>País origen: {vehiculoData.pais_origen || "-"}</Text>
          <Text style={styles.infoLine}>Motor: {vehiculoData.numero_motor || "-"}</Text>
          <Text style={styles.infoLine}>Chasis: {vehiculoData.numero_chasis || "-"}</Text>
        </View>

        {manualVisible && camposManualesPendientes.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.manualTitle}>
              ⚠ Complete solo los datos faltantes
            </Text>

            {camposManualesPendientes.map((campo) => (
              <TextInput
                key={campo.key}
                style={styles.input}
                placeholder={campo.placeholder}
                value={vehiculoData[campo.key]}
                onChangeText={(v) =>
                  setVehiculoData((p) => ({ ...p, [campo.key]: v, manual: true }))
                }
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📸 Fotografías Obligatorias</Text>

        {TIPOS_FOTOS.map((f) => (
          <View key={f.tipo} style={styles.photoBlock}>
            <Text style={styles.photoTitle}>{f.nombre}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {(fotosAgrupadas[f.tipo] || []).map((photo) => (
                  <View key={photo.id} style={styles.photoCard}>
                    <Image
                      source={{ uri: `https://api360suite.pqautoexpert.ec${photo.path}` }}
                      style={styles.preview}
                    />

                    <TextInput
                      style={styles.smallInput}
                      placeholder="Descripción"
                      value={descFotoExistente[photo.id] || ""}
                      onChangeText={(txt) =>
                        setDescFotoExistente((prev) => ({ ...prev, [photo.id]: txt }))
                      }
                    />

                    <TouchableOpacity
                      style={[styles.btnMini, styles.btnDelete]}
                      onPress={() => eliminarFotoObligatoria(photo.id)}
                    >
                      <Text style={styles.btnText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="Descripción para nueva foto"
              value={newDescByTipo[f.tipo] || ""}
              onChangeText={(txt) =>
                setNewDescByTipo((prev) => ({ ...prev, [f.tipo]: txt }))
              }
            />

            <View style={styles.row2}>
  
  <TouchableOpacity
    style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
    onPress={() => subirFotoObligatoria(f.tipo, "camera")}
  >
    <Text style={styles.btnText}>📸 Cámara</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.btn, styles.btnSuccess, { flex: 1 }]}
    onPress={() => subirFotoObligatoria(f.tipo, "gallery")}
  >
    <Text style={styles.btnText}>🖼 Galería</Text>
  </TouchableOpacity>

</View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📝 Conclusiones</Text>

        <TextInput
          style={styles.textarea}
          placeholder="Escriba aquí las conclusiones del informe..."
          multiline
          value={conclusiones}
          onChangeText={setConclusiones}
        />

        <TextInput
          style={styles.textarea}
          placeholder="Observaciones"
          multiline
          value={observaciones}
          onChangeText={setObservaciones}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🖼 Fotografías Adicionales</Text>

        <TextInput
          style={styles.input}
          placeholder="Nombre"
          value={fotoExtraNombre}
          onChangeText={setFotoExtraNombre}
        />

        <TextInput
          style={styles.textareaSmall}
          placeholder="Descripción"
          value={fotoExtraDescripcion}
          onChangeText={setFotoExtraDescripcion}
          multiline
        />

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => pedirOrigenImagen((origen) => subirFotoExtra(origen))}
        >
          <Text style={styles.btnText}>➕ Agregar Foto Extra</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 16 }}>
          {fotosExtra.map((f) => (
            <View key={f.id} style={styles.extraPhotoItem}>
              <Image
                source={{ uri: `https://api360suite.pqautoexpert.ec${f.path}` }}
                style={styles.preview}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.bold}>{f.nombre || "Foto Extra"}</Text>
                <Text>{f.descripcion || "-"}</Text>
                <TouchableOpacity
                  style={[styles.btnMini, styles.btnDelete, { marginTop: 8 }]}
                  onPress={() => eliminarFotoExtra(f.id)}
                >
                  <Text style={styles.btnText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💰 Valores y Costos Finales</Text>

        <Text style={styles.totalLine}>Total Proforma: ${asNumber(totalProforma).toFixed(2)}</Text>

        <View style={styles.separator} />

        <Text style={styles.bold}>Servicios Extras</Text>

        {serviciosExtra.map((e) => (
          <View key={e.id || `${e.descripcion}-${e.valor}`} style={styles.extraItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bold}>{e.descripcion}</Text>
              <Text>${asNumber(e.valor).toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.btnMini, styles.btnDelete]}
              onPress={() => eliminarExtra(e.id)}
            >
              <Text style={styles.btnText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TextInput
          style={styles.input}
          placeholder="Descripción del servicio extra"
          value={extraDesc}
          onChangeText={setExtraDesc}
        />

        <TextInput
          style={styles.input}
          placeholder="Valor"
          keyboardType="numeric"
          value={extraValor}
          onChangeText={setExtraValor}
        />

        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={agregarExtra}>
          <Text style={styles.btnText}>➕ Agregar Extra</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <Text style={styles.totalFinal}>
          TOTAL FINAL: ${asNumber(totalFinal).toFixed(2)}
        </Text>
      </View>

      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnSuccess, { flex: 1 }]}
          onPress={guardarYFinalizarIdentificacion}
          disabled={guardando}
        >
          <Text style={styles.btnText}>
            {guardando
              ? "Guardando..."
              : esAdminIdentificacion
                ? "💾 Guardar y Finalizar Identificación"
                : "💾 Guardar y enviar a revisión"}
          </Text>
        </TouchableOpacity>
      </View>

      {esAdminIdentificacion && (
        <View style={styles.rowButtons}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
            onPress={imprimirIdentificacion}
            disabled={generandoPdf || enviandoWhatsapp}
          >
            <Text style={styles.btnText}>
              {generandoPdf ? "Generando PDF..." : "🧾 Imprimir / Compartir PDF"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnSuccess, { flex: 1 }]}
            onPress={enviarIdentificacionWhatsapp}
            disabled={enviandoWhatsapp || generandoPdf}
          >
            <Text style={styles.btnText}>
              {enviandoWhatsapp ? "Enviando..." : "📲 Enviar al WhatsApp"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, { flex: 1 }]}
          onPress={() => navigation?.navigate?.("HomeIdentificacion")}
        >
          <Text style={styles.btnText}>⬅ Regresar al Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnDark, { flex: 1 }]}
          onPress={() => navigation?.navigate?.("IdentificacionesHistorial")}
        >
          <Text style={styles.btnText}>📌 Ver Consultas</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: "#f4f6f9",
  },
  keyboardRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f4f6f9",
    padding: 14,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111d4d",
    marginBottom: 14,
  },
  topActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  topActionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backActionBtn: {
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  backActionText: {
    color: "#075985",
    fontWeight: "900",
  },
  logoutActionBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  logoutActionText: {
    color: "#475569",
    fontWeight: "900",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderLeftWidth: 5,
    borderLeftColor: "#111d4d",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111d4d",
    marginBottom: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    marginBottom: 10,
  },

  smallInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginTop: 8,
    width: 150,
    fontSize: 12,
  },

  textarea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 110,
    textAlignVertical: "top",
    marginBottom: 10,
  },

  textareaSmall: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 70,
    textAlignVertical: "top",
    marginBottom: 10,
  },

  buttonGrid: {
    gap: 10,
  },

  rowButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  row2: {
    flexDirection: "row",
    gap: 10,
  },

  btn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  btnMini: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  btnDanger: { backgroundColor: "#dc2626" },
  btnWarning: { backgroundColor: "#f59e0b" },
  btnInfo: { backgroundColor: "#0ea5e9" },
  btnDark: { backgroundColor: "#111827" },
  btnPrimary: { backgroundColor: "#2563eb" },
  btnSuccess: { backgroundColor: "#16a34a" },
  btnSecondary: { backgroundColor: "#6b7280" },
  btnDelete: { backgroundColor: "#c40000" },

  btnText: {
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
  },

  btnTextDark: {
    color: "#111827",
    fontWeight: "800",
    textAlign: "center",
  },

  infoBox: {
    backgroundColor: "#f5f7fa",
    borderRadius: 10,
    padding: 12,
  },

  infoLine: {
    marginBottom: 6,
    color: "#111827",
  },

  manualTitle: {
    color: "#b91c1c",
    fontWeight: "900",
    marginBottom: 10,
  },

  photoBlock: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  photoTitle: {
    fontWeight: "900",
    marginBottom: 8,
    color: "#111827",
  },

  photoRow: {
    flexDirection: "row",
    gap: 12,
  },

  photoCard: {
    marginRight: 12,
    alignItems: "center",
  },

  preview: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: "#fff",
  },

  extraPhotoItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    alignItems: "flex-start",
  },

  extraItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginVertical: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  bold: {
    fontWeight: "800",
  },

  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },

  totalLine: {
    fontSize: 16,
    fontWeight: "700",
  },

  totalFinal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#15803d",
  },
});

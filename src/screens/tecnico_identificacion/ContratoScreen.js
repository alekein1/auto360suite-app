import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
  Platform
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import useLockOrderBackNavigation from "../../hooks/useLockOrderBackNavigation";
import { unregisterDevicePushNotifications } from "../../services/pushNotifications";

const API = "https://api360suite.pqautoexpert.ec/api";

// =========================
// Helpers
// =========================
function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function moneySafe(v) {
  if (v === null || v === undefined || v === "") return "";
  return String(v);
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function getTokenOrThrow() {
  const token = await SecureStore.getItemAsync("token");
  if (!token) throw new Error("Token no encontrado");
  return token;
}

async function authHeaders() {
  const token = await getTokenOrThrow();
  return { Authorization: `Bearer ${token}` };
}

function pickAsset(result) {
  if (!result || result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  return asset;
}

// =========================
// UI Components
// =========================
function SectionHeader({ title, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>
        {icon ? `${icon} ` : ""}
        {title}
      </Text>
      <View style={styles.sectionUnderline} />
    </View>
  );
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function MediaBox({ label, imageUri, onTakePhoto, onPickFromGallery, height = 160 }) {
  return (
    <View style={styles.mediaBox}>
      <Text style={styles.mediaLabel}>{label}</Text>

      <View style={[styles.mediaImageWrap, { height }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.mediaImage} />
        ) : (
          <View style={styles.mediaPlaceholder}>
            <Text style={styles.mediaPlaceholderText}>Sin imagen</Text>
          </View>
        )}
      </View>

      <View style={styles.mediaButtonsRow}>
        <TouchableOpacity style={[styles.btnOutline, styles.btnOutlinePrimary]} onPress={onTakePhoto}>
          <Text style={[styles.btnOutlineText, { color: "#0d6efd" }]}>📸 Tomar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btnOutline, styles.btnOutlineGray]} onPress={onPickFromGallery}>
          <Text style={[styles.btnOutlineText, { color: "#6b7280" }]}>📂 Subir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =========================
// Screen
// =========================
export default function ContratoConstanciaScreen({ route, navigation }) {
  useLockOrderBackNavigation();
  const { id_orden } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [ultimoContratoId, setUltimoContratoId] = useState(null);

  // Documento
  const [tipoDocumento, setTipoDocumento] = useState("CONTRATO");
  const [tipoVenta, setTipoVenta] = useState("EFECTIVO");
  const [fechaVenta, setFechaVenta] = useState(todayISO());
  const [montoVenta, setMontoVenta] = useState("");
  const [lugarVenta, setLugarVenta] = useState("");
  const [infoAdicional, setInfoAdicional] = useState("");

  // Comprador
  const [cedulaComprador, setCedulaComprador] = useState("");
  const [nombresComprador, setNombresComprador] = useState("");
  const [apellidosComprador, setApellidosComprador] = useState("");
  const [estadoCivilComprador, setEstadoCivilComprador] = useState("");
  const [telefonoComprador, setTelefonoComprador] = useState("");
  const [direccionComprador, setDireccionComprador] = useState("");

  // Vendedor
  const [cedulaVendedor, setCedulaVendedor] = useState("");
  const [nombresVendedor, setNombresVendedor] = useState("");
  const [apellidosVendedor, setApellidosVendedor] = useState("");
  const [estadoCivilVendedor, setEstadoCivilVendedor] = useState("");
  const [telefonoVendedor, setTelefonoVendedor] = useState("");
  const [direccionVendedor, setDireccionVendedor] = useState("");

  // Vehículo
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("");

  const [tipoVehiculo, setTipoVehiculo] = useState("");
  const [anioFabricacion, setAnioFabricacion] = useState("");
  const [paisOrigen, setPaisOrigen] = useState("");
  const [numeroMotor, setNumeroMotor] = useState("");
  const [numeroChasis, setNumeroChasis] = useState("");
  const [color, setColor] = useState("");

  // Media URIs (local)
  const [fotoCompradorUri, setFotoCompradorUri] = useState(null);
  const [huellaCompradorUri, setHuellaCompradorUri] = useState(null);

  const [fotoVendedorUri, setFotoVendedorUri] = useState(null);
  const [huellaVendedorUri, setHuellaVendedorUri] = useState(null);

  const [fotosVehiculoUris, setFotosVehiculoUris] = useState([]); // múltiples
  const vehiculoPreviewUri = useMemo(() => fotosVehiculoUris?.[0] || null, [fotosVehiculoUris]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await ensurePermissions();
        await cargarDatosIniciales();
      } catch (e) {
        console.log(e);
        Alert.alert("Error", "No se pudo cargar la pantalla");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function ensurePermissions() {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (cam.status !== "granted") {
      Alert.alert("Permiso requerido", "Se necesita permiso de cámara para tomar fotos.");
    }

    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (lib.status !== "granted") {
      Alert.alert("Permiso requerido", "Se necesita permiso para acceder a galería.");
    }
  }

  // ======================
  // Cargar datos ticket
  // ======================
  async function cargarDatosIniciales() {
    const res = await fetch(`${API}/contratos/datos/${id_orden}`, {
      headers: await authHeaders()
    });

    const data = await res.json();

    if (data?.ok) {
      setCedulaComprador(data.cedula_comprador || "");
      setPlaca((data.placa_vehiculo || "").toUpperCase());
    }
  }

  // ======================
  // Pickers (cámara/galería)
  // ======================
  async function tomarFoto(setter) {
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false
      });
      const asset = pickAsset(result);
      if (!asset) return;
      setter(asset.uri);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo abrir la cámara");
    }
  }

  async function elegirFoto(setter) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images
      });
      const asset = pickAsset(result);
      if (!asset) return;
      setter(asset.uri);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo abrir galería");
    }
  }

  async function elegirFotosVehiculo() {
    try {
      // Algunos Android no soportan selección múltiple; igual funciona.
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: false,
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images
      });

      if (result.canceled) return;

      const assets = result.assets || [];
      const uris = assets.map((a) => a.uri).filter(Boolean);
      if (uris.length === 0) return;

      setFotosVehiculoUris((prev) => {
        const set = new Set([...(prev || []), ...uris]);
        return Array.from(set);
      });
    } catch (e) {
      console.log(e);
      // fallback: seleccionar 1 por vez
      try {
        const result2 = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: false,
          mediaTypes: ImagePicker.MediaTypeOptions.Images
        });
        const asset = pickAsset(result2);
        if (!asset) return;
        setFotosVehiculoUris((prev) => {
          const set = new Set([...(prev || []), asset.uri]);
          return Array.from(set);
        });
      } catch (e2) {
        console.log(e2);
        Alert.alert("Error", "No se pudieron seleccionar fotos");
      }
    }
  }

  async function tomarFotosVehiculo() {
    await tomarFoto((uri) => {
      setFotosVehiculoUris((prev) => {
        const set = new Set([...(prev || []), uri]);
        return Array.from(set);
      });
    });
  }

  // ======================
  // Consultas
  // ======================
  async function consultarRegistroCivil(cedula, setNombres, setApellidos, setEstadoCivil) {
    const ced = onlyDigits(cedula);
    if (!ced) return Alert.alert("Atención", "Ingrese cédula");

    const r = await fetch(`${API}/contratos/registro-civil/${ced}`, {
      headers: await authHeaders()
    });

    const j = await r.json();
    if (!j?.ok) return Alert.alert("Sin datos", "No encontrado");

    setNombres(j?.datos?.nombres || "");
    setApellidos(j?.datos?.apellidos || "");
    setEstadoCivil(j?.datos?.estado_civil || "");
  }

  async function consultarComprador() {
    await consultarRegistroCivil(cedulaComprador, setNombresComprador, setApellidosComprador, setEstadoCivilComprador);
  }

  async function consultarVendedor() {
    await consultarRegistroCivil(cedulaVendedor, setNombresVendedor, setApellidosVendedor, setEstadoCivilVendedor);
  }

  async function consultarANT() {
    const p = (placa || "").trim().toUpperCase();
    if (!p) return Alert.alert("Atención", "Ingrese placa");

    const r = await fetch(`${API}/contratos/ant/${p}`, {
      headers: await authHeaders()
    });

    const j = await r.json();
    if (!j?.ok) return Alert.alert("Sin datos", "Vehículo no encontrado");

    setMarca(j?.datos?.marca || "");
    setModelo(j?.datos?.modelo || "");
    setAnio(String(j?.datos?.anio || ""));
  }

  async function consultarDatosTecnicos() {
    const placaVal = (placa || "").trim().toUpperCase();
    const cedulaVal = onlyDigits(cedulaVendedor);

    if (!placaVal || !cedulaVal) {
      return Alert.alert("Atención", "Ingrese cédula del vendedor y placa");
    }

    const r = await fetch(`${API}/contratos/vehiculo-detalle/${cedulaVal}/${placaVal}`, {
      headers: await authHeaders()
    });

    const j = await r.json();

    if (!j?.ok) {
      Alert.alert("Aviso", "No se pudieron obtener los datos técnicos. Puede ingresarlos manualmente.");
      return;
    }

    setTipoVehiculo(j?.datos?.tipo_vehiculo || "");
    setAnioFabricacion(String(j?.datos?.anio_fabricacion || ""));
    setPaisOrigen(j?.datos?.pais_origen || "");
    setNumeroMotor(j?.datos?.motor || "");
    setNumeroChasis(j?.datos?.chasis || "");
    setColor(j?.datos?.color || "");
  }

  // ======================
  // Guardar Contrato
  // ======================
  async function guardarContrato() {
    try {
      setSaving(true);

      if (!id_orden) {
        Alert.alert("Error", "No existe id_orden en el sistema.");
        return;
      }

      const token = await getTokenOrThrow();
      const form = new FormData();

      // Documento
      form.append("tipo_documento", tipoDocumento || "");
      form.append("tipo_venta", tipoVenta || "");
      form.append("fecha_venta", fechaVenta || "");
      form.append("monto_venta", moneySafe(montoVenta));
      form.append("lugar_venta", lugarVenta || "");
      form.append("informacion_adicional", infoAdicional || "");

      // Comprador
      form.append("cedula_comprador", onlyDigits(cedulaComprador));
      form.append("nombres_comprador", nombresComprador || "");
      form.append("apellidos_comprador", apellidosComprador || "");
      form.append("estado_civil_comprador", estadoCivilComprador || "");
      form.append("telefono_comprador", telefonoComprador || "");
      form.append("direccion_comprador", direccionComprador || "");

      // Vendedor
      form.append("cedula_vendedor", onlyDigits(cedulaVendedor));
      form.append("nombres_vendedor", nombresVendedor || "");
      form.append("apellidos_vendedor", apellidosVendedor || "");
      form.append("estado_civil_vendedor", estadoCivilVendedor || "");
      form.append("telefono_vendedor", telefonoVendedor || "");
      form.append("direccion_vendedor", direccionVendedor || "");

      // Vehículo
      form.append("placa", (placa || "").trim().toUpperCase());
      form.append("marca", marca || "");
      form.append("modelo", modelo || "");
      form.append("anio", String(anio || ""));
      form.append("tipo_vehiculo", tipoVehiculo || "");
      form.append("anio_fabricacion", String(anioFabricacion || ""));
      form.append("pais_origen", paisOrigen || "");
      form.append("numero_motor", numeroMotor || "");
      form.append("numero_chasis", numeroChasis || "");
      form.append("color", color || "");

      // Archivos
      if (fotoCompradorUri) {
        form.append("foto_comprador", {
          uri: fotoCompradorUri,
          name: `foto_comprador_${Date.now()}.jpg`,
          type: "image/jpeg"
        });
      }
      if (huellaCompradorUri) {
        form.append("huella_comprador", {
          uri: huellaCompradorUri,
          name: `huella_comprador_${Date.now()}.jpg`,
          type: "image/jpeg"
        });
      }
      if (fotoVendedorUri) {
        form.append("foto_vendedor", {
          uri: fotoVendedorUri,
          name: `foto_vendedor_${Date.now()}.jpg`,
          type: "image/jpeg"
        });
      }
      if (huellaVendedorUri) {
        form.append("huella_vendedor", {
          uri: huellaVendedorUri,
          name: `huella_vendedor_${Date.now()}.jpg`,
          type: "image/jpeg"
        });
      }

      if (Array.isArray(fotosVehiculoUris) && fotosVehiculoUris.length > 0) {
        fotosVehiculoUris.forEach((u, idx) => {
          form.append("fotos_vehiculo", {
            uri: u,
            name: `vehiculo_${idx + 1}_${Date.now()}.jpg`,
            type: "image/jpeg"
          });
        });
      }

      const r = await fetch(`${API}/contratos/guardar/${id_orden}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
          // ❌ NO Content-Type
        },
        body: form
      });

      let j = {};
      try {
        j = await r.json();
      } catch (e) {
        console.log("Respuesta no JSON:", e);
        Alert.alert("Error", "Error inesperado (respuesta no válida)");
        return;
      }

      if (!j?.ok) {
        console.log("Backend error:", j);
        Alert.alert("Error", "Error al guardar contrato");
        return;
      }

      setUltimoContratoId(j?.contrato_id || null);

      Alert.alert(
        "Guardado ✅",
        `Contrato guardado correctamente\n\nCódigo: ${j.codigo_verificacion}\nFactura: ${j.factura_id}`
      );
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error inesperado al guardar contrato");
    } finally {
      setSaving(false);
    }
  }

  // ======================
  // Imprimir / PDF
  // ======================
  async function imprimirUltimoContrato() {
    try {
      if (!ultimoContratoId) {
        Alert.alert("Atención", "Primero debe guardar el contrato");
        return;
      }

      setPrinting(true);

      const token = await getTokenOrThrow();
      const url = `${API}/contratos/pdf/${ultimoContratoId}`;

      const fileUri = FileSystem.documentDirectory + `contrato_${ultimoContratoId}_${Date.now()}.pdf`;

      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("PDF listo", `Guardado en: ${download.uri}`);
        return;
      }

      await Sharing.shareAsync(download.uri);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error al generar/abrir PDF");
    } finally {
      setPrinting(false);
    }
  }

  // ======================
  // Navigation
  // ======================
  function irInicio() {
    if (navigation?.navigate) navigation.navigate("HomeIdentificacion");
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

  function irHistorialContratos() {
    if (navigation?.navigate) navigation.navigate("ContratosHistorial");
    else Alert.alert("Info", "Cree una pantalla de historial en navegación.");
  }

  // ======================
  // Render
  // ======================
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={{ marginTop: 10 }}>Cargando...</Text>
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
      {/* Header */}
      <View style={styles.topRow}>
        <View style={styles.sessionActions}>
          <TouchableOpacity style={[styles.sessionBtn, styles.sessionBackBtn]} onPress={irInicio}>
            <Text style={styles.sessionBackText}>⬅ Inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sessionBtn, styles.sessionLogoutBtn]}
            onPress={cerrarSesion}
          >
            <Text style={styles.sessionLogoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>📄 Crear Contrato / Constancia</Text>

        <View style={styles.topButtons}>
          <TouchableOpacity style={styles.btnTopOutlineBlue} onPress={irInicio}>
            <Text style={styles.btnTopOutlineTextBlue}>⬅ Regresar al inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnTopOutlineDark} onPress={irHistorialContratos}>
            <Text style={styles.btnTopOutlineTextDark}>📂 Ver Contratos Finalizados</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Datos Documento */}
      <Card>
        <SectionHeader title="Datos del Documento" />

        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Tipo documento</Text>
            <View style={styles.selectRow}>
              <TouchableOpacity
                style={[styles.pill, tipoDocumento === "CONTRATO" && styles.pillActiveBlue]}
                onPress={() => setTipoDocumento("CONTRATO")}
              >
                <Text style={[styles.pillText, tipoDocumento === "CONTRATO" && styles.pillTextActive]}>Contrato</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pill, tipoDocumento === "CONSTANCIA" && styles.pillActiveBlue]}
                onPress={() => setTipoDocumento("CONSTANCIA")}
              >
                <Text style={[styles.pillText, tipoDocumento === "CONSTANCIA" && styles.pillTextActive]}>Constancia</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Tipo de venta</Text>
            <View style={styles.selectRow}>
              {["EFECTIVO", "CREDITO", "TRANSFERENCIA"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.pill, tipoVenta === t && styles.pillActiveGold]}
                  onPress={() => setTipoVenta(t)}
                >
                  <Text style={[styles.pillText, tipoVenta === t && styles.pillTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Fecha venta</Text>
            <TextInput
              style={styles.input}
              value={fechaVenta}
              onChangeText={setFechaVenta}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Monto</Text>
            <TextInput
              style={styles.input}
              value={String(montoVenta)}
              onChangeText={setMontoVenta}
              keyboardType="numeric"
              placeholder="0.00"
            />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Lugar de venta</Text>
            <TextInput
              style={styles.input}
              value={lugarVenta}
              onChangeText={setLugarVenta}
              placeholder="Ej: Riobamba, Concesionario, Domicilio"
            />
          </View>
        </View>
      </Card>

      {/* Comprador */}
      <Card>
        <SectionHeader title="Comprador" />

        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Cédula</Text>
            <TextInput
              style={styles.input}
              value={cedulaComprador}
              onChangeText={setCedulaComprador}
              keyboardType="numeric"
              placeholder="Cédula"
            />
          </View>

          <View style={[styles.gridCol, { justifyContent: "flex-end" }]}>
            <TouchableOpacity style={styles.btnOutlinePrimaryAlone} onPress={consultarComprador}>
              <Text style={styles.btnOutlineTextPrimary}>🔍 Consultar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Nombres</Text>
            <TextInput style={styles.input} value={nombresComprador} onChangeText={setNombresComprador} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Apellidos</Text>
            <TextInput style={styles.input} value={apellidosComprador} onChangeText={setApellidosComprador} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Estado civil</Text>
            <TextInput style={styles.input} value={estadoCivilComprador} onChangeText={setEstadoCivilComprador} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={telefonoComprador}
              onChangeText={setTelefonoComprador}
              keyboardType="phone-pad"
              placeholder="Teléfono"
            />
          </View>

          <View style={[styles.gridCol, { flexBasis: "100%" }]}>
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              value={direccionComprador}
              onChangeText={setDireccionComprador}
              placeholder="Dirección"
            />
          </View>
        </View>

        <View style={styles.mediaRow}>
          <MediaBox
            label="📸 Foto Comprador"
            imageUri={fotoCompradorUri}
            onTakePhoto={() => tomarFoto(setFotoCompradorUri)}
            onPickFromGallery={() => elegirFoto(setFotoCompradorUri)}
          />

          <MediaBox
            label="🖐️ Huella Comprador"
            imageUri={huellaCompradorUri}
            onTakePhoto={() => tomarFoto(setHuellaCompradorUri)}
            onPickFromGallery={() => elegirFoto(setHuellaCompradorUri)}
          />
        </View>
      </Card>

      {/* Vendedor */}
      <Card>
        <SectionHeader title="Vendedor" />

        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Cédula</Text>
            <TextInput
              style={styles.input}
              value={cedulaVendedor}
              onChangeText={setCedulaVendedor}
              keyboardType="numeric"
              placeholder="Cédula"
            />
          </View>

          <View style={[styles.gridCol, { justifyContent: "flex-end" }]}>
            <TouchableOpacity style={styles.btnOutlinePrimaryAlone} onPress={consultarVendedor}>
              <Text style={styles.btnOutlineTextPrimary}>🔍 Consultar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Nombres</Text>
            <TextInput style={styles.input} value={nombresVendedor} onChangeText={setNombresVendedor} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Apellidos</Text>
            <TextInput style={styles.input} value={apellidosVendedor} onChangeText={setApellidosVendedor} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Estado civil</Text>
            <TextInput style={styles.input} value={estadoCivilVendedor} onChangeText={setEstadoCivilVendedor} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={telefonoVendedor}
              onChangeText={setTelefonoVendedor}
              keyboardType="phone-pad"
              placeholder="Teléfono"
            />
          </View>

          <View style={[styles.gridCol, { flexBasis: "100%" }]}>
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              value={direccionVendedor}
              onChangeText={setDireccionVendedor}
              placeholder="Dirección"
            />
          </View>
        </View>

        <View style={styles.mediaRow}>
          <MediaBox
            label="📸 Foto Vendedor"
            imageUri={fotoVendedorUri}
            onTakePhoto={() => tomarFoto(setFotoVendedorUri)}
            onPickFromGallery={() => elegirFoto(setFotoVendedorUri)}
          />

          <MediaBox
            label="🖐️ Huella Vendedor"
            imageUri={huellaVendedorUri}
            onTakePhoto={() => tomarFoto(setHuellaVendedorUri)}
            onPickFromGallery={() => elegirFoto(setHuellaVendedorUri)}
          />
        </View>
      </Card>

      {/* Vehículo */}
      <Card>
        <SectionHeader title="Vehículo" />

        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Placa</Text>
            <TextInput
              style={styles.input}
              value={placa}
              onChangeText={(t) => setPlaca((t || "").toUpperCase())}
              autoCapitalize="characters"
              placeholder="Placa"
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={styles.btnOutlineSuccessAlone} onPress={consultarANT}>
              <Text style={styles.btnOutlineTextSuccess}>🚗 ANT (rápido)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnOutlineWarningAlone} onPress={consultarDatosTecnicos}>
              <Text style={styles.btnOutlineTextWarning}>⏳ Datos técnicos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.gridCol}>
            <Text style={styles.label}>Marca</Text>
            <TextInput style={styles.input} value={marca} onChangeText={setMarca} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Modelo</Text>
            <TextInput style={styles.input} value={modelo} onChangeText={setModelo} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Año</Text>
            <TextInput style={styles.input} value={String(anio)} onChangeText={setAnio} keyboardType="numeric" />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Tipo vehículo</Text>
            <TextInput style={styles.input} value={tipoVehiculo} onChangeText={setTipoVehiculo} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Año fabricación</Text>
            <TextInput
              style={styles.input}
              value={String(anioFabricacion)}
              onChangeText={setAnioFabricacion}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Color</Text>
            <TextInput style={styles.input} value={color} onChangeText={setColor} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>País de origen</Text>
            <TextInput style={styles.input} value={paisOrigen} onChangeText={setPaisOrigen} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Número motor</Text>
            <TextInput style={styles.input} value={numeroMotor} onChangeText={setNumeroMotor} />
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.label}>Número chasis</Text>
            <TextInput style={styles.input} value={numeroChasis} onChangeText={setNumeroChasis} />
          </View>

          {/* Fotos vehículo */}
          <View style={{ marginTop: 12 }}>
            <View style={styles.mediaBox}>
              <Text style={styles.mediaLabel}>🚗 Fotos del Vehículo</Text>

              <View style={[styles.mediaImageWrap, { height: 180 }]}>
                {vehiculoPreviewUri ? (
                  <Image source={{ uri: vehiculoPreviewUri }} style={styles.mediaImage} />
                ) : (
                  <View style={styles.mediaPlaceholder}>
                    <Text style={styles.mediaPlaceholderText}>Sin fotos</Text>
                  </View>
                )}
              </View>

              <View style={styles.mediaButtonsRow}>
                <TouchableOpacity style={[styles.btnOutline, styles.btnOutlineSuccess]} onPress={tomarFotosVehiculo}>
                  <Text style={[styles.btnOutlineText, { color: "#198754" }]}>📸 Tomar foto</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btnOutline, styles.btnOutlineGray]} onPress={elegirFotosVehiculo}>
                  <Text style={[styles.btnOutlineText, { color: "#6b7280" }]}>📂 Subir</Text>
                </TouchableOpacity>

                {fotosVehiculoUris.length > 0 && (
                  <View style={{ justifyContent: "center" }}>
                    <Text style={styles.miniInfo}>{fotosVehiculoUris.length} foto(s)</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* Info adicional */}
      <Card>
        <SectionHeader title="Información Adicional" icon="📝" />
        <TextInput
          style={styles.textarea}
          value={infoAdicional}
          onChangeText={setInfoAdicional}
          multiline
          placeholder="Escriba información adicional..."
        />
      </Card>

      {/* Footer buttons */}
      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.btnFooterOutline} onPress={imprimirUltimoContrato} disabled={printing}>
          <Text style={styles.btnFooterOutlineText}>{printing ? "Generando..." : "🖨️ Imprimir"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnFooterPrimary} onPress={guardarContrato} disabled={saving}>
          <Text style={styles.btnFooterPrimaryText}>{saving ? "Guardando..." : "💾 Guardar"}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: Platform.OS === "ios" ? 20 : 10 }} />
    </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =========================
// Styles (pro, similar a web)
// =========================
const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: "#f4f6f9" },
  keyboardRoot: { flex: 1 },
  container: { flex: 1, backgroundColor: "#f4f6f9", padding: 16 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  topRow: { marginBottom: 14 },
  sessionActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  sessionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  sessionBackBtn: {
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd"
  },
  sessionBackText: {
    color: "#075985",
    fontWeight: "900"
  },
  sessionLogoutBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  sessionLogoutText: {
    color: "#475569",
    fontWeight: "900"
  },
  title: { fontSize: 18, fontWeight: "900", color: "#111d4d" },

  topButtons: { flexDirection: "column", gap: 10, marginTop: 12 },

  btnTopOutlineBlue: {
    borderWidth: 1,
    borderColor: "#0d6efd",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center"
  },
  btnTopOutlineTextBlue: { color: "#0d6efd", fontWeight: "900" },

  btnTopOutlineDark: {
    borderWidth: 1,
    borderColor: "#111d4d",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center"
  },
  btnTopOutlineTextDark: { color: "#111d4d", fontWeight: "900" },

  card: {
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },

  sectionHeader: { marginBottom: 12 },
  sectionHeaderText: { fontSize: 16, fontWeight: "900", color: "#111d4d" },
  sectionUnderline: {
    marginTop: 8,
    height: 2,
    backgroundColor: "#debb3c",
    borderRadius: 2,
    width: "55%"
  },

  label: { fontSize: 12, fontWeight: "800", color: "#111d4d", marginBottom: 6 },

  input: {
    backgroundColor: "#f7f8fb",
    borderWidth: 1,
    borderColor: "#e7edf6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12
  },

  textarea: {
    backgroundColor: "#f7f8fb",
    borderWidth: 1,
    borderColor: "#e7edf6",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 120,
    textAlignVertical: "top"
  },

  gridRow: { flexDirection: "column", gap: 12 },
  gridCol: { flex: 1 },

  selectRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  pill: {
    backgroundColor: "#eef2f8",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999
  },
  pillActiveBlue: { backgroundColor: "#111d4d" },
  pillActiveGold: { backgroundColor: "#debb3c" },
  pillText: { fontWeight: "900", color: "#111d4d" },
  pillTextActive: { color: "#fff" },

  divider: { height: 1, backgroundColor: "#e9edf5", marginVertical: 6 },

  // Media
  mediaRow: { flexDirection: "column", gap: 12, marginTop: 12 },

  mediaBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#cfd6e0",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fafbfc"
  },
  mediaLabel: { fontWeight: "900", marginBottom: 10, color: "#111d4d" },

  mediaImageWrap: {
    width: "100%",
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d7dce6",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center"
  },
  mediaImage: { width: "100%", height: "100%", resizeMode: "contain" },

  mediaPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  mediaPlaceholderText: { color: "#6b7280", fontWeight: "800" },

  mediaButtonsRow: { marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" },

  btnOutline: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#fff"
  },
  btnOutlineText: { fontWeight: "900" },

  btnOutlinePrimary: { borderColor: "#0d6efd" },
  btnOutlineGray: { borderColor: "#cfd6e0" },
  btnOutlineSuccess: { borderColor: "#198754" },
  btnOutlineWarning: { borderColor: "#debb3c" },

  btnOutlinePrimaryAlone: {
    borderWidth: 1,
    borderColor: "#0d6efd",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center"
  },
  btnOutlineSuccessAlone: {
    borderWidth: 1,
    borderColor: "#198754",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    flex: 1
  },
  btnOutlineWarningAlone: {
    borderWidth: 1,
    borderColor: "#debb3c",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    flex: 1
  },

  btnOutlineTextPrimary: { color: "#0d6efd", fontWeight: "900", textAlign: "center" },
  btnOutlineTextSuccess: { color: "#198754", fontWeight: "900", textAlign: "center" },
  btnOutlineTextWarning: { color: "#b08900", fontWeight: "900", textAlign: "center" },

  miniInfo: { color: "#111d4d", fontWeight: "900" },

  footerRow: { flexDirection: "column", gap: 12, marginTop: 8 },

  btnFooterOutline: {
    borderWidth: 1,
    borderColor: "#6b7280",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center"
  },
  btnFooterOutlineText: { color: "#111d4d", fontWeight: "900" },

  btnFooterPrimary: {
    backgroundColor: "#0d6efd",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center"
  },
  btnFooterPrimaryText: { color: "#fff", fontWeight: "900" }
});

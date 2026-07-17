import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import useLockOrderBackNavigation from "../../hooks/useLockOrderBackNavigation";

const API = "https://api360suite.pqautoexpert.ec/api";
const FILE_BASE = "https://api360suite.pqautoexpert.ec";

const emptyRc = null;

function text(value, fallback = "—") {
  const clean = String(value ?? "").trim();
  return clean || fallback;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function rcFechaExpedicion(datos) {
  return datos?.fecha_expedicion || datos?.fechaExpedicion || "";
}

function rcFechaExpiracion(datos) {
  return datos?.fecha_expiracion || datos?.fechaExpiracion || "";
}

function buildFileUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  return `${FILE_BASE}/${clean}`;
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function authHeaders(json = false) {
  const token = await SecureStore.getItemAsync("token");
  return json
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { Authorization: `Bearer ${token}` };
}

function Section({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.goldLine} />
      {children}
    </View>
  );
}

function Field({ label, value, onChangeText, keyboardType = "default", placeholder = "", editable = true }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={String(value ?? "")}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        editable={editable}
      />
    </View>
  );
}

function InfoGrid({ items }) {
  return (
    <View style={styles.infoGrid}>
      {items.map(([label, value]) => (
        <View key={label} style={styles.infoItem}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{text(value)}</Text>
        </View>
      ))}
    </View>
  );
}

function RcBox({ datos }) {
  if (!datos) {
    return (
      <View style={styles.rcBox}>
        <Text style={styles.muted}>Sin consulta registrada.</Text>
      </View>
    );
  }

  const rows = [
    ["Cédula", datos.cedula],
    ["Nombre", datos.nombre],
    ["Estado civil", datos.estadoCivil],
    ["Cónyuge", String(datos.estadoCivil || "").toUpperCase() === "CASADO" ? datos.conyuge : ""],
    ["Cédula cónyuge", String(datos.estadoCivil || "").toUpperCase() === "CASADO" ? datos.cedulaConyuge : ""],
    ["Fecha nacimiento", datos.fechaNacimiento],
    ["Lugar nacimiento", datos.lugarNacimiento],
    ["Instrucción", datos.instruccion],
    ["Profesión", datos.profesion],
    ["Fecha expedición", rcFechaExpedicion(datos)],
    ["Fecha expiración", rcFechaExpiracion(datos)],
  ].filter(([, value]) => String(value || "").trim());

  return (
    <View style={styles.rcBox}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.rcRow}>
          <Text style={styles.rcKey}>{label}</Text>
          <Text style={styles.rcValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function LegalizacionOrdenScreen({ route, navigation }) {
  useLockOrderBackNavigation();
  const { id_orden } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingGuia, setUploadingGuia] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [orden, setOrden] = useState(null);
  const [legalizacion, setLegalizacion] = useState(null);
  const [propietarioVehiculo, setPropietarioVehiculo] = useState(null);
  const [consultandoPropietario, setConsultandoPropietario] = useState(false);

  const [cedulaComprador, setCedulaComprador] = useState("");
  const [telefonoComprador, setTelefonoComprador] = useState("");
  const [correoComprador, setCorreoComprador] = useState("");
  const [rcComprador, setRcComprador] = useState(emptyRc);

  const [mismoSolicitante, setMismoSolicitante] = useState(false);
  const [cedulaVendedor, setCedulaVendedor] = useState("");
  const [telefonoVendedor, setTelefonoVendedor] = useState("");
  const [correoVendedor, setCorreoVendedor] = useState("");
  const [rcVendedor, setRcVendedor] = useState(emptyRc);

  const [cantidadContratos, setCantidadContratos] = useState("");
  const [cantidadPoderes, setCantidadPoderes] = useState("");
  const [cantidadFirmas, setCantidadFirmas] = useState("");
  const [cantidadCertificados, setCantidadCertificados] = useState("");
  const [requiereCuv, setRequiereCuv] = useState(false);
  const [requiereEnvio, setRequiereEnvio] = useState(false);
  const [envioDestino, setEnvioDestino] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [abono, setAbono] = useState("");
  const [guiaAsset, setGuiaAsset] = useState(null);
  const [pdfAsset, setPdfAsset] = useState(null);

  const saldo = useMemo(() => Math.max(0, money(valorTotal) - money(abono)), [valorTotal, abono]);
  const vehiculo = orden?.vehiculo || {};
  const guiaUrl = guiaAsset?.uri || buildFileUrl(legalizacion?.guia_envio_path);
  const pdfUrl = pdfAsset?.uri || buildFileUrl(legalizacion?.contrato_legalizado_pdf_path);

  useEffect(() => {
    cargarLegalizacion();
  }, []);

  async function cargarLegalizacion() {
    try {
      setLoading(true);

      await fetch(`${API}/legalizaciones/iniciar/${id_orden}`, {
        method: "PUT",
        headers: await authHeaders(true),
      });

      const res = await fetch(`${API}/legalizaciones/orden/${id_orden}`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.mensaje || "No se pudo cargar la legalización");

      setOrden(data.orden);
      llenarFormulario(data.legalizacion || {});
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message || "No se pudo cargar la pantalla");
    } finally {
      setLoading(false);
    }
  }

  function llenarFormulario(data) {
    setLegalizacion(data);
    setPropietarioVehiculo(
      parseJson(data.propietario_json) ||
      (data.propietario_nombres
        ? {
            tipo_identificacion: data.propietario_tipo_identificacion,
            identificacion: data.propietario_identificacion,
            nombres: data.propietario_nombres,
            email: data.propietario_email,
            tiene_bloqueo: data.propietario_tiene_bloqueo,
          }
        : null)
    );
    setCedulaComprador(data.cedula_comprador || "");
    setTelefonoComprador(data.comprador_telefono || "");
    setCorreoComprador(data.comprador_correo || "");
    setRcComprador(parseJson(data.comprador_rc_json));

    setMismoSolicitante(Number(data.vendedor_mismo_solicitante) === 1);
    setCedulaVendedor(data.cedula_vendedor || "");
    setTelefonoVendedor(data.vendedor_telefono || "");
    setCorreoVendedor(data.vendedor_correo || "");
    setRcVendedor(parseJson(data.vendedor_rc_json));

    setCantidadContratos(String(data.cantidad_contratos || ""));
    setCantidadPoderes(String(data.cantidad_poderes || ""));
    setCantidadFirmas(String(data.cantidad_firmas || ""));
    setCantidadCertificados(String(data.cantidad_certificados_votacion || ""));
    setRequiereCuv(Number(data.requiere_cuv) === 1);
    setRequiereEnvio(Number(data.requiere_envio) === 1);
    setEnvioDestino(data.envio_destino || "");
    setValorTotal(String(data.valor_total || ""));
    setAbono(String(data.abono || ""));
    setGuiaAsset(null);
    setPdfAsset(null);
  }

  async function consultarPropietarioVehiculo() {
    const placa = String(orden?.placa || "").trim();
    if (!placa) {
      Alert.alert("Placa", "La orden no tiene placa para consultar.");
      return;
    }

    try {
      setConsultandoPropietario(true);
      const res = await fetch(`${API}/legalizaciones/propietario-vehiculo/${encodeURIComponent(placa)}`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.mensaje || "No se encontró propietario.");
      setPropietarioVehiculo(data.datos);
    } catch (error) {
      console.log(error);
      Alert.alert("Propietario", error.message || "No se pudo consultar propietario.");
    } finally {
      setConsultandoPropietario(false);
    }
  }

  async function consultarRC(tipo) {
    const cedula = onlyDigits(tipo === "comprador" ? cedulaComprador : cedulaVendedor);
    if (!/^\d{10}$/.test(cedula)) {
      Alert.alert("Cédula inválida", "Ingrese una cédula válida de 10 dígitos.");
      return;
    }

    try {
      const res = await fetch(`${API}/legalizaciones/registro-civil/${cedula}`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.mensaje || "No se encontraron datos.");

      if (tipo === "comprador") {
        setRcComprador(data.datos);
        setCedulaComprador(data.datos?.cedula || cedula);
      } else {
        setRcVendedor(data.datos);
        setCedulaVendedor(data.datos?.cedula || cedula);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Registro Civil", error.message || "No se pudo consultar la cédula.");
    }
  }

  function copiarSolicitante() {
    const next = !mismoSolicitante;
    setMismoSolicitante(next);
    if (next && orden) {
      setCedulaVendedor(orden.numero_cedula || "");
      setTelefonoVendedor(orden.telefono_cliente || "");
    }
  }

  async function guardar() {
    try {
      setSaving(true);

      const body = {
        cedula_comprador: cedulaComprador,
        comprador_nombre: rcComprador?.nombre || "",
        comprador_estado_civil: rcComprador?.estadoCivil || "",
        comprador_conyuge: rcComprador?.conyuge || "",
        comprador_cedula_conyuge: rcComprador?.cedulaConyuge || "",
        comprador_fecha_expedicion: rcFechaExpedicion(rcComprador),
        comprador_fecha_expiracion: rcFechaExpiracion(rcComprador),
        comprador_telefono: telefonoComprador,
        comprador_correo: correoComprador,
        comprador_rc_json: JSON.stringify(rcComprador || null),
        vendedor_mismo_solicitante: mismoSolicitante ? "1" : "0",
        cedula_vendedor: cedulaVendedor,
        vendedor_nombre: rcVendedor?.nombre || "",
        vendedor_estado_civil: rcVendedor?.estadoCivil || "",
        vendedor_conyuge: rcVendedor?.conyuge || "",
        vendedor_cedula_conyuge: rcVendedor?.cedulaConyuge || "",
        vendedor_fecha_expedicion: rcFechaExpedicion(rcVendedor),
        vendedor_fecha_expiracion: rcFechaExpiracion(rcVendedor),
        vendedor_telefono: telefonoVendedor,
        vendedor_correo: correoVendedor,
        vendedor_rc_json: JSON.stringify(rcVendedor || null),
        cantidad_contratos: cantidadContratos,
        cantidad_poderes: cantidadPoderes,
        cantidad_firmas: cantidadFirmas,
        cantidad_certificados_votacion: cantidadCertificados,
        requiere_cuv: requiereCuv ? "1" : "0",
        requiere_envio: requiereEnvio ? "1" : "0",
        envio_destino: envioDestino,
        valor_total: valorTotal,
        abono,
        propietario_tipo_identificacion: propietarioVehiculo?.tipo_identificacion || "",
        propietario_identificacion: propietarioVehiculo?.identificacion || "",
        propietario_nombres: propietarioVehiculo?.nombres || "",
        propietario_email: propietarioVehiculo?.email || "",
        propietario_tiene_bloqueo: propietarioVehiculo?.tiene_bloqueo || "",
        propietario_json: JSON.stringify(propietarioVehiculo || null),
      };

      const res = await fetch(`${API}/legalizaciones/guardar/${id_orden}`, {
        method: "POST",
        headers: await authHeaders(true),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.mensaje || "No se pudo guardar.");

      Alert.alert("Guardado", data?.whatsapp?.enviado === false ? "Legalización guardada. WhatsApp no se pudo enviar." : "Legalización guardada correctamente.");
      await cargarLegalizacion();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function elegirGuia() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) setGuiaAsset(result.assets[0]);
  }

  async function tomarGuia() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permiso requerido", "Se necesita permiso de cámara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (!result.canceled && result.assets?.[0]) setGuiaAsset(result.assets[0]);
  }

  async function subirGuia() {
    if (!guiaAsset?.uri) {
      Alert.alert("Guía", "Seleccione o tome una foto de la guía.");
      return;
    }

    try {
      setUploadingGuia(true);
      const form = new FormData();
      form.append("guia_envio", {
        uri: guiaAsset.uri,
        name: guiaAsset.fileName || `guia_${id_orden}.jpg`,
        type: guiaAsset.mimeType || "image/jpeg",
      });

      const res = await fetch(`${API}/legalizaciones/guia/${id_orden}`, {
        method: "POST",
        headers: await authHeaders(),
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.mensaje || "No se pudo subir la guía.");

      Alert.alert("Guía subida", data?.whatsapp?.enviado === false ? "Guía guardada. WhatsApp no se pudo enviar." : "Guía enviada correctamente.");
      await cargarLegalizacion();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message || "No se pudo subir la guía.");
    } finally {
      setUploadingGuia(false);
    }
  }

  async function elegirPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) setPdfAsset(result.assets[0]);
  }

  async function abrirPdf() {
    const uri = pdfAsset?.uri || pdfUrl;
    if (!uri) return;

    try {
      let localUri = uri;
      if (/^https?:\/\//i.test(uri)) {
        const token = await SecureStore.getItemAsync("token");
        const fileUri = `${FileSystem.documentDirectory}legalizacion_${id_orden}_${Date.now()}.pdf`;
        const download = await FileSystem.downloadAsync(uri, fileUri, {
          headers: { Authorization: `Bearer ${token}` },
        });
        localUri = download.uri;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri);
      } else {
        Alert.alert("PDF", localUri);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("PDF", "No se pudo abrir el PDF.");
    }
  }

  async function finalizar() {
    if (!pdfAsset?.uri) {
      Alert.alert("PDF", "Seleccione el PDF legalizado escaneado.");
      return;
    }

    Alert.alert("Finalizar", "¿Finalizar esta legalización con el PDF seleccionado?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Finalizar",
        onPress: async () => {
          try {
            setFinalizing(true);
            const form = new FormData();
            form.append("contrato_legalizado_pdf", {
              uri: pdfAsset.uri,
              name: pdfAsset.name || `contrato_legalizado_${id_orden}.pdf`,
              type: pdfAsset.mimeType || "application/pdf",
            });

            const res = await fetch(`${API}/legalizaciones/finalizar/${id_orden}`, {
              method: "POST",
              headers: await authHeaders(),
              body: form,
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.mensaje || "No se pudo finalizar.");

            Alert.alert("Finalizada", "Legalización finalizada correctamente.", [
              { text: "OK", onPress: () => navigation.navigate("LegalizacionesHistorial") },
            ]);
          } catch (error) {
            console.log(error);
            Alert.alert("Error", error.message || "No se pudo finalizar.");
          } finally {
            setFinalizing(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={styles.loadingText}>Cargando legalización...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate("HomeLegalizacion")} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Inicio</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("LegalizacionesHistorial")} style={styles.headerBtnOutline}>
              <Text style={styles.headerBtnOutlineText}>Listado</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Legalización de contratos</Text>

          <Section title="Datos de la orden">
            <InfoGrid
              items={[
                ["Orden", id_orden],
                ["Cliente", orden?.cliente_nombre],
                ["Cédula solicitante", orden?.numero_cedula],
                ["Teléfono", orden?.telefono_cliente],
                ["Vehículo", [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ")],
                ["Año", vehiculo.anio],
                ["Color", vehiculo.color],
              ]}
            />
            <View style={styles.plateOwnerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Placa</Text>
                <Text style={styles.plateValue}>{text(orden?.placa)}</Text>
              </View>
              <TouchableOpacity style={styles.ownerButton} onPress={consultarPropietarioVehiculo} disabled={consultandoPropietario}>
                <Text style={styles.ownerButtonText}>{consultandoPropietario ? "Buscando..." : "Buscar dueño"}</Text>
              </TouchableOpacity>
            </View>
            {propietarioVehiculo && (
              <View style={styles.ownerCard}>
                <Text style={styles.ownerLabel}>Dueño del vehículo</Text>
                <Text style={styles.ownerName}>{propietarioVehiculo.nombres || "—"}</Text>
                <Text style={styles.ownerMeta}>
                  {propietarioVehiculo.tipo_identificacion || "ID"}: {propietarioVehiculo.identificacion || "—"}
                </Text>
                {!!propietarioVehiculo.email && <Text style={styles.ownerMeta}>{propietarioVehiculo.email}</Text>}
                <Text style={styles.ownerMeta}>Bloqueo: {propietarioVehiculo.tiene_bloqueo === "S" ? "Sí" : "No"}</Text>
              </View>
            )}
          </Section>

          <Section title="Comprador">
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <Field label="Cédula comprador" value={cedulaComprador} onChangeText={setCedulaComprador} keyboardType="number-pad" />
              </View>
              <TouchableOpacity style={styles.searchButton} onPress={() => consultarRC("comprador")}>
                <Text style={styles.searchButtonText}>Buscar</Text>
              </TouchableOpacity>
            </View>
            <Field label="Teléfono" value={telefonoComprador} onChangeText={setTelefonoComprador} keyboardType="phone-pad" />
            <Field label="Correo electrónico" value={correoComprador} onChangeText={setCorreoComprador} keyboardType="email-address" />
            <RcBox datos={rcComprador} />
          </Section>

          <Section title="Vendedor">
            <View style={styles.switchRow}>
              <Switch value={mismoSolicitante} onValueChange={copiarSolicitante} />
              <Text style={styles.switchText}>El vendedor es el mismo solicitante</Text>
            </View>
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <Field label="Cédula vendedor" value={cedulaVendedor} onChangeText={setCedulaVendedor} keyboardType="number-pad" />
              </View>
              <TouchableOpacity style={styles.searchButton} onPress={() => consultarRC("vendedor")}>
                <Text style={styles.searchButtonText}>Buscar</Text>
              </TouchableOpacity>
            </View>
            <Field label="Teléfono" value={telefonoVendedor} onChangeText={setTelefonoVendedor} keyboardType="phone-pad" />
            <Field label="Correo electrónico" value={correoVendedor} onChangeText={setCorreoVendedor} keyboardType="email-address" />
            <RcBox datos={rcVendedor} />
          </Section>

          <Section title="Documento habilitante">
            <View style={styles.twoCols}>
              <Field label="Contratos" value={cantidadContratos} onChangeText={setCantidadContratos} keyboardType="number-pad" />
              <Field label="Poderes" value={cantidadPoderes} onChangeText={setCantidadPoderes} keyboardType="number-pad" />
              <Field label="Firmas" value={cantidadFirmas} onChangeText={setCantidadFirmas} keyboardType="number-pad" />
              <Field label="Certificados votación" value={cantidadCertificados} onChangeText={setCantidadCertificados} keyboardType="number-pad" />
            </View>
            <View style={styles.switchRow}>
              <Switch value={requiereCuv} onValueChange={setRequiereCuv} />
              <Text style={styles.switchText}>Requiere CUV</Text>
            </View>
            <View style={styles.switchRow}>
              <Switch value={requiereEnvio} onValueChange={setRequiereEnvio} />
              <Text style={styles.switchText}>Envío</Text>
            </View>
            {requiereEnvio && (
              <Field label="Lugar / detalle de envío" value={envioDestino} onChangeText={setEnvioDestino} placeholder="Escriba a dónde se va a enviar" />
            )}
          </Section>

          <Section title="Valores">
            <Field label="Valor total" value={valorTotal} onChangeText={setValorTotal} keyboardType="decimal-pad" />
            <Field label="Abono" value={abono} onChangeText={setAbono} keyboardType="decimal-pad" />
            <View style={styles.balanceBox}>
              <Text style={styles.balanceLabel}>Saldo</Text>
              <Text style={styles.balanceValue}>${saldo.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={guardar} disabled={saving}>
              <Text style={styles.primaryButtonText}>{saving ? "Guardando..." : "Guardar legalización"}</Text>
            </TouchableOpacity>
          </Section>

          <Section title="Archivos de seguimiento">
            <Text style={styles.fileTitle}>Foto de guía de envío</Text>
            {guiaUrl ? (
              <Image source={{ uri: guiaUrl }} style={styles.guiaPreview} />
            ) : (
              <View style={styles.emptyPreview}><Text style={styles.muted}>Sin guía subida.</Text></View>
            )}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={tomarGuia}>
                <Text style={styles.outlineButtonText}>Tomar foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineButton} onPress={elegirGuia}>
                <Text style={styles.outlineButtonText}>Galería</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.successButton} onPress={subirGuia} disabled={uploadingGuia}>
              <Text style={styles.successButtonText}>{uploadingGuia ? "Subiendo..." : "Subir guía"}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.fileTitle}>PDF contrato legalizado escaneado</Text>
            <View style={styles.pdfBox}>
              <Text style={styles.pdfText}>{pdfAsset?.name || (legalizacion?.contrato_legalizado_pdf_path ? "PDF final subido." : "Sin PDF final.")}</Text>
              {(pdfAsset?.uri || pdfUrl) && (
                <TouchableOpacity onPress={abrirPdf}>
                  <Text style={styles.pdfLink}>Abrir PDF</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.outlineButtonFull} onPress={elegirPdf}>
              <Text style={styles.outlineButtonText}>Seleccionar PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.successButton} onPress={finalizar} disabled={finalizing}>
              <Text style={styles.successButtonText}>{finalizing ? "Finalizando..." : "Finalizar con PDF"}</Text>
            </TouchableOpacity>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f4f7" },
  content: { padding: 16, paddingBottom: 30 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f2f4f7" },
  loadingText: { marginTop: 12, color: "#111d4d", fontWeight: "800" },
  header: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 12 },
  headerBtn: { backgroundColor: "#111d4d", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  headerBtnText: { color: "#fff", fontWeight: "900" },
  headerBtnOutline: { borderWidth: 1, borderColor: "#111d4d", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  headerBtnOutlineText: { color: "#111d4d", fontWeight: "900" },
  title: { color: "#111d4d", fontSize: 25, fontWeight: "900", marginBottom: 14 },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sectionTitle: { color: "#111d4d", fontSize: 18, fontWeight: "900" },
  goldLine: { height: 2, backgroundColor: "#debb3c", marginVertical: 12 },
  infoGrid: { gap: 8 },
  infoItem: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  infoLabel: { color: "#64748b", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  infoValue: { color: "#111827", fontWeight: "900", marginTop: 3 },
  plateOwnerRow: { marginTop: 10, backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#dbe3ef", flexDirection: "row", alignItems: "center", gap: 10 },
  plateValue: { color: "#111d4d", fontSize: 18, fontWeight: "900", marginTop: 3 },
  ownerButton: { backgroundColor: "#0d6efd", borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11 },
  ownerButtonText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  ownerCard: { marginTop: 10, backgroundColor: "#fffdf4", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#debb3c" },
  ownerLabel: { color: "#64748b", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  ownerName: { color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 4 },
  ownerMeta: { color: "#334155", fontWeight: "700", marginTop: 3 },
  field: { marginBottom: 12 },
  label: { color: "#111827", fontWeight: "900", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d7dee9", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: "#111827", fontWeight: "700" },
  inputDisabled: { backgroundColor: "#f8fafc" },
  searchRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  searchButton: { backgroundColor: "#0d6efd", borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 12 },
  searchButtonText: { color: "#fff", fontWeight: "900" },
  rcBox: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#dbe3ef", borderRadius: 12, padding: 12, marginTop: 6 },
  rcRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  rcKey: { color: "#334155", fontWeight: "900" },
  rcValue: { color: "#111827", fontWeight: "700", marginTop: 2 },
  muted: { color: "#667085", fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  switchText: { color: "#111827", fontWeight: "900", flex: 1 },
  twoCols: { gap: 0 },
  balanceBox: { backgroundColor: "#111d4d", borderRadius: 14, padding: 16, marginBottom: 12 },
  balanceLabel: { color: "#d7def4", fontWeight: "800" },
  balanceValue: { color: "#fff", fontSize: 25, fontWeight: "900", marginTop: 4 },
  primaryButton: { backgroundColor: "#111d4d", borderRadius: 13, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
  fileTitle: { color: "#111827", fontWeight: "900", fontSize: 15, marginBottom: 8 },
  guiaPreview: { width: "100%", height: 170, borderRadius: 14, backgroundColor: "#f8fafc", resizeMode: "cover", borderWidth: 1, borderColor: "#dbe3ef" },
  emptyPreview: { height: 120, borderRadius: 14, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#dbe3ef", justifyContent: "center", alignItems: "center" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  outlineButton: { flex: 1, borderWidth: 1, borderColor: "#111d4d", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  outlineButtonFull: { borderWidth: 1, borderColor: "#111d4d", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 10 },
  outlineButtonText: { color: "#111d4d", fontWeight: "900" },
  successButton: { backgroundColor: "#198754", borderRadius: 13, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  successButtonText: { color: "#fff", fontWeight: "900" },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 18 },
  pdfBox: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#dbe3ef", padding: 12 },
  pdfText: { color: "#111827", fontWeight: "800" },
  pdfLink: { color: "#0d6efd", fontWeight: "900", marginTop: 8 },
});

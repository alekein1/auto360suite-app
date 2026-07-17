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
  Platform
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import useLockOrderBackNavigation from "../../hooks/useLockOrderBackNavigation";
import { unregisterDevicePushNotifications } from "../../services/pushNotifications";

const API = "https://api360suite.pqautoexpert.ec/api";

function beautify(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (a) => a.toUpperCase());
}

function isEmptyValue(v) {
  return v === undefined || v === null || v === "";
}

function pickSafeString(v) {
  if (isEmptyValue(v)) return "";
  return String(v);
}

function normalizeObject(obj) {
  if (!obj || typeof obj !== "object") return null;
  return obj;
}

function CardBox({ title, icon, children, color = "#111d4d" }) {
  return (
    <View style={[styles.cardBox, { borderLeftColor: color }]}>
      <Text style={styles.sectionTitle}>
        {icon ? `${icon} ` : ""}{title}
      </Text>
      {children}
    </View>
  );
}

function DataGrid({ data, accent = "#0d6efd" }) {
  const obj = normalizeObject(data);
  if (!obj) return null;

  const entries = Object.entries(obj).filter(([, v]) => !isEmptyValue(v));
  if (entries.length === 0) return null;

  return (
    <View style={styles.grid}>
      {entries.map(([k, v]) => (
        <View key={k} style={[styles.dataItem, { borderLeftColor: accent }]}>
          <Text style={styles.dataLabel}>{beautify(k)}</Text>
          <Text style={styles.dataValue}>{pickSafeString(v)}</Text>
        </View>
      ))}
    </View>
  );
}

function RubrosGrid({ rubros }) {
  if (!Array.isArray(rubros) || rubros.length === 0) return null;

  return (
    <View style={styles.grid}>
      {rubros.map((r, idx) => (
        <View key={idx} style={[styles.dataItem, { borderLeftColor: "#28a745" }]}>
          <Text style={styles.dataLabel}>Beneficiario</Text>
          <Text style={styles.dataValue}>{pickSafeString(r?.beneficiario)}</Text>

          <Text style={[styles.dataLabel, { marginTop: 8 }]}>Descripción</Text>
          <Text style={styles.dataValue}>{pickSafeString(r?.descripcion)}</Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.dataLabel}>Año</Text>
              <Text style={styles.dataValue}>{pickSafeString(r?.anio)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dataLabel}>Valor</Text>
              <Text style={styles.dataValue}>${pickSafeString(r?.valor)}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function ObjectTable({ rows, emptyText = "Sin datos" }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {rows.map((row, idx) => (
        <View key={idx} style={styles.tableItem}>
          <DataGrid data={row} accent="#4f46e5" />
        </View>
      ))}
    </View>
  );
}

export default function HistorialScreen({ route, navigation }) {
  useLockOrderBackNavigation();
  const { id_orden } = route.params;

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ANT");

  const [placa, setPlaca] = useState("");
  const [cedula, setCedula] = useState("");
  const [cedulaDueno, setCedulaDueno] = useState("");

  const [cliente, setCliente] = useState({
    nombres: "",
    apellidos: "",
    telefono_manual: "",
    direccion_manual: ""
  });

  const [antData, setAntData] = useState(null);
  const [premiumData, setPremiumData] = useState(null);
  const [integradoData, setIntegradoData] = useState(null);
  const [gravamenData, setGravamenData] = useState(null);
const [loadingGravamen, setLoadingGravamen] = useState(false);

  const [observaciones, setObservaciones] = useState("");
  const [valorOrden, setValorOrden] = useState(null);

  // PDF manual ya subido (nombre desde backend)
  const [pdfManualNombre, setPdfManualNombre] = useState(null);

  const [loadingANT, setLoadingANT] = useState(false);
  const [loadingPremium, setLoadingPremium] = useState(false);
  const [loadingIntegrado, setLoadingIntegrado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [selectedPdfManual, setSelectedPdfManual] = useState(null);

  useEffect(() => {
    cargarTodo();
  }, []);

  const authHeaders = async () => {
    const token = await SecureStore.getItemAsync("token");
    return { Authorization: `Bearer ${token}` };
  };

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

  async function cargarContactoTicket() {
    try {
      const r = await fetch(`${API}/historial/contacto/${id_orden}`, {
        headers: await authHeaders()
      });
      const d = await r.json();

      if (!d?.ok || !d?.persona) return;

      const p = d.persona;

      setCliente((prev) => ({
        ...prev,
        nombres: p?.nombres || prev.nombres || "",
        apellidos: p?.apellidos || prev.apellidos || "",
        telefono_manual: p?.telefono || prev.telefono_manual || "",
        direccion_manual: p?.direccion || prev.direccion_manual || ""
      }));
    } catch (e) {
      console.log("Error cargando contacto ticket:", e);
    }
  }

  async function cargarHistorialGuardado() {
    const r = await fetch(`${API}/historial/${id_orden}`, {
      headers: await authHeaders()
    });
    const d = await r.json();

    setPlaca(d.placa ?? "");
    setCedula(d.cedula ?? "");
    setObservaciones(d.observaciones ?? "");
    setValorOrden(d.valor_orden ?? null);

    if (d.datos_cedula) {
      try {
        const c = JSON.parse(d.datos_cedula);
        if (c && typeof c === "object") {
          setCliente((prev) => ({
            ...prev,
            nombres: c?.nombres || prev.nombres || "",
            apellidos: c?.apellidos || prev.apellidos || "",
            telefono_manual: c?.telefono_manual || prev.telefono_manual || "",
            direccion_manual: c?.direccion_manual || prev.direccion_manual || ""
          }));
        }
      } catch {}
    }

    if (d.datos_vehiculo) {
      try {
        const parsed = JSON.parse(d.datos_vehiculo);
        if (parsed?.datos_principales) {
          setPremiumData(parsed);
          setAntData(null);
          setTab("PREMIUM");
        } else if (parsed?.historial_unificado) {
          setIntegradoData(parsed.historial_unificado);
          setAntData(null);
          setPremiumData(null);
          setTab("INTEGRADO");
        } else if (parsed?.vehiculo || parsed?.propietario) {
          setAntData(parsed);
          setPremiumData(null);
          setTab("ANT");
        }
      } catch {}
    }

    if (d.pdf_manual) setPdfManualNombre(d.pdf_manual);
    else setPdfManualNombre(null);
  }

  async function cargarTodo() {
    try {
      setLoading(true);
      await cargarContactoTicket();
      await cargarHistorialGuardado();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error cargando historial");
    } finally {
      setLoading(false);
    }
  }

  // ============================
  // 🚗 CONSULTA ANT
  // ============================
  async function consultarANT() {
    if (!placa) return Alert.alert("Ingrese una placa");

    try {
      setLoadingANT(true);

      const placaVal = placa.trim();
      const cedulaOwner = (cedulaDueno || "").trim();

      let url = `${API}/historial/consultar/placa/${placaVal}`;
      if (cedulaOwner) url += `?cedula=${encodeURIComponent(cedulaOwner)}`;

      const res = await fetch(url, { headers: await authHeaders() });
      const data = await res.json();

      if (data?.solicitar_cedula_manual) {
        Alert.alert("Atención", data?.mensaje || "Ingrese cédula del dueño");
        return;
      }

      if (!data?.success) {
        Alert.alert("Sin datos", data?.mensaje || "No se encontraron datos.");
        return;
      }

      const antPayload = {
        vehiculo: data.vehiculo || {},
        propietario: data.propietario || {},
        ant: data.ant || {},
        sri: data.sri || {},
        rubros: data.rubros || [],
        numero_cambios_dominio: data.numero_cambios_dominio,
        resumen: data.resumen,
        datos_matricula: data.datos_matricula
      };

      setAntData(antPayload);
      setPremiumData(null);
      setTab("ANT");

      Alert.alert("OK", "Datos ANT cargados correctamente.");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error consultando ANT");
    } finally {
      setLoadingANT(false);
    }
  }

  // ============================
  // ⭐ CONSULTA PREMIUM
  // ============================
  async function consultarPremium() {
    if (!placa) return Alert.alert("Ingrese una placa");

    try {
      setLoadingPremium(true);

      const placaVal = placa.trim().toUpperCase();

      const res = await fetch(`${API}/historial/permiso-circulacion/${placaVal}`, {
        headers: await authHeaders()
      });
      const json = await res.json();

      if (!json?.success || !json?.informe) {
        Alert.alert("Sin datos", "No se encontró información Premium.");
        return;
      }

      setPremiumData(json.informe);
      setAntData(null);
      setTab("PREMIUM");

      Alert.alert("OK", "Informe Premium cargado correctamente.");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error obteniendo el informe Premium");
    } finally {
      setLoadingPremium(false);
    }
  }

  // ============================
  // 🧩 HISTORIAL INTEGRADO
  // ============================
  async function consultarHistorialIntegrado() {
    if (!placa) return Alert.alert("Ingrese una placa");

    try {
      setLoadingIntegrado(true);

      const placaVal = placa.trim().toUpperCase();
      const res = await fetch(`${API}/historial/consultar/placa-integrado/${placaVal}`, {
        headers: await authHeaders()
      });
      const data = await res.json();

      if (!data?.success || !data?.historial_unificado) {
        Alert.alert("Sin datos", data?.mensaje || "No se encontró historial integrado.");
        return;
      }

      setIntegradoData(data.historial_unificado);
      setAntData(null);
      setPremiumData(null);
      setTab("INTEGRADO");

      if (data?.parcial) {
        Alert.alert("OK", "Historial integrado cargado con algunas fuentes parciales.");
        return;
      }

      Alert.alert("OK", "Historial integrado cargado correctamente.");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error consultando historial integrado");
    } finally {
      setLoadingIntegrado(false);
    }
  }

  // ============================
// 🚫 CONSULTA GRAVAMEN
// ============================
async function consultarGravamen() {

  if (!placa) return Alert.alert("Ingrese una placa");

  try {

    setLoadingGravamen(true);

    const placaVal = placa.trim().toUpperCase();

    const res = await fetch(
      `${API}/historial/bloqueos-gravamen?placa=${placaVal}`,
      { headers: await authHeaders() }
    );

    const json = await res.json();

    if (!json?.success) {
      Alert.alert("Sin datos", json?.mensaje || "No se encontraron datos.");
      return;
    }

    setGravamenData(json.data);
    setAntData(null);
    setPremiumData(null);
    setTab("GRAVAMEN");

    Alert.alert("OK", "Datos de Gravamen cargados");

  } catch (e) {

    console.log(e);
    Alert.alert("Error", "Error consultando Gravamen");

  } finally {

    setLoadingGravamen(false);

  }
}
  // ============================
  // 💾 GUARDAR / FINALIZAR
  // ============================
  function buildHistorialPayload() {
    let datosVehiculo = {};

    // ANT
    if (antData) {
      datosVehiculo = antData;
    }

    // PREMIUM
    else if (premiumData) {
      datosVehiculo = premiumData;
    }

    // HISTORIAL INTEGRADO
    else if (integradoData) {
      datosVehiculo = {
        historial_unificado: integradoData
      };
    }

    // GRAVAMEN
    else if (gravamenData) {

      datosVehiculo = {

        datos_principales: gravamenData?.vehiculo || {},

        datos_tecnicos: gravamenData?.identificacion || {},

        propietario_actual: gravamenData?.propietario_actual || {},

        propietario_registrado_sri: gravamenData?.propietario_potencial || {},

        propietario_anterior: gravamenData?.propietario_anterior || {},

        matricula_registro: gravamenData?.matricula || {},

        vigencia_estado: gravamenData?.vigencia || {},

        legal_restricciones: gravamenData?.restricciones || {},

        referencia_sistema: gravamenData?.referencia_sistema || {}

      };

    }

    const body = {
      placa,
      cedula,
      observaciones,
      datos_cedula: cliente || {},
      datos_vehiculo: datosVehiculo
    };

    return body;
  }

async function guardarYFinalizar() {

  try {

    setSaving(true);

    await fetch(`${API}/historial/${id_orden}`, {
      method: "PUT",
      headers: {
        ...(await authHeaders()),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildHistorialPayload())
    });

    await fetch(`${API}/historial/finalizar/${id_orden}`, {
      method: "PUT",
      headers: await authHeaders()
    });

    Alert.alert("OK", "Historial guardado y finalizado");

  } catch (e) {

    console.log(e);
    Alert.alert("Error guardando historial");

  } finally {

    setSaving(false);

  }
}

async function enviarHistorialWhatsapp() {
  try {
    setEnviandoWhatsapp(true);

    await fetch(`${API}/historial/${id_orden}`, {
      method: "PUT",
      headers: {
        ...(await authHeaders()),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildHistorialPayload())
    });

    const res = await fetch(`${API}/historial/pdf/${id_orden}/whatsapp`, {
      method: "POST",
      headers: {
        ...(await authHeaders()),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        telefono: cliente?.telefono_manual || ""
      })
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.ok === false) {
      throw new Error(json.mensaje || "No se pudo enviar el historial por WhatsApp.");
    }

    Alert.alert("WhatsApp", "Historial enviado por WhatsApp correctamente.");
  } catch (e) {
    console.log(e);
    Alert.alert("WhatsApp", e.message || "No se pudo enviar el historial por WhatsApp.");
  } finally {
    setEnviandoWhatsapp(false);
  }
}
  // ============================
  // 📄 PDF NORMAL / PREMIUM
  // ============================
  async function generarPDF(tipo) {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) return Alert.alert("Error", "Token no encontrado");

      const endpoint = tipo === "PREMIUM" ? "historial/premium" : "historial/pdf";
      const url = `${API}/${endpoint}/${id_orden}`;

      const fileUri =
        FileSystem.documentDirectory +
        `${endpoint.replace("/", "_")}_${id_orden}_${Date.now()}.pdf`;

      // ✅ FIX: legacy downloadAsync
      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("PDF listo", `Guardado en: ${download.uri}`);
        return;
      }

      // ✅ Esto sirve como “previsualizar” en iOS: abre Archivos / Acrobat / etc.
      await Sharing.shareAsync(download.uri);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error generando PDF");
    }
  }

  // ============================
// 🚫 PDF GRAVAMEN
// ============================
async function generarPDFGravamen() {
  try {

    const token = await SecureStore.getItemAsync("token");

    const url = `${API}/historial/bloqueos/pdf/${id_orden}`;

    const fileUri =
      FileSystem.documentDirectory +
      `gravamen_${id_orden}_${Date.now()}.pdf`;

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
    Alert.alert("Error", "Error generando PDF de Gravamen");

  }
}

async function generarPDFIntegrado() {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (!token) return Alert.alert("Error", "Token no encontrado");

    await fetch(`${API}/historial/${id_orden}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        placa,
        cedula,
        observaciones,
        datos_cedula: cliente || {},
        datos_vehiculo: integradoData ? { historial_unificado: integradoData } : {}
      })
    });

    const url = `${API}/historial/integrado/pdf/${id_orden}`;
    const fileUri =
      FileSystem.documentDirectory +
      `historial_integrado_${id_orden}_${Date.now()}.pdf`;

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
    Alert.alert("Error", "Error generando PDF Integrado");
  }
}

  // ============================
  // 📎 PDF MANUAL: seleccionar / previsualizar / subir
  // ============================
  async function seleccionarPDFManual() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled) return null;

    const asset = result.assets?.[0];
    if (!asset?.uri) return null;

    return asset;
  }

  async function previsualizarPDFManual() {
    try {
      const asset = await seleccionarPDFManual();
      if (!asset) return;

      setSelectedPdfManual(asset);

      // ✅ esto es preview real en iOS (abre visor externo)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(asset.uri);
      } else {
        Alert.alert("PDF seleccionado", "No hay visor disponible en este dispositivo.");
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo previsualizar el PDF");
    }
  }

  async function subirPDFManual() {
    try {
      setUploadingPdf(true);

      const asset = selectedPdfManual || (await seleccionarPDFManual());
      if (!asset) return;

      const form = new FormData();
      form.append("pdf", {
        uri: asset.uri,
        name: asset.name || `manual_${Date.now()}.pdf`,
        type: "application/pdf"
      });

      const res = await fetch(`${API}/historial/${id_orden}/pdf`, {
        method: "POST",
        headers: await authHeaders(),
        body: form
      });

      const json = await res.json();

      if (!json?.ok) {
        Alert.alert("Error", json?.mensaje || "Error subiendo PDF");
        return;
      }

      Alert.alert("OK", "PDF subido correctamente ✔");
      setSelectedPdfManual(null);
      await cargarHistorialGuardado();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error subiendo PDF manual");
    } finally {
      setUploadingPdf(false);
    }
  }

  async function verPDFManualSubido() {
    try {
      if (!pdfManualNombre) return;

      const token = await SecureStore.getItemAsync("token");

      // URL del server igual que web
      const url = `https://api360suite.pqautoexpert.ec/uploads/historial/pdf/orden_${id_orden}/${pdfManualNombre}`;

      const fileUri =
        FileSystem.documentDirectory +
        `pdf_manual_${id_orden}_${Date.now()}.pdf`;

      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(download.uri);
      } else {
        Alert.alert("PDF listo", `Guardado en: ${download.uri}`);
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo abrir el PDF manual");
    }
  }

  const clienteRender = useMemo(() => {
    return {
      nombres: cliente?.nombres || "",
      apellidos: cliente?.apellidos || "",
      telefono: cliente?.telefono_manual || "",
      direccion: cliente?.direccion_manual || ""
    };
  }, [cliente]);

  const integradoRender = useMemo(() => {
    const unificado = integradoData || {};
    const matricula = unificado.matricula_oficial || {};
    const axiscloudRaw = unificado.capturas_fuentes_raw?.axiscloud?.datos || {};
    const axisInfoNormalizado = unificado.axiscloud?.info_placa || {};
    const axisCuentaNormalizada = unificado.axiscloud?.estado_cuenta || {};
    const axisInfoRaw = axiscloudRaw.info_placa || {};
    const axisCuentaRaw = axiscloudRaw.mi_cuenta || {};
    const axisResumenRaw = axisCuentaRaw.resumen || {};

    const axisInfo = Object.keys(axisInfoNormalizado).length
      ? axisInfoNormalizado
      : axisInfoRaw;
    const axisCuenta = Object.keys(axisCuentaNormalizada).length
      ? axisCuentaNormalizada
      : {
          tipo_busqueda: axisCuentaRaw.consulta?.tipo_busqueda,
          criterio: axisCuentaRaw.consulta?.criterio,
          codigo_respuesta: axisCuentaRaw.consulta?.codigo_respuesta,
          disponible:
            axisCuentaRaw.disponible === undefined
              ? null
              : axisCuentaRaw.disponible
                ? "SI"
                : "NO",
          mensaje: axisCuentaRaw.mensaje,
          total_fuentes_axiscloud: axisResumenRaw.total_fuentes_axiscloud,
          total_infracciones_axiscloud: axisResumenRaw.total_infracciones_axiscloud,
          total_pendiente_axiscloud_centavos:
            axisResumenRaw.total_pendiente_axiscloud_centavos,
          total_pendiente_axiscloud: axisResumenRaw.total_pendiente_axiscloud
        };

    return {
      resumen: unificado.resumen_ejecutivo || {},
      propietario: unificado.propietario_por_placa || {},
      matricula,
      matriculaDatos: {
        placa: matricula.placa,
        marca: matricula.marca,
        modelo: matricula.modelo,
        anio_modelo: matricula.anio_modelo,
        pais_fabricacion: matricula.pais_fabricacion,
        clase: matricula.clase,
        servicio: matricula.servicio,
        tipo_uso: matricula.tipo_uso,
        canton_matricula: matricula.canton_matricula,
        fecha_ultima_matricula: matricula.fecha_ultima_matricula,
        fecha_caducidad_matricula: matricula.fecha_caducidad_matricula,
        fecha_revision: matricula.fecha_revision,
        anio_ultimo_pago: matricula.anio_ultimo_pago,
        estado_deudas: matricula.estado_deudas,
        estado_tasas: matricula.estado_tasas,
        total: matricula.total,
        total_pagar: matricula.total_pagar,
        cilindraje: matricula.cilindraje,
        ramv_cpn: matricula.ramv_cpn,
        fecha_compra: matricula.fecha_compra,
        fecha_matricula_anual: matricula.fecha_matricula_anual,
        remision: matricula.remision
      },
      axisDatos: {
        tipo_vehiculo: axisInfo.tipo_vehiculo,
        servicio_codigo: axisInfo.servicio_codigo,
        color: axisInfo.color,
        matricula_anio: axisInfo.matricula_anio,
        fecha_matricula: axisInfo.fecha_matricula,
        lugar_matricula: axisInfo.lugar_matricula,
        fecha_caducidad: axisInfo.fecha_caducidad,
        anio_revision: axisInfo.anio_revision,
        fecha_revision_desde: axisInfo.fecha_revision_desde,
        fecha_revision_hasta: axisInfo.fecha_revision_hasta,
        disponible: axisCuenta.disponible,
        mensaje: axisCuenta.mensaje,
        codigo_respuesta: axisCuenta.codigo_respuesta,
        total_fuentes_axiscloud: axisCuenta.total_fuentes_axiscloud,
        total_infracciones_axiscloud: axisCuenta.total_infracciones_axiscloud,
        total_pendiente_axiscloud_centavos:
          axisCuenta.total_pendiente_axiscloud_centavos,
        total_pendiente_axiscloud: axisCuenta.total_pendiente_axiscloud
      },
      deudaAxiscloud: Array.isArray(axisCuentaNormalizada.deuda_axiscloud)
        ? axisCuentaNormalizada.deuda_axiscloud
        : Array.isArray(axisCuentaRaw.deuda_axiscloud)
          ? axisCuentaRaw.deuda_axiscloud
          : [],
      deudaInstitucion: Array.isArray(axisCuentaNormalizada.deuda_institucion)
        ? axisCuentaNormalizada.deuda_institucion
        : Array.isArray(axisCuentaRaw.deuda_institucion)
          ? axisCuentaRaw.deuda_institucion
          : [],
      deudaAnt: Array.isArray(axisCuentaNormalizada.deuda_ant)
        ? axisCuentaNormalizada.deuda_ant
        : Array.isArray(axisCuentaRaw.deuda_ant)
          ? axisCuentaRaw.deuda_ant
          : [],
      fiscalia: unificado.fiscalia || {},
      actos: unificado.actos_administrativos || {},
      fuentes: unificado.fuentes_estado || {}
    };
  }, [integradoData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={{ marginTop: 8 }}>Cargando...</Text>
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

      <Text style={styles.pageTitle}>📜 Historial Vehicular</Text>

      <CardBox title="Datos básicos" icon="📘" color="#111d4d">
        <View style={styles.row3}>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Placa</Text>
            <TextInput
              style={styles.input}
              value={placa}
              onChangeText={setPlaca}
              placeholder="Placa"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.col}>
            <Text style={styles.inputLabel}>Cédula del solicitante</Text>
            <TextInput
              style={styles.input}
              value={cedula}
              onChangeText={setCedula}
              placeholder="Cédula solicitante"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.col}>
            <Text style={styles.inputLabel}>Cédula del dueño del vehículo</Text>
            <TextInput
              style={styles.input}
              value={cedulaDueno}
              onChangeText={setCedulaDueno}
              placeholder="Cédula dueño"
              keyboardType="numeric"
            />
          </View>
        </View>
      </CardBox>

      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={[styles.btnWide, styles.btnDark]}
          onPress={consultarGravamen}
          disabled={loadingGravamen || loadingIntegrado}
        >
          <Text style={styles.btnText}>
            {loadingGravamen ? "Consultando..." : "🚫 Consultar Bloqueos / Gravamen"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnWide, styles.btnPrimary]}
          onPress={consultarHistorialIntegrado}
          disabled={loadingGravamen || loadingIntegrado}
        >
          <Text style={styles.btnText}>
            {loadingIntegrado ? "Consultando..." : "🧩 Consultar Historial Integrado"}
          </Text>
        </TouchableOpacity>
      </View>

      <CardBox title="Datos del Solicitante (Cliente)" icon="🧑" color="#111d4d">
        <DataGrid data={clienteRender} accent="#0d6efd" />
      </CardBox>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "ANT" && styles.tabActiveAnt]}
          onPress={() => setTab("ANT")}
        >
          <Text style={[styles.tabText, tab === "ANT" && styles.tabTextActive]}>ANT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === "PREMIUM" && styles.tabActivePremium]}
          onPress={() => setTab("PREMIUM")}
        >
          <Text style={[styles.tabText, tab === "PREMIUM" && styles.tabTextActive]}>PREMIUM</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === "INTEGRADO" && styles.tabActiveAnt]}
          onPress={() => setTab("INTEGRADO")}
        >
          <Text style={[styles.tabText, tab === "INTEGRADO" && styles.tabTextActive]}>
            INTEGRADO
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
  style={[styles.tab, tab === "GRAVAMEN" && styles.tabActiveDanger]}
  onPress={() => setTab("GRAVAMEN")}
>
  <Text style={[styles.tabText, tab === "GRAVAMEN" && styles.tabTextActive]}>
    GRAVAMEN
  </Text>
</TouchableOpacity>
      </View>

      {tab === "ANT" && antData && (
        <>
          <CardBox title="Datos del Vehículo (ANT)" icon="🚗" color="#111d4d">
            <DataGrid data={antData?.vehiculo} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Propietario del Vehículo" icon="🧑" color="#111d4d">
            <DataGrid data={antData?.propietario} accent="#0d6efd" />
          </CardBox>

          {!!antData?.rubros?.length && (
            <CardBox title="Rubros y Valores" icon="💰" color="#111d4d">
              <RubrosGrid rubros={antData?.rubros} />
            </CardBox>
          )}

          {!isEmptyValue(antData?.numero_cambios_dominio) && (
            <CardBox title="Cambios de Dominio / Matrícula" icon="🔄" color="#111d4d">
              <DataGrid
                data={{
                  numero_cambios_dominio: antData?.numero_cambios_dominio,
                  fechaUltimaMatricula: antData?.datos_matricula?.fechaUltimaMatricula,
                  fechaCaducidadMatricula: antData?.datos_matricula?.fechaCaducidadMatricula,
                  cantonMatricula: antData?.datos_matricula?.cantonMatricula,
                  fechaRevision: antData?.datos_matricula?.fechaRevision
                }}
                accent="#0d6efd"
              />
            </CardBox>
          )}
        </>
      )}

      {tab === "PREMIUM" && premiumData && (
        <>
          <CardBox title="Informe Premium – Datos Principales" icon="⭐" color="#111d4d">
            <DataGrid data={premiumData?.datos_principales} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Datos Técnicos" icon="🔧" color="#111d4d">
            <DataGrid data={premiumData?.datos_tecnicos} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Propietario Actual" icon="🧑" color="#111d4d">
            <DataGrid data={premiumData?.propietario_actual} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Propietario Registrado en SRI" icon="🏛" color="#111d4d">
            <DataGrid data={premiumData?.propietario_registrado_sri} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Propietario Anterior" icon="🔄" color="#111d4d">
            <DataGrid data={premiumData?.propietario_anterior} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Matrícula y Registro" icon="📄" color="#111d4d">
            <DataGrid data={premiumData?.matricula_registro} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Vigencia y Estado" icon="⏳" color="#111d4d">
            <DataGrid data={premiumData?.vigencia_estado} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Restricciones Legales" icon="⚖" color="#111d4d">
            <DataGrid data={premiumData?.legal_restricciones} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Datos Internos del Sistema" icon="🟦" color="#111d4d">
            <DataGrid data={premiumData?.referencia_sistema} accent="#0d6efd" />
          </CardBox>
        </>
      )}

      {tab === "INTEGRADO" && integradoData && (
        <>
          <CardBox title="Historial Integrado - Resumen Ejecutivo" icon="🧩" color="#111d4d">
            <DataGrid data={integradoRender.resumen} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Dueño del Carro" icon="🧑" color="#111d4d">
            <DataGrid data={integradoRender.propietario} accent="#0d6efd" />
          </CardBox>

          <CardBox title="Matrícula Oficial" icon="📄" color="#111d4d">
            <Text style={styles.panelTitle}>Datos unificados de matrícula</Text>
            <DataGrid data={integradoRender.matriculaDatos} accent="#0d6efd" />

            <Text style={styles.panelTitle}>Resumen de valores de matrícula</Text>
            <ObjectTable
              rows={integradoRender.matricula?.resumen_valores}
              emptyText="Sin resumen de valores"
            />

            <Text style={styles.panelTitle}>Detalle de deudas y rubros</Text>
            <ObjectTable
              rows={integradoRender.matricula?.detalle_valores}
              emptyText="Sin detalle de deudas o rubros"
            />
          </CardBox>

          <CardBox title="Axiscloud y Estado de Cuenta" icon="🛰" color="#111d4d">
            <Text style={styles.panelTitle}>Datos complementarios de Axiscloud</Text>
            <DataGrid data={integradoRender.axisDatos} accent="#0d6efd" />

            <Text style={styles.panelTitle}>Deuda Axiscloud</Text>
            <ObjectTable rows={integradoRender.deudaAxiscloud} emptyText="Sin deuda en Axiscloud" />

            <Text style={styles.panelTitle}>Deuda Institución</Text>
            <ObjectTable
              rows={integradoRender.deudaInstitucion}
              emptyText="Sin deuda por institución"
            />

            <Text style={styles.panelTitle}>Deuda ANT</Text>
            <ObjectTable rows={integradoRender.deudaAnt} emptyText="Sin deuda ANT" />
          </CardBox>

          <CardBox
            title="Fiscalía, Denuncias y Actos Administrativos"
            icon="⚖"
            color="#111d4d"
          >
            <Text style={styles.panelTitle}>Denuncias y Casos</Text>
            <DataGrid
              data={{
                criterio: integradoRender.fiscalia?.criterio,
                coincidencias: integradoRender.fiscalia?.coincidencias ? "SI" : "NO",
                total_casos: integradoRender.fiscalia?.total_casos,
                mensaje: integradoRender.fiscalia?.mensaje,
                fuente_disponible: integradoRender.fuentes?.consulta_fuentes?.ok
                  ? "SI"
                  : "PARCIAL"
              }}
              accent="#0d6efd"
            />

            <ObjectTable
              rows={integradoRender.fiscalia?.casos}
              emptyText="Sin casos de Fiscalía"
            />

            <Text style={styles.panelTitle}>Actos Administrativos</Text>
            <DataGrid
              data={{
                criterio: integradoRender.actos?.criterio,
                coincidencias: integradoRender.actos?.coincidencias ? "SI" : "NO",
                total_actos: integradoRender.actos?.total_actos,
                mensaje: integradoRender.actos?.mensaje
              }}
              accent="#0d6efd"
            />

            <ObjectTable
              rows={integradoRender.actos?.actos}
              emptyText="Sin actos administrativos"
            />
          </CardBox>
        </>
      )}

      {tab === "GRAVAMEN" && gravamenData && (
  <>
    <CardBox title="Datos del Vehículo" icon="🚗">
      <DataGrid data={gravamenData?.vehiculo} />
    </CardBox>

    <CardBox title="Identificación" icon="🔧">
      <DataGrid data={gravamenData?.identificacion} />
    </CardBox>

    <CardBox title="Propietario Actual" icon="🧑">
      <DataGrid data={gravamenData?.propietario_actual} />
    </CardBox>

    <CardBox title="Propietario Potencial" icon="🏛">
      <DataGrid data={gravamenData?.propietario_potencial} />
    </CardBox>

    <CardBox title="Restricciones Legales" icon="⚖">
      <DataGrid data={gravamenData?.restricciones} />
    </CardBox>

    <CardBox title="Referencia del Sistema" icon="📄">
      <DataGrid data={gravamenData?.referencia_sistema} />
    </CardBox>
  </>
)}

      <CardBox title="Subir PDF Manual" icon="📄" color="#111d4d">
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            style={[styles.btnSmall, styles.btnPrimary]}
            onPress={previsualizarPDFManual}
            disabled={uploadingPdf}
          >
            <Text style={styles.btnText}>👀 Previsualizar PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSmall, styles.btnSuccess]}
            onPress={subirPDFManual}
            disabled={uploadingPdf}
          >
            <Text style={styles.btnText}>{uploadingPdf ? "Subiendo..." : "⬆ Subir PDF Manual"}</Text>
          </TouchableOpacity>

          {!!pdfManualNombre && (
            <TouchableOpacity
              style={[styles.btnSmall, styles.btnOutlineDark]}
              onPress={verPDFManualSubido}
              disabled={uploadingPdf}
            >
              <Text style={styles.btnTextDark}>📎 Ver PDF Manual Subido</Text>
            </TouchableOpacity>
          )}
        </View>
      </CardBox>

      <CardBox title="Observaciones" icon="📝" color="#111d4d">
        <TextInput
          style={[styles.input, { height: 110, textAlignVertical: "top" }]}
          value={observaciones}
          onChangeText={setObservaciones}
          placeholder="Observaciones"
          multiline
        />
      </CardBox>

      {valorOrden != null && (
        <View style={styles.valorOrdenBox}>
          <Text style={styles.valorOrdenTitle}>💵 VALOR DE LA ORDEN</Text>
          <Text style={styles.valorOrdenAmount}>${Number(valorOrden).toFixed(2)}</Text>
        </View>
      )}

      <View style={styles.footerButtons}>
       <TouchableOpacity
  style={[styles.footerBtn, styles.btnSuccess]}
  onPress={guardarYFinalizar}
>
  <Text style={styles.btnText}>
    💾 Guardar y Finalizar Historial
  </Text>
</TouchableOpacity>

        <TouchableOpacity style={[styles.footerBtn, styles.btnPrimary]} onPress={() => generarPDF("NORMAL")}>
          <Text style={styles.btnText}>📄 Generar Informe PDF Normal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.footerBtn, styles.btnWarning]} onPress={() => generarPDF("PREMIUM")}>
          <Text style={styles.btnText}>⭐ Imprimir Informe Premium</Text>
        </TouchableOpacity>

        <TouchableOpacity
  style={[styles.footerBtn, styles.btnDark]}
  onPress={generarPDFGravamen}
>
  <Text style={styles.btnText}>
    🚫 PDF Bloqueos / Gravamen
  </Text>
</TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerBtn, styles.btnPrimary]}
          onPress={generarPDFIntegrado}
        >
          <Text style={styles.btnText}>🧩 PDF Historial Integrado</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerBtn, styles.btnSuccess]}
          onPress={enviarHistorialWhatsapp}
          disabled={enviandoWhatsapp}
        >
          <Text style={styles.btnText}>
            {enviandoWhatsapp ? "Enviando..." : "📲 Enviar al WhatsApp"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: Platform.OS === "ios" ? 20 : 10 }} />
    </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: "#f5f7fa" },
  keyboardRoot: { flex: 1 },
  container: { flex: 1, backgroundColor: "#f5f7fa", padding: 16 },
  pageTitle: { fontSize: 22, fontWeight: "900", color: "#111d4d", marginBottom: 14 },
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

  cardBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },

  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111d4d", marginBottom: 12 },

  panelTitle: {
    color: "#111d4d",
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 10
  },

  inputLabel: { fontSize: 12, fontWeight: "800", color: "#111d4d", marginBottom: 6 },

  input: {
    backgroundColor: "#f2f4f8",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e6eaf0"
  },

  row3: { flexDirection: "column", gap: 10 },
  col: { flex: 1 },

  rowButtons: { flexDirection: "column", gap: 10, marginBottom: 14 },

  btnWide: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },

  btnSmall: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },

  btnDanger: { backgroundColor: "#d62b3a" },
  btnInfo: { backgroundColor: "#11b6d9" },
  btnPrimary: { backgroundColor: "#111d4d" },
  btnSuccess: { backgroundColor: "#198754" },
  btnWarning: { backgroundColor: "#debb3c" },

  btnOutlineDark: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#111d4d",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },

  btnText: { color: "#fff", fontWeight: "900" },
  btnTextDark: { color: "#111d4d", fontWeight: "900" },

  tabs: { flexDirection: "row", gap: 10, marginBottom: 12 },
  tab: {
    flex: 1,
    backgroundColor: "#e9edf5",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  tabActiveAnt: { backgroundColor: "#111d4d" },
  tabActivePremium: { backgroundColor: "#debb3c" },
  tabText: { fontWeight: "900", color: "#111d4d" },
  tabTextActive: { color: "#fff" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dataItem: {
    width: "48%",
    backgroundColor: "#f5f7fa",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4
  },
  dataLabel: { fontSize: 12, color: "#6b7280", fontWeight: "800" },
  dataValue: { fontSize: 14, color: "#111827", fontWeight: "700", marginTop: 3 },

  tableItem: {
    backgroundColor: "#f8faff",
    borderWidth: 1,
    borderColor: "#d9e4fb",
    borderRadius: 12,
    padding: 10
  },
  emptyBox: {
    backgroundColor: "#f5f7fa",
    borderWidth: 1,
    borderColor: "#c7d4ed",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12
  },
  emptyText: {
    color: "#6b7280",
    fontWeight: "800"
  },

  valorOrdenBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  valorOrdenTitle: { fontSize: 16, fontWeight: "900", color: "#111d4d" },
  valorOrdenAmount: { marginTop: 6, fontSize: 26, fontWeight: "900", color: "#111d4d" },

  footerButtons: { gap: 10, marginTop: 6 },
  footerBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  btnDark: { backgroundColor: "#111827" },
tabActiveDanger: { backgroundColor: "#dc3545" },
  
});

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
  Modal,
  Platform,
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as ImageManipulator from "expo-image-manipulator";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
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

const LUGARES_REVISION = ["RIOBAMBA OFICINA", "RIOBAMBA FERIA", "AMBATO", "CUENCA"];
const TIPOS_REVISION = [
  { value: "preventiva", label: "Preventiva" },
  { value: "pericial", label: "Pericial" },
];
const CONDICIONES_REVISION = [
  { value: "compra", label: "Compra" },
  { value: "tramite", label: "Trámite" },
  { value: "otra", label: "Otra" },
];
const ESTADOS_VEHICULO = [
  { value: "encendido", label: "Encendido" },
  { value: "apagado", label: "Apagado" },
];
const ELEMENTOS_IDENTIFICACION = [
  "Serie identificativa del motor",
  "Serie identificativa del chasis",
  "VIN público",
  "Plaquilla del fabricante",
  "Remaches de fijación",
  "Adhesivo del parante / etiqueta VIN",
  "Números confidenciales o secundarios",
  "Lectura electrónica ECU",
  "Correspondencia documental",
  "Otros elementos",
];
const CONCLUSIONES_TECNICAS = [
  "Mantienen correspondencia con sus características originales",
  "Mantienen correspondencia con sus características originales y la ECU no le corresponde al vehículo",
  "Mantienen correspondencia con sus características originales, pero sus remaches de sujeción son cambiados",
  "Mantienen correspondencia con sus características originales, pero sus remaches de sujeción son cambiados al igual que la ECU no corresponde al vehículo",
];
const RESULTADO_GRUPOS = [
  {
    key: "caracteristicas_morfologicas",
    title: "Características morfológicas de las series",
    options: [
      "La serie examinada presenta características morfológicas compatibles con el sistema de marcación original",
      "La serie examinada no permite realizar una conclusión técnica definitiva",
      "Requiere análisis técnico complementario",
    ],
  },
  {
    key: "estado_superficies",
    title: "Estado de superficies y soportes",
    options: [
      "Buen estado",
      "Estado regular",
      "Mal estado",
      "Con indicios visibles de intervención",
      "Requiere análisis técnico complementario",
    ],
  },
  {
    key: "correspondencia_elementos",
    title: "Correspondencia entre elementos físicos y electrónicos",
    options: [
      "Correspondencia compatible",
      "Correspondencia parcial",
      "No existe correspondencia",
      "No verificable al momento de la inspección",
    ],
  },
  {
    key: "novedades_detectadas",
    title: "Novedades detectadas",
    options: [
      "Sin novedades visibles",
      "Series parcialmente legibles",
      "Serie de motor no localizada",
      "Serie de chasis no localizada",
      "Diferencias entre series físicas y registros",
      "Diferencias entre VIN físico y VIN electrónico",
      "Plaquilla o adhesivo deteriorado",
      "Remaches con características irregulares",
      "Indicios de lijado, pulido o esmerilado",
      "Indicios de remarcación o reimpresión",
      "Presencia de soldadura, corte o injerto",
      "Oxidación, corrosión o desgaste",
      "Soporte deformado o intervenido",
      "ECU reemplazada o sin información identificativa",
      "No fue posible efectuar la lectura electrónica",
      "Requiere inspección técnica complementaria",
    ],
  },
];

const emptyVehiculo = {
  placa: "",
  marca: "",
  modelo: "",
  anio: "",
  pais_origen: "",
  numero_motor: "",
  numero_chasis: "",
  propietario_cedula: "",
  propietario_nombres: "",
  propietario_email: "",
  manual: false,
};

function parseJsonSafe(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseArraySafe(value) {
  const parsed = parseJsonSafe(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function buildDefaultPuntos(vehiculo = {}) {
  return [
    {
      elemento: "Serie identificativa del motor",
      dato_observado: vehiculo.numero_motor || "",
      resultado: "",
      observacion: "",
      fijo: true,
    },
    {
      elemento: "Serie identificativa del chasis",
      dato_observado: vehiculo.numero_chasis || "",
      resultado: "",
      observacion: "",
      fijo: true,
    },
    {
      elemento: "Números confidenciales o secundarios",
      dato_observado: "",
      resultado: "",
      observacion: "",
      fijo: true,
    },
  ];
}

function FirmaClientePad({ value, onChange }) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          html, body { margin:0; padding:0; overflow:hidden; background:#fff; touch-action:none; }
          canvas { width:100vw; height:180px; display:block; background:#fff; }
        </style>
      </head>
      <body>
        <canvas id="pad"></canvas>
        <script>
          const canvas = document.getElementById('pad');
          const ctx = canvas.getContext('2d');
          let drawing = false;
          let dirty = false;
          function resize(){
            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.floor(window.innerWidth * ratio);
            canvas.height = Math.floor(180 * ratio);
            ctx.scale(ratio, ratio);
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#111827';
          }
          resize();
          function point(e){
            const t = e.touches ? e.touches[0] : e;
            const r = canvas.getBoundingClientRect();
            return { x: t.clientX - r.left, y: t.clientY - r.top };
          }
          function start(e){ e.preventDefault(); drawing = true; dirty = true; const p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
          function move(e){ if(!drawing) return; e.preventDefault(); const p = point(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
          function end(){ if(!drawing) return; drawing = false; window.ReactNativeWebView.postMessage(canvas.toDataURL('image/png')); }
          window.limpiarFirma = function(){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            dirty = false;
            window.ReactNativeWebView.postMessage('');
          };
          canvas.addEventListener('mousedown', start);
          canvas.addEventListener('mousemove', move);
          window.addEventListener('mouseup', end);
          canvas.addEventListener('touchstart', start, { passive:false });
          canvas.addEventListener('touchmove', move, { passive:false });
          canvas.addEventListener('touchend', end);
        </script>
      </body>
    </html>
  `;

  const webviewRef = React.useRef(null);

  return (
    <View>
      <View style={styles.signatureBox}>
        <WebView
          ref={webviewRef}
          originWhitelist={["*"]}
          source={{ html }}
          scrollEnabled={false}
          onMessage={(event) => onChange(event.nativeEvent.data || "")}
          style={styles.signatureWebview}
        />
      </View>
      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, { flex: 1 }]}
          onPress={() => {
            webviewRef.current?.injectJavaScript("window.limpiarFirma && window.limpiarFirma(); true;");
            onChange("");
          }}
        >
          <Text style={styles.btnText}>Limpiar firma</Text>
        </TouchableOpacity>
      </View>
      {!!value && <Text style={styles.signatureReady}>Firma capturada lista para guardar.</Text>}
    </View>
  );
}

export default function IdentificacionNuevaScreen({ route, navigation }) {
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
  const [imagenCompletaUri, setImagenCompletaUri] = useState("");
  const [firmaClienteDataUrl, setFirmaClienteDataUrl] = useState("");
  const [firmaClientePath, setFirmaClientePath] = useState("");
  const [lugar, setLugar] = useState("RIOBAMBA OFICINA");
  const [tipoRevision, setTipoRevision] = useState("preventiva");
  const [condicion, setCondicion] = useState("compra");
  const [kilometraje, setKilometraje] = useState("");
  const [estadoVehiculo, setEstadoVehiculo] = useState("");
  const [observacionInicial, setObservacionInicial] = useState("");
  const [puntosIdentificacion, setPuntosIdentificacion] = useState(buildDefaultPuntos());
  const [nuevoPuntoElemento, setNuevoPuntoElemento] = useState("");
  const [resultadosInspeccion, setResultadosInspeccion] = useState({
    conclusion_opcion: "",
    caracteristicas_morfologicas: [],
    estado_superficies: [],
    correspondencia_elementos: [],
    novedades_detectadas: [],
  });

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
  const [extrayendoMatricula, setExtrayendoMatricula] = useState(false);

  const [fotosDetalle, setFotosDetalle] = useState([]);
  const [fotosExtra, setFotosExtra] = useState([]);
  const [serviciosExtra, setServiciosExtra] = useState([]);

  const [fotoExtraNombre, setFotoExtraNombre] = useState("");
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
      propietario_cedula:
        v.propietario_cedula ||
        v.cedula_propietario ||
        extra.propietario_cedula ||
        extra.cedula_propietario ||
        "",
      propietario_nombres:
        v.propietario_nombres ||
        v.propietario ||
        v.propietario_actual ||
        extra.propietario_nombres ||
        extra.propietario ||
        "",
      propietario_email:
        v.propietario_email || extra.propietario_email || "",
      manual: !!extra.manual,
    };
  }

  function setVehiculoDataAndSync(next) {
    setVehiculoData((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      setPuntosIdentificacion((puntosPrev) => {
        const base = puntosPrev.length ? puntosPrev : buildDefaultPuntos(resolved);
        return base.map((punto) => {
          if (punto.elemento === "Serie identificativa del motor") {
            return { ...punto, dato_observado: resolved.numero_motor || punto.dato_observado || "" };
          }
          if (punto.elemento === "Serie identificativa del chasis") {
            return { ...punto, dato_observado: resolved.numero_chasis || punto.dato_observado || "" };
          }
          return punto;
        });
      });
      return resolved;
    });
  }

  function updatePunto(index, field, value) {
    setPuntosIdentificacion((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  }

  function agregarPuntoIdentificacion() {
    if (!nuevoPuntoElemento) {
      Alert.alert("Aviso", "Seleccione un elemento para agregar.");
      return;
    }

    setPuntosIdentificacion((prev) => [
      ...prev,
      { elemento: nuevoPuntoElemento, dato_observado: "", resultado: "", observacion: "" },
    ]);
    setNuevoPuntoElemento("");
  }

  function eliminarPuntoIdentificacion(index) {
    setPuntosIdentificacion((prev) => prev.filter((_, idx) => idx !== index));
  }

  function toggleResultadoGrupo(key, option) {
    setResultadosInspeccion((prev) => {
      const actual = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = actual.includes(option);
      return {
        ...prev,
        [key]: exists ? actual.filter((item) => item !== option) : [...actual, option],
      };
    });
  }

  async function cargarContactoTicket(token) {
    const res = await fetch(`${API}/identificacion-nueva/contacto/${id_orden}`, {
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

  async function cargarDatos(options = {}) {
    const preservarFormulario = options?.preservarFormulario === true;

    try {
      if (!preservarFormulario) {
        setLoading(true);
      }
      const token = await getToken();
      const storedUser = await SecureStore.getItemAsync("usuario");

      if (storedUser) {
        setUsuario(JSON.parse(storedUser));
      }

      await cargarContactoTicket(token);

      const res = await fetch(`${API}/identificacion-nueva/${id_orden}`, {
        headers: authHeader(token),
      });

      const ident = await res.json();

      if (!preservarFormulario) {
        setPlaca(ident.placa ?? "");
        setCedula(ident.cedula ?? "");
        setLugar(ident.lugar || "RIOBAMBA OFICINA");
        setTipoRevision(ident.tipo_revision || "preventiva");
        setCondicion(ident.condicion || "compra");
        setKilometraje(ident.kilometraje || "");
        setEstadoVehiculo(ident.estado_vehiculo || "");
        setObservacionInicial(ident.observacion_inicial ?? ident.observaciones ?? "");
        setObservaciones(ident.observacion_inicial ?? ident.observaciones ?? "");
        setFirmaClientePath(ident.firma_cliente_path || "");
        setFirmaClienteDataUrl("");
      }
      setEstadoOrden(ident.estado_orden ?? ident.estadoOrden ?? "");

      setTotalProforma(asNumber(ident.total_proforma));
      setTotalFinal(asNumber(ident.total_final));

      let vehiculoCargado = emptyVehiculo;
      if (ident.datos_vehiculo) {
        try {
          const parsed = JSON.parse(ident.datos_vehiculo);
          vehiculoCargado = {
            placa: parsed.placa || "",
            marca: parsed.marca || "",
            modelo: parsed.modelo || "",
            anio: parsed.anio || "",
            pais_origen: parsed.pais_origen || "",
            numero_motor: parsed.numero_motor || "",
            numero_chasis: parsed.numero_chasis || "",
            propietario_cedula: parsed.propietario_cedula || parsed.cedula_propietario || "",
            propietario_nombres: parsed.propietario_nombres || parsed.propietario || "",
            propietario_email: parsed.propietario_email || "",
            manual: !!parsed.manual,
          };
          if (!preservarFormulario) {
            setVehiculoDataAndSync(vehiculoCargado);
            setKilometraje(ident.kilometraje || parsed.kilometraje || "");
            setEstadoVehiculo(ident.estado_vehiculo || parsed.estado_vehiculo || "");
            setManualVisible(!!parsed.manual);
          }
        } catch (e) {
          console.log("Error parsing datos_vehiculo", e);
        }
      }

      if (!preservarFormulario) {
        const puntosGuardados = parseArraySafe(ident.puntos_identificacion);
        setPuntosIdentificacion(
          puntosGuardados.length ? puntosGuardados : buildDefaultPuntos(vehiculoCargado)
        );

        const resultadosGuardados = parseJsonSafe(ident.resultados_inspeccion, {});
        setResultadosInspeccion((prev) => ({
          ...prev,
          ...resultadosGuardados,
          caracteristicas_morfologicas: Array.isArray(resultadosGuardados.caracteristicas_morfologicas)
            ? resultadosGuardados.caracteristicas_morfologicas
            : [],
          estado_superficies: Array.isArray(resultadosGuardados.estado_superficies)
            ? resultadosGuardados.estado_superficies
            : [],
          correspondencia_elementos: Array.isArray(resultadosGuardados.correspondencia_elementos)
            ? resultadosGuardados.correspondencia_elementos
            : [],
          novedades_detectadas: Array.isArray(resultadosGuardados.novedades_detectadas)
            ? resultadosGuardados.novedades_detectadas
            : [],
        }));
        setConclusiones(resultadosGuardados.conclusion_tecnica || ident.conclusiones || "");
      }

      const detalle = ident.fotos_detalle || [];
      setFotosDetalle(detalle);

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
      let url = `${API}/identificacion-nueva/consultar/ant/${placa.trim()}`;

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
        setVehiculoDataAndSync({
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

      setVehiculoDataAndSync(normalizeVehiculoFromApi(json.vehiculo));
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
      const res = await fetch(`${API}/identificacion-nueva/consultar/sri-basico/${placa.trim()}`, {
        headers: authHeader(token),
      });

      const json = await res.json();

      if (!json.ok || !json.vehiculo) {
        Alert.alert("Aviso", json.mensaje || "No se encontraron datos");
        return;
      }

      setVehiculoDataAndSync(
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

  async function seleccionarFotoMatricula(origen = "galeria") {
    if (origen === "camara") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Autorice la cámara para tomar la foto de la matrícula.");
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      return result.canceled ? null : result.assets?.[0];
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Autorice la galería para seleccionar la foto de la matrícula.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    return result.canceled ? null : result.assets?.[0];
  }

  async function extraerMotorChasisDesdeMatricula(origen = "galeria") {
    try {
      if (extrayendoMatricula) return;

      const asset = await seleccionarFotoMatricula(origen);
      if (!asset?.uri) return;

      setExtrayendoMatricula(true);

      const resized = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      const token = await getToken();
      const form = new FormData();
      form.append("foto_matricula", {
        uri: resized.uri,
        name: "matricula.jpg",
        type: "image/jpeg",
      });
      form.append("placa", placa.trim().toUpperCase());

      const res = await fetch(`${API}/historial/matricula-imagen/ocr`, {
        method: "POST",
        headers: authHeader(token),
        body: form,
      });

      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (!res.ok || !json.success) {
        throw new Error(json.mensaje || json.detalle || "No se pudo extraer motor y chasis.");
      }

      const identificacion = json.data?.identificacion_vehicular || {};
      const motor = identificacion.motor || json.data?.matricula_imagen?.numero_motor || "";
      const chasis = identificacion.chasis || json.data?.matricula_imagen?.vin_chasis || "";

      if (!motor && !chasis) {
        throw new Error("No se encontró número de motor ni número de chasis en la imagen.");
      }

      setVehiculoDataAndSync((prev) => ({
        ...prev,
        numero_motor: motor || prev.numero_motor || "",
        numero_chasis: chasis || prev.numero_chasis || "",
        manual: true,
      }));

      Alert.alert("Listo", "Motor y chasis extraídos correctamente.");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", e.message || "Error extrayendo motor y chasis.");
    } finally {
      setExtrayendoMatricula(false);
    }
  }

  async function consultarBloqueosBasico() {
    try {
      if (!placa.trim()) {
        Alert.alert("Aviso", "Ingrese la placa");
        return;
      }

      const token = await getToken();
      const res = await fetch(`${API}/identificacion-nueva/consultar/bloqueos/${placa.trim()}`, {
        headers: authHeader(token),
      });

      const json = await res.json();

      if (!json.ok || !json.vehiculo) {
        Alert.alert("Aviso", json.mensaje || "No se encontraron datos");
        return;
      }

      setVehiculoDataAndSync(
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
      const res = await fetch(`${API}/identificacion-nueva/consultar/ant-pro/${placa.trim()}`, {
        headers: authHeader(token),
      });

      const json = await res.json();

      if (!json.ok || !json.vehiculo) {
        Alert.alert("Aviso", json.mensaje || "No se encontraron datos");
        return;
      }

      setVehiculoDataAndSync(
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

    form.append("descripcion", "");

    const res = await fetch(`${API}/identificacion-nueva/${id_orden}/foto/${preview.tipo}`, {
      method: "POST",
      headers: authHeader(token),
      body: form,
    });

    if (!res.ok) {
      Alert.alert("Error", "Error subiendo la foto");
      return;
    }

    setPreviewImage(null);
    await cargarDatos({ preservarFormulario: true });

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
      form.append("descripcion", "");

      const res = await fetch(`${API}/identificacion-nueva/${id_orden}/foto-extra`, {
        method: "POST",
        headers: authHeader(token),
        body: form,
      });

      if (!res.ok) {
        Alert.alert("Error", "No se pudo subir la foto extra");
        return;
      }

      setFotoExtraNombre("");
      await cargarDatos({ preservarFormulario: true });
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo subir la foto extra");
    }
  }

  async function eliminarFotoObligatoria(id) {
    try {
      const token = await getToken();

      const res = await fetch(`${API}/identificacion-nueva/foto/${id}`, {
        method: "DELETE",
        headers: authHeader(token),
      });

      if (!res.ok) {
        Alert.alert("Error", "No se pudo eliminar la foto");
        return;
      }

      await cargarDatos({ preservarFormulario: true });
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo eliminar la foto");
    }
  }

  async function eliminarFotoExtra(id) {
    try {
      const token = await getToken();

      const res = await fetch(`${API}/identificacion-nueva/foto-extra/${id}`, {
        headers: authHeader(token),
      });

      if (!res.ok) {
        Alert.alert("Error", "No se pudo eliminar la foto extra");
        return;
      }

      await cargarDatos({ preservarFormulario: true });
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo eliminar la foto extra");
    }
  }

  async function subirFirmaClienteSiExiste() {
    if (!firmaClienteDataUrl) {
      return;
    }

    const base64 = String(firmaClienteDataUrl).replace(/^data:image\/png;base64,/, "");
    if (!base64.trim()) {
      return;
    }

    const token = await getToken();
    const fileUri = `${FileSystem.cacheDirectory}firma_cliente_${id_orden}_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const form = new FormData();
    form.append("firma", {
      uri: fileUri,
      name: `firma_cliente_${id_orden}.png`,
      type: "image/png",
    });

    const res = await fetch(`${API}/identificacion-nueva/${id_orden}/firma-cliente`, {
      method: "POST",
      headers: authHeader(token),
      body: form,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      throw new Error(json.mensaje || "No se pudo guardar la firma del cliente.");
    }

    setFirmaClientePath(json.firma_cliente_path || "");
    setFirmaClienteDataUrl("");
  }

  async function agregarExtra() {
    try {
      if (!extraDesc.trim() || !extraValor.trim()) {
        Alert.alert("Aviso", "Complete descripción y valor");
        return;
      }

      const token = await getToken();

      const res = await fetch(`${API}/identificacion-nueva/${id_orden}/extra`, {
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
      await cargarDatos({ preservarFormulario: true });
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo agregar el extra");
    }
  }

  async function eliminarExtra(id) {
    try {
      const token = await getToken();

      const res = await fetch(`${API}/identificacion-nueva/extra/${id}`, {
        method: "DELETE",
        headers: authHeader(token),
      });

      if (!res.ok) {
        Alert.alert("Error", "No se pudo eliminar el extra");
        return;
      }

      await cargarDatos({ preservarFormulario: true });
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
          propietario_cedula: vehiculoData.propietario_cedula || "",
          propietario_nombres: vehiculoData.propietario_nombres || "",
          propietario_email: vehiculoData.propietario_email || "",
          kilometraje: kilometraje || "",
          estado_vehiculo: estadoVehiculo || "",
          manual: true,
        }
      : {
          ...vehiculoData,
          placa: vehiculoData.placa || placa,
          kilometraje: kilometraje || vehiculoData.kilometraje || "",
          estado_vehiculo: estadoVehiculo || vehiculoData.estado_vehiculo || "",
          manual: !!vehiculoData.manual,
        };

    const payload = {
      placa: placa ?? "",
      cedula: cedula ?? "",
      lugar,
      tipo_revision: tipoRevision,
      condicion,
      kilometraje,
      estado_vehiculo: estadoVehiculo,
      observaciones: observacionInicial || observaciones || "",
      datos_cedula: datosCedulaPayload,
      datos_vehiculo: vehiculoPayload,
      puntos_identificacion: puntosIdentificacion,
      resultados_inspeccion: {
        ...resultadosInspeccion,
        conclusion_tecnica: conclusiones || "",
      },
      conclusiones: conclusiones || "",
    };

    const res = await fetch(`${API}/identificacion-nueva/${id_orden}`, {
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

    const res = await fetch(`${API}/identificacion-nueva/finalizar/${id_orden}`, {
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

      await subirFirmaClienteSiExiste();
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

      Alert.alert("Éxito", "Identificación nueva guardada y finalizada correctamente");
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
      await subirFirmaClienteSiExiste();
      const token = await getToken();

      const url = `${API}/identificacion-nueva/pdf/${id_orden}`;
      const fileUri =
        FileSystem.documentDirectory + `identificacion_nueva_${id_orden}_${Date.now()}.pdf`;

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
      await subirFirmaClienteSiExiste();
      await guardarIdentificacion();
      const token = await getToken();

      const res = await fetch(`${API}/identificacion-nueva/pdf/${id_orden}/whatsapp`, {
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

      Alert.alert("WhatsApp", json.mensaje || "Certificación enviada por WhatsApp correctamente.");
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
      <Modal
        visible={!!imagenCompletaUri}
        transparent
        animationType="fade"
        onRequestClose={() => setImagenCompletaUri("")}
      >
        <View style={styles.fullImageOverlay}>
          <TouchableOpacity
            style={styles.fullImageClose}
            onPress={() => setImagenCompletaUri("")}
          >
            <Text style={styles.fullImageCloseText}>Cerrar</Text>
          </TouchableOpacity>
          {!!imagenCompletaUri && (
            <Image
              source={{ uri: imagenCompletaUri }}
              resizeMode="contain"
              style={styles.fullImage}
            />
          )}
        </View>
      </Modal>
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
        <Text style={styles.sectionTitle}>📍 Datos de la Inspección</Text>

        <Text style={styles.label}>Lugar</Text>
        <View style={styles.chipRow}>
          {LUGARES_REVISION.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.chip, lugar === item && styles.chipActive]}
              onPress={() => setLugar(item)}
            >
              <Text style={[styles.chipText, lugar === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tipo de revisión</Text>
        <View style={styles.chipRow}>
          {TIPOS_REVISION.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.chip, tipoRevision === item.value && styles.chipActive]}
              onPress={() => setTipoRevision(item.value)}
            >
              <Text style={[styles.chipText, tipoRevision === item.value && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Condición</Text>
        <View style={styles.chipRow}>
          {CONDICIONES_REVISION.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.chip, condicion === item.value && styles.chipActive]}
              onPress={() => setCondicion(item.value)}
            >
              <Text style={[styles.chipText, condicion === item.value && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
          <Text style={styles.infoLine}>Propietario cédula: {vehiculoData.propietario_cedula || "-"}</Text>
          <Text style={styles.infoLine}>Propietario nombres: {vehiculoData.propietario_nombres || "-"}</Text>
          <Text style={styles.infoLine}>Propietario email: {vehiculoData.propietario_email || "-"}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Kilometraje"
          keyboardType="numeric"
          value={kilometraje}
          onChangeText={setKilometraje}
        />

        <Text style={styles.label}>Estado del vehículo</Text>
        <View style={styles.chipRow}>
          {ESTADOS_VEHICULO.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.chip, estadoVehiculo === item.value && styles.chipActive]}
              onPress={() => setEstadoVehiculo(item.value)}
            >
              <Text style={[styles.chipText, estadoVehiculo === item.value && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.textareaSmall}
          placeholder="Observación inicial"
          multiline
          value={observacionInicial}
          onChangeText={(txt) => {
            setObservacionInicial(txt);
            setObservaciones(txt);
          }}
        />

        {manualVisible && camposManualesPendientes.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.manualTitle}>
              ⚠ Complete solo los datos faltantes
            </Text>

            <View style={styles.ocrBox}>
              <Text style={styles.ocrTitle}>📷 Motor y chasis desde matrícula</Text>
              <Text style={styles.ocrHint}>
                Si tiene una foto de la matrícula, puede autorrellenar número de motor y número de chasis.
              </Text>
              <View style={styles.rowButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnInfo, { flex: 1 }]}
                  disabled={extrayendoMatricula}
                  onPress={() => extraerMotorChasisDesdeMatricula("camara")}
                >
                  {extrayendoMatricula ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Tomar foto</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                  disabled={extrayendoMatricula}
                  onPress={() => extraerMotorChasisDesdeMatricula("galeria")}
                >
                  {extrayendoMatricula ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Subir foto</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {camposManualesPendientes.map((campo) => (
              <TextInput
                key={campo.key}
                style={styles.input}
                placeholder={campo.placeholder}
                value={vehiculoData[campo.key]}
                onChangeText={(v) =>
                  setVehiculoDataAndSync((p) => ({ ...p, [campo.key]: v, manual: true }))
                }
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🧩 Puntos de Identificación Inspeccionados</Text>

        {puntosIdentificacion.map((punto, index) => (
          <View key={`${punto.elemento}-${index}`} style={styles.puntoCard}>
            <View style={styles.puntoHeader}>
              <Text style={styles.puntoTitle}>{index + 1}. {punto.elemento}</Text>
              {!punto.fijo && (
                <TouchableOpacity onPress={() => eliminarPuntoIdentificacion(index)}>
                  <Text style={styles.deleteText}>Eliminar</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Dato observado"
              value={punto.dato_observado || ""}
              onChangeText={(txt) => updatePunto(index, "dato_observado", txt)}
            />

            <View style={styles.chipRow}>
              {["compatible", "no_compatible"].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, punto.resultado === value && styles.chipActive]}
                  onPress={() => updatePunto(index, "resultado", value)}
                >
                  <Text style={[styles.chipText, punto.resultado === value && styles.chipTextActive]}>
                    {value === "compatible" ? "Compatible" : "No compatible"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.textareaSmall}
              placeholder="Observación"
              multiline
              value={punto.observacion || ""}
              onChangeText={(txt) => updatePunto(index, "observacion", txt)}
            />
          </View>
        ))}

        <Text style={styles.label}>Agregar otro punto</Text>
        <View style={styles.chipRow}>
          {ELEMENTOS_IDENTIFICACION
            .filter((item) => !puntosIdentificacion.some((punto) => punto.elemento === item))
            .map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, nuevoPuntoElemento === item && styles.chipActive]}
                onPress={() => setNuevoPuntoElemento(item)}
              >
                <Text style={[styles.chipText, nuevoPuntoElemento === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
        </View>

        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={agregarPuntoIdentificacion}>
          <Text style={styles.btnText}>➕ Agregar punto</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>✍️ Firma del Cliente</Text>
        <Text style={styles.ocrHint}>
          Solicite al cliente o propietario firmar dentro del recuadro. Esta firma se estampará en el PDF.
        </Text>

        {!!firmaClientePath && !firmaClienteDataUrl && (
          <View style={styles.savedSignatureBox}>
            <Image
              source={{ uri: `https://api360suite.pqautoexpert.ec${firmaClientePath}` }}
              resizeMode="contain"
              style={styles.savedSignatureImage}
            />
            <Text style={styles.signatureReady}>Firma guardada en esta orden.</Text>
          </View>
        )}

        <FirmaClientePad value={firmaClienteDataUrl} onChange={setFirmaClienteDataUrl} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📸 Fotografías Obligatorias</Text>

        {TIPOS_FOTOS.map((f) => {
          const fotos = fotosAgrupadas[f.tipo] || [];
          const primeraFoto = fotos[0];

          return (
            <View key={f.tipo} style={styles.photoCompactBlock}>
              <View style={styles.photoCompactHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.photoTitle}>{f.nombre}</Text>
                  <Text style={styles.photoCount}>
                    {fotos.length ? `${fotos.length} foto(s) cargada(s)` : "Sin fotos cargadas"}
                  </Text>
                </View>

                {!!primeraFoto && (
                  <TouchableOpacity
                    style={[styles.btnMini, styles.btnDelete]}
                    onPress={() => eliminarFotoObligatoria(primeraFoto.id)}
                  >
                    <Text style={styles.btnText}>Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>

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

                <TouchableOpacity
                  style={[
                    styles.btn,
                    fotos.length ? styles.btnDark : styles.btnSecondary,
                    { flex: 1 },
                  ]}
                  disabled={!fotos.length}
                  onPress={() =>
                    setImagenCompletaUri(`https://api360suite.pqautoexpert.ec${primeraFoto.path}`)
                  }
                >
                  <Text style={styles.btnText}>👁 Ver</Text>
                </TouchableOpacity>
              </View>

              {fotos.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  <View style={styles.photoPillRow}>
                    {fotos.map((photo, idx) => (
                      <TouchableOpacity
                        key={photo.id}
                        style={styles.photoPill}
                        onPress={() =>
                          setImagenCompletaUri(`https://api360suite.pqautoexpert.ec${photo.path}`)
                        }
                      >
                        <Text style={styles.photoPillText}>Foto {idx + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>✅ Resultados, Conclusión y Certificación</Text>

        {RESULTADO_GRUPOS.map((grupo) => (
          <View key={grupo.key} style={styles.resultGroup}>
            <Text style={styles.label}>{grupo.title}</Text>
            {grupo.options.map((option) => {
              const selected = (resultadosInspeccion[grupo.key] || []).includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionRow, selected && styles.optionRowActive]}
                  onPress={() => toggleResultadoGrupo(grupo.key, option)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextActive]}>
                    {selected ? "✓ " : ""}{option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <Text style={styles.label}>Conclusión técnica</Text>
        <View style={styles.chipColumn}>
          {CONCLUSIONES_TECNICAS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionRow,
                resultadosInspeccion.conclusion_opcion === option && styles.optionRowActive,
              ]}
              onPress={() =>
                setResultadosInspeccion((prev) => ({ ...prev, conclusion_opcion: option }))
              }
            >
              <Text
                style={[
                  styles.optionText,
                  resultadosInspeccion.conclusion_opcion === option && styles.optionTextActive,
                ]}
              >
                {resultadosInspeccion.conclusion_opcion === option ? "✓ " : ""}{option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.textarea}
          placeholder="Detalle de la conclusión técnica"
          multiline
          value={conclusiones}
          onChangeText={setConclusiones}
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

        <View style={styles.row2}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
            onPress={() => subirFotoExtra("camera")}
          >
            <Text style={styles.btnText}>📸 Cámara</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnSuccess, { flex: 1 }]}
            onPress={() => subirFotoExtra("gallery")}
          >
            <Text style={styles.btnText}>🖼 Galería</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 14 }}>
          {fotosExtra.length === 0 ? (
            <Text style={styles.photoCount}>Sin fotos adicionales</Text>
          ) : (
            fotosExtra.map((f, idx) => (
              <View key={f.id} style={styles.extraPhotoCompactItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bold}>{f.nombre || `Foto adicional ${idx + 1}`}</Text>
                  <Text style={styles.photoCount}>Foto {idx + 1}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.btnMini, styles.btnDark]}
                  onPress={() => setImagenCompletaUri(`https://api360suite.pqautoexpert.ec${f.path}`)}
                >
                  <Text style={styles.btnText}>Ver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnMini, styles.btnDelete]}
                  onPress={() => eliminarFotoExtra(f.id)}
                >
                  <Text style={styles.btnText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
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
          onPress={() => navigation?.navigate?.("IdentificacionesNuevasHistorial")}
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

  fullImageOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },

  fullImage: {
    width: "100%",
    height: "84%",
  },

  fullImageClose: {
    position: "absolute",
    top: 48,
    right: 18,
    zIndex: 2,
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },

  fullImageCloseText: {
    color: "#111827",
    fontWeight: "900",
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

  ocrBox: {
    backgroundColor: "#eef6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  ocrTitle: {
    color: "#111d4d",
    fontWeight: "900",
    marginBottom: 4,
  },

  ocrHint: {
    color: "#475569",
    fontWeight: "700",
    marginBottom: 10,
    lineHeight: 19,
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

  label: {
    color: "#111827",
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 4,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  chipColumn: {
    gap: 8,
    marginBottom: 12,
  },

  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  chipActive: {
    backgroundColor: "#111d4d",
    borderColor: "#111d4d",
  },

  chipText: {
    color: "#334155",
    fontWeight: "800",
  },

  chipTextActive: {
    color: "#fff",
  },

  puntoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 12,
  },

  puntoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },

  puntoTitle: {
    flex: 1,
    color: "#111d4d",
    fontWeight: "900",
  },

  deleteText: {
    color: "#dc2626",
    fontWeight: "900",
  },

  resultGroup: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 12,
  },

  optionRow: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  optionRowActive: {
    backgroundColor: "#e0f2fe",
    borderColor: "#0284c7",
  },

  optionText: {
    color: "#334155",
    fontWeight: "800",
    lineHeight: 20,
  },

  optionTextActive: {
    color: "#075985",
  },

  signatureBox: {
    height: 180,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },

  signatureWebview: {
    height: 180,
    backgroundColor: "#fff",
  },

  savedSignatureBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
  },

  savedSignatureImage: {
    width: "100%",
    height: 90,
    backgroundColor: "#fff",
    borderRadius: 8,
  },

  signatureReady: {
    color: "#15803d",
    fontWeight: "900",
    marginTop: 6,
    marginBottom: 8,
  },

  photoBlock: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  photoCompactBlock: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  photoCompactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  photoTitle: {
    fontWeight: "900",
    marginBottom: 8,
    color: "#111827",
  },

  photoCount: {
    color: "#6b7280",
    fontWeight: "700",
    fontSize: 13,
  },

  photoPillRow: {
    flexDirection: "row",
    gap: 8,
  },

  photoPill: {
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#eff6ff",
  },

  photoPillText: {
    color: "#1d4ed8",
    fontWeight: "900",
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

  extraPhotoCompactItem: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 10,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
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

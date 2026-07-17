import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  Image,
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import useLockOrderBackNavigation from "../../hooks/useLockOrderBackNavigation";
import { unregisterDevicePushNotifications } from "../../services/pushNotifications";

const API = "https://api360suite.pqautoexpert.ec/api";

function beautify(key) {
  return String(key).replace(/_/g, " ").replace(/\b\w/g, (a) => a.toUpperCase());
}
function isEmptyValue(v) {
  return v === undefined || v === null || v === "";
}
function safeText(v) {
  if (isEmptyValue(v)) return "";
  return String(v);
}
function originFromApi(apiUrl) {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return apiUrl;
  }
}

function CardBox({ title, icon, color = "#111d4d", right, children }) {
  return (
    <View style={[styles.cardBox, { borderLeftColor: color }]}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.sectionTitle}>
          {icon ? `${icon} ` : ""}{title}
        </Text>
        {!!right && <View>{right}</View>}
      </View>
      {children}
    </View>
  );
}

function DataGrid({ data, accent = "#0d6efd" }) {
  if (!data || typeof data !== "object") return null;

  const entries = Object.entries(data).filter(([, v]) => !isEmptyValue(v));
  if (entries.length === 0) return null;

  return (
    <View style={styles.grid}>
      {entries.map(([k, v]) => (
        <View key={k} style={[styles.dataItem, { borderLeftColor: accent }]}>
          <Text style={styles.dataLabel}>{beautify(k)}</Text>
          <Text style={styles.dataValue}>{safeText(v)}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionToggle({ checked, label, onToggle }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle} activeOpacity={0.85}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
      </View>
      <Text style={styles.toggleLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function PhotoStrip({ title, photos, onRemove, onAdd, loading, hint }) {
  return (
    <View style={{ marginTop: 10 }}>
      <View style={styles.photoHeader}>
        <Text style={styles.photoTitle}>{title}</Text>

        <TouchableOpacity
          style={[styles.btnSmall, styles.btnPrimary, loading && { opacity: 0.7 }]}
          onPress={onAdd}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "Subiendo..." : "📷 Agregar fotos"}</Text>
        </TouchableOpacity>
      </View>

      {!!hint && <Text style={styles.hint}>{hint}</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <View style={{ flexDirection: "row", gap: 10, paddingRight: 10 }}>
          {(!photos || photos.length === 0) ? (
            <View style={styles.photoEmpty}>
              <Text style={styles.photoEmptyText}>Sin fotos</Text>
            </View>
          ) : (
            photos.map((p) => (
              <View key={p.id} style={styles.photoWrap}>
                <Image source={{ uri: p.uri }} style={styles.photo} />
                {!!onRemove && (
                  <TouchableOpacity
                    onPress={() => onRemove(p)}
                    style={styles.photoRemove}
                  >
                    <Text style={styles.photoRemoveText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default function PrecompraScreen({ route, navigation }) {
  useLockOrderBackNavigation();
  // ✅ evita el error: route.params undefined
  const id_orden = route?.params?.id_orden;

  const [loading, setLoading] = useState(true);

  const [idPrecompra, setIdPrecompra] = useState(null);

  const [datosPersona, setDatosPersona] = useState({});
  const [datosVehiculo, setDatosVehiculo] = useState({});

  const [externoActivo, setExternoActivo] = useState(false);
  const [internoActivo, setInternoActivo] = useState(false);

  const [ext, setExt] = useState({
    carroceria: "",
    chasis: "",
    estructura: "",
    susp_del: "",
    susp_pos: "",
  });

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
      if (rootNavigation) rootNavigation.replace("Welcome");
      else navigation.replace("Welcome");
    }
  }

  const [int, setInt] = useState({
    motor: "",
    caja: "",
  });

  const [observaciones, setObservaciones] = useState("");
  const [conclusiones, setConclusiones] = useState("");

  // fotos (mezcla: backend + locales)
  const [fotosExterno, setFotosExterno] = useState([]); // [{id, uri, source}]
  const [fotosInterno, setFotosInterno] = useState([]);

  const [consultandoVehiculo, setConsultandoVehiculo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingExterno, setUploadingExterno] = useState(false);
  const [uploadingInterno, setUploadingInterno] = useState(false);
  const [printing, setPrinting] = useState(false);

  const API_BASE = useMemo(() => originFromApi(API), []);

  const authHeaders = useCallback(async () => {
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      navigation?.replace?.("Login");
      throw new Error("Token no encontrado");
    }
    return { Authorization: `Bearer ${token}` };
  }, [navigation]);

  // =========================
  // init
  // =========================
  useEffect(() => {
    if (!id_orden) {
      Alert.alert("Error", "No llegó id_orden a Precompra.");
      return;
    }
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_orden]);

  async function iniciarPrecompra() {
    const headers = await authHeaders();

    const r = await fetch(`${API}/precompra/iniciar/${id_orden}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
    });

    const d = await r.json();

    if (!r.ok || !d?.id_precompra) {
      throw new Error(d?.mensaje || "No se pudo iniciar precompra");
    }

    setIdPrecompra(d.id_precompra);
    return d.id_precompra;
  }

  async function cargarDatosTicket() {
    const headers = await authHeaders();

    const r = await fetch(`${API}/precompra/datos-ticket/${id_orden}`, { headers });
    const d = await r.json();

    if (!d?.ok) return;

    const persona = {
      nombre: `${d?.datos?.nombre_cliente || ""} ${d?.datos?.apellido_cliente || ""}`.trim(),
      cedula: d?.datos?.numero_cedula || "",
      telefono: d?.datos?.telefono_cliente || "",
    };

    const vehiculo = {
      placa: d?.datos?.placa || "",
    };

    setDatosPersona((prev) => (Object.keys(prev || {}).length ? prev : persona));
    setDatosVehiculo((prev) => (Object.keys(prev || {}).length ? prev : vehiculo));
  }

  function normalizeFotoItem(f) {
    // backend: { ruta_imagen, tipo } según tu web
    const ruta = f?.ruta_imagen || "";
    const uri = ruta.startsWith("http") ? ruta : `${API_BASE}${ruta}`;
    return {
      id: `srv-${f?.id || ruta || Math.random()}`,
      uri,
      source: "server",
      tipo: f?.tipo || "externo",
    };
  }

  async function cargarPrecompraInicial() {
    const headers = await authHeaders();

    const r = await fetch(`${API}/precompra/datos-iniciales/${id_orden}`, { headers });
    const d = await r.json();

    if (!d?.ok) return;

    const p = d.precompra || {};

    // persona/vehiculo (si vienen guardados)
    if (p?.datos_persona && typeof p.datos_persona === "object") setDatosPersona(p.datos_persona);
    if (p?.datos_vehiculo && typeof p.datos_vehiculo === "object") setDatosVehiculo(p.datos_vehiculo);

    // toggles
    setExternoActivo(p?.externo_activo == 1);
    setInternoActivo(p?.interno_activo == 1);

    // textos externos
    setExt({
      carroceria: p?.externo_carroceria || "",
      chasis: p?.externo_chasis || "",
      estructura: p?.externo_estructura || "",
      susp_del: p?.externo_suspension_delantera || "",
      susp_pos: p?.externo_suspension_posterior || "",
    });

    // textos internos
    setInt({
      motor: p?.interno_motor || "",
      caja: p?.interno_caja || "",
    });

    setObservaciones(p?.observaciones || "");
    setConclusiones(p?.conclusiones || "");

    // fotos servidor
    const fotosSrv = Array.isArray(d?.fotos) ? d.fotos.map(normalizeFotoItem) : [];
    const extSrv = fotosSrv.filter((x) => x.tipo === "externo");
    const intSrv = fotosSrv.filter((x) => x.tipo !== "externo");

    setFotosExterno(extSrv);
    setFotosInterno(intSrv);
  }

  async function cargarTodo() {
    try {
      setLoading(true);

      await iniciarPrecompra();
      await cargarPrecompraInicial();

      // si aún no hay persona/vehiculo, intentar ticket
      await cargarDatosTicket();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", e?.message || "Error cargando precompra");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // consultar ANT vehículo
  // =========================
  async function consultarDatosVehiculo() {
    const placa = safeText(datosVehiculo?.placa).trim();
    if (!placa) return Alert.alert("Atención", "Primero debe existir una placa.");

    try {
      setConsultandoVehiculo(true);

      const headers = await authHeaders();
      const r = await fetch(`${API}/precompra/consultar/ant/${encodeURIComponent(placa)}`, { headers });
      const d = await r.json();

      if (!d?.ok) {
        Alert.alert("Sin datos", "No se encontraron datos del vehículo.");
        return;
      }

      // SOLO VEHÍCULO (como tu web)
      setDatosVehiculo({
        placa: d?.placa || placa,
        marca: d?.marca || "",
        modelo: d?.modelo || "",
        anio: d?.anio || "",
        pais: d?.pais || "",
      });

      Alert.alert("OK", "Datos del vehículo actualizados.");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error consultando datos del vehículo.");
    } finally {
      setConsultandoVehiculo(false);
    }
  }

  // =========================
  // guardar
  // =========================
  async function guardar() {
    if (!idPrecompra) return Alert.alert("Error", "Precompra no iniciada (id_precompra vacío).");

    try {
      setSaving(true);

      const headers = await authHeaders();

      const body = {
        datos_persona: datosPersona,
        datos_vehiculo: datosVehiculo,

        externo_activo: !!externoActivo,
        externo_carroceria: ext.carroceria,
        externo_chasis: ext.chasis,
        externo_estructura: ext.estructura,
        externo_suspension_delantera: ext.susp_del,
        externo_suspension_posterior: ext.susp_pos,

        interno_activo: !!internoActivo,
        interno_motor: int.motor,
        interno_caja: int.caja,

        observaciones,
        conclusiones,
      };

      const r = await fetch(`${API}/precompra/guardar/${idPrecompra}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || "Error guardando");
      }

      Alert.alert("OK", "Guardado correctamente ✔");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", e?.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  // =========================
// PERMISOS
// =========================

async function pedirPermisos() {

const galeria = await ImagePicker.requestMediaLibraryPermissionsAsync();
const camara = await ImagePicker.requestCameraPermissionsAsync();

if (galeria.status !== "granted" || camara.status !== "granted") {
Alert.alert("Permiso requerido","Debe permitir cámara y galería");
return false;
}

return true;

}

// =========================
// TOMAR FOTO
// =========================

async function tomarFoto(){

const permiso = await pedirPermisos();
if(!permiso) return [];

const result = await ImagePicker.launchCameraAsync({
mediaTypes: ImagePicker.MediaTypeOptions.Images,
quality:0.8
});

if(result.canceled) return [];

return result.assets.map(a=>({
uri:a.uri,
name:`foto_${Date.now()}.jpg`,
type:"image/jpeg"
}));

}

// =========================
// ELEGIR GALERIA
// =========================

async function elegirGaleria(){

const permiso = await pedirPermisos();
if(!permiso) return [];

const result = await ImagePicker.launchImageLibraryAsync({
mediaTypes: ImagePicker.MediaTypeOptions.Images,
quality:0.8,
allowsMultipleSelection:true,
selectionLimit:8
});

if(result.canceled) return [];

return result.assets.map(a=>({
uri:a.uri,
name:`foto_${Date.now()}.jpg`,
type:"image/jpeg"
}));

}

// =========================
// SELECTOR CAMARA / GALERIA
// =========================

function seleccionarFotos(tipo){

Alert.alert(
"Agregar foto",
"Seleccione una opción",
[
{
text:"📷 Tomar foto",
onPress: async()=>{

const fotos = await tomarFoto();
if(fotos && fotos.length > 0){
  subirFotos(tipo,fotos);
}

}
},
{
text:"🖼 Elegir de galería",
onPress: async()=>{

const fotos = await elegirGaleria();
if(fotos && fotos.length > 0){
  subirFotos(tipo,fotos);
}
}
},
{ text:"Cancelar", style:"cancel" }
]
);

}

// =========================
// SUBIR FOTOS
// =========================

async function subirFotos(tipo,files){

if(!idPrecompra){
Alert.alert("Error","Precompra no iniciada");
return;
}

const setUploading = tipo==="externo"
? setUploadingExterno
: setUploadingInterno;

try{

setUploading(true);

const token = await SecureStore.getItemAsync("token");

const form = new FormData();
form.append("tipo",tipo);

files.forEach((f,i)=>{

form.append("fotos[]", {
  uri: f.uri,
  name: f.name ?? `foto_${tipo}_${Date.now()}_${i}.jpg`,
  type: f.type ?? "image/jpeg"
});
});

const r = await fetch(`${API}/precompra/subir-fotos/${idPrecompra}`,{
method:"POST",
headers:{
Authorization:`Bearer ${token}`
},
body:form
});

if(!r.ok){
const t = await r.text();
throw new Error(t || "Error subiendo imágenes");
}

// PREVIEW LOCAL
const nuevas = files.map(f=>({
id:`local-${Date.now()}-${Math.floor(Math.random()*100000)}`,
uri:f.uri,
source:"local",
tipo
}));

if(tipo==="externo"){
setFotosExterno(prev=>[...prev,...nuevas]);
}else{
setFotosInterno(prev=>[...prev,...nuevas]);
}

Alert.alert("Correcto","Fotos subidas");

}catch(e){

console.log(e);
Alert.alert("Error","No se pudieron subir las imágenes");

}
finally{

setUploading(false);

}

}

function removeLocalPhoto(setter, foto) {

  if (foto?.source !== "local") {
    Alert.alert(
      "Información",
      "Esta foto ya está guardada en el servidor y no se puede eliminar desde aquí."
    );
    return;
  }

  setter(prev => prev.filter(x => x.id !== foto.id));

}

  // =========================
  // imprimir PDF
  // =========================
  async function imprimirPrecompra() {
    try {
      setPrinting(true);

      const token = await SecureStore.getItemAsync("token");
      if (!token) throw new Error("Token no encontrado");

      const url = `${API}/precompra/pdf/${id_orden}`;

      const fileUri =
        FileSystem.documentDirectory +
        `precompra_${id_orden}_${Date.now()}.pdf`;

      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("PDF listo", `Guardado en: ${download.uri}`);
        return;
      }

      await Sharing.shareAsync(download.uri);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error generando el PDF de la precompra");
    } finally {
      setPrinting(false);
    }
  }

  // =========================
  // render
  // =========================
  const personaRender = useMemo(() => datosPersona || {}, [datosPersona]);
  const vehiculoRender = useMemo(() => datosVehiculo || {}, [datosVehiculo]);

  if (!id_orden) {
    return (
      <View style={styles.center}>
        <Text style={{ fontWeight: "900" }}>No llegó id_orden</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={{ marginTop: 8 }}>Cargando Precompra...</Text>
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
      <View style={styles.sessionActions}>
        <TouchableOpacity
          style={[styles.sessionBtn, styles.sessionBackBtn]}
          onPress={() => navigation?.navigate?.("HomeMecanica")}
        >
          <Text style={styles.sessionBackText}>⬅ Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sessionBtn, styles.sessionLogoutBtn]}
          onPress={cerrarSesion}
        >
          <Text style={styles.sessionLogoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>🧰 Revisión Técnica Pre-Compra</Text>

      <CardBox title="Datos del Cliente" icon="👤" color="#111d4d">
        <DataGrid data={personaRender} accent="#0d6efd" />
      </CardBox>

      <CardBox
        title="Datos del Vehículo"
        icon="🚗"
        color="#111d4d"
        right={
          <TouchableOpacity
            style={[styles.btnSmall, styles.btnInfo, consultandoVehiculo && { opacity: 0.7 }]}
            onPress={consultarDatosVehiculo}
            disabled={consultandoVehiculo}
          >
            <Text style={styles.btnText}>
              {consultandoVehiculo ? "Consultando..." : "🔍 Consultar datos"}
            </Text>
          </TouchableOpacity>
        }
      >
        <DataGrid data={vehiculoRender} accent="#0d6efd" />
      </CardBox>

      <CardBox title="Revisión Externa" icon="🔧" color="#111d4d">
        <SectionToggle
          checked={externoActivo}
          label="Activar revisión externa"
          onToggle={() => setExternoActivo((s) => !s)}
        />

        {externoActivo && (
          <>
            <Text style={styles.inputLabel}>Carrocería</Text>
            <TextInput
              style={styles.input}
              value={ext.carroceria}
              onChangeText={(t) => setExt((p) => ({ ...p, carroceria: t }))}
              placeholder="Carrocería"
              multiline
            />

            <Text style={styles.inputLabel}>Chasis</Text>
            <TextInput
              style={styles.input}
              value={ext.chasis}
              onChangeText={(t) => setExt((p) => ({ ...p, chasis: t }))}
              placeholder="Chasis"
              multiline
            />

            <Text style={styles.inputLabel}>Estructura</Text>
            <TextInput
              style={styles.input}
              value={ext.estructura}
              onChangeText={(t) => setExt((p) => ({ ...p, estructura: t }))}
              placeholder="Estructura"
              multiline
            />

            <Text style={styles.inputLabel}>Suspensión Delantera</Text>
            <TextInput
              style={styles.input}
              value={ext.susp_del}
              onChangeText={(t) => setExt((p) => ({ ...p, susp_del: t }))}
              placeholder="Suspensión Delantera"
              multiline
            />

            <Text style={styles.inputLabel}>Suspensión Posterior</Text>
            <TextInput
              style={styles.input}
              value={ext.susp_pos}
              onChangeText={(t) => setExt((p) => ({ ...p, susp_pos: t }))}
              placeholder="Suspensión Posterior"
              multiline
            />

            <PhotoStrip
              title="Fotos externas"
              hint="Sube varias fotos. Se verán aquí inmediatamente."
              photos={fotosExterno}
              loading={uploadingExterno}
              onAdd={() => seleccionarFotos("externo")}
              onRemove={(foto) => removeLocalPhoto(setFotosExterno, foto)}
            />
          </>
        )}
      </CardBox>

      <CardBox title="Revisión Interna" icon="⚙️" color="#111d4d">
        <SectionToggle
          checked={internoActivo}
          label="Activar revisión interna"
          onToggle={() => setInternoActivo((s) => !s)}
        />

        {internoActivo && (
          <>
            <Text style={styles.inputLabel}>Motor</Text>
            <TextInput
              style={styles.input}
              value={int.motor}
              onChangeText={(t) => setInt((p) => ({ ...p, motor: t }))}
              placeholder="Motor"
              multiline
            />

            <Text style={styles.inputLabel}>Caja</Text>
            <TextInput
              style={styles.input}
              value={int.caja}
              onChangeText={(t) => setInt((p) => ({ ...p, caja: t }))}
              placeholder="Caja"
              multiline
            />

            <PhotoStrip
              title="Fotos internas"
              hint="Fotos del motor, chasis interno, fugas, etc."
              photos={fotosInterno}
              loading={uploadingInterno}
              onAdd={() => seleccionarFotos("interno")}
              onRemove={(foto) => removeLocalPhoto(setFotosInterno, foto)}
            />
          </>
        )}
      </CardBox>

      <CardBox title="Observaciones" icon="📝" color="#111d4d">
        <Text style={styles.inputLabel}>Observaciones</Text>
        <TextInput
          style={[styles.input, { height: 110, textAlignVertical: "top" }]}
          value={observaciones}
          onChangeText={setObservaciones}
          placeholder="Observaciones"
          multiline
        />

        <Text style={[styles.inputLabel, { marginTop: 6 }]}>Conclusiones</Text>
        <TextInput
          style={[styles.input, { height: 110, textAlignVertical: "top" }]}
          value={conclusiones}
          onChangeText={setConclusiones}
          placeholder="Conclusiones"
          multiline
        />
      </CardBox>

      <View style={styles.footerButtons}>
        <TouchableOpacity
          style={[styles.footerBtn, styles.btnSuccess, saving && { opacity: 0.7 }]}
          onPress={guardar}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? "Guardando..." : "💾 Guardar Revisión"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerBtn, styles.btnPrimary, printing && { opacity: 0.7 }]}
          onPress={imprimirPrecompra}
          disabled={printing}
        >
          <Text style={styles.btnText}>{printing ? "Generando..." : "🖨️ Imprimir / Descargar Informe"}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: Platform.OS === "ios" ? 18 : 10 }} />
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
  sessionActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  sessionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionBackBtn: {
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  sessionBackText: {
    color: "#075985",
    fontWeight: "900",
  },
  sessionLogoutBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sessionLogoutText: {
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
    elevation: 4,
  },

  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111d4d", marginBottom: 12 },

  inputLabel: { fontSize: 12, fontWeight: "800", color: "#111d4d", marginBottom: 6 },

  input: {
    backgroundColor: "#f2f4f8",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e6eaf0",
  },

  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  toggleLabel: { fontWeight: "900", color: "#111d4d" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#111d4d",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxOn: { backgroundColor: "#111d4d" },
  checkboxTick: { color: "#fff", fontWeight: "900" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dataItem: {
    width: "48%",
    backgroundColor: "#f5f7fa",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  dataLabel: { fontSize: 12, color: "#6b7280", fontWeight: "800" },
  dataValue: { fontSize: 14, color: "#111827", fontWeight: "700", marginTop: 3 },

  hint: { marginTop: 2, color: "#6b7280", fontWeight: "700" },

  photoHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  photoTitle: { fontWeight: "900", color: "#111d4d" },
  photoWrap: { width: 140, height: 100, borderRadius: 12, overflow: "hidden", borderWidth: 2, borderColor: "#111d4d" },
  photo: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(17,29,77,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: { color: "#fff", fontSize: 18, fontWeight: "900", marginTop: -2 },

  photoEmpty: {
    width: 160,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e6eaf0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmptyText: { color: "#6b7280", fontWeight: "900" },

  footerButtons: { gap: 10, marginTop: 6 },
  footerBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },

  btnPrimary: { backgroundColor: "#111d4d" },
  btnSuccess: { backgroundColor: "#198754" },
  btnInfo: { backgroundColor: "#11b6d9" },

  btnSmall: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: "center" },

  btnText: { color: "#fff", fontWeight: "900" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});

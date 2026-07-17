import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import useLockOrderBackNavigation from "../../hooks/useLockOrderBackNavigation";
import { unregisterDevicePushNotifications } from "../../services/pushNotifications";

const API = "https://api360suite.pqautoexpert.ec/api";

/** =========================
 *  Catálogos EXACTOS (como tu web)
 *  ========================= */
const ESTADOS = {
  "Filtros (aceite, aire, combustible)": ["Bueno", "Regular", "Malo", "Reemplazado", "Revisado", "No aplica"],
  "Aceite del motor": ["Nivel OK", "Bajo", "Sucio", "Cambiado", "Complementado"],
  "Sistema de frenos": ["Funcional", "Desgaste", "Fuga", "Ajustado", "Reparado", "Revisado"],
  "Neumáticos": ["Presión OK", "Desgaste irregular", "Inflado", "Rotación", "Reemplazo"],
  "Batería": ["Cargada", "Débil", "Dañada", "Limpieza", "Reemplazada"],
  "Correas y mangueras": ["Buen estado", "Agrietadas", "Reemplazadas", "Monitoreadas"],
  "Líquidos (refrigerante, dirección, frenos)": ["Nivel OK", "Bajo", "Contaminado", "Completado", "Cambiado"],
  "Iluminación y señales": ["Funcional", "Parcial", "Apagado", "Reparado", "Reemplazado"],
  "Sistema de suspensión": ["Estable", "Ruidos", "Fugas", "Lubricado", "Ajustado", "Reparado"],
  "Otros servicios - servicios terceros": ["Realizado", "Pendiente", "No aplica"],
};

const ACCIONES = {
  "Filtros (aceite, aire, combustible)": ["Reemplazo", "Limpieza", "Revisión"],
  "Aceite del motor": ["Cambio", "Completar", "Revisión"],
  "Sistema de frenos": ["Ajuste", "Reparación", "Revisión"],
  "Neumáticos": ["Rotación", "Inflado", "Reemplazo"],
  "Batería": ["Limpieza", "Reemplazo", "Prueba"],
  "Correas y mangueras": ["Reemplazo", "Ajuste"],
  "Líquidos (refrigerante, dirección, frenos)": ["Relleno", "Cambio"],
  "Iluminación y señales": ["Reemplazo", "Reparación"],
  "Sistema de suspensión": ["Ajuste", "Lubricación", "Reparación"],
  "Otros servicios - servicios terceros": ["Realizado", "Pendiente"],
};

function safeText(v) {
  if (v === undefined || v === null) return "";
  return String(v);
}

function money(n) {
  const x = Number(n || 0);
  if (Number.isNaN(x)) return "0.00";
  return x.toFixed(2);
}

/** Select básico sin librerías (RN puro):
 *  - tocando cambia entre opciones con un modal simple usando Alert
 */
function SimpleSelect({ label, value, options, onChange, disabled }) {
  const open = () => {
    if (disabled) return;
    Alert.alert(
      label,
      "Seleccione una opción",
      [
        ...options.map((opt) => ({
          text: opt,
          onPress: () => onChange(opt),
        })),
        { text: "Cancelar", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity style={[styles.selectBox, disabled && { opacity: 0.6 }]} onPress={open} activeOpacity={0.85}>
      <Text style={styles.selectLabel}>{label}</Text>
      <Text style={styles.selectValue}>{value ? value : "Seleccionar..."}</Text>
    </TouchableOpacity>
  );
}

export default function MecanicaScreen({ route, navigation }) {
  useLockOrderBackNavigation();
  const idOrden = route?.params?.id_orden;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [idReparacion, setIdReparacion] = useState(null);
  const [tipoReparacion, setTipoReparacion] = useState(""); // preventivo / correctivo / ambos

  /** =========================
   *  Búsqueda inicial
   *  ========================= */
  const [placa, setPlaca] = useState("");
  const [cedula, setCedula] = useState("");

  /** =========================
   *  Datos generales
   *  ========================= */
  const [fechaRevision, setFechaRevision] = useState("");
  const [subservicio, setSubservicio] = useState("");

  const [clienteNombre, setClienteNombre] = useState("");

  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");

  const [kmUso, setKmUso] = useState("");
  const [marca, setMarca] = useState("");
  const [anio, setAnio] = useState("");

  const [combustible, setCombustible] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [tecnico, setTecnico] = useState("");

  const [ultimoMant, setUltimoMant] = useState("");
  const [observacionesGenerales, setObservacionesGenerales] = useState("");

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

  /** =========================
   *  Preventivo
   *  ========================= */
  const [preventivoItems, setPreventivoItems] = useState([]); // [{componente, estado, accion, observaciones}]

  /** =========================
   *  Correctivo
   *  ========================= */
  const [correctivo, setCorrectivo] = useState({
    componente_afectado: "",
    falla_reportada: "",
    diagnostico_tecnico: "",
    accion_realizada: "",
  });

  /** =========================
   *  Piezas
   *  ========================= */
  const [piezas, setPiezas] = useState([]); // [{id?, pieza, cantidad, valor_unitario, total}]

  /** =========================
   *  Costos
   *  ========================= */
  const [valorProforma, setValorProforma] = useState(0);
  const [manoObra, setManoObra] = useState("");
  const [repuestos, setRepuestos] = useState("");
  const [consumibles, setConsumibles] = useState("");
  const [totalGeneral, setTotalGeneral] = useState("0.00");

  /** =========================
   *  Ajustes
   *  ========================= */
  const [ajustesSi, setAjustesSi] = useState(false);
  const [ajustes, setAjustes] = useState([]); // [{componente, antes, ajustado, recomendado, observaciones}]

  /** =========================
   *  Daños
   *  ========================= */
  const [danosSi, setDanosSi] = useState(false);
  const [danos, setDanos] = useState({
    componente: "",
    gravedad: "leve",
    descripcion: "",
    causa: "",
    urgente: "0",
    accion: "",
  });

  const totalPiezas = useMemo(() => {
    return piezas.reduce((acc, p) => acc + Number(p.total || 0), 0);
  }, [piezas]);

  useEffect(() => {
    // recalcular total general cada vez que cambie algo
    const total =
      Number(totalPiezas || 0) +
      Number(manoObra || 0) +
      Number(consumibles || 0) +
      Number(valorProforma || 0);

    setTotalGeneral(money(total));
  }, [totalPiezas, manoObra, consumibles, valorProforma]);

  async function authHeaders() {
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      navigation?.replace?.("Login");
      throw new Error("Token no encontrado");
    }
    return { Authorization: `Bearer ${token}` };
  }

  useEffect(() => {
    if (!idOrden) {
      Alert.alert("Error", "No llegó id_orden");
      setLoading(false);
      return;
    }
    cargarDatosIniciales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idOrden]);

  async function cargarDatosIniciales() {
    try {
      setLoading(true);

      const res = await fetch(`${API}/mecanica/datos-iniciales/${idOrden}`, {
        headers: await authHeaders(),
      });

      const data = await res.json();

      if (!data?.ok) {
        Alert.alert("Error", "No se encontraron datos iniciales.");
        return;
      }

      setPlaca(safeText(data.placa));
      setCedula(safeText(data.cedula));

      setFechaRevision(safeText(data.fecha_revision)?.substring(0, 10) || "");
      setSubservicio(safeText(data.subservicio || ""));

      setTipoReparacion(safeText(data.tipo_reparacion || "")); // preventivo / correctivo / ambos
      setValorProforma(Number(data.valor_proforma ?? 0));

      setIdReparacion(data.id_reparacion);

      // si backend manda preventivo_items como tu web
      if (Array.isArray(data.preventivo_items)) {
        // normalizamos a estructura: componente, estado, accion, observaciones
        const items = data.preventivo_items.map((it) => ({
          componente: it.componente,
          estado: it.estado || (ESTADOS[it.componente]?.[0] ?? ""),
          accion: it.accion || (ACCIONES[it.componente]?.[0] ?? ""),
          observaciones: it.observaciones ?? "",
        }));
        setPreventivoItems(items);
      } else {
        // si no viene, igual construimos los 10 por catálogo
        const comps = Object.keys(ESTADOS);
        setPreventivoItems(
          comps.map((c) => ({
            componente: c,
            estado: ESTADOS[c]?.[0] ?? "",
            accion: ACCIONES[c]?.[0] ?? "",
            observaciones: "",
          }))
        );
      }

      // cargar piezas por idReparacion (como web)
      if (data.id_reparacion) {
        await cargarPiezas(data.id_reparacion);
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", e?.message || "Error cargando datos.");
    } finally {
      setLoading(false);
    }
  }

  async function cargarPiezas(id_reparacion) {
    try {
      const res = await fetch(`${API}/mecanica/piezas/${id_reparacion}`, {
        headers: await authHeaders(),
      });

      const data = await res.json();
      if (!data?.ok) return;

      const arr = Array.isArray(data.piezas)
        ? data.piezas.map((p) => ({
            id: p.id,
            pieza: safeText(p.pieza),
            cantidad: Number(p.cantidad ?? 1),
            valor_unitario: Number(p.valor_unitario ?? 0),
            total: Number(p.total ?? 0),
          }))
        : [];

      setPiezas(arr);
    } catch (e) {
      console.log(e);
    }
  }

  async function buscarCedula() {
    const c = safeText(cedula).trim();
    if (!c) return Alert.alert("Atención", "Ingrese una cédula para consultar");

    try {
      const res = await fetch(`${API}/mecanica/consultar/cedula/${encodeURIComponent(c)}`, {
        headers: await authHeaders(),
      });

      const data = await res.json();

      if (data?.error) {
        Alert.alert("Sin datos", "No se encontró la cédula");
        return;
      }

      setClienteNombre(safeText(data.nombres_completos || ""));
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error consultando cédula");
    }
  }

  async function buscarPlaca() {
    const p = safeText(placa).trim();
    if (!p) return Alert.alert("Atención", "Ingrese una placa para consultar");

    try {
      const res = await fetch(`${API}/mecanica/consultar/ant/${encodeURIComponent(p)}`, {
        headers: await authHeaders(),
      });

      const data = await res.json();

      if (data?.error) {
        Alert.alert("Sin datos", "Placa no encontrada");
        return;
      }

      setMarca(safeText(data.marca || ""));
      setModelo(safeText(data.modelo || ""));
      setAnio(safeText(data.anio || ""));
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error consultando placa");
    }
  }

  function addPieza() {
    setPiezas((prev) => [
      ...prev,
      { id: null, pieza: "", cantidad: 1, valor_unitario: 0, total: 0 },
    ]);
  }

  function updatePieza(index, patch) {
    setPiezas((prev) => {
      const arr = [...prev];
      const cur = { ...arr[index], ...patch };
      const cantidad = Number(cur.cantidad || 0);
      const valor = Number(cur.valor_unitario || 0);
      cur.total = cantidad * valor;
      arr[index] = cur;
      return arr;
    });
  }

  function setPreventivoField(i, patch) {
    setPreventivoItems((prev) => {
      const arr = [...prev];
      arr[i] = { ...arr[i], ...patch };
      return arr;
    });
  }

  function ensureAjustesBase() {
    // igual a tu web: si está vacío, meter 3 filas base
    if (ajustes.length > 0) return;
    setAjustes([
      { componente: "Presión del motor", antes: "", ajustado: "", recomendado: "", observaciones: "" },
      { componente: "Sistema eléctrico", antes: "", ajustado: "", recomendado: "", observaciones: "" },
      { componente: "Frenos", antes: "", ajustado: "", recomendado: "", observaciones: "" },
    ]);
  }

  function updateAjuste(i, patch) {
    setAjustes((prev) => {
      const arr = [...prev];
      arr[i] = { ...arr[i], ...patch };
      return arr;
    });
  }

  async function guardarPiezasSolo() {
    if (!idReparacion) return Alert.alert("Error", "No existe id_reparacion");

    try {
      const body = {
        piezas: piezas.map((p) => ({
          id: p.id || null,
          pieza: p.pieza,
          cantidad: Number(p.cantidad || 1),
          valor_unitario: Number(p.valor_unitario || 0),
          total: Number(p.total || 0),
        })),
      };

      const res = await fetch(`${API}/mecanica/piezas/${idReparacion}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeaders()),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data?.ok) {
        Alert.alert("OK", "Piezas guardadas correctamente");
        await cargarPiezas(idReparacion);
      } else {
        Alert.alert("Error", safeText(data?.error || "No se pudo guardar piezas"));
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error guardando piezas");
    }
  }

  async function guardarTodo() {
    if (!idReparacion) return Alert.alert("Error", "La reparación aún no está cargada.");

    try {
      setSaving(true);

      const body = {
        id_orden: idOrden,

        // generales (como tu web)
        fecha_revision: fechaRevision,
        cliente_nombre: clienteNombre,
        cedula,
        placa,
        numero_serie: numeroSerie,
        km_uso: kmUso,
        horas_uso: null, // igual que tu web
        sucursal,
        tecnico,
        marca,
        modelo,
        anio,
        combustible,
        ultimo_mant: ultimoMant,
        observaciones_generales: observacionesGenerales,

        // correctivo (solo si aplica)
        ...(tipoReparacion === "correctivo" || tipoReparacion === "ambos"
          ? { correctivo: { ...correctivo } }
          : {}),

        // daños (solo si SI)
        ...(danosSi
          ? {
              danos: {
                componente: danos.componente,
                gravedad: danos.gravedad,
                descripcion: danos.descripcion,
                causa: danos.causa,
                urgente: danos.urgente,
                accion: danos.accion,
              },
            }
          : {}),

        // preventivo (solo si aplica)
        ...(tipoReparacion === "preventivo" || tipoReparacion === "ambos"
          ? { preventivo: preventivoItems.map((x) => ({ ...x })) }
          : {}),

        // ajustes (solo si SI)
        ...(ajustesSi
          ? {
              ajustes: ajustes.map((a) => ({
                componente: a.componente,
                antes: a.antes,
                ajustado: a.ajustado,
                recomendado: a.recomendado,
                observaciones: a.observaciones,
              })),
            }
          : {}),

        // costos (como tu web)
        mano_obra: manoObra,
        repuestos: repuestos,
        consumibles: consumibles,
        valor_proforma: valorProforma,
        otros: 0,
        total_general: totalGeneral,

        // piezas (para que vaya completo)
        piezas: piezas.map((p) => ({
          id: p.id || null,
          pieza: p.pieza,
          cantidad: Number(p.cantidad || 1),
          valor_unitario: Number(p.valor_unitario || 0),
          total: Number(p.total || 0),
        })),
      };

      const res = await fetch(`${API}/mecanica/guardar-todo/${idReparacion}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeaders()),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data?.ok) {
        Alert.alert("✅ Guardado", "Reparación guardada correctamente");
      } else {
        Alert.alert("❌ Error", safeText(data?.error || "No se pudo guardar"));
        console.log("guardarTodo error:", data);
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error guardando reparación");
    } finally {
      setSaving(false);
    }
  }

async function generarPDF() {
  try {
    setPrinting(true);

    const tokenHeaders = await authHeaders();
    const url = `${API}/mecanica/pdf/${idOrden}`;

    // nombre del archivo
    const fileName = `reporte_mecanica_${idOrden}_${Date.now()}.pdf`;

    // ubicación segura
    const fileUri = FileSystem.documentDirectory + fileName;

    const response = await fetch(url, {
      method: "GET",
      headers: tokenHeaders,
    });

    if (!response.ok) {
      throw new Error("No se pudo generar el PDF");
    }

    const blob = await response.blob();

    // convertir a base64
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result.split(",")[1];

      // guardar archivo
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("PDF guardado en:", fileUri);

      // compartir archivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("PDF generado", `Archivo guardado en:\n${fileUri}`);
      }
    };

    reader.readAsDataURL(blob);
  } catch (error) {
    console.log("Error generando PDF:", error);
    Alert.alert("Error", "No se pudo generar el PDF");
  } finally {
    setPrinting(false);
  }
}
  /** =========================
   *  UI helpers
   *  ========================= */
  function ToggleYesNo({ title, value, onChange }) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{title}</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, !value ? styles.chipOn : styles.chipOff]}
            onPress={() => onChange(false)}
          >
            <Text style={[styles.chipText, !value ? styles.chipTextOn : styles.chipTextOff]}>No</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, value ? styles.chipOn : styles.chipOff]}
            onPress={() => onChange(true)}
          >
            <Text style={[styles.chipText, value ? styles.chipTextOn : styles.chipTextOff]}>Sí</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!idOrden) {
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
        <Text style={{ marginTop: 10, fontWeight: "800" }}>Cargando módulo de mecánica…</Text>
      </View>
    );
  }

  const showPreventivo = tipoReparacion === "preventivo" || tipoReparacion === "ambos";
  const showCorrectivo = tipoReparacion === "correctivo" || tipoReparacion === "ambos";

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
      <View style={styles.header}>
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

        <Text style={styles.h1}>🔧 Módulo de Mecánica – Autoservicios</Text>
        <Text style={styles.h2}>Orden: #{idOrden}</Text>
      </View>

      {/* Acciones arriba (como web: regresar / finalizadas) */}
      <View style={styles.topButtons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnDark]}
          onPress={() => navigation?.navigate?.("HomeMecanica")}
        >
          <Text style={styles.btnText}>⬅ Regresar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnGray]}
          onPress={() => navigation?.navigate?.("MecanicaFinalizadas")}
        >
          <Text style={styles.btnText}>📄 Finalizadas</Text>
        </TouchableOpacity>
      </View>

      {/* Búsqueda inicial */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>📌 Búsqueda Inicial</Text>

        <Text style={styles.label}>Placa</Text>
        <TextInput style={styles.input} value={placa} onChangeText={setPlaca} placeholder="ABC1234" />

        <Text style={styles.label}>Cédula</Text>
        <TextInput style={styles.input} value={cedula} onChangeText={setCedula} placeholder="0102030405" keyboardType="numeric" />

        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary, { flex: 1 }]} onPress={buscarPlaca}>
            <Text style={styles.btnText}>Consultar Placa</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnGold, { flex: 1 }]} onPress={buscarCedula}>
            <Text style={styles.btnTextDark}>Consultar Cédula</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Datos generales */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>📌 Datos Generales del Servicio</Text>

        <Text style={styles.label}>Fecha de Revisión (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={fechaRevision} onChangeText={setFechaRevision} placeholder="2026-03-05" />

        <Text style={styles.label}>Cliente</Text>
        <TextInput style={styles.input} value={clienteNombre} onChangeText={setClienteNombre} placeholder="Nombre completo" />

        <Text style={styles.label}>Modelo del Carro</Text>
        <TextInput style={styles.input} value={modelo} onChangeText={setModelo} placeholder="Modelo" />

        <Text style={styles.label}>Número de Serie</Text>
        <TextInput style={styles.input} value={numeroSerie} onChangeText={setNumeroSerie} placeholder="Número de serie" />

        <Text style={styles.label}>Kilometraje / Horas Uso</Text>
        <TextInput style={styles.input} value={kmUso} onChangeText={setKmUso} placeholder="Ej: 120000" keyboardType="numeric" />

        <Text style={styles.label}>Marca</Text>
        <TextInput style={styles.input} value={marca} onChangeText={setMarca} placeholder="Marca" />

        <Text style={styles.label}>Año</Text>
        <TextInput style={styles.input} value={anio} onChangeText={setAnio} placeholder="Ej: 2018" keyboardType="numeric" />

        <Text style={styles.label}>Combustible</Text>
        <TextInput style={styles.input} value={combustible} onChangeText={setCombustible} placeholder="Gasolina / Diesel /..." />

        <Text style={styles.label}>Taller / Sucursal</Text>
        <TextInput style={styles.input} value={sucursal} onChangeText={setSucursal} placeholder="Sucursal" />

        <Text style={styles.label}>Técnico Responsable</Text>
        <TextInput style={styles.input} value={tecnico} onChangeText={setTecnico} placeholder="Técnico" />

        <Text style={styles.label}>Último Mantenimiento</Text>
        <TextInput style={styles.input} value={ultimoMant} onChangeText={setUltimoMant} placeholder="Ej: Cambio de aceite" />

        <Text style={styles.label}>Tipo de Reparación (informativo)</Text>
        <TextInput style={styles.input} value={subservicio} onChangeText={setSubservicio} placeholder="Subservicio" />

        <Text style={styles.label}>Observaciones Generales</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={observacionesGenerales}
          onChangeText={setObservacionesGenerales}
          placeholder="Observaciones generales"
          multiline
        />
      </View>

      {/* Preventivo */}
      {showPreventivo && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>🛡 Mantenimiento Preventivo</Text>
          <Text style={styles.muted}>Estado / Acción / Observaciones (igual a tu tabla web)</Text>

          {preventivoItems.map((it, i) => {
            const estados = ESTADOS[it.componente] || ["No aplica"];
            const acciones = ACCIONES[it.componente] || ["Revisión"];

            return (
              <View key={`${it.componente}-${i}`} style={styles.cardRow}>
                <Text style={styles.cardRowTitle}>{it.componente}</Text>

                <SimpleSelect
                  label="Estado"
                  value={it.estado}
                  options={estados}
                  onChange={(v) => setPreventivoField(i, { estado: v })}
                />

                <SimpleSelect
                  label="Acción"
                  value={it.accion}
                  options={acciones}
                  onChange={(v) => setPreventivoField(i, { accion: v })}
                />

                <Text style={styles.label}>Observaciones</Text>
                <TextInput
                  style={styles.input}
                  value={safeText(it.observaciones)}
                  onChangeText={(t) => setPreventivoField(i, { observaciones: t })}
                  placeholder="Observaciones"
                />
              </View>
            );
          })}
        </View>
      )}

      {/* Correctivo */}
      {showCorrectivo && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>⚠ Reparación Correctiva</Text>

          <Text style={styles.label}>Componente Afectado</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={correctivo.componente_afectado}
            onChangeText={(t) => setCorrectivo((p) => ({ ...p, componente_afectado: t }))}
            placeholder="Componente afectado"
            multiline
          />

          <Text style={styles.label}>Falla Reportada</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={correctivo.falla_reportada}
            onChangeText={(t) => setCorrectivo((p) => ({ ...p, falla_reportada: t }))}
            placeholder="Falla reportada"
            multiline
          />

          <Text style={styles.label}>Diagnóstico Técnico</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={correctivo.diagnostico_tecnico}
            onChangeText={(t) => setCorrectivo((p) => ({ ...p, diagnostico_tecnico: t }))}
            placeholder="Diagnóstico técnico"
            multiline
          />

          <Text style={styles.label}>Acción Realizada</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={correctivo.accion_realizada}
            onChangeText={(t) => setCorrectivo((p) => ({ ...p, accion_realizada: t }))}
            placeholder="Acción realizada"
            multiline
          />
        </View>
      )}

      {/* Piezas utilizadas */}
      <View style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>🔩 Piezas Utilizadas</Text>
          <TouchableOpacity style={[styles.btn, styles.btnSuccess, { paddingVertical: 10 }]} onPress={addPieza}>
            <Text style={styles.btnText}>➕ Añadir</Text>
          </TouchableOpacity>
        </View>

        {piezas.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.muted}>Sin piezas registradas</Text>
          </View>
        ) : (
          piezas.map((p, i) => (
            <View key={`pieza-${i}`} style={styles.cardRow}>
              <Text style={styles.cardRowTitle}>Pieza #{i + 1}</Text>

              <Text style={styles.label}>Pieza</Text>
              <TextInput
                style={styles.input}
                value={safeText(p.pieza)}
                onChangeText={(t) => updatePieza(i, { pieza: t })}
                placeholder="Nombre pieza"
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Cantidad</Text>
                  <TextInput
                    style={styles.input}
                    value={safeText(p.cantidad)}
                    onChangeText={(t) => updatePieza(i, { cantidad: Number(t || 0) })}
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Valor Unitario</Text>
                  <TextInput
                    style={styles.input}
                    value={safeText(p.valor_unitario)}
                    onChangeText={(t) => updatePieza(i, { valor_unitario: Number(t || 0) })}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={styles.totalLine}>
                <Text style={styles.totalLineText}>Total fila:</Text>
                <Text style={styles.totalLineValue}>${money(p.total)}</Text>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={[styles.btn, styles.btnSuccessAlt]} onPress={guardarPiezasSolo}>
          <Text style={styles.btnText}>💾 Guardar piezas</Text>
        </TouchableOpacity>
      </View>

      {/* Costos */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>💰 Costos del Servicio</Text>

        <Text style={styles.label}>Valor Proforma</Text>
        <TextInput style={[styles.input, styles.readonly]} value={money(valorProforma)} editable={false} />

        <Text style={styles.label}>Mano de Obra</Text>
        <TextInput
          style={styles.input}
          value={manoObra}
          onChangeText={setManoObra}
          keyboardType="numeric"
          placeholder="0"
        />

        <Text style={styles.label}>Repuestos</Text>
        <TextInput
          style={styles.input}
          value={repuestos}
          onChangeText={setRepuestos}
          keyboardType="numeric"
          placeholder="0"
        />

        <Text style={styles.label}>Consumibles</Text>
        <TextInput
          style={styles.input}
          value={consumibles}
          onChangeText={setConsumibles}
          keyboardType="numeric"
          placeholder="0"
        />

        <View style={styles.totalBox}>
          <Text style={styles.totalBoxLabel}>Total General</Text>
          <Text style={styles.totalBoxValue}>${totalGeneral}</Text>
        </View>

        <Text style={styles.muted}>
          * Total = (piezas) + mano_obra + consumibles + valor_proforma (igual a tu lógica web)
        </Text>
      </View>

      {/* Ajustes */}
      <ToggleYesNo
        title="⚙ ¿Se realizaron ajustes técnicos?"
        value={ajustesSi}
        onChange={(v) => {
          setAjustesSi(v);
          if (v) ensureAjustesBase();
          if (!v) setAjustes([]); // opcional: limpiar
        }}
      />

      {ajustesSi && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>🔧 Ajustes Realizados</Text>

          {ajustes.map((a, i) => (
            <View key={`ajuste-${i}`} style={styles.cardRow}>
              <Text style={styles.cardRowTitle}>{a.componente}</Text>

              <Text style={styles.label}>Valor Antes</Text>
              <TextInput
                style={styles.input}
                value={safeText(a.antes)}
                onChangeText={(t) => updateAjuste(i, { antes: t })}
                placeholder="Antes"
              />

              <Text style={styles.label}>Valor Ajustado</Text>
              <TextInput
                style={styles.input}
                value={safeText(a.ajustado)}
                onChangeText={(t) => updateAjuste(i, { ajustado: t })}
                placeholder="Ajustado"
              />

              <Text style={styles.label}>Valor Recomendado</Text>
              <TextInput
                style={styles.input}
                value={safeText(a.recomendado)}
                onChangeText={(t) => updateAjuste(i, { recomendado: t })}
                placeholder="Recomendado"
              />

              <Text style={styles.label}>Observaciones</Text>
              <TextInput
                style={styles.input}
                value={safeText(a.observaciones)}
                onChangeText={(t) => updateAjuste(i, { observaciones: t })}
                placeholder="Observaciones"
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={() =>
              setAjustes((prev) => [
                ...prev,
                { componente: `Ajuste ${prev.length + 1}`, antes: "", ajustado: "", recomendado: "", observaciones: "" },
              ])
            }
          >
            <Text style={styles.btnText}>➕ Añadir fila ajuste</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Daños */}
      <ToggleYesNo
        title="🛑 ¿Deseas registrar daños identificados adicionales?"
        value={danosSi}
        onChange={(v) => {
          setDanosSi(v);
          if (!v) {
            setDanos({
              componente: "",
              gravedad: "leve",
              descripcion: "",
              causa: "",
              urgente: "0",
              accion: "",
            });
          }
        }}
      />

      {danosSi && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>📛 Registro de Daños Identificados</Text>

          <Text style={styles.label}>Componente</Text>
          <TextInput style={styles.input} value={danos.componente} onChangeText={(t) => setDanos((p) => ({ ...p, componente: t }))} />

          <SimpleSelect
            label="Gravedad"
            value={danos.gravedad}
            options={["leve", "moderado", "grave"]}
            onChange={(v) => setDanos((p) => ({ ...p, gravedad: v }))}
          />

          <Text style={styles.label}>Descripción del daño</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={danos.descripcion}
            onChangeText={(t) => setDanos((p) => ({ ...p, descripcion: t }))}
            multiline
          />

          <Text style={styles.label}>Causa probable</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={danos.causa}
            onChangeText={(t) => setDanos((p) => ({ ...p, causa: t }))}
            multiline
          />

          <SimpleSelect
            label="Urgente"
            value={danos.urgente === "1" ? "Sí" : "No"}
            options={["No", "Sí"]}
            onChange={(v) => setDanos((p) => ({ ...p, urgente: v === "Sí" ? "1" : "0" }))}
          />

          <Text style={styles.label}>Acción recomendada</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={danos.accion}
            onChangeText={(t) => setDanos((p) => ({ ...p, accion: t }))}
            multiline
          />
        </View>
      )}

      {/* Botones final (como web) */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnBig, styles.btnSuccess, saving && { opacity: 0.7 }]}
          onPress={guardarTodo}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? "Guardando..." : "💾 Guardar"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnBig, styles.btnGray, printing && { opacity: 0.7 }]}
          onPress={generarPDF}
          disabled={printing}
        >
          <Text style={styles.btnText}>{printing ? "Generando..." : "📄 Generar PDF"}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: Platform.OS === "ios" ? 18 : 10 }} />
    </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** =========================
 *  Estilos pro (parecido al web)
 *  ========================= */
const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: "#f4f6f9" },
  keyboardRoot: { flex: 1 },
  container: { flex: 1, backgroundColor: "#f4f6f9", padding: 16 },

  header: { marginBottom: 12 },
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
  h1: { fontSize: 20, fontWeight: "900", color: "#111d4d" },
  h2: { marginTop: 4, fontWeight: "800", color: "#6b7280" },

  topButtons: { flexDirection: "row", gap: 10, marginBottom: 12 },

  panel: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 6,
    borderLeftColor: "#111d4d",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  panelHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  panelTitle: { fontSize: 16, fontWeight: "900", color: "#111d4d", marginBottom: 10 },

  label: { fontSize: 12, fontWeight: "900", color: "#111d4d", marginBottom: 6 },
  muted: { color: "#6b7280", fontWeight: "700", marginBottom: 8 },

  input: {
    backgroundColor: "#f2f4f8",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e6eaf0",
    fontWeight: "800",
    color: "#111827",
  },

  textArea: { height: 90, textAlignVertical: "top" },
  readonly: { opacity: 0.85 },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },

  btn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  btnBig: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: { color: "#fff", fontWeight: "900" },
  btnTextDark: { color: "#111d4d", fontWeight: "900" },

  btnPrimary: { backgroundColor: "#111d4d" },
  btnSuccess: { backgroundColor: "#198754" },
  btnSuccessAlt: { backgroundColor: "#16a34a" },
  btnGray: { backgroundColor: "#4b5563" },
  btnDark: { backgroundColor: "#111827" },
  btnGold: { backgroundColor: "#debb3c" },

  cardRow: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6eaf0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  cardRowTitle: { fontWeight: "900", color: "#111d4d", marginBottom: 10 },

  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#eef2f7",
  },
  totalLineText: { fontWeight: "800", color: "#6b7280" },
  totalLineValue: { fontWeight: "900", color: "#111d4d" },

  totalBox: {
    backgroundColor: "#111d4d",
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    marginBottom: 6,
  },
  totalBoxLabel: { color: "#cbd5e1", fontWeight: "900" },
  totalBoxValue: { color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 4 },

  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  chipOn: { backgroundColor: "#111d4d", borderColor: "#111d4d" },
  chipOff: { backgroundColor: "#fff", borderColor: "#e6eaf0" },
  chipText: { fontWeight: "900" },
  chipTextOn: { color: "#fff" },
  chipTextOff: { color: "#111d4d" },

  selectBox: {
    backgroundColor: "#f2f4f8",
    borderWidth: 1,
    borderColor: "#e6eaf0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  selectLabel: { fontSize: 12, fontWeight: "900", color: "#111d4d" },
  selectValue: { marginTop: 4, fontWeight: "900", color: "#111827" },

  emptyBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e6eaf0",
    alignItems: "center",
  },

  footer: { gap: 10, marginTop: 6 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

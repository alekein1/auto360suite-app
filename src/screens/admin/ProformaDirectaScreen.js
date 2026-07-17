import React, { useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API = "https://api360suite.pqautoexpert.ec/api";

const SUBSERVICIOS_FIJOS = [
  { id: 11, nombre: "Verificacion de Series", service_id: 2 },
  { id: 12, nombre: "Historial Vehicular", service_id: 2 },
  { id: 13, nombre: "Certificado Unico Vehicular", service_id: 2 },
  { id: 14, nombre: "Constancia", service_id: 2 },
  { id: 15, nombre: "Legalizacion de Contratos", service_id: 2 },
  { id: 50, nombre: "Revision Precompra", service_id: 3 },
];

function money(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
}

function sanitizePhoneForWhatsapp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("593")) return digits;
  if (digits.length === 10 && digits.startsWith("0")) return `593${digits.slice(1)}`;
  if (digits.length === 9) return `593${digits}`;

  return digits;
}

export default function ProformaDirectaScreen() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [facturacionElectronica, setFacturacionElectronica] = useState("NO");
  const [correoFacturacion, setCorreoFacturacion] = useState("");

  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("");
  const [pais, setPais] = useState("");

  const [personas, setPersonas] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [subservicioSeleccionado, setSubservicioSeleccionado] = useState(null);

  const [itemDesc, setItemDesc] = useState("");
  const [itemCant, setItemCant] = useState("1");
  const [itemPrecio, setItemPrecio] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const t = await SecureStore.getItemAsync("token");

      if (!t) {
        Alert.alert("Sesion expirada", "Vuelva a iniciar sesion");
        return;
      }

      setToken(t);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo recuperar la sesion");
    } finally {
      setLoading(false);
    }
  }

  function authHeaders(contentType = true) {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    if (contentType) headers["Content-Type"] = "application/json";

    return headers;
  }

  async function buscarPersonaBD(text) {
    setClienteBusqueda(text);

    if (!token) return;

    const query = text.trim();

    if (query.length < 3) {
      setPersonas([]);
      setShowDropdown(false);
      return;
    }

    try {
      const res = await fetch(`${API}/proformadir/buscar/${encodeURIComponent(query)}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      const resultados = data?.resultados || [];

      setPersonas(resultados);
      setShowDropdown(resultados.length > 0);
    } catch (e) {
      console.log(e);
      setPersonas([]);
      setShowDropdown(false);
    }
  }

  function seleccionarPersona(p) {
    setClienteBusqueda(`${p?.nombres || ""} ${p?.apellidos || ""}`.trim() || String(p?.cedula || ""));
    setCedula(String(p?.cedula || ""));
    setNombre(String(p?.nombres || ""));
    setApellido(String(p?.apellidos || ""));
    setTelefono(String(p?.telefono || ""));
    setDireccion(String(p?.direccion || ""));
    setShowDropdown(false);
  }

  async function buscarCedula() {
    const ced = cedula.trim();

    if (ced.length < 10) {
      Alert.alert("Atencion", "Ingrese una cedula valida");
      return;
    }

    try {
      const res = await fetch(`${API}/proformadir/consultar/cedula/${encodeURIComponent(ced)}`, {
        headers: authHeaders(),
      });
      const data = await res.json();

      if (!data?.ok) {
        Alert.alert("Aviso", "Error consultando datos");
        return;
      }

      setNombre(String(data?.nombres || ""));
      setApellido(String(data?.apellidos || ""));

      if (data?.registrado) {
        setTelefono(String(data?.telefono || ""));
        setDireccion(String(data?.direccion || ""));
        Alert.alert("Cliente encontrado", "Cliente cargado desde el sistema");
        return;
      }

      Alert.alert("Consulta exitosa", "Datos obtenidos del Registro Civil");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo consultar la cedula");
    }
  }

  async function buscarVehiculo() {
    const placaConsulta = placa.trim().toUpperCase();

    if (!placaConsulta) {
      Alert.alert("Atencion", "Ingrese una placa");
      return;
    }

    try {
      const res = await fetch(`${API}/proformadir/consultar/vehiculo/${encodeURIComponent(placaConsulta)}`, {
        headers: authHeaders(),
      });
      const data = await res.json();

      if (!data?.ok) {
        Alert.alert("Aviso", "No se encontro informacion del vehiculo");
        return;
      }

      setPlaca(placaConsulta);
      setMarca(String(data?.vehiculo?.marca || ""));
      setModelo(String(data?.vehiculo?.modelo || ""));
      setAnio(String(data?.vehiculo?.anio || ""));
      setPais(String(data?.vehiculo?.pais || ""));

      Alert.alert("Vehiculo encontrado", "Los datos del vehiculo fueron cargados");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo consultar la placa");
    }
  }

  function agregarItem() {
    if (!subservicioSeleccionado) {
      Alert.alert("Atencion", "Seleccione primero un subservicio");
      return;
    }

    const descripcionItem = itemDesc.trim() || subservicioSeleccionado.nombre;
    const cantidad = Number(itemCant);
    const precioUnitario = Number(itemPrecio);

    if (!descripcionItem || !cantidad || precioUnitario <= 0) {
      Alert.alert("Atencion", "Complete cantidad y precio");
      return;
    }

    const nuevoItem = {
      id_service: subservicioSeleccionado.service_id,
      id_subservice: subservicioSeleccionado.id,
      subservicio_nombre: subservicioSeleccionado.nombre,
      descripcion: descripcionItem,
      cantidad,
      precio_unitario: precioUnitario,
      total: cantidad * precioUnitario,
    };

    setItems((prev) => [...prev, nuevoItem]);
    setItemDesc(subservicioSeleccionado.nombre);
    setItemCant("1");
    setItemPrecio("");
  }

  function eliminarItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function limpiarItems() {
    setItems([]);
    setItemDesc("");
    setItemCant("1");
    setItemPrecio("");
  }

  function limpiarServicioActual() {
    setSubservicioSeleccionado(null);
    setDescripcion("");
    setItemDesc("");
    setItemCant("1");
    setItemPrecio("");
  }

  function limpiarTodo() {
    setClienteBusqueda("");
    setCedula("");
    setNombre("");
    setApellido("");
    setTelefono("");
    setDireccion("");
    setDescripcion("");
    setFacturacionElectronica("NO");
    setCorreoFacturacion("");
    setPlaca("");
    setMarca("");
    setModelo("");
    setAnio("");
    setPais("");
    setPersonas([]);
    setShowDropdown(false);
    setSubservicioSeleccionado(null);
    limpiarItems();
  }

  function crearOtroServicio() {
    limpiarServicioActual();
    Alert.alert("Listo", "Seleccione otro subservicio y agregue su costo al mismo ticket");
  }

  function confirmar(titulo, mensaje) {
    return new Promise((resolve) => {
      Alert.alert(titulo, mensaje, [
        { text: "No", style: "cancel", onPress: () => resolve(false) },
        { text: "Si", onPress: () => resolve(true) },
      ]);
    });
  }

  async function enviarTicketWhatsappBackend(idOrden) {
    const res = await fetch(`${API}/proformadir/tickets/turno/${idOrden}/whatsapp`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ telefono }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      throw new Error(data?.mensaje || "No se pudo enviar el ticket por WhatsApp");
    }

    return data;
  }

  async function procesarFacturaSri(idFactura, correoDestino = "") {
    const res = await fetch(`${API}/factura/sri/procesar/${idFactura}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        correo_destino: correoDestino,
        enviar_correo: Boolean(correoDestino),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      throw new Error(data?.mensaje || "No se pudo autorizar la factura en el SRI");
    }

    return data;
  }

  async function enviarRideFacturaWhatsapp(idFactura) {
    const res = await fetch(`${API}/factura/sri/ride/${idFactura}/whatsapp`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ telefono }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      throw new Error(data?.mensaje || "No se pudo enviar el RIDE por WhatsApp");
    }

    return data;
  }

  async function compartirTicketPorWhatsApp({ idOrden, ticketUrl }) {
    const message = [
      "Hola, comparto el ticket generado en Auto360 Suite.",
      `Orden #${idOrden}`,
      ticketUrl,
    ].join("\n");

    try {
      await enviarTicketWhatsappBackend(idOrden);
      return true;
    } catch (e) {
      console.log(e);

      try {
        await Share.share({ message });
        return true;
      } catch (shareError) {
        console.log(shareError);
        Alert.alert("Aviso", "La proforma se creo, pero no se pudo abrir WhatsApp");
        return false;
      }
    }
  }

  async function guardarProforma() {
    if (!items.length) {
      Alert.alert("Atencion", "Agregue al menos un subservicio con costo");
      return;
    }

    if (facturacionElectronica === "SI" && !correoFacturacion.trim()) {
      Alert.alert("Atencion", "Ingrese el correo para enviar la factura electronica");
      return;
    }

    if (facturacionElectronica === "SI" && !telefono.trim()) {
      const continuar = await confirmar(
        "Telefono no ingresado",
        "Sin telefono no se podra enviar el RIDE por WhatsApp. Desea continuar?"
      );

      if (!continuar) {
        return;
      }
    }

    try {
      setSaving(true);

      const subserviciosMap = new Map();

      items.forEach((item) => {
        const key = `${item.id_service}-${item.id_subservice}`;
        if (!subserviciosMap.has(key)) {
          subserviciosMap.set(key, {
            id_service: item.id_service,
            id_subservice: item.id_subservice,
            items: [],
          });
      }

      subserviciosMap.get(key).items.push({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
      });
    });

      const subservicios = Array.from(subserviciosMap.values());
      const principal = subservicios[0];

      const body = {
        nombre_cliente: nombre,
        apellido_cliente: apellido,
        telefono_cliente: telefono,
        direccion,
        placa,
        numero_cedula: cedula,
        id_service: principal.id_service,
        id_subservice: principal.id_subservice,
        descripcion,
        facturacion_electronica: facturacionElectronica,
        correo_facturacion: correoFacturacion.trim(),
        subservicios,
        datos_vehiculo: {
          marca,
          modelo,
          anio,
          pais,
        },
      };

      const res = await fetch(`${API}/proformadir`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        Alert.alert("Error", data?.error || "No se pudo crear la proforma");
        return;
      }

      const idOrden = data?.orden_trabajo?.id_orden;
      const ticketUrl = idOrden
        ? `${API}/proformadir/tickets/turno/${idOrden}`
        : null;

      if (ticketUrl) {
        const enviarTicket = await confirmar(
          "Enviar ticket",
          "Desea enviar el ticket al WhatsApp del cliente?"
        );

        if (enviarTicket) {
          await compartirTicketPorWhatsApp({ idOrden, ticketUrl });
        }
      }

      if (data?.factura_electronica?.id_factura) {
        const idFactura = data.factura_electronica.id_factura;
        const correoDestino = data.factura_electronica.correo || correoFacturacion.trim();

        Alert.alert("SRI", "La factura electronica queda procesandose en segundo plano.");

        procesarFacturaSri(idFactura, correoDestino)
          .then(async () => {
            const enviarRide = await confirmar(
              "Factura autorizada",
              "Desea enviar el RIDE al WhatsApp del cliente?"
            );

            if (!enviarRide) return;

            try {
              await enviarRideFacturaWhatsapp(idFactura);
              Alert.alert("WhatsApp", "RIDE enviado por WhatsApp correctamente");
            } catch (whatsappError) {
              Alert.alert("WhatsApp", whatsappError?.message || "No se pudo enviar el RIDE por WhatsApp");
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }

      limpiarTodo();
      Alert.alert("Exito", "Proforma creada correctamente");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo crear la proforma");
    } finally {
      setSaving(false);
    }
  }

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item?.total || 0), 0),
    [items]
  );

  const resumenSubservicios = useMemo(() => {
    const resumen = new Map();

    items.forEach((item) => {
      const key = `${item.id_service}-${item.id_subservice}`;
      if (!resumen.has(key)) {
        resumen.set(key, {
          nombre: item.subservicio_nombre || "Subservicio",
          items: 0,
          cantidad: 0,
          total: 0,
        });
      }

      const group = resumen.get(key);
      group.items += 1;
      group.cantidad += Number(item.cantidad || 0);
      group.total += Number(item.total || 0);
    });

    return Array.from(resumen.values());
  }, [items]);

  const totalServicios = useMemo(
    () => new Set(items.map((item) => item.id_service).filter(Boolean)).size,
    [items]
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text style={styles.loadingText}>Cargando formulario...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <Text style={styles.title}>Crear Proforma Directa</Text>
          <Text style={styles.subtitle}>
            Cree ticket, proforma y orden desde una sola pantalla.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos del Cliente</Text>

          <Text style={styles.label}>Buscar cliente</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              value={clienteBusqueda}
              onChangeText={buscarPersonaBD}
              placeholder="Ingrese cédula, RUC, nombre o apellido"
              autoCapitalize="words"
            />
            <TouchableOpacity style={styles.btnPrimarySmall} onPress={buscarCedula}>
              <Text style={styles.btnPrimaryText}>Cédula</Text>
            </TouchableOpacity>
          </View>

          {showDropdown && personas.length > 0 && (
            <View style={styles.dropdown}>
              {personas.map((p) => (
                <TouchableOpacity
                  key={String(p.id)}
                  style={styles.dropdownItem}
                  onPress={() => seleccionarPersona(p)}
                >
                  <Text style={styles.dropdownTitle}>
                    {p.cedula} - {p.nombres} {p.apellidos}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.helperText}>
            Puede buscar clientes por cédula, RUC, nombre o apellido. El botón `Cédula` consulta el Registro Civil usando la cédula ingresada.
          </Text>

          <Text style={styles.label}>Cedula o RUC</Text>
          <TextInput
            style={styles.input}
            value={cedula}
            onChangeText={setCedula}
            placeholder="Ingrese cédula o RUC para consultar"
            keyboardType="numeric"
          />

          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput style={styles.input} value={nombre} onChangeText={setNombre} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Apellido</Text>
              <TextInput style={styles.input} value={apellido} onChangeText={setApellido} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>Telefono</Text>
              <TextInput
                style={styles.input}
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Direccion</Text>
              <TextInput style={styles.input} value={direccion} onChangeText={setDireccion} />
            </View>
          </View>

          <Text style={styles.label}>Descripcion</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Detalle adicional de la orden..."
            multiline
          />

          <Text style={styles.label}>Facturacion electronica</Text>
          <View style={styles.segmentRow}>
            {["NO", "SI"].map((option) => {
              const selected = facturacionElectronica === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
                  onPress={() => setFacturacionElectronica(option)}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                    {option === "SI" ? "Si" : "No"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {facturacionElectronica === "SI" && (
            <>
              <Text style={styles.label}>Correo para comprobante</Text>
              <TextInput
                style={styles.input}
                value={correoFacturacion}
                onChangeText={setCorreoFacturacion}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="cliente@correo.com"
              />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos del Vehiculo</Text>

          <Text style={styles.label}>Placa</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              value={placa}
              onChangeText={(v) => setPlaca(v.toUpperCase())}
              placeholder="Ej: ABC1234"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.btnPrimarySmall} onPress={buscarVehiculo}>
              <Text style={styles.btnPrimaryText}>Consultar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>Marca</Text>
              <TextInput style={styles.input} value={marca} onChangeText={setMarca} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Modelo</Text>
              <TextInput style={styles.input} value={modelo} onChangeText={setModelo} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>Ano</Text>
              <TextInput
                style={styles.input}
                value={anio}
                onChangeText={setAnio}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Pais</Text>
              <TextInput style={styles.input} value={pais} onChangeText={setPais} />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Subservicios</Text>
          <Text style={styles.helperText}>
            Seleccione un subservicio, agregue su costo y repita si la orden incluye mas servicios.
          </Text>

          <View style={styles.subservicesWrap}>
            {SUBSERVICIOS_FIJOS.map((sub) => {
              const selected = subservicioSeleccionado?.id === sub.id;
              const hasItems = items.some((item) => Number(item.id_subservice) === Number(sub.id));

              return (
                <TouchableOpacity
                  key={sub.id}
                  style={[
                    styles.subserviceBtn,
                    hasItems && styles.subserviceBtnWithItems,
                    selected && styles.subserviceBtnActive,
                  ]}
                  onPress={() => {
                    setSubservicioSeleccionado(sub);
                    setItemDesc(sub.nombre);
                    setItemCant("1");
                  }}
                >
                  <Text
                    style={[
                      styles.subserviceBtnText,
                      selected && styles.subserviceBtnTextActive,
                    ]}
                  >
                    {sub.nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Items</Text>
            <Text style={styles.totalPill}>Total {money(total)} USD</Text>
          </View>
          <Text style={styles.helperText}>
            Activo: {subservicioSeleccionado?.nombre || "Seleccione un subservicio"}
          </Text>

          <Text style={styles.label}>Descripcion del item</Text>
          <TextInput
            style={styles.input}
            value={itemDesc}
            onChangeText={setItemDesc}
            placeholder="Ej: Revision documental"
          />

          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>Cantidad</Text>
              <TextInput
                style={styles.input}
                value={itemCant}
                onChangeText={setItemCant}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>Precio unitario</Text>
              <TextInput
                style={styles.input}
                value={itemPrecio}
                onChangeText={setItemPrecio}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={agregarItem}>
            <Text style={styles.btnPrimaryText}>Anadir item</Text>
          </TouchableOpacity>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Subservicios</Text>
              <Text style={styles.metricValue}>{resumenSubservicios.length}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Items</Text>
              <Text style={styles.metricValue}>{items.length}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Areas</Text>
              <Text style={styles.metricValue}>{totalServicios}</Text>
            </View>
          </View>

          <View style={styles.summaryList}>
            {resumenSubservicios.map((group) => (
              <View key={group.nombre} style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{group.nombre}</Text>
                <Text style={styles.summaryText}>
                  {group.items} item(s) · Cantidad {group.cantidad} · {money(group.total)} USD
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.itemsList}>
            {items.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Todavia no hay items agregados.</Text>
              </View>
            ) : (
              items.map((item, index) => (
                <View key={`${item.descripcion}-${index}`} style={styles.itemRow}>
                  <View style={styles.flex}>
                    <Text style={styles.itemTitle}>{item.descripcion}</Text>
                    <Text style={styles.itemService}>{item.subservicio_nombre}</Text>
                    <Text style={styles.itemMeta}>
                      {item.cantidad} x {money(item.precio_unitario)} = {money(item.total)} USD
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => eliminarItem(index)}
                  >
                    <Text style={styles.deleteBtnText}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.btnPrimary, saving && styles.btnDisabled]}
            onPress={guardarProforma}
            disabled={saving}
          >
            <Text style={styles.btnPrimaryText}>
              {saving ? "Guardando..." : "Crear proforma"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={crearOtroServicio}>
            <Text style={styles.btnSecondaryText}>Anadir otro subservicio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  content: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 28,
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
    fontWeight: "700",
  },
  headerCard: {
    backgroundColor: "#111d4d",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 6,
    color: "#d9e0ff",
    fontWeight: "600",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: {
    color: "#111d4d",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  totalPill: {
    backgroundColor: "#fff4cc",
    color: "#6d5200",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "900",
    overflow: "hidden",
  },
  helperText: {
    marginTop: 6,
    color: "#667085",
    fontWeight: "600",
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    color: "#111827",
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe2ea",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#111827",
    fontWeight: "600",
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dbe2ea",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  segmentBtnActive: {
    backgroundColor: "#111d4d",
    borderColor: "#111d4d",
  },
  segmentText: {
    color: "#111d4d",
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#fff",
  },
  btnPrimary: {
    marginTop: 14,
    backgroundColor: "#111d4d",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimarySmall: {
    backgroundColor: "#111d4d",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 96,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },
  btnSecondary: {
    marginTop: 10,
    backgroundColor: "#f0b429",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    color: "#111827",
    fontWeight: "900",
    textAlign: "center",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#dbe2ea",
    borderRadius: 12,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f6",
    backgroundColor: "#fff",
  },
  dropdownTitle: {
    color: "#111827",
    fontWeight: "700",
  },
  subservicesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  subserviceBtn: {
    borderWidth: 2,
    borderColor: "#dbe2ea",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: "47%",
  },
  subserviceBtnActive: {
    backgroundColor: "#111d4d",
    borderColor: "#111d4d",
  },
  subserviceBtnWithItems: {
    borderColor: "#f0b429",
    backgroundColor: "#fffaf0",
  },
  subserviceBtnText: {
    color: "#111d4d",
    fontWeight: "900",
    textAlign: "center",
  },
  subserviceBtnTextActive: {
    color: "#fff",
  },
  itemsList: {
    marginTop: 14,
    gap: 10,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dbe2ea",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#f8fbff",
  },
  metricLabel: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "800",
  },
  metricValue: {
    marginTop: 4,
    color: "#111d4d",
    fontSize: 18,
    fontWeight: "900",
  },
  summaryList: {
    marginTop: 12,
    gap: 8,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#dbe2ea",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fbfcff",
  },
  summaryTitle: {
    color: "#111d4d",
    fontWeight: "900",
  },
  summaryText: {
    marginTop: 3,
    color: "#667085",
    fontWeight: "700",
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
    fontWeight: "700",
    textAlign: "center",
  },
  itemRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#fafbfd",
  },
  itemTitle: {
    color: "#111827",
    fontWeight: "900",
  },
  itemService: {
    marginTop: 3,
    color: "#111d4d",
    fontWeight: "800",
  },
  itemMeta: {
    marginTop: 4,
    color: "#667085",
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteBtnText: {
    color: "#b91c1c",
    fontWeight: "900",
  },
  actionsRow: {
    marginTop: 4,
  },
});

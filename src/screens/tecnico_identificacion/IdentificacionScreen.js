import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator
} from 'react-native';

import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';

const API = 'https://api360suite.pqautoexpert.ec/api';

const TIPOS_FOTOS = [
  { tipo: 'vehiculo', nombre: 'Vehículo' },
  { tipo: 'motor', nombre: 'Motor' },
  { tipo: 'chasis', nombre: 'Chasis' },
  { tipo: 'plaquilla_referencial', nombre: 'Plaquilla Referencial' },
  { tipo: 'placa_vin', nombre: 'Placa VIN' },
  { tipo: 'adhesivo_seguridad', nombre: 'Adhesivo Seguridad' },
  { tipo: 'lectura_ecu', nombre: 'Lectura ECU' }
];

export default function IdentificacionScreen({ route, navigation }) {
  const { id_orden } = route.params;

  const [loading, setLoading] = useState(true);

  const [placa, setPlaca] = useState('');
  const [cedula, setCedula] = useState('');
  const [cedulaDueno, setCedulaDueno] = useState('');

  const [observaciones, setObservaciones] = useState('');
  const [conclusiones, setConclusiones] = useState('');

  const [vehiculo, setVehiculo] = useState(null);
  const [vehiculoManual, setVehiculoManual] = useState(false);

  const [fotos, setFotos] = useState([]);

  // ===================== NUEVOS STATES =====================
  const [cliente, setCliente] = useState({
    nombres: '',
    apellidos: '',
    telefono: '',
    direccion: ''
  });

  const [vehiculoManualData, setVehiculoManualData] = useState({
    placa: '',
    marca: '',
    modelo: '',
    anio: '',
    pais_origen: '',
    numero_motor: '',
    numero_chasis: '',
    manual: true
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const auth = async () => ({
    Authorization: `Bearer ${await SecureStore.getItemAsync('token')}`
  });

  // ===================== CONTACTO DESDE TICKET =====================
  async function cargarContactoTicket() {
    const r = await fetch(`${API}/identificacion/contacto/${id_orden}`, {
      headers: await auth()
    });
    const d = await r.json();

    if (d.ok && d.persona) {
      setCliente({
        nombres: d.persona.nombres || '',
        apellidos: d.persona.apellidos || '',
        telefono: d.persona.telefono || '',
        direccion: d.persona.direccion || ''
      });
    }
  }

  // ===================== CARGAR BD =====================
  async function cargarDatos() {
    await cargarContactoTicket();

    const r = await fetch(`${API}/identificacion/${id_orden}`, {
      headers: await auth()
    });

    const d = await r.json();

    setPlaca(d.placa ?? '');
    setCedula(d.cedula ?? '');
    setObservaciones(d.observaciones ?? '');
    setConclusiones(d.conclusiones ?? '');

    if (d.datos_vehiculo) {
      const v = JSON.parse(d.datos_vehiculo);
      setVehiculo(v);
      setVehiculoManual(v.manual === true);
      setVehiculoManualData(v);
    }

    setFotos(d.fotos_detalle || []);
    setLoading(false);
  }

  // ===================== ANT =====================
  async function consultarANT() {
    if (!placa) return Alert.alert('Ingrese la placa');

    const r = await fetch(`${API}/identificacion/consultar/ant/${placa}`, {
      headers: await auth()
    });

    const d = await r.json();

    if (!d.ok || !d.vehiculo) {
      Alert.alert('No se encontró el vehículo, ingrese los datos manualmente');
      setVehiculoManual(true);
      setVehiculoManualData({ ...vehiculoManualData, placa, manual: true });
      return;
    }

    setVehiculoManual(false);
    setVehiculo(d.vehiculo);

    if (d.propietario?.cedula) {
      setCedulaDueno(d.propietario.cedula);
    }
  }

  // ===================== FOTO =====================
  async function tomarFoto(tipo) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;

    const img = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (img.canceled) return;

    const form = new FormData();
    form.append('foto', {
      uri: img.assets[0].uri,
      name: `${Date.now()}.jpg`,
      type: 'image/jpeg'
    });
    form.append('descripcion', '');

    await fetch(`${API}/identificacion/${id_orden}/foto/${tipo}`, {
      method: 'POST',
      headers: await auth(),
      body: form
    });

    cargarDatos();
  }

  async function guardarDescripcionFoto(id, descripcion) {
    await fetch(`${API}/identificacion/foto-detalle/${id}`, {
      method: 'PUT',
      headers: {
        ...(await auth()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ descripcion })
    });
  }

  // ===================== GUARDAR =====================
  async function guardar() {
    const payload = {
      placa,
      cedula,
      observaciones,
      datos_cedula: {
        nombre: `${cliente.nombres} ${cliente.apellidos}`.trim(),
        telefono_manual: cliente.telefono,
        direccion_manual: cliente.direccion
      },
      datos_vehiculo: vehiculoManual ? vehiculoManualData : vehiculo
    };

    await fetch(`${API}/identificacion/${id_orden}`, {
      method: 'PUT',
      headers: {
        ...(await auth()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    Alert.alert('Datos guardados');
  }

  // ===================== FINALIZAR =====================
  async function finalizar() {
    await fetch(`${API}/identificacion/finalizar/${id_orden}`, {
      method: 'PUT',
      headers: {
        ...(await auth()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conclusiones })
    });

    Alert.alert(
      'Finalizado',
      'Seleccione una opción',
      [
        { text: '📄 Ver PDF', onPress: imprimir },
        { text: '📋 Identificaciones', onPress: () => navigation.navigate('Identificaciones') },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  }

  // ===================== PDF =====================
  async function imprimir() {
    const token = await SecureStore.getItemAsync('token');
    Linking.openURL(`${API}/identificacion/pdf/${id_orden}?token=${token}`);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>🔍 Verificación de Series</Text>

      <TextInput style={styles.input} value={placa} onChangeText={setPlaca} placeholder="Placa" />
      <TextInput style={styles.input} value={cedula} onChangeText={setCedula} placeholder="Cédula solicitante" />
      <TextInput style={styles.input} value={cedulaDueno} onChangeText={setCedulaDueno} placeholder="Cédula dueño" />

      <TouchableOpacity style={styles.btnDanger} onPress={consultarANT}>
        <Text style={styles.btnText}>Consultar ANT</Text>
      </TouchableOpacity>

      {/* DATOS DEL CLIENTE */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>🧑 Datos del Solicitante</Text>
        <Text>Nombres: {cliente.nombres}</Text>
        <Text>Apellidos: {cliente.apellidos}</Text>
        <Text>Teléfono: {cliente.telefono}</Text>
        <Text>Dirección: {cliente.direccion}</Text>
      </View>

      {/* VEHÍCULO */}
      {vehiculo && !vehiculoManual && (
        <View style={styles.card}>
          <Text>Marca: {vehiculo.marca}</Text>
          <Text>Modelo: {vehiculo.modelo}</Text>
          <Text>Año: {vehiculo.anio}</Text>
          <Text>Motor: {vehiculo.numero_motor}</Text>
          <Text>Chasis: {vehiculo.numero_chasis}</Text>
        </View>
      )}

      {/* VEHÍCULO MANUAL */}
      {vehiculoManual && (
        <View style={styles.card}>
          <Text style={styles.subtitle}>⚠ Ingreso Manual del Vehículo</Text>

          <TextInput style={styles.input} placeholder="Marca"
            value={vehiculoManualData.marca}
            onChangeText={v => setVehiculoManualData({ ...vehiculoManualData, marca: v })}
          />
          <TextInput style={styles.input} placeholder="Modelo"
            value={vehiculoManualData.modelo}
            onChangeText={v => setVehiculoManualData({ ...vehiculoManualData, modelo: v })}
          />
          <TextInput style={styles.input} placeholder="Año"
            value={vehiculoManualData.anio}
            onChangeText={v => setVehiculoManualData({ ...vehiculoManualData, anio: v })}
          />
          <TextInput style={styles.input} placeholder="País de Origen"
            value={vehiculoManualData.pais_origen}
            onChangeText={v => setVehiculoManualData({ ...vehiculoManualData, pais_origen: v })}
          />
          <TextInput style={styles.input} placeholder="Número de Motor"
            value={vehiculoManualData.numero_motor}
            onChangeText={v => setVehiculoManualData({ ...vehiculoManualData, numero_motor: v })}
          />
          <TextInput style={styles.input} placeholder="Número de Chasis"
            value={vehiculoManualData.numero_chasis}
            onChangeText={v => setVehiculoManualData({ ...vehiculoManualData, numero_chasis: v })}
          />
        </View>
      )}

      <Text style={styles.subtitle}>📸 Fotografías Obligatorias</Text>

      {TIPOS_FOTOS.map(f => (
        <View key={f.tipo} style={styles.card}>
          <Text style={styles.photoTitle}>{f.nombre}</Text>

          {fotos.filter(x => x.tipo === f.tipo).map(photo => (
            <View key={photo.id}>
              <Image
                source={{ uri: `https://api360suite.pqautoexpert.ec${photo.path}` }}
                style={styles.preview}
              />
              <TextInput
                style={styles.input}
                placeholder="Descripción"
                defaultValue={photo.descripcion}
                onEndEditing={e =>
                  guardarDescripcionFoto(photo.id, e.nativeEvent.text)
                }
              />
            </View>
          ))}

          <TouchableOpacity style={styles.btnPrimary} onPress={() => tomarFoto(f.tipo)}>
            <Text style={styles.btnText}>Tomar foto</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TextInput
        style={[styles.input, { height: 90 }]}
        value={observaciones}
        onChangeText={setObservaciones}
        placeholder="Observaciones"
        multiline
      />

      <TextInput
        style={[styles.input, { height: 90 }]}
        value={conclusiones}
        onChangeText={setConclusiones}
        placeholder="Conclusiones"
        multiline
      />

      <TouchableOpacity style={styles.btnSuccess} onPress={guardar}>
        <Text style={styles.btnText}>Guardar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnOutline} onPress={finalizar}>
        <Text style={styles.btnTextDark}>Finalizar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnPrimary} onPress={imprimir}>
        <Text style={styles.btnText}>Imprimir PDF</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ===================== STYLES =====================
const styles = StyleSheet.create({
  container:{ padding:20, backgroundColor:'#f5f5f5' },
  title:{ fontSize:22, fontWeight:'bold', marginBottom:15 },
  subtitle:{ fontSize:18, fontWeight:'bold', marginVertical:10 },
  photoTitle:{ fontWeight:'bold', marginBottom:5 },
  input:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:10 },
  card:{ backgroundColor:'#fff', padding:15, borderRadius:10, marginVertical:10 },
  btnPrimary:{ backgroundColor:'#111d4d', padding:14, borderRadius:10, marginVertical:6 },
  btnDanger:{ backgroundColor:'#c40000', padding:14, borderRadius:10, marginVertical:6 },
  btnSuccess:{ backgroundColor:'#198754', padding:14, borderRadius:10, marginVertical:6 },
  btnOutline:{ borderWidth:2, borderColor:'#198754', padding:14, borderRadius:10, marginVertical:6 },
  btnText:{ color:'#fff', textAlign:'center', fontWeight:'bold' },
  btnTextDark:{ color:'#198754', textAlign:'center', fontWeight:'bold' },
  preview:{ width:'100%', height:200, borderRadius:10, marginVertical:8 },
  center:{ flex:1, justifyContent:'center', alignItems:'center' }
});
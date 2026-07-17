import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";

const API = "https://api360suite.pqautoexpert.ec/api";

export default function ContratosHistorialScreen() {

  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;

  useEffect(() => {
    cargarContratos();
  }, []);

  async function authHeaders() {
    const token = await SecureStore.getItemAsync("token");

    return {
      Authorization: `Bearer ${token}`
    };
  }

  async function cargarContratos() {

    try {

      setLoading(true);

      const res = await fetch(`${API}/contratos/contratos`, {
        headers: await authHeaders()
      });

      const json = await res.json();

      setContratos(json.data || []);

    } catch (e) {

      console.log(e);
      Alert.alert("Error", "No se pudieron cargar los contratos");

    } finally {

      setLoading(false);

    }
  }

  const contratosFiltrados = useMemo(() => {

    const t = busqueda.toLowerCase();

    if (!t) return contratos;

    return contratos.filter(c =>
      String(c.comprador).toLowerCase().includes(t) ||
      String(c.placa).toLowerCase().includes(t) ||
      String(c.cedula_comprador).toLowerCase().includes(t)
    );

  }, [contratos, busqueda]);

  const totalPaginas = Math.ceil(contratosFiltrados.length / registrosPorPagina);

  const datosPagina = useMemo(() => {

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;

    return contratosFiltrados.slice(inicio, fin);

  }, [contratosFiltrados, paginaActual]);

  async function descargarPDF(id) {

    try {

      const token = await SecureStore.getItemAsync("token");

      const url = `${API}/contratos/pdf/${id}`;

      const fileUri =
        FileSystem.documentDirectory +
        `contrato_${id}_${Date.now()}.pdf`;

      const download = await FileSystem.downloadAsync(
        url,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!(await Sharing.isAvailableAsync())) {

        Alert.alert("PDF descargado", download.uri);
        return;

      }

      await Sharing.shareAsync(download.uri);

    } catch (e) {

      console.log(e);
      Alert.alert("Error", "No se pudo descargar el PDF");

    }
  }

  function formatearFecha(fecha) {

    if (!fecha) return "";

    const d = new Date(fecha);

    return d.toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

  }

  if (loading) {

    return (
      <View style={styles.center}>
        <ActivityIndicator size="large"/>
        <Text>Cargando contratos...</Text>
      </View>
    );

  }

  return (

    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>

      <Text style={styles.title}>
        📄 Contratos Registrados
      </Text>

      <TextInput
        style={styles.search}
        placeholder="Buscar comprador, placa o cédula"
        value={busqueda}
        onChangeText={(t)=>{
          setBusqueda(t);
          setPaginaActual(1);
        }}
      />

      <ScrollView style={styles.scroll}>

        {datosPagina.length === 0 && (
          <Text style={{textAlign:"center"}}>
            No hay contratos
          </Text>
        )}

        {datosPagina.map((c,i)=>{

          return(

            <View key={i} style={styles.card}>

              <Text style={styles.codigo}>
                Código: {c.codigo_verificacion}
              </Text>

              <Text>
                Comprador: {c.comprador}
              </Text>

              <Text>
                Cédula: {c.cedula_comprador}
              </Text>

              <Text>
                Vehículo: {c.marca} {c.modelo}
              </Text>

              <Text>
                Placa: {c.placa}
              </Text>

              <Text>
                Fecha: {formatearFecha(c.fecha_venta)}
              </Text>

              <View style={styles.row}>

                <View style={[
                  styles.badge,
                  {backgroundColor:
                    c.estado === "ANULADO"
                    ? "#dc3545"
                    : "#198754"
                  }
                ]}>
                  <Text style={styles.badgeText}>
                    {c.estado}
                  </Text>
                </View>

              </View>

              <TouchableOpacity
                style={styles.btn}
                onPress={()=>descargarPDF(c.contrato_id)}
              >
                <Text style={styles.btnText}>
                  🖨 Descargar / Imprimir PDF
                </Text>
              </TouchableOpacity>

            </View>

          )

        })}

      </ScrollView>

      {totalPaginas > 1 && (

        <View style={styles.pagination}>

          {Array.from({length: totalPaginas}).map((_,i)=>{

            const p = i+1;

            return(

              <TouchableOpacity
                key={p}
                style={[
                  styles.pageBtn,
                  p===paginaActual && styles.pageActive
                ]}
                onPress={()=>setPaginaActual(p)}
              >
                <Text style={{
                  color: p===paginaActual ? "#fff" : "#000",
                  fontWeight:"bold"
                }}>
                  {p}
                </Text>
              </TouchableOpacity>

            )

          })}

        </View>

      )}

    </SafeAreaView>

  )

}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#f5f7fb",
padding:15
},

scroll:{
flex:1
},

title:{
fontSize:18,
fontWeight:"900",
marginBottom:10
},

search:{
borderWidth:1,
borderColor:"#ddd",
padding:10,
borderRadius:10,
marginBottom:10
},

card:{
backgroundColor:"#fff",
borderRadius:10,
padding:15,
marginBottom:10,
borderWidth:1,
borderColor:"#eee"
},

codigo:{
fontWeight:"900",
marginBottom:5
},

row:{
flexDirection:"row",
justifyContent:"space-between",
marginTop:5
},

badge:{
paddingHorizontal:10,
paddingVertical:4,
borderRadius:5
},

badgeText:{
color:"#fff",
fontWeight:"bold"
},

btn:{
backgroundColor:"#0d6efd",
marginTop:10,
padding:10,
borderRadius:8,
alignItems:"center"
},

btnText:{
color:"#fff",
fontWeight:"bold"
},

pagination:{
flexDirection:"row",
justifyContent:"center",
gap:10,
marginTop:10
},

pageBtn:{
padding:10,
borderRadius:8,
backgroundColor:"#eee"
},

pageActive:{
backgroundColor:"#0d6efd"
},

center:{
flex:1,
justifyContent:"center",
alignItems:"center"
}

});

import React, { useEffect, useState } from "react";
import {
View,
Text,
FlatList,
TouchableOpacity,
StyleSheet,
ActivityIndicator,
Alert
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";

const API = "https://api360suite.pqautoexpert.ec/api";

export default function MecanicaHistorialScreen({ navigation }) {

const [historial,setHistorial] = useState([]);
const [loading,setLoading] = useState(true);
const [paginaActual,setPaginaActual] = useState(1);

const registrosPorPagina = 12;

async function authHeaders(){
const token = await SecureStore.getItemAsync("token");

if(!token){
navigation.replace("Login");
throw new Error("Token no encontrado");
}

return { Authorization:`Bearer ${token}` }
}

useEffect(()=>{
cargarHistorial();
},[]);

async function cargarHistorial(){

try{

setLoading(true);

const res = await fetch(`${API}/mecanica/listar-ordenesfinalizadas`,{
headers: await authHeaders()
});

const data = await res.json();

setHistorial(data.historial || []);

}catch(e){

console.log(e);
Alert.alert("Error","No se pudo cargar historial");

}finally{
setLoading(false);
}

}

function formatearFecha(f){

if(!f) return "—";

return new Date(f).toLocaleDateString("es-EC",{
day:"2-digit",
month:"short",
year:"numeric"
});

}

async function verPDF(id_orden){

try{

const tokenHeaders = await authHeaders();

const url = `${API}/mecanica/pdf/${id_orden}`;

const fileUri = FileSystem.documentDirectory + `reporte_${id_orden}.pdf`;

const response = await fetch(url,{
headers: tokenHeaders
});

if(!response.ok){
throw new Error("Error generando PDF");
}

const blob = await response.blob();

const reader = new FileReader();

reader.onloadend = async ()=>{

const base64 = reader.result.split(",")[1];

await FileSystem.writeAsStringAsync(fileUri,base64,{
encoding: FileSystem.EncodingType.Base64
});

await Sharing.shareAsync(fileUri);

};

reader.readAsDataURL(blob);

}catch(e){

console.log(e);
Alert.alert("Error","No se pudo abrir el PDF");

}

}

const inicio = (paginaActual - 1) * registrosPorPagina;
const fin = inicio + registrosPorPagina;
const datos = historial.slice(inicio,fin);

const totalPaginas = Math.ceil(historial.length / registrosPorPagina);

if(loading){

return(

<View style={styles.center}>

<ActivityIndicator size="large" color="#111d4d"/>

<Text style={styles.loadingText}>
Cargando historial...
</Text>

</View>

)

}

return(

<SafeAreaView style={styles.container} edges={["top", "left", "right"]}>

<Text style={styles.title}>
🔧 Historial Mecánica Finalizada
</Text>

<FlatList
data={datos}
keyExtractor={(item)=>item.id_orden.toString()}
renderItem={({item,index})=>(

<View style={styles.card}>

<View style={styles.row}>
<Text style={styles.label}>Cliente:</Text>
<Text style={styles.value}>{item.cliente_nombre}</Text>
</View>

<View style={styles.row}>
<Text style={styles.label}>Cédula:</Text>
<Text style={styles.value}>{item.cedula}</Text>
</View>

<View style={styles.row}>
<Text style={styles.label}>Placa:</Text>
<Text style={styles.value}>{item.placa}</Text>
</View>

<View style={styles.row}>
<Text style={styles.label}>Servicio:</Text>
<Text style={styles.value}>{item.servicio}</Text>
</View>

<View style={styles.row}>
<Text style={styles.label}>Subservicio:</Text>
<Text style={styles.value}>{item.subservicio}</Text>
</View>

<View style={styles.row}>
<Text style={styles.label}>Fecha:</Text>
<Text style={styles.value}>{formatearFecha(item.fecha_revision)}</Text>
</View>

<View style={styles.row}>
<Text style={styles.label}>Total:</Text>
<Text style={styles.total}>${item.total_final}</Text>
</View>

<TouchableOpacity
style={styles.btn}
onPress={()=>verPDF(item.id_orden)}
>

<Text style={styles.btnText}>
📄 Ver PDF
</Text>

</TouchableOpacity>

</View>

)}
/>

<View style={styles.pagination}>

{Array.from({length:totalPaginas}).map((_,i)=>{

const pagina = i + 1;

return(

<TouchableOpacity
key={pagina}
style={[
styles.pageBtn,
paginaActual === pagina && styles.pageBtnActive
]}
onPress={()=>setPaginaActual(pagina)}
>

<Text
style={[
styles.pageText,
paginaActual === pagina && styles.pageTextActive
]}
>
{pagina}
</Text>

</TouchableOpacity>

)

})}

</View>

<TouchableOpacity
style={styles.backBtn}
onPress={()=>navigation.goBack()}
>

<Text style={styles.btnText}>
⬅ Regresar
</Text>

</TouchableOpacity>

</SafeAreaView>

)

}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#f4f6f9",
padding:16
},

title:{
fontSize:20,
fontWeight:"900",
color:"#111d4d",
marginBottom:12
},

card:{
backgroundColor:"#fff",
borderRadius:12,
padding:14,
marginBottom:12,
borderLeftWidth:6,
borderLeftColor:"#111d4d",
shadowColor:"#000",
shadowOpacity:0.1,
shadowRadius:6,
shadowOffset:{width:0,height:3},
elevation:4
},

row:{
flexDirection:"row",
justifyContent:"space-between",
marginBottom:4
},

label:{
fontWeight:"900",
color:"#6b7280"
},

value:{
fontWeight:"800",
color:"#111827"
},

total:{
fontWeight:"900",
color:"#16a34a"
},

btn:{
marginTop:8,
backgroundColor:"#111d4d",
padding:10,
borderRadius:8,
alignItems:"center"
},

btnText:{
color:"#fff",
fontWeight:"900"
},

pagination:{
flexDirection:"row",
flexWrap:"wrap",
justifyContent:"center",
marginVertical:10,
gap:6
},

pageBtn:{
backgroundColor:"#e5e7eb",
paddingVertical:6,
paddingHorizontal:10,
borderRadius:6
},

pageBtnActive:{
backgroundColor:"#111d4d"
},

pageText:{
fontWeight:"800"
},

pageTextActive:{
color:"#fff"
},

backBtn:{
backgroundColor:"#374151",
padding:12,
borderRadius:10,
alignItems:"center",
marginTop:10
},

center:{
flex:1,
justifyContent:"center",
alignItems:"center"
},

loadingText:{
marginTop:10,
fontWeight:"800"
}

});

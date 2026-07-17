import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeMecanicaScreen from "../screens/mecanica/HomeMecanicaScreen";
import PrecompraScreen from "../screens/mecanica/PrecompraScreen";
import MecanicaScreen from "../screens/mecanica/MecanicaScreen";
import MecanicaHistorialScreen from "../screens/mecanica/MecanicaHistorialScreen";
import PrecompraHistorialScreen from "../screens/mecanica/PrecompraHistorialScreen";


const Stack = createNativeStackNavigator();
const lockedOrderScreenOptions = {
  gestureEnabled: false,
  headerBackVisible: false,
};


export default function AutoServicioStack() {
return(
<Stack.Navigator screenOptions={{ headerShown: false }}>
<Stack.Screen name="HomeMecanica" component={HomeMecanicaScreen} />
<Stack.Screen
  name="PrecompraOrden"
  component={PrecompraScreen}
  options={{ title: "Precompra", ...lockedOrderScreenOptions }}
/>

<Stack.Screen
  name="MecanicaOrden"
  component={MecanicaScreen}
  options={{ title: "Mecanica", ...lockedOrderScreenOptions }}
/>

<Stack.Screen
  name="MecanicaHistorial"
  component={MecanicaHistorialScreen}
  options={{ title: "Mecanica Historial" }}
/>

<Stack.Screen
  name="PrecompraHistorial"
  component={PrecompraHistorialScreen}
  options={{ title: "Precompra Historial" }}
/>


</Stack.Navigator>
);

}

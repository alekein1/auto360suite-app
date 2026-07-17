import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeIdentificacionScreen from "../screens/tecnico_identificacion/HomeIdentificacionScreen";
import IdentificacionScreen from "../screens/tecnico_identificacion/IdentificacionScreen";
import HistorialScreen from "../screens/tecnico_identificacion/HistorialScreen";
import ContratoConstanciaScreen from "../screens/tecnico_identificacion/ContratoScreen";
import IdentificacionesHistorialScreen from "../screens/tecnico_identificacion/IdentificacionesHistorialScreen1";
import HistorialVehicularHistorialScreen from "../screens/tecnico_identificacion/HistorialVehicularHistorialScreen";
import ContratosHistorialScreen from "../screens/tecnico_identificacion/ContratosHistorialScreen";
import PdfPreviewScreen from "../screens/tecnico_identificacion/PdfPreviewScreen";
import RevisionPendientesIdentificacionScreen from "../screens/tecnico_identificacion/RevisionPendientesIdentificacionScreen";

const Stack = createNativeStackNavigator();
const lockedOrderScreenOptions = {
  gestureEnabled: false,
  headerBackVisible: false,
};

export default function IdentificacionStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeIdentificacion" component={HomeIdentificacionScreen} />

      <Stack.Screen
        name="Identificacion"
        component={IdentificacionScreen}
        options={{ title: "Verificación de Series", ...lockedOrderScreenOptions }}
      />

      <Stack.Screen
        name="HistorialVehicular"
        component={HistorialScreen}
        options={{ title: "Historial Vehicular", ...lockedOrderScreenOptions }}
      />

      <Stack.Screen
        name="Contrato"
        component={ContratoConstanciaScreen}
        options={{ title: "Contrato / Constancia", ...lockedOrderScreenOptions }}
      />

      <Stack.Screen
        name="IdentificacionesHistorial"
        component={IdentificacionesHistorialScreen}
        options={{ title: "Identificaciones — Registros" }}
      />

      <Stack.Screen
        name="IdentificacionRevisionPendientes"
        component={RevisionPendientesIdentificacionScreen}
        options={{ title: "Revisión de Identificación" }}
      />

      <Stack.Screen
        name="HistorialRegistros"
        component={HistorialVehicularHistorialScreen}
        options={{ title: "Historial Vehicular — Registros" }}
      />

      <Stack.Screen
        name="ContratosHistorial"
        component={ContratosHistorialScreen}
        options={{ title: "Contratos - Registros" }}
      />

      <Stack.Screen
        name="PdfPreview"
        component={PdfPreviewScreen}
        options={{ title: "Vista previa PDF" }}
      />
    </Stack.Navigator>
  );
}

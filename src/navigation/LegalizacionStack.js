import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeLegalizacionScreen from "../screens/legalizacion/HomeLegalizacionScreen";
import LegalizacionOrdenScreen from "../screens/legalizacion/LegalizacionOrdenScreen";
import LegalizacionesHistorialScreen from "../screens/legalizacion/LegalizacionesHistorialScreen";

const Stack = createNativeStackNavigator();
const lockedOrderScreenOptions = {
  gestureEnabled: false,
  headerBackVisible: false,
};

export default function LegalizacionStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeLegalizacion" component={HomeLegalizacionScreen} />
      <Stack.Screen
        name="LegalizacionOrden"
        component={LegalizacionOrdenScreen}
        options={{ title: "Legalización de contratos", ...lockedOrderScreenOptions }}
      />
      <Stack.Screen
        name="LegalizacionesHistorial"
        component={LegalizacionesHistorialScreen}
        options={{ title: "Legalizaciones guardadas" }}
      />
    </Stack.Navigator>
  );
}

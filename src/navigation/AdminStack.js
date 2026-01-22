import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ClientesFrecuentesScreen from "../screens/admin/ClientesFrecuentesScreen";
import ProformaDirectaScreen from "../screens/admin/ProformaDirectaScreen";
import OrdenesAsignadasScreen from "../screens/admin/OrdenesAsignadasScreen";
import OrdenesEnProcesoScreen from "../screens/admin/OrdenesEnProcesoScreen";
import OrdenesFinalizadasScreen from "../screens/admin/OrdenesFinalizadasScreen";
import GestionUsuariosScreen from "../screens/admin/GestionUsuariosScreen";
import DashboardAdmin from "../screens/admin/DashboardAdmin";

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminHome" component={DashboardAdmin} />
      <Stack.Screen
  name="ClientesFrecuentes"
  component={ClientesFrecuentesScreen}
/>
<Stack.Screen
  name="ProformaDirecta"
  component={ProformaDirectaScreen}
/>
<Stack.Screen
  name="OrdenesAsignadas"
  component={OrdenesAsignadasScreen}
/>
<Stack.Screen
  name="OrdenesProceso"
  component={OrdenesEnProcesoScreen}
/>

<Stack.Screen
  name="OrdenesFinalizadas"
  component={OrdenesFinalizadasScreen}
/>
<Stack.Screen
  name="GestionTecnicos"
  component={GestionUsuariosScreen}
/>


    </Stack.Navigator>
  );
}
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ClientesFrecuentesScreen from "../screens/admin/ClientesFrecuentesScreen";
import ProformaDirectaScreen from "../screens/admin/ProformaDirectaScreen";
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


    </Stack.Navigator>
  );
}
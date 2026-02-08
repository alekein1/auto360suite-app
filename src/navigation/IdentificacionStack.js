import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeIdentificacionScreen from '../screens/tecnico_identificacion/HomeIdentificacionScreen';
import IdentificacionScreen from '../screens/tecnico_identificacion/IdentificacionScreen';



const Stack = createNativeStackNavigator();

export default function IdentificacionStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeIdentificacion" component={HomeIdentificacionScreen} />

      {/* VERIFICACIÓN DE SERIES */}
      <Stack.Screen
        name="Identificacion"
        component={IdentificacionScreen}
        options={{ title: 'Verificación de Series' }}
      />

    </Stack.Navigator>
  );
}
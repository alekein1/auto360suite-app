import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://api360suite.pqautoexpert.ec/api';

export default function HomeIdentificacionScreen({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsuario = async () => {
      const storedUser = await SecureStore.getItemAsync('usuario');
      if (storedUser) {
        setUsuario(JSON.parse(storedUser));
        fetchOrdenes();  // Al obtener el usuario, cargamos las órdenes.
      }
    };

    fetchUsuario();
  }, []);

  const fetchOrdenes = async () => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) {
      navigation.replace('Login'); // Si no hay token, redirigir al login
    }

    try {
      const response = await fetch(`${API_URL}/tecnico/ordenes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setOrdenes(data.ordenes);
      } else {
        alert('Error cargando las órdenes.');
      }
    } catch (error) {
      alert('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111d4d" />
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Bienvenido, {usuario?.nombres} {usuario?.apellidos}</Text>

      {/* Botones de navegación */}
     <View style={styles.row}>
  <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('Identificaciones')}>
    <Text style={styles.menuButtonText}>📘 Identificaciones</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('HistorialVehicular')}>
    <Text style={styles.menuButtonText}>📙 Historial Vehicular</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('Contratos')}>
    <Text style={styles.menuButtonText}>📒 Contratos & Constancias</Text>
  </TouchableOpacity>
</View>

      {/* Órdenes pendientes de Identificación */}
      <Text style={styles.subtitle}>Órdenes pendientes de Identificación</Text>

      {ordenes.length === 0 ? (
        <Text>No hay órdenes pendientes para identificar.</Text>
      ) : (
        ordenes.map(o => (
          <View key={o.id_orden} style={styles.orderItem}>
            <Text style={styles.orderText}>ID Orden: {o.id_orden}</Text>
            <Text style={styles.orderText}>Cliente: {o.nombre_cliente} {o.apellido_cliente}</Text>
            <Text style={styles.orderText}>Placa: {o.placa}</Text>
            <Text style={styles.orderText}>Subservicio: {o.subservicio_nombre}</Text>
            <TouchableOpacity
              style={styles.buttonIniciar}
              onPress={() => iniciarIdentificacion(o.id_orden, o.subservicio_nombre)}>
              <Text style={styles.buttonText}>Iniciar Identificación</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  async function iniciarIdentificacion(id_orden, subservicio) {
    const modulo = subservicio.trim().toLowerCase();

    try {
      if (modulo === "verificación de series") {
        await iniciarProceso(`/identificacion/iniciar/${id_orden}`);
        navigation.navigate('Identificacion', { id_orden });
      } else if (modulo === "historial vehicular") {
        await iniciarProceso(`/historial/iniciar/${id_orden}`);
        navigation.navigate('HistorialVehicular', { id_orden });
      } else if (modulo === "certificado unico vehicular") {
        await iniciarProceso(`/certificados/iniciar/${id_orden}`);
        navigation.navigate('CUV', { id_orden });
      } else if (modulo === "constancia" || modulo === "legalizacion de contratos") {
        await iniciarProceso(`/contratos/iniciar/${id_orden}`);
        navigation.navigate('Contrato', { id_orden });
      }
    } catch (error) {
      alert('Error iniciando el proceso.');
    }
  }

  async function iniciarProceso(url) {
    const token = await SecureStore.getItemAsync('token');
    const response = await fetch(`${API_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      alert('Error iniciando el proceso.');
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111d4d',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  row: {
    flexDirection: 'column',  // Cambiar a columna para que los botones estén uno debajo de otro
    justifyContent: 'space-between',
    alignItems: 'center',  // Centrar los botones
    marginBottom: 20,
  },
  menuButton: {
    backgroundColor: '#111d4d',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,  // Asegurarse de que haya un pequeño espacio entre los botones
    width: '100%',  // Asegurarse de que cada botón ocupe toda la pantalla
  },
  menuButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  orderText: {
    fontSize: 16,
    marginBottom: 8,
  },
  buttonIniciar: {
    backgroundColor: '#111d4d',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
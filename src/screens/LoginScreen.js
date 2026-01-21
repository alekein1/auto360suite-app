import { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, Image, ActivityIndicator 
} from "react-native";

const API_URL = "https://api360suite.pqautoexpert.ec/api";

export default function LoginScreen({ navigation }) {

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {

      setLoading(true);

      const resp = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario, 
          password
        }),
      });

      const data = await resp.json();
      setLoading(false);

      if (!resp.ok) {
        alert(data.error || "Credenciales incorrectas");
        return;
      }

      console.log("LOGIN OK:", data);

      const rol = data.usuario.tipo_usuario;       // ADMIN / TECNICO
      const tipoTec = data.usuario.tipo_tecnico;   // IDENTIFICACION / DETAILING / AUTOSERVICIOS

      // =========================================
      // 🔥 REDIRECCIÓN SEGÚN ROL
      // =========================================

     // ADMIN
if (rol === "ADMIN") {
  navigation.replace("Admin");
  return;
}

      // TECNICOS
      if (rol === "TECNICO") {

        if (tipoTec.includes("IDENTIFICACIÓN VEHICULAR")) {
          navigation.replace("HomeIdentificacion");
          return;
        }

        if (tipoTec.includes("DETAILING")) {
          navigation.replace("HomeDetailing");
          return;
        }

        if (tipoTec.includes("AUTO SERVICIOS")) {
          navigation.replace("HomeAutoservicios");
          return;
        }

        // Si no coincide nada, va al menú general
        navigation.replace("HomeScreen");
        return;
      }

      // Si nada calza → Home general
      navigation.replace("Home");

    } catch (error) {
      console.error("Error de login:", error);
      setLoading(false);
      alert("Error conectando con el servidor.");
    }
  };

  return (
    <View style={styles.container}>

      {/* LOGO */}
      <Image 
        source={require("../../assets/logo_prin.png")} 
        style={styles.logo} 
      />

      <Text style={styles.title}>Iniciar Sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Usuario o correo"
        value={usuario}
        onChangeText={setUsuario}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity 
        style={styles.btn} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Ingresar</Text>
        )}
      </TouchableOpacity>

      {/* BOTÓN REGRESAR */}
      <TouchableOpacity 
        style={styles.backBtn}
        onPress={() => navigation.navigate("Welcome")}
      >
        <Text style={styles.backText}>Regresar al inicio</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    padding: 20, 
    backgroundColor: "#f5f5f5" 
  },

  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 10,
  },

  title: { 
    fontSize: 28, 
    textAlign: "center", 
    marginBottom: 20, 
    fontWeight: "900",
    color: "#111d4d"
  },

  input: { 
    backgroundColor: "#fff", 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 15,
    width: "100%"
  },

  btn: { 
    backgroundColor: "#111d4d", 
    padding: 15, 
    borderRadius: 8,
    width: "100%",
    marginTop: 5
  },

  btnText: { 
    color: "#fff", 
    textAlign: "center", 
    fontWeight: "bold" 
  },

  backBtn: {
    marginTop: 10,
  },

  backText: {
    color: "#111d4d",
    fontWeight: "bold",
    textDecorationLine: "underline",
  }
});
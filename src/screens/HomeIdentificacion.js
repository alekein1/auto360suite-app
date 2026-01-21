import { View, Text, StyleSheet } from "react-native";

export default function HomeIdentificacion() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inicio Identificación Vehicular</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold" }
});
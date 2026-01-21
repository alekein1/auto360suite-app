import { View, Text, StyleSheet } from "react-native";

export default function HomeAdmin() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel del Administrador</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold" }
});
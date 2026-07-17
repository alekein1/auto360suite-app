import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PdfPreviewScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pdfUri = route?.params?.uri || null;
  const pdfTitle = route?.params?.title || "Vista previa PDF";

  const allowingReadAccessToURL = useMemo(() => {
    if (!pdfUri) return undefined;

    const lastSlash = pdfUri.lastIndexOf("/");
    if (lastSlash === -1) return pdfUri;

    return pdfUri.slice(0, lastSlash + 1);
  }, [pdfUri]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: pdfTitle });
  }, [navigation, pdfTitle]);

  async function compartirPDF() {
    if (!pdfUri) return;

    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("PDF listo", `Guardado en: ${pdfUri}`);
        return;
      }

      await Sharing.shareAsync(pdfUri);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "No se pudo compartir el PDF");
    }
  }

  if (!pdfUri) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>No se encontró el PDF</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.viewerCard}>
        <WebView
          source={{ uri: pdfUri }}
          originWhitelist={["*"]}
          allowingReadAccessToURL={allowingReadAccessToURL}
          onLoadStart={() => {
            setLoading(true);
            setError(null);
          }}
          onLoadEnd={() => setLoading(false)}
          onError={(event) => {
            setLoading(false);
            setError(event?.nativeEvent?.description || "No se pudo cargar el PDF");
          }}
          style={styles.webview}
        />

        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#111d4d" />
            <Text style={styles.overlayText}>Cargando PDF...</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.overlay}>
            <Text style={styles.errorTitle}>No se pudo previsualizar el PDF</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Cerrar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={compartirPDF}>
          <Text style={styles.primaryBtnText}>Compartir PDF</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f9",
    padding: 12,
  },
  viewerCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  webview: {
    flex: 1,
    backgroundColor: "#fff",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 24,
  },
  overlayText: {
    marginTop: 10,
    color: "#111827",
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#111d4d",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "900",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "#111827",
    fontWeight: "900",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f4f6f9",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  errorText: {
    marginTop: 8,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "600",
  },
});

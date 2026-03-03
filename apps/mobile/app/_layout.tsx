import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#3b82f6",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[id]" options={{ title: "Lesson" }} />
        <Stack.Screen name="practice/[id]" options={{ title: "Practice" }} />
        <Stack.Screen
          name="auth"
          options={{
            title: "Sign In",
            presentation: "modal",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}

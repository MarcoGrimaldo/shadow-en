import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Shadow EN</Text>
        <Text style={styles.subtitle}>
          Master English pronunciation through shadowing practice
        </Text>
      </View>

      <View style={styles.features}>
        <FeatureCard
          icon="🎯"
          title="Practice Speaking"
          description="Shadow native speakers and improve your pronunciation"
          onPress={() => router.push("/practice")}
        />
        <FeatureCard
          icon="📚"
          title="Browse Lessons"
          description="Explore lessons created by the community"
          onPress={() => router.push("/lessons")}
        />
        <FeatureCard
          icon="📊"
          title="Track Progress"
          description="Monitor your improvement over time"
          onPress={() => router.push("/profile")}
        />
      </View>

      {!user && !loading && (
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push("/auth")}
        >
          <Text style={styles.signInText}>Sign In to Get Started</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}

function FeatureCard({ icon, title, description, onPress }: FeatureCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  hero: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#3b82f6",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#dbeafe",
    textAlign: "center",
  },
  features: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  signInButton: {
    margin: 16,
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  signInText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

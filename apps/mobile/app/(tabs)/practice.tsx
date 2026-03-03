import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Lesson, getYouTubeThumbnail } from "@shadow-en/shared";
import { useAuth } from "../../src/contexts/AuthContext";
import { supabase } from "../../src/lib/supabase";

export default function PracticeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [recentLessons, setRecentLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentLessons();
  }, []);

  const fetchRecentLessons = async () => {
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, user:users(*)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentLessons(data || []);
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  const startPractice = (lessonId: string) => {
    router.push(`/practice/${lessonId}`);
  };

  const renderLesson = ({ item }: { item: Lesson }) => (
    <TouchableOpacity
      style={styles.lessonCard}
      onPress={() => startPractice(item.id)}
    >
      <Image
        source={{ uri: getYouTubeThumbnail(item.video_id, "medium") }}
        style={styles.thumbnail}
      />
      <View style={styles.lessonInfo}>
        <Text style={styles.lessonTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.lessonMeta}>{item.pauses.length} exercises</Text>
      </View>
      <View style={styles.startButton}>
        <Text style={styles.startButtonText}>Start</Text>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Sign in to track your practice progress
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push("/auth")}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose a Lesson to Practice</Text>
        <Text style={styles.headerSubtitle}>
          Listen, repeat, and improve your pronunciation
        </Text>
      </View>

      <FlatList
        data={recentLessons}
        renderItem={renderLesson}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No lessons available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  message: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  list: {
    padding: 16,
  },
  lessonCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: "center",
  },
  thumbnail: {
    width: 80,
    height: 60,
    backgroundColor: "#e5e7eb",
  },
  lessonInfo: {
    flex: 1,
    padding: 12,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  lessonMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  startButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 6,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
  },
});

import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Lesson, getYouTubeThumbnail, formatTime } from "@shadow-en/shared";
import { supabase } from "../src/lib/supabase";

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchLesson();
    }
  }, [id]);

  const fetchLesson = async () => {
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, user:users(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      setLesson(data);
    } catch (error) {
      console.error("Error fetching lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Lesson not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: getYouTubeThumbnail(lesson.video_id, "high") }}
        style={styles.thumbnail}
      />

      <View style={styles.content}>
        <Text style={styles.title}>{lesson.title}</Text>

        {lesson.user && (
          <Text style={styles.author}>Created by {lesson.user.username}</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{lesson.pauses.length}</Text>
            <Text style={styles.statLabel}>Pause Points</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {lesson.pauses.length > 0
                ? formatTime(lesson.pauses[lesson.pauses.length - 1].time)
                : "0:00"}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Practice Points</Text>
        {lesson.pauses.map((pause, index) => (
          <View key={pause.id} style={styles.pauseItem}>
            <Text style={styles.pauseTime}>{formatTime(pause.time)}</Text>
            <Text style={styles.pauseText} numberOfLines={2}>
              {pause.subtitle}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.practiceButton}
          onPress={() => router.push(`/practice/${lesson.id}`)}
        >
          <Text style={styles.practiceButtonText}>Start Practice</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  thumbnail: {
    width: "100%",
    height: 220,
    backgroundColor: "#e5e7eb",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  author: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  pauseItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  pauseTime: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
    width: 50,
  },
  pauseText: {
    flex: 1,
    fontSize: 14,
    color: "#4b5563",
  },
  practiceButton: {
    backgroundColor: "#3b82f6",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  practiceButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

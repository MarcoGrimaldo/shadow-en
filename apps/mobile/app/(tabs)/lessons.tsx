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
import { supabase } from "../../src/lib/supabase";

export default function LessonsScreen() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, user:users(*)")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderLesson = ({ item }: { item: Lesson }) => (
    <TouchableOpacity
      style={styles.lessonCard}
      onPress={() => router.push(`/lesson/${item.id}`)}
    >
      <Image
        source={{ uri: getYouTubeThumbnail(item.video_id) }}
        style={styles.thumbnail}
      />
      <View style={styles.lessonInfo}>
        <Text style={styles.lessonTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.lessonMeta}>{item.pauses.length} pause points</Text>
        {item.user && (
          <Text style={styles.lessonAuthor}>by {item.user.username}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lessons}
        renderItem={renderLesson}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No lessons available yet</Text>
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
  },
  list: {
    padding: 16,
    gap: 16,
  },
  lessonCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  thumbnail: {
    width: "100%",
    height: 180,
    backgroundColor: "#e5e7eb",
  },
  lessonInfo: {
    padding: 16,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  lessonMeta: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  lessonAuthor: {
    fontSize: 12,
    color: "#9ca3af",
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

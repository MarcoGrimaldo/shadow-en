import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Audio } from "expo-av";
import { WebView } from "react-native-webview";
import {
  Lesson,
  PausePoint,
  formatTime,
  calculateTextAccuracy,
  getAccuracyColor,
  getAccuracyMessage,
} from "@shadow-en/shared";
import { supabase } from "../../src/lib/supabase";

export default function PracticeSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPauseIndex, setCurrentPauseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [sessionResults, setSessionResults] = useState<{ accuracy: number }[]>(
    [],
  );

  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    if (id) {
      fetchLesson();
    }

    // Request audio permissions
    Audio.requestPermissionsAsync();

    return () => {
      // Cleanup recording
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
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

  const currentPause: PausePoint | undefined =
    lesson?.pauses[currentPauseIndex];

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert(
        "Error",
        "Could not start recording. Please check microphone permissions.",
      );
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();

      // In a real app, you would send this to a speech-to-text service
      // For now, we'll simulate with a placeholder
      const simulatedText = "This is a simulated transcription";
      setRecordedText(simulatedText);

      // Calculate accuracy
      if (currentPause) {
        const acc = calculateTextAccuracy(currentPause.subtitle, simulatedText);
        setAccuracy(acc);
        setSessionResults([...sessionResults, { accuracy: acc }]);
      }

      setShowResult(true);
      recordingRef.current = null;
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  };

  const nextPause = () => {
    if (lesson && currentPauseIndex < lesson.pauses.length - 1) {
      setCurrentPauseIndex(currentPauseIndex + 1);
      setShowResult(false);
      setRecordedText("");
      setAccuracy(0);
    } else {
      // Session complete
      const avgAccuracy =
        sessionResults.length > 0
          ? Math.round(
              sessionResults.reduce((a, b) => a + b.accuracy, 0) /
                sessionResults.length,
            )
          : 0;

      Alert.alert(
        "Practice Complete!",
        `You completed ${lesson?.pauses.length || 0} exercises with an average accuracy of ${avgAccuracy}%`,
        [
          { text: "Done", onPress: () => router.back() },
          {
            text: "Practice Again",
            onPress: () => {
              setCurrentPauseIndex(0);
              setSessionResults([]);
              setShowResult(false);
            },
          },
        ],
      );
    }
  };

  const getColorStyle = (acc: number) => {
    const color = getAccuracyColor(acc);
    switch (color) {
      case "green":
        return { color: "#16a34a" };
      case "yellow":
        return { color: "#ca8a04" };
      default:
        return { color: "#dc2626" };
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!lesson || !currentPause) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Lesson not found</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${((currentPauseIndex + 1) / lesson.pauses.length) * 100}%`,
            },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {currentPauseIndex + 1} of {lesson.pauses.length}
      </Text>

      {/* Video placeholder */}
      <View style={styles.videoContainer}>
        <WebView
          source={{
            uri: `https://www.youtube.com/embed/${lesson.video_id}?start=${Math.max(0, Math.floor(currentPause.time) - 5)}&end=${Math.floor(currentPause.time)}`,
          }}
          style={styles.video}
          allowsInlineMediaPlayback
        />
      </View>

      {/* Current phrase */}
      <View style={styles.phraseContainer}>
        <Text style={styles.timeLabel}>{formatTime(currentPause.time)}</Text>
        <Text style={styles.phraseText}>{currentPause.subtitle}</Text>
      </View>

      {/* Recording / Results */}
      {!showResult ? (
        <View style={styles.recordingSection}>
          <Text style={styles.instruction}>
            Listen to the phrase, then tap and hold to record your voice
          </Text>

          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordingActive]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <Text style={styles.recordButtonText}>
              {isRecording ? "🎙️ Recording..." : "🎤 Hold to Record"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resultSection}>
          <Text style={[styles.accuracyText, getColorStyle(accuracy)]}>
            {accuracy}% Accuracy
          </Text>
          <Text style={styles.message}>{getAccuracyMessage(accuracy)}</Text>

          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>You said:</Text>
            <Text style={styles.transcriptText}>
              {recordedText || "(No speech detected)"}
            </Text>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={nextPause}>
            <Text style={styles.nextButtonText}>
              {currentPauseIndex < lesson.pauses.length - 1 ? "Next" : "Finish"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  button: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e5e7eb",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
  },
  progressText: {
    textAlign: "center",
    fontSize: 12,
    color: "#6b7280",
    paddingVertical: 8,
  },
  videoContainer: {
    height: 200,
    backgroundColor: "#000",
  },
  video: {
    flex: 1,
  },
  phraseContainer: {
    padding: 20,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  timeLabel: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
    marginBottom: 8,
  },
  phraseText: {
    fontSize: 18,
    color: "#1f2937",
    lineHeight: 26,
  },
  recordingSection: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  instruction: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  recordButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recordingActive: {
    backgroundColor: "#ef4444",
    transform: [{ scale: 1.1 }],
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  resultSection: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  accuracyText: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 8,
  },
  message: {
    fontSize: 18,
    color: "#4b5563",
    marginBottom: 24,
  },
  transcriptBox: {
    width: "100%",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  transcriptLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 16,
    color: "#374151",
  },
  nextButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

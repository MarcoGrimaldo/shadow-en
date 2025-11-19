// Utility functions for the Shadow English app

/**
 * Extract YouTube video ID from various YouTube URL formats
 * Supports regular videos, shorts, embeds, and mobile URLs
 */
export function getYouTubeVideoId(url: string): string | null {
  const regexPatterns = [
    // Regular YouTube URLs: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    // Short URLs: youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([^&\n?#]+)/,
    // YouTube Shorts: youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
    // Embed URLs: youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    // Legacy format: youtube.com/v/VIDEO_ID
    /youtube\.com\/v\/([^&\n?#]+)/,
    // URL with v parameter anywhere: youtube.com/...?v=VIDEO_ID
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
    // Mobile URLs: m.youtube.com variations
    /(?:m\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
  ];

  for (const pattern of regexPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Format seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parse time input string (M:SS or SS) into total seconds
 */
export function parseTimeInput(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  return parseInt(timeStr) || 0;
}

/**
 * Calculate text similarity percentage between expected and actual text
 * Uses word-based comparison with fuzzy matching
 */
export function calculateTextAccuracy(
  expected: string,
  actual: string
): number {
  if (!expected || !actual) return 0;

  // Clean and normalize text
  const normalizeText = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 0);
  };

  const expectedWords = normalizeText(expected);
  const actualWords = normalizeText(actual);

  if (expectedWords.length === 0) return 0;

  let matches = 0;
  const usedIndices = new Set<number>();

  // Find exact matches first
  expectedWords.forEach((expectedWord) => {
    const exactMatchIndex = actualWords.findIndex(
      (actualWord, index) =>
        !usedIndices.has(index) && actualWord === expectedWord
    );
    if (exactMatchIndex !== -1) {
      matches++;
      usedIndices.add(exactMatchIndex);
    }
  });

  // Find fuzzy matches for remaining words
  expectedWords.forEach((expectedWord) => {
    if (matches >= expectedWords.length) return; // All words matched

    const fuzzyMatchIndex = actualWords.findIndex((actualWord, index) => {
      if (usedIndices.has(index)) return false;

      // Check if words share significant similarity
      const similarity = calculateWordSimilarity(expectedWord, actualWord);
      return similarity > 0.6; // 60% similarity threshold
    });

    if (fuzzyMatchIndex !== -1) {
      matches++;
      usedIndices.add(fuzzyMatchIndex);
    }
  });

  // Calculate accuracy based on expected words length
  const accuracy = (matches / expectedWords.length) * 100;
  return Math.min(100, Math.round(accuracy));
}

/**
 * Calculate similarity between two words using Levenshtein distance
 */
function calculateWordSimilarity(word1: string, word2: string): number {
  if (word1.length === 0) return word2.length === 0 ? 1 : 0;
  if (word2.length === 0) return 0;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= word2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= word1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= word2.length; i++) {
    for (let j = 1; j <= word1.length; j++) {
      if (word2.charAt(i - 1) === word1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  const maxLength = Math.max(word1.length, word2.length);
  const distance = matrix[word2.length][word1.length];
  return (maxLength - distance) / maxLength;
}

/**
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null;
}

/**
 * Check if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

/**
 * Get accuracy color based on percentage
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return "text-green-600";
  if (accuracy >= 60) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Get accuracy message based on percentage
 */
export function getAccuracyMessage(accuracy: number): string {
  if (accuracy >= 90) return "Excellent! 🎉";
  if (accuracy >= 80) return "Great job! 👍";
  if (accuracy >= 70) return "Good work! 👌";
  if (accuracy >= 60) return "Not bad, keep practicing! 💪";
  return "Keep practicing, you'll improve! 📚";
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

/**
 * Extract subtitles from YouTube video automatically
 */
export async function extractYouTubeSubtitles(
  videoUrl: string,
  fallbackMethod?: string
) {
  const videoId = getYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  try {
    const response = await fetch("/api/youtube/transcript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoId, fallbackMethod }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to extract subtitles");
    }

    return data;
  } catch (error) {
    console.error("Error extracting subtitles:", error);
    throw error;
  }
}

/**
 * Convert subtitle data to pause points format
 */
export function convertSubtitlesToPauses(subtitles: any[]) {
  return subtitles.map((subtitle, index) => ({
    id: subtitle.id || Date.now() + index,
    time: subtitle.time,
    subtitle: subtitle.subtitle,
  }));
}

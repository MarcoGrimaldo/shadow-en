// Utility functions shared between web and mobile apps

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
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null;
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
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  const maxLength = Math.max(word1.length, word2.length);
  const distance = matrix[word2.length][word1.length];
  return (maxLength - distance) / maxLength;
}

/**
 * Calculate text similarity percentage between expected and actual text
 * Uses word-based comparison with fuzzy matching
 */
export function calculateTextAccuracy(
  expected: string,
  actual: string,
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
        !usedIndices.has(index) && actualWord === expectedWord,
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
 * Get accuracy color based on percentage
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return "green";
  if (accuracy >= 60) return "yellow";
  return "red";
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
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

/**
 * Convert subtitle data to pause points format
 */
export function convertSubtitlesToPauses(
  subtitles: Array<{ id?: number; time: number; subtitle: string }>,
) {
  return subtitles.map((subtitle, index) => ({
    id: subtitle.id || Date.now() + index,
    time: subtitle.time,
    subtitle: subtitle.subtitle,
  }));
}

/**
 * Generate YouTube thumbnail URL
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: "default" | "medium" | "high" | "maxres" = "high",
): string {
  const qualityMap = {
    default: "default",
    medium: "mqdefault",
    high: "hqdefault",
    maxres: "maxresdefault",
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

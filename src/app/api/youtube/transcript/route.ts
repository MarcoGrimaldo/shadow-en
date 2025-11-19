import { NextRequest, NextResponse } from "next/server";

// Define the transcript item interface based on youtube-transcript package
interface TranscriptItem {
  text: string;
  offset: number; // youtube-transcript uses 'offset' instead of 'start'
  duration: number;
}

// Define our processed subtitle interface
interface ProcessedSubtitle {
  id: number;
  time: number;
  subtitle: string;
  duration: number;
  end: number;
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Try YouTube transcript extraction
    try {
      const transcriptResult = await extractYouTubeTranscript(videoId);
      if (transcriptResult.success) {
        return NextResponse.json(transcriptResult);
      }
    } catch (error) {
      console.log(
        "YouTube transcript not available, will use browser transcription"
      );
    }

    // If YouTube transcript fails, return a response that tells the client to use browser transcription
    return NextResponse.json({
      success: false,
      requiresBrowserTranscription: true,
      error:
        "No YouTube captions available. Use browser transcription instead.",
      suggestion:
        "Click 'Generate with Voice Recognition' to transcribe the audio in your browser.",
    });
  } catch (error: any) {
    console.error("Transcript extraction failed:", error);
    return NextResponse.json(
      {
        success: false,
        requiresBrowserTranscription: true,
        error: "Failed to extract YouTube captions.",
        suggestion: "Use browser-based voice transcription instead.",
      },
      { status: 500 }
    );
  }
}

async function extractYouTubeTranscript(videoId: string) {
  const { YoutubeTranscript } = await import("youtube-transcript");

  const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
    lang: "en",
  });

  if (!transcript || transcript.length === 0) {
    throw new Error("No transcript available");
  }

  const processedSubtitles = processTranscriptForPractice(transcript);
  const videoDuration = getVideoDuration(transcript);

  return {
    success: true,
    subtitles: processedSubtitles,
    duration: videoDuration,
    totalSegments: processedSubtitles.length,
    method: "youtube-transcript",
  };
}

function processTranscriptForPractice(
  transcript: TranscriptItem[]
): ProcessedSubtitle[] {
  const processedItems: ProcessedSubtitle[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const item = transcript[i];

    // Clean up the text
    let cleanText = item.text
      .replace(/\[.*?\]/g, "") // Remove bracketed content like [Music]
      .replace(/\(.*?\)/g, "") // Remove parenthetical content
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    // Skip empty or very short segments
    if (cleanText.length < 3) continue;

    // Skip non-speech content
    if (isNonSpeechContent(cleanText)) continue;

    // Calculate end time
    const endTime = item.offset + item.duration;

    processedItems.push({
      id: i + 1,
      time: Math.round(item.offset),
      subtitle: cleanText,
      duration: item.duration,
      end: Math.round(endTime),
    });
  }

  // Merge very short segments with adjacent ones for better practice
  return mergeShortSegments(processedItems);
}

function isNonSpeechContent(text: string): boolean {
  const nonSpeechPatterns = [
    /^\[.*\]$/, // [Music], [Applause], etc.
    /^music$/i,
    /^applause$/i,
    /^laughter$/i,
    /^\(.*\)$/, // (instrumental)
    /^♪.*♪$/, // Musical notes
    /^[♫♪♬♩]+$/, // Musical symbols only
  ];

  return nonSpeechPatterns.some((pattern) => pattern.test(text.trim()));
}

function mergeShortSegments(
  segments: ProcessedSubtitle[]
): ProcessedSubtitle[] {
  const merged: ProcessedSubtitle[] = [];
  let currentSegment: ProcessedSubtitle | null = null;

  for (const segment of segments) {
    // If this is a very short segment (less than 2 seconds or less than 10 characters)
    if (segment.duration < 2 || segment.subtitle.length < 10) {
      if (currentSegment) {
        // Merge with previous segment
        currentSegment.subtitle += " " + segment.subtitle;
        currentSegment.duration = segment.end - currentSegment.time;
        currentSegment.end = segment.end;
      } else {
        currentSegment = { ...segment };
      }
    } else {
      // This is a good segment
      if (currentSegment) {
        merged.push(currentSegment);
      }
      currentSegment = { ...segment };
    }
  }

  // Don't forget the last segment
  if (currentSegment) {
    merged.push(currentSegment);
  }

  // Ensure segments are spaced appropriately for practice
  return spaceSuitableForPractice(merged);
}

function spaceSuitableForPractice(
  segments: ProcessedSubtitle[]
): ProcessedSubtitle[] {
  // For shadow technique, we want natural pause points
  // Filter to have segments that are 3-10 seconds apart for good practice rhythm
  const spaced: ProcessedSubtitle[] = [];
  let lastEndTime = 0;

  for (const segment of segments) {
    // Ensure at least 2 seconds between segments for comfortable practice
    if (segment.time - lastEndTime >= 2) {
      spaced.push(segment);
      lastEndTime = segment.end;
    }
  }

  return spaced.slice(0, 8); // Limit to 8 segments max for focused practice
}

function getVideoDuration(transcript: TranscriptItem[]): number {
  if (transcript.length === 0) return 0;

  const lastItem = transcript[transcript.length - 1];
  return Math.ceil(lastItem.offset + lastItem.duration);
}

// No more mock fallbacks - we'll use browser-based transcription instead

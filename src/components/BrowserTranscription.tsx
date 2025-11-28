"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Play,
  Pause,
  Mic,
  MicOff,
  Loader2,
  Volume2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface TranscriptionSegment {
  id: number;
  time: number;
  subtitle: string;
  duration: number;
  end: number;
}

interface BrowserTranscriptionProps {
  videoId: string;
  onTranscriptionComplete: (segments: TranscriptionSegment[]) => void;
  onError: (error: string) => void;
}

export default function BrowserTranscription({
  videoId,
  onTranscriptionComplete,
  onError,
}: BrowserTranscriptionProps) {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showTranscriptViewer, setShowTranscriptViewer] = useState(false);
  const [fullTranscript, setFullTranscript] = useState("");
  const [pauseTime, setPauseTime] = useState("");
  const [pauseSubtitle, setPauseSubtitle] = useState("");
  const [customPauses, setCustomPauses] = useState<TranscriptionSegment[]>([]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const segmentStartTimeRef = useRef(0);
  const transcriptBufferRef = useRef<string[]>([]);

  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return false;

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      onError(
        "Speech recognition not supported in this browser. Please use Chrome or Safari."
      );
      return false;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        transcriptBufferRef.current.push(finalTranscript.trim());
        setCurrentText(transcriptBufferRef.current.join(" "));
      } else if (interimTranscript) {
        // Show interim results but don't save them yet
        const currentBuffer = transcriptBufferRef.current.join(" ");
        setCurrentText(currentBuffer + " " + interimTranscript.trim());
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        // Continue listening for speech, but update UI
        setCurrentText(
          "🔇 No speech detected - please speak into your microphone or check your audio settings"
        );
        return;
      }
      if (event.error === "not-allowed") {
        onError(
          "Microphone access denied. Please allow microphone access and try again."
        );
        return;
      }
      onError(
        `Speech recognition error: ${event.error}. Please check your microphone settings.`
      );
    };

    recognitionRef.current.onend = () => {
      if (isTranscribing && videoPlaying) {
        // Restart recognition if video is still playing
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Recognition might already be running
        }
      }
    };

    return true;
  }, [isTranscribing, videoPlaying, onError]);

  const startTranscription = async () => {
    if (!initializeSpeechRecognition()) return;

    setIsTranscribing(true);
    setSegments([]);
    setCurrentText("");
    setProgress(0);
    transcriptBufferRef.current = [];

    // Start video playback
    postMessageToVideo("playVideo");
    setVideoPlaying(true);
    setStartTime(Date.now());
    segmentStartTimeRef.current = 0;

    // Start speech recognition
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error("Error starting speech recognition:", e);
      onError("Failed to start speech recognition");
    }

    // Monitor video progress and create segments
    const progressInterval = setInterval(() => {
      if (videoRef.current && videoRef.current.contentWindow) {
        videoRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "listening", id: "transcription-monitor" }),
          "*"
        );
      }
    }, 1000);

    // Auto-complete after 30 seconds max
    setTimeout(() => {
      if (isTranscribing) {
        finishTranscription();
      }
      clearInterval(progressInterval);
    }, 32000);
  };

  const postMessageToVideo = (command: string) => {
    if (videoRef.current && videoRef.current.contentWindow) {
      videoRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: command }),
        "*"
      );
    }
  };

  const createSegment = (endTime: number) => {
    if (transcriptBufferRef.current.length > 0) {
      const segmentText = transcriptBufferRef.current.join(" ").trim();
      if (segmentText.length > 0) {
        setSegments((prev) => {
          const newSegment: TranscriptionSegment = {
            id: prev.length + 1,
            time: Math.round(segmentStartTimeRef.current),
            subtitle: segmentText,
            duration: Math.round(endTime - segmentStartTimeRef.current),
            end: Math.round(endTime),
          };
          return [...prev, newSegment];
        });

        transcriptBufferRef.current = [];
        segmentStartTimeRef.current = endTime;
      }
    }
  };

  const finishTranscription = () => {
    setIsTranscribing(false);
    setVideoPlaying(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    postMessageToVideo("pauseVideo");

    // Create final segment if there's remaining text
    const currentTime = (Date.now() - startTime) / 1000;
    const hasRemainingText =
      transcriptBufferRef.current.length > 0 &&
      transcriptBufferRef.current.join(" ").trim().length > 0;

    if (hasRemainingText) {
      createSegment(currentTime);
    }

    // Process and return segments - check both current segments and if we have captured text
    setTimeout(() => {
      // Get the latest segments state and check for any captured text
      setSegments((currentSegments) => {
        const totalCapturedText = transcriptBufferRef.current.join(" ").trim();
        const hasAnyContent =
          currentSegments.length > 0 || totalCapturedText.length > 0;

        if (hasAnyContent) {
          // Store the transcript and show viewer
          const allText =
            currentSegments.map((s) => s.subtitle).join(" ") +
            " " +
            totalCapturedText;
          setFullTranscript(allText.trim());
          setShowTranscriptViewer(true);
        } else {
          onError(
            "No speech detected during transcription. Please try again and speak clearly into your microphone."
          );
        }
        return currentSegments;
      });
    }, 500);
  };

  // Listen for video time updates
  const createPracticeSession = () => {
    // Create segments from the current segments state and complete
    const finalSegments =
      segments.length > 0
        ? segments
        : [
            {
              id: 1,
              time: 0,
              subtitle: fullTranscript,
              duration: Math.round((Date.now() - startTime) / 1000),
              end: Math.round((Date.now() - startTime) / 1000),
            },
          ];

    // Convert segments to the format expected by practice page
    const pauses = finalSegments.map((segment, index) => ({
      id: index + 1,
      time: segment.time,
      subtitle: segment.subtitle,
    }));

    if (pauses.length === 0) {
      alert("No segments found to create practice session.");
      return;
    }

    // Store data in sessionStorage for the practice page
    sessionStorage.setItem(
      "shadowPractice",
      JSON.stringify({
        videoId,
        pauses,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      })
    );

    // Navigate to practice page
    router.push("/practice");
  };

  const copyFullTranscript = () => {
    navigator.clipboard
      .writeText(fullTranscript)
      .then(() => {
        // Could add a toast notification here
        alert("Transcript copied to clipboard!");
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = fullTranscript;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Transcript copied to clipboard!");
      });
  };

  const parseTimeInput = (timeStr: string): number => {
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return parseInt(timeStr) || 0;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const addCustomPause = () => {
    if (!pauseTime.trim() || !pauseSubtitle.trim()) {
      alert("Please enter both time and subtitle");
      return;
    }

    const timeInSeconds = parseTimeInput(pauseTime.trim());
    const newPause: TranscriptionSegment = {
      id: customPauses.length + 1,
      time: timeInSeconds,
      subtitle: pauseSubtitle.trim(),
      duration: 3, // Default 3 seconds
      end: timeInSeconds + 3,
    };

    setCustomPauses((prev) =>
      [...prev, newPause].sort((a, b) => a.time - b.time)
    );
    setPauseTime("");
    setPauseSubtitle("");
  };

  const removeCustomPause = (id: number) => {
    setCustomPauses((prev) => prev.filter((p) => p.id !== id));
  };

  const saveLesson = async (pauses: any[]) => {
    if (!lessonTitle.trim()) {
      alert("Please enter a lesson title");
      return false;
    }

    // Check if user is authenticated
    if (!user) {
      alert("Please sign in to save lessons");
      return false;
    }

    if (!accessToken) {
      alert("No authentication token available. Please sign in again.");
      return false;
    }

    setIsSavingLesson(true);
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: lessonTitle.trim(),
          video_id: videoId,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          pauses,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to save lesson: ${response.status} ${errorText}`
        );
      }

      const savedLesson = await response.json();
      console.log("Lesson saved:", savedLesson);
      return true;
    } catch (error) {
      console.error("Error saving lesson:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to save lesson: ${errorMessage}. Please try again.`);
      return false;
    } finally {
      setIsSavingLesson(false);
    }
  };

  const createPracticeSessionWithCustomPauses = async () => {
    const finalSegments = customPauses.length > 0 ? customPauses : segments;
    if (finalSegments.length === 0) {
      alert("Please add at least one pause point");
      return;
    }

    // Convert segments to the format expected by practice page
    const pauses = finalSegments.map((segment, index) => ({
      id: index + 1,
      time: segment.time,
      subtitle: segment.subtitle,
    }));

    if (pauses.length === 0) {
      alert("No segments found to create practice session.");
      return;
    }

    // Save lesson to API
    const lessonSaved = await saveLesson(pauses);
    if (!lessonSaved) {
      return; // Don't proceed if lesson save failed
    }

    // Store data in sessionStorage for the practice page
    sessionStorage.setItem(
      "shadowPractice",
      JSON.stringify({
        videoId,
        pauses,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      })
    );

    // Navigate to practice page
    router.push("/practice");
  };

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "video-progress" && isTranscribing) {
          const currentTime = data.info?.currentTime || 0;
          setProgress(Math.min(100, (currentTime / 30) * 100));

          // Create segments every 5-8 seconds for natural breaks
          if (currentTime - segmentStartTimeRef.current >= 6) {
            createSegment(currentTime);
          }

          // Auto-finish when video ends or reaches 30 seconds
          if (currentTime >= 30 || data.info?.ended) {
            finishTranscription();
          }
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    },
    [isTranscribing, segments]
  );

  // Set up message listener
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [handleMessage]);

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          ref={videoRef}
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${
            typeof window !== "undefined" ? window.location.origin : ""
          }`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Transcription Controls */}
      <div className="text-center">
        {!isTranscribing ? (
          <button
            onClick={startTranscription}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg flex items-center gap-3 mx-auto transition-colors"
          >
            <Mic className="w-6 h-6" />
            🎤 Start Transcription (Speak Along)
          </button>
        ) : (
          <div className="space-y-4">
            <button
              onClick={finishTranscription}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-medium text-lg flex items-center gap-3 mx-auto animate-pulse"
            >
              <MicOff className="w-6 h-6" />
              Stop Transcription
            </button>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Transcribing...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Transcription Display */}
      {isTranscribing && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-green-600" />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              🎤 Live transcription - Speak clearly:
            </span>
          </div>
          <p className="text-gray-800 min-h-[24px] font-mono bg-white p-2 rounded border">
            {currentText ||
              "🔊 Listening for your voice... Please speak into the microphone"}
          </p>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-green-600">
              💡 Tip: Watch the video and repeat what you hear out loud for best
              results
            </p>
            <div className="text-xs text-gray-500">
              Captured: {transcriptBufferRef.current?.length || 0} phrases
            </div>
          </div>
        </div>
      )}

      {/* Transcript Viewer - After transcription completion */}
      {showTranscriptViewer && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-900">
                📄 Transcript Ready
              </h3>
              <button
                onClick={copyFullTranscript}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                📋 Copy All Text
              </button>
            </div>
          </div>

          {/* Full Transcript */}
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            <div className="text-sm text-gray-800 leading-relaxed select-all cursor-text max-h-96 overflow-y-auto">
              {fullTranscript || "No transcript available"}
            </div>
          </div>

          {/* Add Pause Points */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3">
              ➕ Add Pause Points
            </h4>
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={pauseTime}
                onChange={(e) => setPauseTime(e.target.value)}
                placeholder="0:10"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <input
                type="text"
                value={pauseSubtitle}
                onChange={(e) => setPauseSubtitle(e.target.value)}
                placeholder="Copy text from transcript above"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={addCustomPause}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                ➕ Add
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Format: M:SS (e.g., 0:10, 0:25, 0:45) - Watch video above to get
              exact timing
            </p>

            {/* Custom Pause Points List */}
            {customPauses.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-700 mb-2">
                  Pause Points ({customPauses.length}):
                </h5>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {customPauses.map((pause, index) => (
                    <div
                      key={pause.id}
                      className="flex items-center justify-between bg-white p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                          {index + 1}
                        </span>
                        <span className="font-mono text-sm bg-purple-100 px-2 py-1 rounded">
                          {formatTime(pause.time)}
                        </span>
                        <span className="text-gray-700 truncate text-sm">
                          {pause.subtitle}
                        </span>
                      </div>
                      <button
                        onClick={() => removeCustomPause(pause.id)}
                        className="text-red-500 hover:text-red-700 p-1 ml-2"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lesson Title Input */}
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Title *
            </label>
            <input
              type="text"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Enter a name for this lesson (e.g., 'Daily Greetings Practice')"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center pt-4">
            <button
              onClick={() => {
                setShowTranscriptViewer(false);
                setIsTranscribing(false);
                onError(
                  "Transcription cancelled. You can try again or use manual entry."
                );
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              ↩️ Back to Options
            </button>
            <button
              onClick={createPracticeSessionWithCustomPauses}
              disabled={isSavingLesson || !lessonTitle.trim()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isSavingLesson || !lessonTitle.trim()
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {isSavingLesson ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  ✅ Save Lesson & Start Practice{" "}
                  {customPauses.length > 0 && `(${customPauses.length} pauses)`}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Generated Segments Preview */}
      {segments.length > 0 && !showTranscriptViewer && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-800">
            Generated segments ({segments.length}):
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="bg-green-50 border border-green-200 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-mono text-sm text-green-800">
                    {Math.floor(segment.time / 60)}:
                    {(segment.time % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <p className="text-sm text-gray-800">"{segment.subtitle}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions - Only show when not transcribing and not showing transcript viewer */}
      {!isTranscribing && !showTranscriptViewer && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-2">
                📢 Important: How to make this work
              </p>
              <div className="space-y-2 text-xs">
                <div className="bg-amber-100 p-2 rounded border">
                  <p className="font-medium">
                    Option 1 - Repeat Method (Recommended):
                  </p>
                  <ul className="space-y-1 mt-1">
                    <li>• Click "Generate with Voice Recognition" to start</li>
                    <li>
                      • Watch the video and{" "}
                      <strong>repeat what you hear</strong> out loud
                    </li>
                    <li>• Speak clearly into your microphone</li>
                    <li>
                      • The system will transcribe your speech in real-time
                    </li>
                  </ul>
                </div>
                <div className="bg-amber-100 p-2 rounded border">
                  <p className="font-medium">
                    Option 2 - System Audio (Advanced):
                  </p>
                  <ul className="space-y-1 mt-1">
                    <li>
                      • Use audio routing software to redirect system audio to
                      microphone
                    </li>
                    <li>• macOS: Use BlackHole + Audio MIDI Setup</li>
                    <li>• Windows: Use VoiceMeeter or similar</li>
                    <li>• This allows direct transcription of video audio</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

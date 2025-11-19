"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, X, Wand2, Mic, AlertCircle } from "lucide-react";
import {
  formatTime,
  parseTimeInput,
  getYouTubeVideoId,
  isValidYouTubeUrl,
  extractYouTubeSubtitles,
  convertSubtitlesToPauses,
} from "@/utils/helpers";
import BrowserTranscription from "@/components/BrowserTranscription";
import ManualTranscription from "@/components/ManualTranscription";

interface Pause {
  id: number;
  time: number;
  subtitle: string;
}

export default function Home() {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState("");
  const [pauses, setPauses] = useState<Pause[]>([]);
  const [newPauseTime, setNewPauseTime] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);
  const [subtitleError, setSubtitleError] = useState("");
  const [videoInfo, setVideoInfo] = useState<{
    duration?: number;
    segments?: number;
  } | null>(null);
  const [showBrowserTranscription, setShowBrowserTranscription] =
    useState(false);
  const [showManualTranscription, setShowManualTranscription] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState("");

  // Utility functions are now imported from helpers

  const addPause = () => {
    if (newPauseTime && newSubtitle) {
      const timeInSeconds = parseTimeInput(newPauseTime);
      if (timeInSeconds <= 60) {
        // 1 minute limit
        const newPause: Pause = {
          id: Date.now(),
          time: timeInSeconds,
          subtitle: newSubtitle,
        };
        setPauses([...pauses, newPause].sort((a, b) => a.time - b.time));
        setNewPauseTime("");
        setNewSubtitle("");
      } else {
        alert("Video duration is limited to 1 minute (0:60)");
      }
    }
  };

  const removePause = (id: number) => {
    setPauses(pauses.filter((p) => p.id !== id));
  };

  const generateSubtitles = async () => {
    if (!isValidYouTubeUrl(videoUrl)) {
      setSubtitleError("Please enter a valid YouTube URL first");
      return;
    }

    setIsGeneratingSubtitles(true);
    setSubtitleError("");
    setVideoInfo(null);
    setShowBrowserTranscription(false);
    setShowManualTranscription(false);

    try {
      const result = await extractYouTubeSubtitles(videoUrl);

      if (result.success && result.subtitles) {
        const newPauses = convertSubtitlesToPauses(result.subtitles);
        setPauses(newPauses);
        setVideoInfo({
          duration: result.duration,
          segments: result.totalSegments,
        });
        setSubtitleError("");
      } else if (result.requiresBrowserTranscription) {
        // YouTube captions not available, show browser transcription option
        const videoId = getYouTubeVideoId(videoUrl);
        if (videoId) {
          setCurrentVideoId(videoId);
          setShowBrowserTranscription(true);
          setSubtitleError("");
        }
      } else {
        throw new Error(result.error || "Failed to generate subtitles");
      }
    } catch (error: any) {
      console.error("Subtitle generation error:", error);
      setSubtitleError(
        error.message ||
          "Failed to generate subtitles. Please try a different video."
      );
      setPauses([]);
      setVideoInfo(null);
    } finally {
      setIsGeneratingSubtitles(false);
    }
  };

  const handleBrowserTranscriptionComplete = (segments: any[]) => {
    const newPauses = convertSubtitlesToPauses(segments);
    setPauses(newPauses);
    setVideoInfo({
      duration:
        segments.length > 0 ? Math.max(...segments.map((s) => s.end)) : 30,
      segments: segments.length,
    });
    setShowBrowserTranscription(false);
    setSubtitleError("");
  };

  const handleBrowserTranscriptionError = (error: string) => {
    setSubtitleError(error);
    setShowBrowserTranscription(false);
  };

  const handleManualTranscriptionComplete = (segments: any[]) => {
    const newPauses = convertSubtitlesToPauses(segments);
    setPauses(newPauses);
    setVideoInfo({
      duration:
        segments.length > 0 ? Math.max(...segments.map((s) => s.end)) : 30,
      segments: segments.length,
    });
    setShowManualTranscription(false);
    setSubtitleError("");
  };

  const handleManualTranscriptionError = (error: string) => {
    setSubtitleError(error);
    setShowManualTranscription(false);
  };
  const clearSubtitles = () => {
    setPauses([]);
    setSubtitleError("");
    setVideoInfo(null);
  };

  const startPractice = () => {
    if (!isValidYouTubeUrl(videoUrl)) {
      alert("Please enter a valid YouTube URL");
      return;
    }

    const videoId = getYouTubeVideoId(videoUrl);
    if (pauses.length === 0) {
      alert("Please add at least one pause point");
      return;
    }

    // Store data in sessionStorage for the practice page
    sessionStorage.setItem(
      "shadowPractice",
      JSON.stringify({
        videoId,
        pauses,
        videoUrl,
      })
    );

    router.push("/practice");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <nav className="flex justify-between items-center mb-6 pt-4">
          <div className="text-xl font-bold text-gray-800">Shadow English</div>
          <button
            onClick={() => router.push("/lessons")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            📚 My Lessons
          </button>
        </nav>

        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Create New Lesson
          </h1>
          <p className="text-lg text-gray-600">
            Practice English pronunciation with the shadow technique
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">
            Setup Your Practice Session
          </h2>

          {/* Video URL Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube Video URL
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or https://youtube.com/shorts/..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => generateSubtitles()}
                disabled={!videoUrl || isGeneratingSubtitles}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium whitespace-nowrap"
              >
                {isGeneratingSubtitles ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Get Captions
                  </>
                )}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500">
                Supports regular videos, YouTube Shorts, and mobile URLs (max 1
                minute)
              </p>
              {videoInfo && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ Found {videoInfo.segments} segments ({videoInfo.duration}s)
                </p>
              )}
            </div>

            {/* Error Display */}
            {subtitleError && (
              <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700 flex-1">
                    <p className="font-medium">Failed to generate subtitles</p>
                    <p>{subtitleError}</p>
                  </div>
                </div>

                {/* Transcription Options */}
                {!showBrowserTranscription && !showManualTranscription && (
                  <div className="border-t border-red-200 pt-3 space-y-3">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      🎤 No captions available? Choose a transcription method:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const videoId = getYouTubeVideoId(videoUrl);
                          if (videoId) {
                            setCurrentVideoId(videoId);
                            setShowBrowserTranscription(true);
                            setSubtitleError("");
                          }
                        }}
                        className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Mic className="w-4 h-4" />
                          <span className="font-semibold">
                            🎤 Voice Transcription
                          </span>
                        </div>
                        <p className="text-xs text-blue-100">
                          Watch video and speak along - your voice will be
                          transcribed
                        </p>
                      </button>

                      <button
                        onClick={() => {
                          const videoId = getYouTubeVideoId(videoUrl);
                          if (videoId) {
                            setCurrentVideoId(videoId);
                            setShowManualTranscription(true);
                            setSubtitleError("");
                          }
                        }}
                        className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Plus className="w-4 h-4" />
                          <span className="font-semibold">✍️ Manual Entry</span>
                        </div>
                        <p className="text-xs text-green-100">
                          Watch video and type subtitles manually with timing
                        </p>
                      </button>
                    </div>

                    <p className="text-xs text-red-600">
                      Both methods will create practice segments for shadow
                      technique training.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Browser Transcription Component */}
            {showBrowserTranscription && (
              <BrowserTranscription
                videoId={currentVideoId}
                onTranscriptionComplete={handleBrowserTranscriptionComplete}
                onError={handleBrowserTranscriptionError}
              />
            )}

            {/* Manual Transcription Component */}
            {showManualTranscription && (
              <ManualTranscription
                videoId={currentVideoId}
                onTranscriptionComplete={handleManualTranscriptionComplete}
                onError={handleManualTranscriptionError}
              />
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">How it works</h3>
          <div className="space-y-3 text-gray-600">
            <div className="flex gap-3">
              <span className="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <p>
                Paste any YouTube URL (videos, Shorts, max 1 minute) and click{" "}
                <strong className="text-purple-700">"Get Captions"</strong> to
                extract subtitles automatically
              </p>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <p>
                If captions aren't available, use voice transcription or manual
                entry to create your practice session
              </p>
            </div>
            <div className="flex gap-3">
              <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <p>
                Practice by listening and repeating when the video pauses at
                each segment
              </p>
            </div>
            <div className="flex gap-3">
              <span className="bg-orange-100 text-orange-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                4
              </span>
              <p>
                Get real-time pronunciation accuracy feedback and track your
                progress
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Wand2 className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium text-purple-800 mb-1">
                  ✨ Smart Subtitle Generation
                </p>
                <p className="text-sm text-purple-700">
                  Our system first tries to extract YouTube captions. If
                  captions aren't available, you can use browser transcription
                  to generate subtitles in real-time using your device's
                  microphone and speech recognition!
                </p>
                <div className="mt-2 text-xs text-purple-600">
                  <strong>Methods:</strong> YouTube Captions → Browser
                  Transcription (100% Free)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

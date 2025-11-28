"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Play, Plus, X, Wand2, Mic, AlertCircle } from "lucide-react";
import AuthModal from "@/components/auth/AuthModal";
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

export default function CreateLesson() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [pauses, setPauses] = useState<Pause[]>([]);
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
  const [showTranscriptionMethods, setShowTranscriptionMethods] =
    useState(false);

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
        const videoId = getYouTubeVideoId(videoUrl);
        if (videoId) {
          setCurrentVideoId(videoId);
          // Show transcription methods instead of automatically starting browser transcription
          setShowTranscriptionMethods(true);
          setSubtitleError(
            "No captions available for this video. Please choose a transcription method:"
          );
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

  const handleBrowserTranscriptionError = useCallback((error: string) => {
    // Use setTimeout to avoid updating state during render
    setTimeout(() => {
      setSubtitleError(error);
      setShowBrowserTranscription(false);
      // Ensure transcription methods remain visible when going back
      setShowTranscriptionMethods(true);
    }, 0);
  }, []);

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

  const handleManualTranscriptionError = useCallback((error: string) => {
    // Use setTimeout to avoid updating state during render
    setTimeout(() => {
      setSubtitleError(error);
      setShowManualTranscription(false);
      // Ensure transcription methods remain visible when going back
      setShowTranscriptionMethods(true);
    }, 0);
  }, []);

  const requireAuth = (action: () => void) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    action();
  };

  const saveLesson = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!isValidYouTubeUrl(videoUrl)) {
      alert("Please enter a valid YouTube URL");
      return;
    }

    if (pauses.length === 0) {
      alert("Please add at least one pause point");
      return;
    }

    setIsLoading(true);

    try {
      // Get fresh session token
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        console.error("Session error:", sessionError);
        alert("Authentication error. Please sign in again.");
        setShowAuthModal(true);
        return;
      }

      const videoId = getYouTubeVideoId(videoUrl);
      const lessonData = {
        title: `YouTube Video: ${videoId}`,
        video_id: videoId,
        video_url: videoUrl,
        pauses,
      };

      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(lessonData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to save lesson");
      }

      alert("Lesson saved successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error saving lesson:", error);
      alert(
        `Failed to save lesson: ${
          error instanceof Error ? error.message : "Please try again."
        }`
      );
    } finally {
      setIsLoading(false);
    }
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

  // Redirect if not authenticated
  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Create a Lesson
              </h2>
              <p className="text-gray-600">
                Sign in to start creating your own English practice lessons
              </p>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Sign In to Continue
            </button>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signup"
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8 pt-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Create New Lesson
            </h1>
            <p className="text-lg text-gray-600">
              Create English pronunciation practice sessions with the shadow
              technique
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
                  onClick={() => {
                    generateSubtitles();
                    setShowTranscriptionMethods(true);
                  }}
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
                  Supports regular videos, YouTube Shorts, and mobile URLs (max
                  1 minute)
                </p>
                {videoInfo && (
                  <p className="text-sm text-green-600 font-medium">
                    ✓ Found {videoInfo.segments} segments ({videoInfo.duration}
                    s)
                  </p>
                )}
              </div>

              {/* Error Display */}
              {subtitleError && (
                <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-700 flex-1">
                      <p className="font-medium">
                        Failed to generate subtitles
                      </p>
                      <p>{subtitleError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transcription Method Selection */}
              {showTranscriptionMethods &&
                !isGeneratingSubtitles &&
                subtitleError &&
                !showBrowserTranscription &&
                !showManualTranscription && (
                  <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Choose Transcription Method
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Select how you'd like to create subtitles for your lesson:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          const videoId = getYouTubeVideoId(videoUrl);
                          if (videoId) {
                            setCurrentVideoId(videoId);
                            setShowBrowserTranscription(true);
                            setSubtitleError("");
                          }
                        }}
                        className="p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Mic className="w-6 h-6" />
                          <span className="text-lg font-semibold">
                            🎤 Voice Transcription
                          </span>
                        </div>
                        <p className="text-sm text-blue-100">
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
                        className="p-6 bg-green-600 hover:bg-green-700 text-white rounded-lg text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Plus className="w-6 h-6" />
                          <span className="text-lg font-semibold">
                            ✍️ Manual Entry
                          </span>
                        </div>
                        <p className="text-sm text-green-100">
                          Watch video and type subtitles manually with timing
                        </p>
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 mt-4 text-center">
                      Both methods will create practice segments for shadow
                      technique training.
                    </p>
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

          {/* Pauses Preview & Actions */}
          {pauses.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">
                  Practice Segments ({pauses.length})
                </h2>
                <button
                  onClick={clearSubtitles}
                  className="text-gray-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid gap-3 mb-6 max-h-60 overflow-y-auto">
                {pauses.map((pause) => (
                  <div
                    key={pause.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                        {formatTime(pause.time)}
                      </span>
                      <span className="text-gray-700">{pause.subtitle}</span>
                    </div>
                    <button
                      onClick={() => removePause(pause.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => requireAuth(saveLesson)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Save Lesson
                    </>
                  )}
                </button>

                <button
                  onClick={startPractice}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Practice
                </button>
              </div>
            </div>
          )}

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
                  If captions aren't available, use voice transcription or
                  manual entry to create your practice session
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
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signup"
        />
      </div>
    </>
  );
}

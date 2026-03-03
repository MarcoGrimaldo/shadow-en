"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Play,
  Plus,
  X,
  Wand2,
  AlertCircle,
  Save,
  ArrowLeft,
  Loader2,
  Shield,
} from "lucide-react";
import AuthModal from "@/components/auth/AuthModal";
import {
  formatTime,
  parseTimeInput,
  getYouTubeVideoId,
  isValidYouTubeUrl,
  extractYouTubeSubtitles,
  convertSubtitlesToPauses,
} from "@/utils/helpers";
import ManualTranscription from "@/components/ManualTranscription";

interface Pause {
  id: number;
  time: number;
  subtitle: string;
}

interface Lesson {
  id: string;
  title: string;
  video_id: string;
  video_url: string;
  pauses: Pause[];
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    username: string;
  };
}

export default function EditLesson() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.id as string;
  const { user, accessToken } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isUnauthorized, setIsUnauthorized] = useState(false);

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
  const [showManualTranscription, setShowManualTranscription] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");

  // Load lesson data
  useEffect(() => {
    const loadLesson = async () => {
      if (!lessonId) return;

      setIsLoadingLesson(true);
      setLoadError("");

      try {
        // Get fresh session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(`/api/lessons?id=${lessonId}`, {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        });

        if (!response.ok) {
          if (response.status === 404) {
            setLoadError("Lesson not found");
          } else if (response.status === 403) {
            setIsUnauthorized(true);
            setLoadError("You don't have permission to edit this lesson");
          } else {
            setLoadError("Failed to load lesson");
          }
          return;
        }

        const lessonData = await response.json();

        // Check if user is the owner
        if (user && lessonData.user_id !== user.id) {
          setIsUnauthorized(true);
          setLoadError("You can only edit lessons you created");
          return;
        }

        setLesson(lessonData);
        setVideoUrl(lessonData.video_url);
        setPauses(lessonData.pauses || []);
        setCurrentVideoId(lessonData.video_id);
        setLessonTitle(lessonData.title || "");
        setVideoInfo({
          segments: lessonData.pauses?.length || 0,
        });
      } catch (error) {
        console.error("Error loading lesson:", error);
        setLoadError("Failed to load lesson");
      } finally {
        setIsLoadingLesson(false);
      }
    };

    loadLesson();
  }, [lessonId, user]);

  const removePause = (id: number) => {
    setPauses(pauses.filter((p) => p.id !== id));
  };

  const updatePauseTime = (id: number, newTime: number) => {
    setPauses(pauses.map((p) => (p.id === id ? { ...p, time: newTime } : p)));
  };

  const updatePauseSubtitle = (id: number, newSubtitle: string) => {
    setPauses(
      pauses.map((p) => (p.id === id ? { ...p, subtitle: newSubtitle } : p))
    );
  };

  const addNewPause = () => {
    const newId = Date.now();
    const lastPauseTime =
      pauses.length > 0 ? Math.max(...pauses.map((p) => p.time)) : 0;
    setPauses([
      ...pauses,
      { id: newId, time: lastPauseTime + 5, subtitle: "" },
    ]);
  };

  const generateSubtitles = async () => {
    if (!isValidYouTubeUrl(videoUrl)) {
      setSubtitleError("Please enter a valid YouTube URL first");
      return;
    }

    setIsGeneratingSubtitles(true);
    setSubtitleError("");
    setVideoInfo(null);
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
          // Directly show manual transcription
          setShowManualTranscription(true);
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
    setTimeout(() => {
      setSubtitleError(error);
      setShowManualTranscription(false);
    }, 0);
  }, []);

  const updateLesson = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!lesson) {
      alert("No lesson loaded");
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

    if (!lessonTitle.trim()) {
      alert("Please enter a lesson title");
      return;
    }

    setIsLoading(true);

    try {
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
        id: lesson.id,
        title: lessonTitle.trim(),
        video_id: videoId,
        video_url: videoUrl,
        pauses,
      };

      const response = await fetch("/api/lessons", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(lessonData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          alert("You can only edit lessons you created");
          return;
        }
        throw new Error(responseData.error || "Failed to update lesson");
      }

      alert("Lesson updated successfully!");
      router.push("/lessons");
    } catch (error) {
      console.error("Error updating lesson:", error);
      alert(
        `Failed to update lesson: ${
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

  // Loading state
  if (isLoadingLesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Authentication Required
              </h2>
              <p className="text-gray-600">Sign in to edit lessons</p>
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
          initialMode="login"
        />
      </>
    );
  }

  // Unauthorized or error
  if (loadError || isUnauthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isUnauthorized ? "Access Denied" : "Error"}
            </h2>
            <p className="text-gray-600">{loadError}</p>
          </div>
          <button
            onClick={() => router.push("/lessons")}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lessons
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="flex items-center gap-4 mb-8 pt-8">
            <button
              onClick={() => router.push("/lessons")}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Edit Lesson</h1>
              <p className="text-gray-600">
                Update your pronunciation practice session
              </p>
            </div>
          </header>

          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">
              Edit Practice Session
            </h2>

            {/* Lesson Title Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lesson Title *
              </label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Enter a descriptive title for your lesson"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

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
                      Re-fetch Captions
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
                    ✓ {videoInfo.segments} segments
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={addNewPause}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Segment
                  </button>
                  <button
                    onClick={clearSubtitles}
                    className="text-gray-500 hover:text-red-600 transition-colors"
                    title="Clear all segments"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Click on the time or text to edit. Time format: M:SS (e.g., 0:15
                for 15 seconds)
              </p>

              <div className="grid gap-3 mb-6 max-h-80 overflow-y-auto">
                {pauses
                  .sort((a, b) => a.time - b.time)
                  .map((pause) => (
                    <div
                      key={pause.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                    >
                      {/* Editable Time Input */}
                      <input
                        type="text"
                        value={formatTime(pause.time)}
                        onChange={(e) => {
                          const timeStr = e.target.value;
                          const parsed = parseTimeInput(timeStr);
                          if (!isNaN(parsed)) {
                            updatePauseTime(pause.id, parsed);
                          }
                        }}
                        className="w-16 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0:00"
                      />

                      {/* Editable Subtitle Input */}
                      <input
                        type="text"
                        value={pause.subtitle}
                        onChange={(e) =>
                          updatePauseSubtitle(pause.id, e.target.value)
                        }
                        className="flex-1 bg-transparent text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none rounded px-2 py-1"
                        placeholder="Enter subtitle text..."
                      />

                      {/* Delete Button */}
                      <button
                        onClick={() => removePause(pause.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={updateLesson}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>

                <button
                  onClick={startPractice}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Test Practice
                </button>

                <button
                  onClick={() => router.push("/lessons")}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="login"
        />
      </div>
    </>
  );
}

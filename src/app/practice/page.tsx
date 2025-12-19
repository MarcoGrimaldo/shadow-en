"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Mic,
  MicOff,
  RotateCcw,
  Home,
  Volume2,
  AlertTriangle,
  Send,
  Keyboard,
  Chrome,
  Edit,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateTextAccuracy,
  formatTime,
  getAccuracyColor,
  getAccuracyMessage,
  isSpeechRecognitionSupported,
} from "@/utils/helpers";
import SpeechRecorder from "@/components/SpeechRecorder";
import StarRating from "@/components/StarRating";

interface Pause {
  id: number;
  time: number;
  subtitle: string;
}

interface PracticeData {
  videoId: string;
  pauses: Pause[];
  videoUrl: string;
  lessonId?: string;
}

interface PracticeResult {
  pauseId: number;
  accuracy: number;
  userText: string;
  expectedText: string;
}

export default function PracticePage() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [practiceData, setPracticeData] = useState<PracticeData | null>(null);
  const [lessonOwnerId, setLessonOwnerId] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [currentPauseIndex, setCurrentPauseIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [practiceResults, setPracticeResults] = useState<PracticeResult[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [currentRecognition, setCurrentRecognition] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [currentResult, setCurrentResult] = useState<PracticeResult | null>(
    null
  );
  const [isStartingVideo, setIsStartingVideo] = useState(true);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] =
    useState(true);
  const [manualInputMode, setManualInputMode] = useState(false);
  const [manualInputText, setManualInputText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLIFrameElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const timeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleRecognitionComplete = useCallback(
    (transcript: string) => {
      console.log("Recognition completed with transcript:", transcript);
      if (!practiceData || currentPauseIndex >= practiceData.pauses.length) {
        console.log("No practice data or invalid pause index");
        return;
      }

      const currentPause = practiceData.pauses[currentPauseIndex];
      const accuracy = calculateTextAccuracy(currentPause.subtitle, transcript);

      const result: PracticeResult = {
        pauseId: currentPause.id,
        accuracy,
        userText: transcript,
        expectedText: currentPause.subtitle,
      };

      console.log("Setting result:", result);
      setPracticeResults((prev) => [...prev, result]);
      setIsRecording(false);

      // Show results for user to review
      setCurrentResult(result);
      setShowResults(true);
    },
    [practiceData, currentPauseIndex]
  );

  // Initialize speech recognition
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        console.log(
          "Speech recognition result:",
          event.results[0][0].transcript
        );
        const transcript = event.results[0][0].transcript;
        setCurrentRecognition(transcript);
        handleRecognitionComplete(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        // Show toast and switch to manual input on any error
        setToastMessage("Voice recognition not available. Switching to text input.");
        setManualInputMode(true);
        setSpeechRecognitionSupported(false);
        // Auto-hide toast after 4 seconds
        setTimeout(() => setToastMessage(null), 4000);
      };

      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended");
        setIsRecording(false);
      };
    }
  }, [handleRecognitionComplete]);

  // Load practice data from sessionStorage
  useEffect(() => {
    const data = sessionStorage.getItem("shadowPractice");
    if (data) {
      const parsed = JSON.parse(data);
      setPracticeData(parsed);

      // Fetch lesson owner if lessonId exists
      if (parsed.lessonId) {
        fetch(`/api/lessons?id=${parsed.lessonId}`)
          .then((res) => res.json())
          .then((lesson) => {
            if (lesson && lesson.user_id) {
              setLessonOwnerId(lesson.user_id);
            }
          })
          .catch((err) => console.error("Error fetching lesson:", err));

        // Fetch user's existing rating if logged in
        if (user) {
          fetch(`/api/ratings?lesson_id=${parsed.lessonId}&user_id=${user.id}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.userRating) {
                setUserRating(data.userRating);
                setHasRated(true);
              }
            })
            .catch((err) => console.error("Error fetching rating:", err));
        }
      }
    } else {
      router.push("/");
    }
  }, [router]);

  // Initialize YouTube Player API
  useEffect(() => {
    if (typeof window !== "undefined" && !window.YT) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }
  }, []);

  // Check speech recognition support
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setSpeechRecognitionSupported(false);
      setManualInputMode(true);
    }
  }, []);

  const handleRetry = () => {
    setShowResults(false);
    setCurrentResult(null);
    setCurrentRecognition("");
    setManualInputText("");
    // Remove the last result since we're retrying
    setPracticeResults((prev) => prev.slice(0, -1));
  };

  const handleManualSubmit = () => {
    if (!manualInputText.trim()) return;
    handleRecognitionComplete(manualInputText.trim());
    setManualInputText("");
  };

  const handleNext = () => {
    setIsStartingVideo(true);
    setShowResults(false);
    setCurrentResult(null);
    setCurrentRecognition("");

    if (!practiceData) return;

    // Move to next pause or complete practice
    if (currentPauseIndex < practiceData.pauses.length - 1) {
      const nextIndex = currentPauseIndex + 1;
      setCurrentPauseIndex(nextIndex);

      // Play sequentially from previous pause time to current pause time
      const nextPause = practiceData.pauses[nextIndex];
      const previousPause = practiceData.pauses[currentPauseIndex];

      // Start from the previous pause time (or 0 for the first segment)
      const seekTime = previousPause ? previousPause.time : 0;

      console.log(
        `Moving to pause ${
          nextIndex + 1
        }, seeking to ${seekTime}s, will pause at ${nextPause.time}s`
      );

      setTimeout(() => {
        postMessageToVideo("seekTo", [seekTime, true]);
        setTimeout(() => {
          postMessageToVideo("playVideo");
          setIsVideoPlaying(true);
          setIsStartingVideo(false);

          // Fallback timer - force pause at the correct time regardless of API
          const playDuration = Math.max(
            1000,
            (nextPause.time - seekTime) * 1000
          ); // Convert to milliseconds, minimum 1 second
          console.log(
            `Setting fallback timer for ${playDuration}ms to force pause at ${nextPause.time}s`
          );

          setTimeout(() => {
            console.log("Fallback timer: Force pausing video");
            postMessageToVideo("pauseVideo");
            setIsVideoPlaying(false);
          }, playDuration);
        }, 500);
      }, 500);
    } else {
      setPracticeCompleted(true);
      postMessageToVideo("pauseVideo");
      setIsVideoPlaying(false);
    }
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      setCurrentRecognition("");
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const postMessageToVideo = (command: string, args?: any[]) => {
    if (videoRef.current?.contentWindow) {
      const message = {
        event: "command",
        func: command,
        args: args || [],
      };
      console.log("Sending command to video:", command, args);

      try {
        videoRef.current.contentWindow.postMessage(
          JSON.stringify(message),
          "*"
        );

        // Alternative method for better compatibility
        if (command === "playVideo") {
          videoRef.current.contentWindow.postMessage(
            '{"event":"command","func":"playVideo","args":[]}',
            "*"
          );
        } else if (command === "pauseVideo") {
          videoRef.current.contentWindow.postMessage(
            '{"event":"command","func":"pauseVideo","args":[]}',
            "*"
          );
        } else if (command === "seekTo" && args) {
          videoRef.current.contentWindow.postMessage(
            `{"event":"command","func":"seekTo","args":[${args[0]},true]}`,
            "*"
          );
        }
      } catch (error) {
        console.error("Error sending message to video:", error);
      }
    }
  };

  const startPracticeSession = () => {
    setSessionStarted(true);
    setCurrentPauseIndex(0);
    setPracticeResults([]);
    setPracticeCompleted(false);
    setVideoCurrentTime(0);
    setIsRecording(false);

    console.log(
      "Starting practice session with pause points:",
      practiceData?.pauses
    );

    // Initialize video from the beginning
    setTimeout(() => {
      setIsStartingVideo(true);
      postMessageToVideo("seekTo", [0, true]);
      setTimeout(() => {
        postMessageToVideo("playVideo");
        setIsVideoPlaying(true);
        setIsStartingVideo(false);
        console.log("Video should be playing now");

        // Fallback timer as backup - pause at first pause point regardless of API
        if (practiceData?.pauses && practiceData.pauses.length > 0) {
          const firstPause = practiceData.pauses[0];
          console.log(
            `Setting fallback timer to pause at ${firstPause.time} seconds`
          );
          setTimeout(() => {
            console.log(
              "Fallback timer: Attempting to pause video at first pause point"
            );
            postMessageToVideo("pauseVideo");
            setIsVideoPlaying(false);
          }, firstPause.time * 1000);
        }
      }, 1000);
    }, 500);
  };

  const restartPractice = () => {
    setSessionStarted(false);
    setCurrentPauseIndex(0);
    setPracticeResults([]);
    setPracticeCompleted(false);
    setVideoCurrentTime(0);
    setIsRecording(false);
    setCurrentRecognition("");
    setIsStartingVideo(false);

    // Pause and seek to beginning
    postMessageToVideo("pauseVideo");
    setIsVideoPlaying(false);
    setTimeout(() => {
      postMessageToVideo("seekTo", [0, true]);
    }, 300);
  };

  const goHome = () => {
    router.push("/");
  };

  const handleRating = async (rating: number) => {
    if (!user || !accessToken || !practiceData?.lessonId) {
      return;
    }

    setIsSubmittingRating(true);
    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          lesson_id: practiceData.lessonId,
          rating,
        }),
      });

      if (response.ok) {
        setUserRating(rating);
        setHasRated(true);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Initialize YouTube Player API
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load YouTube IFrame API
      if (!window.YT) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);

        (window as any).onYouTubeIframeAPIReady = () => {
          console.log("YouTube API Ready");
        };
      }

      // Handle messages from iframe
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== "https://www.youtube.com") return;

        try {
          const data = JSON.parse(event.data);
          if (data.event === "video-progress" && data.info) {
            const currentTime = data.info.currentTime;
            setVideoCurrentTime(currentTime);

            // Check for pause points with tolerance
            if (
              practiceData &&
              sessionStarted &&
              !practiceCompleted &&
              isVideoPlaying &&
              !isRecording &&
              !showResults
            ) {
              const currentPause = practiceData.pauses[currentPauseIndex];
              // Add tolerance: pause if we're within 0.5 seconds of the target time
              if (currentPause && currentTime >= currentPause.time - 0.5) {
                console.log(
                  `Pausing at ${currentTime}s for pause point at ${
                    currentPause.time
                  }s (pause ${currentPauseIndex + 1})`
                );
                postMessageToVideo("pauseVideo");
                setIsVideoPlaying(false);

                // Double-check pause after a small delay
                setTimeout(() => {
                  if (isVideoPlaying) {
                    console.log("Video still playing, forcing pause again");
                    postMessageToVideo("pauseVideo");
                    setIsVideoPlaying(false);
                  }
                }, 100);
              }
            }
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [
    practiceData,
    sessionStarted,
    currentPauseIndex,
    isVideoPlaying,
    practiceCompleted,
    isRecording,
    showResults,
  ]);

  // Start time monitoring when video is playing
  useEffect(() => {
    if (
      isVideoPlaying &&
      sessionStarted &&
      !practiceCompleted &&
      practiceData
    ) {
      // Start requesting time updates
      const interval = setInterval(() => {
        if (videoRef.current?.contentWindow) {
          videoRef.current.contentWindow.postMessage(
            '{"event":"listening","id":"widget","channel":"widget"}',
            "*"
          );
        }
      }, 100); // Check every 100ms for more accurate timing

      timeCheckIntervalRef.current = interval;

      return () => {
        if (timeCheckIntervalRef.current) {
          clearInterval(timeCheckIntervalRef.current);
          timeCheckIntervalRef.current = null;
        }
      };
    }
  }, [isVideoPlaying, sessionStarted, practiceCompleted, practiceData]);

  if (!practiceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading practice session...</p>
        </div>
      </div>
    );
  }

  const currentPause = practiceData.pauses[currentPauseIndex];
  const averageAccuracy =
    practiceResults.length > 0
      ? Math.round(
          practiceResults.reduce((sum, result) => sum + result.accuracy, 0) /
            practiceResults.length
        )
      : 0;

  // Determine if mobile modal should be shown (needs user interaction)
  const showMobileModal =
    sessionStarted &&
    !practiceCompleted &&
    ((!isVideoPlaying && !isStartingVideo) || showResults);

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-3 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Header - Compact */}
        <header className="flex justify-between items-center mb-3 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-800">Shadow Practice</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/lessons")}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              📚 Lessons
            </button>
            <button
              onClick={goHome}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="ml-2 text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Progress Indicator - Always visible on top */}
        {sessionStarted && (
          <div className="bg-white rounded-lg shadow-md p-3 mb-3 flex-shrink-0">
            <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
              <span className="font-medium">Progress</span>
              <div className="flex items-center gap-4">
                {practiceResults.length > 0 && (
                  <span>
                    Avg:{" "}
                    <strong className="text-blue-600">
                      {averageAccuracy}%
                    </strong>
                  </span>
                )}
                <span>
                  {practiceResults.length} / {practiceData.pauses.length}{" "}
                  completed
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (practiceResults.length / practiceData.pauses.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Main Content - Side by side on desktop, full video on mobile */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
          {/* Video Player - Full width on mobile, left side on desktop */}
          <div className="bg-white rounded-xl shadow-lg p-4 flex-1 lg:w-1/2 lg:flex-initial flex flex-col">
            <div className="flex-1 bg-black rounded-lg overflow-hidden relative min-h-[200px]">
              <iframe
                ref={videoRef}
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${
                  practiceData.videoId
                }?enablejsapi=1&origin=${
                  typeof window !== "undefined" ? window.location.origin : ""
                }&autoplay=0&controls=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&rel=0&widget_referrer=${
                  typeof window !== "undefined" ? window.location.origin : ""
                }`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Practice Video"
                className="absolute inset-0 w-full h-full"
              />
              {/* Overlay to prevent user interaction during session */}
              {sessionStarted && (
                <div
                  className="absolute inset-0 bg-transparent pointer-events-auto"
                  onClick={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  style={{ zIndex: 10 }}
                >
                  <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                    🔒 Controlled
                  </div>
                </div>
              )}

              {/* Mobile: Video playing indicator overlay */}
              {sessionStarted &&
                !practiceCompleted &&
                (isVideoPlaying || isStartingVideo) && (
                  <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <div className="text-white text-center">
                      <div className="animate-pulse flex items-center justify-center gap-2">
                        <Play className="w-5 h-5" />
                        <span className="text-sm">
                          {isStartingVideo
                            ? "Starting..."
                            : `Playing to ${formatTime(
                                currentPause?.time || 0
                              )}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Control Button - Only show when not started */}
            {!sessionStarted && (
              <div className="text-center mt-4 flex-shrink-0">
                <button
                  onClick={startPracticeSession}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                >
                  <Play className="w-5 h-5" />
                  Start Shadow Practice
                </button>
              </div>
            )}

            {/* Restart button when session active - Desktop only inline, mobile in modal */}
            {sessionStarted && !practiceCompleted && (
              <div className="hidden lg:flex justify-center mt-3 flex-shrink-0">
                <button
                  onClick={restartPractice}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart
                </button>
              </div>
            )}
          </div>

          {/* Practice Interface - Right side on desktop only (hidden on mobile, shown in modal) */}
          <div className="hidden lg:flex lg:w-1/2 flex-col min-h-0">
            {/* Practice Interface */}
            {sessionStarted && !practiceCompleted && (
              <div className="bg-white rounded-xl shadow-lg p-4 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-center gap-2 mb-3 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                    Pause {currentPauseIndex + 1} of{" "}
                    {practiceData.pauses.length}
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-center overflow-auto">
                  {/* Show Results */}
                  {showResults && currentResult ? (
                    <div className="space-y-4">
                      {/* Accuracy Score */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl text-center">
                        <div className="text-4xl font-bold mb-1">
                          <span
                            className={`${getAccuracyColor(
                              currentResult.accuracy
                            )}`}
                          >
                            {currentResult.accuracy}%
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                          {getAccuracyMessage(currentResult.accuracy)}
                        </div>
                      </div>

                      {/* Comparison */}
                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="text-xs font-medium text-green-800 mb-1">
                            Expected:
                          </div>
                          <div className="text-gray-800 text-sm">
                            "{currentResult.expectedText}"
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-xs font-medium text-blue-800 mb-1">
                            You said:
                          </div>
                          <div className="text-gray-800 text-sm">
                            "{currentResult.userText}"
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={handleRetry}
                          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Retry
                        </button>
                        <button
                          onClick={handleNext}
                          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Next
                        </button>
                      </div>
                    </div>
                  ) : !isVideoPlaying && !showResults && !isStartingVideo ? (
                    <div className="space-y-4">
                      {/* Browser not supported warning */}
                      {!speechRecognitionSupported && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-amber-800 mb-1">
                                Speech recognition not available
                              </p>
                              <p className="text-amber-700 text-xs">
                                Your browser doesn't support voice input. Use{" "}
                                <strong>Safari</strong> on iOS or{" "}
                                <strong>Chrome</strong> on desktop/Android for
                                voice recording.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mode toggle if speech recognition is supported */}
                      {speechRecognitionSupported && (
                        <div className="flex justify-center">
                          <button
                            onClick={() => setManualInputMode(!manualInputMode)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            {manualInputMode ? (
                              <>
                                <Mic className="w-3 h-3" />
                                Switch to voice input
                              </>
                            ) : (
                              <>
                                <Keyboard className="w-3 h-3" />
                                Switch to text input
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Voice or Manual Input */}
                      {manualInputMode ? (
                        <div className="space-y-3">
                          {/* Prompt */}
                          <div className="flex items-center justify-center gap-2">
                            <Volume2 className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-600">
                              Type what you heard:
                            </span>
                          </div>

                          {/* Text Input */}
                          <div className="space-y-2">
                            <textarea
                              value={manualInputText}
                              onChange={(e) =>
                                setManualInputText(e.target.value)
                              }
                              placeholder="Type what you heard..."
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              rows={3}
                            />
                            <button
                              onClick={handleManualSubmit}
                              disabled={!manualInputText.trim()}
                              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                                manualInputText.trim()
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
                              }`}
                            >
                              <Send className="w-5 h-5" />
                              Submit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <SpeechRecorder
                          isRecording={isRecording}
                          onStartRecording={startRecording}
                          onStopRecording={stopRecording}
                          currentText={currentRecognition}
                          expectedText={currentPause?.subtitle || ""}
                          disabled={isVideoPlaying}
                        />
                      )}
                    </div>
                  ) : !showResults ? (
                    <div className="text-center py-6">
                      <div className="animate-pulse">
                        <Play className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                        <p className="text-lg text-gray-600">
                          {isStartingVideo
                            ? "Starting video..."
                            : "Video is playing..."}
                        </p>
                        <p className="text-sm text-gray-500">
                          {isStartingVideo
                            ? "Please wait"
                            : "Listen carefully and get ready to repeat"}
                        </p>
                        {!isStartingVideo && (
                          <p className="text-xs text-gray-400 mt-2">
                            Will pause at {formatTime(currentPause?.time || 0)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Practice Completed */}
            {practiceCompleted && (
              <div className="bg-white rounded-xl shadow-lg p-4 flex-1 flex flex-col overflow-hidden">
                <div className="text-center mb-4 flex-shrink-0">
                  <h2 className="text-2xl font-bold text-green-600 mb-1">
                    🎉 Practice Completed!
                  </h2>
                  <p className="text-lg text-gray-700">
                    Average Accuracy:{" "}
                    <span className="font-bold text-green-600">
                      {averageAccuracy}%
                    </span>
                  </p>
                </div>

                {/* Rate This Lesson */}
                {practiceData?.lessonId && user && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {hasRated ? "Thanks for rating!" : "Rate this lesson:"}
                      </p>
                      <div className="flex justify-center">
                        <StarRating
                          rating={userRating}
                          onRate={handleRating}
                          readonly={isSubmittingRating}
                          size="lg"
                        />
                      </div>
                      {hasRated && (
                        <p className="text-xs text-gray-500 mt-1">
                          You rated this {userRating} star
                          {userRating !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Results Summary - Scrollable */}
                <div className="flex-1 overflow-auto mb-4">
                  <h3 className="text-sm font-semibold mb-2 sticky top-0 bg-white">
                    Results Summary:
                  </h3>
                  <div className="space-y-2">
                    {practiceResults.map((result, index) => (
                      <div
                        key={result.pauseId}
                        className="bg-gray-50 p-3 rounded-lg"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-sm">
                            Pause {index + 1}
                          </span>
                          <span
                            className={`font-bold text-sm ${getAccuracyColor(
                              result.accuracy
                            )}`}
                          >
                            {result.accuracy}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <div>
                            <strong>Expected:</strong> "{result.expectedText}"
                          </div>
                          <div>
                            <strong>You said:</strong> "{result.userText}"
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-center flex-shrink-0 flex-wrap">
                  <button
                    onClick={restartPractice}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Practice Again
                  </button>
                  <button
                    onClick={goHome}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                  >
                    <Home className="w-4 h-4" />
                    New Session
                  </button>
                  {practiceData?.lessonId &&
                    user &&
                    lessonOwnerId === user.id && (
                      <button
                        onClick={() =>
                          router.push(`/edit/${practiceData.lessonId}`)
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Practice
                      </button>
                    )}
                </div>
              </div>
            )}

            {/* Start Prompt - When session not started */}
            {!sessionStarted && (
              <div className="bg-white rounded-xl shadow-lg p-6 flex-1 flex flex-col justify-center items-center">
                <div className="text-center">
                  <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Ready to Practice?
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Click "Start Shadow Practice" to begin
                  </p>
                  <p className="text-xs text-gray-400">
                    {practiceData.pauses.length} pause points • Listen and
                    repeat
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Modal - Practice Interface */}
      {showMobileModal && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Modal Content - Slides up from bottom */}
          <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Modal Header */}
            <div className="px-4 pb-3 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                  Pause {currentPauseIndex + 1} of {practiceData.pauses.length}
                </span>
                <button
                  onClick={restartPractice}
                  className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-700 text-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restart
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4">
              {/* Show Results */}
              {showResults && currentResult ? (
                <div className="space-y-4">
                  {/* Accuracy Score */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl text-center">
                    <div className="text-5xl font-bold mb-1">
                      <span
                        className={`${getAccuracyColor(
                          currentResult.accuracy
                        )}`}
                      >
                        {currentResult.accuracy}%
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {getAccuracyMessage(currentResult.accuracy)}
                    </div>
                  </div>

                  {/* Comparison */}
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-xs font-medium text-green-800 mb-1">
                        Expected:
                      </div>
                      <div className="text-gray-800 text-sm">
                        "{currentResult.expectedText}"
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-xs font-medium text-blue-800 mb-1">
                        You said:
                      </div>
                      <div className="text-gray-800 text-sm">
                        "{currentResult.userText}"
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleRetry}
                      className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Retry
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Next
                    </button>
                  </div>
                </div>
              ) : !isVideoPlaying && !showResults && !isStartingVideo ? (
                <div className="py-4 space-y-4">
                  {/* Browser not supported warning */}
                  {!speechRecognitionSupported && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800 mb-1">
                            Speech recognition not available
                          </p>
                          <p className="text-amber-700 text-xs">
                            Use <strong>Safari</strong> on iOS or{" "}
                            <strong>Chrome</strong> on desktop/Android for voice
                            recording.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode toggle if speech recognition is supported */}
                  {speechRecognitionSupported && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setManualInputMode(!manualInputMode)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {manualInputMode ? (
                          <>
                            <Mic className="w-3 h-3" />
                            Switch to voice input
                          </>
                        ) : (
                          <>
                            <Keyboard className="w-3 h-3" />
                            Switch to text input
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Voice or Manual Input */}
                  {manualInputMode ? (
                    <div className="space-y-3">
                      {/* Prompt */}
                      <div className="flex items-center justify-center gap-2">
                        <Volume2 className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">
                          Type what you heard:
                        </span>
                      </div>

                      {/* Text Input */}
                      <div className="space-y-2">
                        <textarea
                          value={manualInputText}
                          onChange={(e) => setManualInputText(e.target.value)}
                          placeholder="Type what you heard..."
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
                          rows={2}
                        />
                        <button
                          onClick={handleManualSubmit}
                          disabled={!manualInputText.trim()}
                          className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                            manualInputText.trim()
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          <Send className="w-5 h-5" />
                          Submit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <SpeechRecorder
                      isRecording={isRecording}
                      onStartRecording={startRecording}
                      onStopRecording={stopRecording}
                      currentText={currentRecognition}
                      expectedText={currentPause?.subtitle || ""}
                      disabled={isVideoPlaying}
                    />
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Modal - Practice Completed */}
      {practiceCompleted && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Modal Content */}
          <div className="relative w-full max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 text-center border-b flex-shrink-0">
              <h2 className="text-2xl font-bold text-green-600 mb-1">
                🎉 Practice Completed!
              </h2>
              <p className="text-lg text-gray-700">
                Average Accuracy:{" "}
                <span className="font-bold text-green-600">
                  {averageAccuracy}%
                </span>
              </p>

              {/* Rate This Lesson - Mobile */}
              {practiceData?.lessonId && user && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {hasRated ? "Thanks for rating!" : "Rate this lesson:"}
                  </p>
                  <div className="flex justify-center">
                    <StarRating
                      rating={userRating}
                      onRate={handleRating}
                      readonly={isSubmittingRating}
                      size="lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Results Summary - Scrollable */}
            <div className="flex-1 overflow-auto p-4">
              <h3 className="text-sm font-semibold mb-2">Results Summary:</h3>
              <div className="space-y-2">
                {practiceResults.map((result, index) => (
                  <div
                    key={result.pauseId}
                    className="bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">
                        Pause {index + 1}
                      </span>
                      <span
                        className={`font-bold text-sm ${getAccuracyColor(
                          result.accuracy
                        )}`}
                      >
                        {result.accuracy}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div>
                        <strong>Expected:</strong> "{result.expectedText}"
                      </div>
                      <div>
                        <strong>You said:</strong> "{result.userText}"
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t flex flex-col gap-3 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={restartPractice}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
                >
                  <RotateCcw className="w-5 h-5" />
                  Practice Again
                </button>
                <button
                  onClick={goHome}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium"
                >
                  <Home className="w-5 h-5" />
                  New Session
                </button>
              </div>
              {practiceData?.lessonId && user && lessonOwnerId === user.id && (
                <button
                  onClick={() => router.push(`/edit/${practiceData.lessonId}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium"
                >
                  <Edit className="w-5 h-5" />
                  Edit Practice
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS for slide-up animation */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

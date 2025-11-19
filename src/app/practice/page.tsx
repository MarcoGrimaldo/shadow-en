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
} from "lucide-react";
import {
  calculateTextAccuracy,
  formatTime,
  getAccuracyColor,
  getAccuracyMessage,
  isSpeechRecognitionSupported,
} from "@/utils/helpers";
import SpeechRecorder from "@/components/SpeechRecorder";

interface Pause {
  id: number;
  time: number;
  subtitle: string;
}

interface PracticeData {
  videoId: string;
  pauses: Pause[];
  videoUrl: string;
}

interface PracticeResult {
  pauseId: number;
  accuracy: number;
  userText: string;
  expectedText: string;
}

export default function PracticePage() {
  const router = useRouter();
  const [practiceData, setPracticeData] = useState<PracticeData | null>(null);
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
      setPracticeData(JSON.parse(data));
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
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome or Safari for the best experience."
      );
    }
  }, []);

  const handleRetry = () => {
    setShowResults(false);
    setCurrentResult(null);
    setCurrentRecognition("");
    // Remove the last result since we're retrying
    setPracticeResults((prev) => prev.slice(0, -1));
  };

  const handleNext = () => {
    setShowResults(false);
    setCurrentResult(null);
    setCurrentRecognition("");

    if (!practiceData) return;

    // Move to next pause or complete practice
    if (currentPauseIndex < practiceData.pauses.length - 1) {
      const nextIndex = currentPauseIndex + 1;
      setCurrentPauseIndex(nextIndex);

      // Seek to just before the next pause point and resume playbook
      const nextPause = practiceData.pauses[nextIndex];
      const seekTime = Math.max(0, nextPause.time - 2); // Start 2 seconds before next pause

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

          // Fallback timer - force pause at the correct time regardless of API
          const playDuration = (nextPause.time - seekTime) * 1000; // Convert to milliseconds
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
      postMessageToVideo("seekTo", [0, true]);
      setTimeout(() => {
        postMessageToVideo("playVideo");
        setIsVideoPlaying(true);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-6 pt-4">
          <h1 className="text-2xl font-bold text-gray-800">Shadow Practice</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/lessons")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              📚 My Lessons
            </button>
            <button
              onClick={goHome}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </header>

        {/* Video Player */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="aspect-video mb-4 bg-black rounded-lg overflow-hidden relative">
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
                  🔒 Video Controlled by App
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          {!sessionStarted ? (
            <div className="text-center">
              <button
                onClick={startPracticeSession}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-medium text-lg flex items-center gap-3 mx-auto"
              >
                <Play className="w-6 h-6" />
                Start Shadow Practice
              </button>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <button
                onClick={restartPractice}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <RotateCcw className="w-4 h-4" />
                Restart
              </button>
            </div>
          )}
        </div>

        {/* Practice Interface */}
        {sessionStarted && !practiceCompleted && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-sm font-medium text-gray-600">
                  Pause {currentPauseIndex + 1} of {practiceData.pauses.length}
                </span>
              </div>

              {/* Current subtitle display */}
              {currentPause && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-blue-600 font-medium mb-2">
                      Current Subtitle (at {formatTime(currentPause.time)}):
                    </div>
                    <div className="text-lg font-semibold text-blue-900">
                      "{currentPause.subtitle}"
                    </div>
                  </div>
                </div>
              )}

              {/* Show Results */}
              {showResults && currentResult ? (
                <div className="space-y-6">
                  {/* Accuracy Score */}
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold mb-2">
                        <span
                          className={`${getAccuracyColor(
                            currentResult.accuracy
                          )}`}
                        >
                          {currentResult.accuracy}%
                        </span>
                      </div>
                      <div className="text-lg font-medium text-gray-700">
                        {getAccuracyMessage(currentResult.accuracy)}
                      </div>
                    </div>
                  </div>

                  {/* Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm font-medium text-green-800 mb-2">
                        Expected:
                      </div>
                      <div className="text-gray-800 font-medium">
                        "{currentResult.expectedText}"
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 mb-2">
                        You said:
                      </div>
                      <div className="text-gray-800 font-medium">
                        "{currentResult.userText}"
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={handleRetry}
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Retry
                    </button>
                    <button
                      onClick={handleNext}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Next
                    </button>
                  </div>
                </div>
              ) : !isVideoPlaying && !showResults ? (
                <SpeechRecorder
                  isRecording={isRecording}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                  currentText={currentRecognition}
                  expectedText={currentPause?.subtitle || ""}
                  disabled={isVideoPlaying}
                />
              ) : !showResults ? (
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <Play className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                    <p className="text-lg text-gray-600">Video is playing...</p>
                    <p className="text-sm text-gray-500">
                      Listen carefully and get ready to repeat
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Will pause at {formatTime(currentPause?.time || 0)}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Practice Completed */}
        {practiceCompleted && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-green-600 mb-2">
                🎉 Practice Completed!
              </h2>
              <p className="text-xl text-gray-700 mb-4">
                Average Accuracy:{" "}
                <span className="font-bold text-green-600">
                  {averageAccuracy}%
                </span>
              </p>
            </div>

            {/* Results Summary */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold">Results Summary:</h3>
              {practiceResults.map((result, index) => (
                <div key={result.pauseId} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Pause {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold ${getAccuracyColor(
                          result.accuracy
                        )}`}
                      >
                        {result.accuracy}%
                      </span>
                      <span className="text-sm">
                        {getAccuracyMessage(result.accuracy)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
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

            <div className="flex gap-4 justify-center">
              <button
                onClick={restartPractice}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <RotateCcw className="w-5 h-5" />
                Practice Again
              </button>
              <button
                onClick={goHome}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                <Home className="w-5 h-5" />
                New Session
              </button>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {sessionStarted && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>
                {practiceResults.length} / {practiceData.pauses.length}{" "}
                completed
              </span>
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
            {practiceResults.length > 0 && (
              <div className="mt-2 text-center">
                <span className="text-sm text-gray-600">
                  Current average: <strong>{averageAccuracy}%</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

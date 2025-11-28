"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Save,
  Clock,
  Type,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface PausePoint {
  id: number;
  time: number;
  subtitle: string;
}

interface ManualTranscriptionProps {
  videoId: string;
  onTranscriptionComplete: (segments: PausePoint[]) => void;
  onError: (error: string) => void;
}

export default function ManualTranscription({
  videoId,
  onTranscriptionComplete,
  onError,
}: ManualTranscriptionProps) {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [pausePoints, setPausePoints] = useState<PausePoint[]>([
    { id: 1, time: 5, subtitle: "" },
  ]);
  const [currentSegmentId, setCurrentSegmentId] = useState(1);
  const [lessonTitle, setLessonTitle] = useState("");
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const videoRef = useRef<HTMLIFrameElement>(null);

  const addPausePoint = () => {
    const lastPause = pausePoints[pausePoints.length - 1];
    const newTime = lastPause ? lastPause.time + 5 : 5;
    const newPause: PausePoint = {
      id: pausePoints.length + 1,
      time: newTime,
      subtitle: "",
    };
    setPausePoints([...pausePoints, newPause]);
  };

  const removePausePoint = (id: number) => {
    if (pausePoints.length > 1) {
      setPausePoints(pausePoints.filter((pause) => pause.id !== id));
    }
  };

  const updatePausePoint = (
    id: number,
    field: keyof PausePoint,
    value: any
  ) => {
    setPausePoints(
      pausePoints.map((pause) => {
        if (pause.id === id) {
          return { ...pause, [field]: value };
        }
        return pause;
      })
    );
  };

  const seekToTime = (time: number) => {
    if (videoRef.current && videoRef.current.contentWindow) {
      videoRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [time, true],
        }),
        "*"
      );
    }
  };

  const saveLesson = async () => {
    console.log("🚀 saveLesson called!");

    if (isSavingLesson) {
      console.log("❌ Already saving, returning");
      return;
    }

    if (!lessonTitle.trim()) {
      console.log("❌ No title provided");
      alert("Please enter a lesson title");
      return;
    }

    const validPauses = pausePoints.filter(
      (pause) => pause.subtitle.trim().length > 0
    );
    console.log(
      "📝 Valid pause points:",
      validPauses.length,
      "out of",
      pausePoints.length
    );

    if (validPauses.length === 0) {
      console.log("❌ No valid pause points found");
      onError("Please add at least one pause point with text");
      return;
    }
    console.log("✅ Segments validation passed");

    console.log("👤 User check:", !!user, user?.id);
    if (!user) {
      console.log("❌ No user found");
      alert("Please sign in to save lessons");
      return;
    }
    console.log("✅ User validation passed");

    console.log("🔄 Setting saving state to true");
    setIsSavingLesson(true);

    console.log("🎯 Entering try block");
    try {
      console.log("🔑 Using accessToken from AuthContext...");

      if (!accessToken) {
        console.log("❌ No access token available from AuthContext");
        throw new Error(
          "No authentication token available. Please sign in again."
        );
      }

      console.log(
        "✅ Got access token from context:",
        accessToken.length,
        "characters"
      );
      console.log("✅ Authentication ready - proceeding with save!");

      const pauses = validPauses
        .sort((a, b) => a.time - b.time)
        .map((pause, index) => ({ ...pause, id: index + 1 }));

      if (pauses.length === 0) {
        throw new Error("No valid pause points found.");
      }

      const lessonData = {
        title: lessonTitle.trim(),
        video_id: videoId,
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
        pauses,
      };

      console.log("🚀 Making API call to /api/lessons...");
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(lessonData),
      });

      console.log(
        "📡 API call completed:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to save lesson: ${response.status} ${errorText}`
        );
      }

      const savedLesson = await response.json();

      sessionStorage.setItem(
        "shadowPractice",
        JSON.stringify({
          videoId,
          pauses,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        })
      );

      router.push("/practice");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to save lesson: ${errorMessage}`);
    } finally {
      setIsSavingLesson(false);
    }
  };

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

      {/* Manual Subtitle Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">➕ Add Pause Points</h3>
          <button
            onClick={addPausePoint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Pause Points List */}
        {pausePoints.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {pausePoints
              .slice()
              .reverse()
              .map((pause, reverseIndex) => {
                const originalIndex = pausePoints.length - 1 - reverseIndex;
                return (
                  <div
                    key={pause.id}
                    className="flex items-center justify-between bg-white p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                        {originalIndex + 1}
                      </span>
                      <input
                        type="text"
                        value={
                          Math.floor(pause.time / 60) +
                          ":" +
                          (pause.time % 60).toString().padStart(2, "0")
                        }
                        onChange={(e) => {
                          const parts = e.target.value.split(":");
                          if (parts.length === 2) {
                            const minutes = parseInt(parts[0]) || 0;
                            const seconds = parseInt(parts[1]) || 0;
                            updatePausePoint(
                              pause.id,
                              "time",
                              minutes * 60 + seconds
                            );
                          }
                        }}
                        placeholder="0:10"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm font-mono bg-purple-100"
                      />
                      <input
                        type="text"
                        value={pause.subtitle}
                        onChange={(e) =>
                          updatePausePoint(pause.id, "subtitle", e.target.value)
                        }
                        placeholder="Copy text from transcript above"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <button
                      onClick={() => removePausePoint(pause.id)}
                      className="text-red-500 hover:text-red-700 p-1 ml-2"
                    >
                      ❌
                    </button>
                  </div>
                );
              })}
          </div>
        )}

        {/* Lesson Title Input */}
        <div className="pt-4 border-t">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lesson Title *
          </label>
          <input
            type="text"
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="Enter a name for this lesson (e.g., 'Manual Pronunciation Practice')"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            required
          />
        </div>

        {/* Generate Button */}
        <div className="text-center">
          <button
            onClick={saveLesson}
            disabled={isSavingLesson || !lessonTitle.trim()}
            className={`px-8 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors ${
              isSavingLesson || !lessonTitle.trim()
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isSavingLesson ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving Lesson...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />✅ Save Lesson & Start Practice (
                {pausePoints.filter((p) => p.subtitle.trim()).length} pauses)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Manual subtitle creation:</p>
            <ul className="space-y-1 text-xs">
              <li>• Play the video and listen to the content</li>
              <li>• Set the start time and duration for each subtitle</li>
              <li>• Enter the text you hear in each segment</li>
              <li>• Use the play button (▶️) to seek to specific times</li>
              <li>• Add more segments as needed</li>
              <li>• Generate your practice session when ready</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

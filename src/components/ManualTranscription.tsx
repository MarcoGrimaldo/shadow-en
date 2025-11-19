"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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

interface TranscriptionSegment {
  id: number;
  time: number;
  subtitle: string;
  duration: number;
  end: number;
}

interface ManualTranscriptionProps {
  videoId: string;
  onTranscriptionComplete: (segments: TranscriptionSegment[]) => void;
  onError: (error: string) => void;
}

export default function ManualTranscription({
  videoId,
  onTranscriptionComplete,
  onError,
}: ManualTranscriptionProps) {
  const router = useRouter();
  const [segments, setSegments] = useState<TranscriptionSegment[]>([
    { id: 1, time: 0, subtitle: "", duration: 5, end: 5 },
  ]);
  const [currentSegmentId, setCurrentSegmentId] = useState(1);
  const [lessonTitle, setLessonTitle] = useState("");
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const videoRef = useRef<HTMLIFrameElement>(null);

  const addSegment = () => {
    const lastSegment = segments[segments.length - 1];
    const newStartTime = lastSegment ? lastSegment.end : 0;
    const newSegment: TranscriptionSegment = {
      id: segments.length + 1,
      time: newStartTime,
      subtitle: "",
      duration: 5,
      end: newStartTime + 5,
    };
    setSegments([...segments, newSegment]);
  };

  const removeSegment = (id: number) => {
    if (segments.length > 1) {
      setSegments(segments.filter((seg) => seg.id !== id));
    }
  };

  const updateSegment = (
    id: number,
    field: keyof TranscriptionSegment,
    value: any
  ) => {
    setSegments(
      segments.map((seg) => {
        if (seg.id === id) {
          const updated = { ...seg, [field]: value };
          if (field === "time" || field === "duration") {
            updated.end = updated.time + updated.duration;
          }
          return updated;
        }
        return seg;
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
    if (!lessonTitle.trim()) {
      alert("Please enter a lesson title");
      return;
    }

    const validSegments = segments.filter(
      (seg) => seg.subtitle.trim().length > 0
    );

    if (validSegments.length === 0) {
      onError("Please add at least one subtitle segment with text");
      return;
    }

    // Sort segments by time and validate
    const sortedSegments = validSegments
      .sort((a, b) => a.time - b.time)
      .map((seg, index) => ({ ...seg, id: index + 1 }));

    // Convert to pause format
    const pauses = sortedSegments.map((segment) => ({
      id: segment.id,
      time: segment.time,
      subtitle: segment.subtitle,
    }));

    setIsSavingLesson(true);
    try {
      // Save lesson to API
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: lessonTitle.trim(),
          videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          pauses,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save lesson");
      }

      const savedLesson = await response.json();
      console.log("Lesson saved:", savedLesson);

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
    } catch (error) {
      console.error("Error saving lesson:", error);
      alert("Failed to save lesson. Please try again.");
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
          <h3 className="text-lg font-semibold">Manual Subtitle Editor</h3>
          <button
            onClick={addSegment}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Segment
          </button>
        </div>

        {/* Segments List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className={`border-2 rounded-lg p-4 transition-colors ${
                currentSegmentId === segment.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Time Controls */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">
                    Start Time (seconds)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={segment.time}
                      onChange={(e) =>
                        updateSegment(
                          segment.id,
                          "time",
                          Number(e.target.value)
                        )
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.5"
                    />
                    <button
                      onClick={() => seekToTime(segment.time)}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                      title="Seek to this time"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={segment.duration}
                    onChange={(e) =>
                      updateSegment(
                        segment.id,
                        "duration",
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min="1"
                    step="0.5"
                  />
                </div>

                {/* Subtitle Text */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-medium text-gray-700">
                    Subtitle Text
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={segment.subtitle}
                      onChange={(e) =>
                        updateSegment(segment.id, "subtitle", e.target.value)
                      }
                      placeholder="Enter subtitle text..."
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                      rows={2}
                      onFocus={() => setCurrentSegmentId(segment.id)}
                    />
                    <button
                      onClick={() => removeSegment(segment.id)}
                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs self-start"
                      title="Remove segment"
                      disabled={segments.length === 1}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Time Preview */}
              <div className="mt-2 text-xs text-gray-500">
                {Math.floor(segment.time / 60)}:
                {(segment.time % 60).toFixed(1).padStart(4, "0")} →{" "}
                {Math.floor(segment.end / 60)}:
                {(segment.end % 60).toFixed(1).padStart(4, "0")}
              </div>
            </div>
          ))}
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
                <Save className="w-5 h-5" />
                Save Lesson & Start Practice (
                {segments.filter((s) => s.subtitle.trim()).length} segments)
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

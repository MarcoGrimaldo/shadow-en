"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Trash2,
  Calendar,
  Clock,
  Video,
  Plus,
  Home,
  BookOpen,
  Loader2,
} from "lucide-react";

interface Pause {
  id: number;
  time: number;
  subtitle: string;
}

interface Lesson {
  id: string;
  title: string;
  videoId: string;
  videoUrl: string;
  pauses: Pause[];
  createdAt: string;
  updatedAt: string;
}

export default function LessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);

  // Load lessons on component mount
  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/lessons");
      if (response.ok) {
        const lessonsData = await response.json();
        setLessons(lessonsData);
      } else {
        console.error("Failed to load lessons");
      }
    } catch (error) {
      console.error("Error loading lessons:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this lesson? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingLessonId(lessonId);
    try {
      const response = await fetch(`/api/lessons?id=${lessonId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
      } else {
        alert("Failed to delete lesson. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      alert("Failed to delete lesson. Please try again.");
    } finally {
      setDeletingLessonId(null);
    }
  };

  const startPractice = (lesson: Lesson) => {
    // Store lesson data in sessionStorage for practice page
    sessionStorage.setItem(
      "shadowPractice",
      JSON.stringify({
        videoId: lesson.videoId,
        pauses: lesson.pauses,
        videoUrl: lesson.videoUrl,
      })
    );

    // Navigate to practice page
    router.push("/practice");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const getThumbnailUrl = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your lessons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pt-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">My Lessons</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Lesson
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </header>

        {/* Empty State */}
        {lessons.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">
              No lessons yet
            </h2>
            <p className="text-gray-500 mb-6">
              Create your first lesson to start practicing English with the
              shadow technique!
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Lesson
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {lessons.length}
                  </div>
                  <div className="text-gray-600">Total Lessons</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {lessons.reduce(
                      (total, lesson) => total + lesson.pauses.length,
                      0
                    )}
                  </div>
                  <div className="text-gray-600">Practice Segments</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {Math.round(
                      lessons.reduce((total, lesson) => {
                        const maxTime = Math.max(
                          ...lesson.pauses.map((p) => p.time),
                          0
                        );
                        return total + maxTime;
                      }, 0) / 60
                    )}
                  </div>
                  <div className="text-gray-600">Minutes of Content</div>
                </div>
              </div>
            </div>

            {/* Lessons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* Video Thumbnail */}
                  <div className="relative aspect-video bg-gray-900">
                    <img
                      src={getThumbnailUrl(lesson.videoId)}
                      alt={lesson.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://img.youtube.com/vi/${lesson.videoId}/hqdefault.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
                      {lesson.pauses.length} segments
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2 line-clamp-2">
                      {lesson.title}
                    </h3>

                    {/* Lesson Info */}
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>YouTube Video</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{lesson.pauses.length} practice segments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Created {formatDate(lesson.createdAt)}</span>
                      </div>
                    </div>

                    {/* Sample Subtitles Preview */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Sample segments:
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        {lesson.pauses.slice(0, 2).map((pause, index) => (
                          <div key={pause.id} className="truncate">
                            <span className="text-blue-600 font-mono text-xs">
                              {Math.floor(pause.time / 60)}:
                              {(pause.time % 60).toFixed(0).padStart(2, "0")}
                            </span>{" "}
                            "{pause.subtitle}"
                          </div>
                        ))}
                        {lesson.pauses.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{lesson.pauses.length - 2} more segments...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startPractice(lesson)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Practice
                      </button>
                      <button
                        onClick={() => deleteLesson(lesson.id)}
                        disabled={deletingLessonId === lesson.id}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingLessonId === lesson.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

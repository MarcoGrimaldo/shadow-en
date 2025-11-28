"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Play, Calendar, User, Clock } from "lucide-react";
import { formatTime } from "@/utils/helpers";

interface Lesson {
  id: string;
  title: string;
  video_id: string;
  video_url: string;
  pauses: Array<{
    id: number;
    time: number;
    subtitle: string;
  }>;
  created_at: string;
  users?: {
    username: string;
  };
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/lessons");

      if (!response.ok) {
        throw new Error("Failed to fetch lessons");
      }

      const data = await response.json();
      setLessons(Array.isArray(data) ? data : data.lessons || []);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      setError("Failed to load lessons");
    } finally {
      setLoading(false);
    }
  };

  const startPractice = (lesson: Lesson) => {
    // Store data in sessionStorage for the practice page
    sessionStorage.setItem(
      "shadowPractice",
      JSON.stringify({
        videoId: lesson.video_id,
        pauses: lesson.pauses,
        videoUrl: lesson.video_url,
      })
    );

    router.push("/practice");
  };

  const getTotalDuration = (pauses: any[]) => {
    if (!pauses || pauses.length === 0) return 0;
    return Math.max(...pauses.map((p) => p.time)) + 5; // Add 5 seconds buffer
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lessons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Shadow English
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Improve your English pronunciation with the shadow technique.
            Practice with lessons created by our community or create your own.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-blue-600">
              {lessons.length}
            </div>
            <div className="text-gray-600">Total Lessons</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {lessons.reduce(
                (acc, lesson) => acc + (lesson.pauses?.length || 0),
                0
              )}
            </div>
            <div className="text-gray-600">Practice Segments</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-purple-600">
              {Math.round(
                lessons.reduce(
                  (acc, lesson) => acc + getTotalDuration(lesson.pauses || []),
                  0
                ) / 60
              )}
            </div>
            <div className="text-gray-600">Minutes of Content</div>
          </div>
        </div>

        {/* Lessons Grid */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">All Lessons</h2>
            {!user && (
              <p className="text-sm text-gray-600">
                Sign in to create your own lessons
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {lessons.length === 0 && !loading && !error ? (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm">
              <div className="text-gray-400 mb-4">
                <Play className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No lessons yet
              </h3>
              <p className="text-gray-600 mb-6">
                Be the first to create a lesson and start practicing!
              </p>
              {user && (
                <button
                  onClick={() => router.push("/create")}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Lesson
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                >
                  {/* YouTube Thumbnail */}
                  <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                    <img
                      src={`https://img.youtube.com/vi/${lesson.video_id}/mqdefault.jpg`}
                      alt={lesson.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {lesson.title}
                    </h3>

                    {/* Creator Info */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <User className="w-4 h-4" />
                      <span>
                        Created by: @{lesson.users?.username || "unknown"}
                      </span>
                    </div>

                    {/* Lesson Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{lesson.pauses?.length || 0} segments</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(lesson.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Practice Button */}
                    <button
                      onClick={() => startPractice(lesson)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <Play className="w-4 h-4" />
                      Start Practice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
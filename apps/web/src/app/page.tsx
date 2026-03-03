"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Play, Calendar, User, Clock, Star, Filter } from "lucide-react";
import { formatTime } from "@/utils/helpers";
import StarRating from "@/components/StarRating";

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
  averageRating?: number;
  totalRatings?: number;
  userRating?: number;
}

export default function Home() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingLessonId, setRatingLessonId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "popular" | "newest" | "oldest"
  >("all");

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
      const lessonsArray = Array.isArray(data) ? data : data.lessons || [];
      setLessons(lessonsArray);
      
      // Fetch ratings for all lessons
      fetchAllRatings(lessonsArray);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      setError("Failed to load lessons");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRatings = async (lessonsList: Lesson[]) => {
    try {
      const ratingsPromises = lessonsList.map(async (lesson) => {
        const url = user
          ? `/api/ratings?lesson_id=${lesson.id}&user_id=${user.id}`
          : `/api/ratings?lesson_id=${lesson.id}`;
        const response = await fetch(url);
        if (response.ok) {
          return await response.json();
        }
        return null;
      });

      const ratingsResults = await Promise.all(ratingsPromises);

      setLessons((prev) =>
        prev.map((lesson, index) => {
          const ratingData = ratingsResults[index];
          if (ratingData) {
            return {
              ...lesson,
              averageRating: ratingData.averageRating || 0,
              totalRatings: ratingData.totalRatings || 0,
              userRating: ratingData.userRating || undefined,
            };
          }
          return lesson;
        })
      );
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  };

  const handleRateLesson = async (lessonId: string, rating: number) => {
    if (!user || !accessToken) {
      alert("Please sign in to rate lessons");
      return;
    }

    setRatingLessonId(lessonId);
    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ lesson_id: lessonId, rating }),
      });

      if (response.ok) {
        // Refresh rating for this lesson
        const ratingResponse = await fetch(
          `/api/ratings?lesson_id=${lessonId}&user_id=${user.id}`
        );
        if (ratingResponse.ok) {
          const ratingData = await ratingResponse.json();
          setLessons((prev) =>
            prev.map((lesson) =>
              lesson.id === lessonId
                ? {
                    ...lesson,
                    averageRating: ratingData.averageRating || 0,
                    totalRatings: ratingData.totalRatings || 0,
                    userRating: ratingData.userRating,
                  }
                : lesson
            )
          );
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Error rating lesson:", error);
      alert("Failed to submit rating");
    } finally {
      setRatingLessonId(null);
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
        lessonId: lesson.id,
      })
    );

    router.push("/practice");
  };

  const getTotalDuration = (pauses: any[]) => {
    if (!pauses || pauses.length === 0) return 0;
    return Math.max(...pauses.map((p) => p.time)) + 5; // Add 5 seconds buffer
  };

  const getFilteredLessons = () => {
    let filtered = [...lessons];

    switch (activeFilter) {
      case "popular":
        // Sort by rating (highest first), then by number of ratings
        filtered.sort((a, b) => {
          const ratingDiff = (b.averageRating || 0) - (a.averageRating || 0);
          if (ratingDiff !== 0) return ratingDiff;
          return (b.totalRatings || 0) - (a.totalRatings || 0);
        });
        break;
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "all":
      default:
        // Keep original order
        break;
    }

    return filtered;
  };

  const filteredLessons = getFilteredLessons();

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
            Welcome to mimick.io
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Improve your English pronunciation with the shadow technique.
            Practice with lessons created by our community or create your own.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <div className="flex items-center gap-2 text-gray-600 mr-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter:</span>
          </div>
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("popular")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === "popular"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            ⭐ Most Popular
          </button>
          <button
            onClick={() => setActiveFilter("newest")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === "newest"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            🆕 Newest
          </button>
          <button
            onClick={() => setActiveFilter("oldest")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === "oldest"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            📅 Oldest
          </button>
        </div>

        {/* Lessons Grid */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {activeFilter === "all"
                ? "All Lessons"
                : activeFilter === "popular"
                ? "Most Popular"
                : activeFilter === "newest"
                ? "Newest Lessons"
                : "Oldest Lessons"}
              <span className="text-base font-normal text-gray-500 ml-2">
                ({filteredLessons.length})
              </span>
            </h2>
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

          {filteredLessons.length === 0 && !loading && !error ? (
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
              {filteredLessons.map((lesson) => (
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

                    {/* Rating Section */}
                    <div className="flex items-center gap-2 mb-3">
                      <StarRating
                        rating={lesson.averageRating || 0}
                        readonly={true}
                        size="sm"
                      />
                      <span className="text-sm text-gray-500">
                        {lesson.averageRating
                          ? lesson.averageRating.toFixed(1)
                          : "0"}
                        {lesson.totalRatings ? ` (${lesson.totalRatings})` : ""}
                      </span>
                    </div>

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
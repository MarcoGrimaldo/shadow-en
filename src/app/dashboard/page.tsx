"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Play,
  Trash2,
  Calendar,
  Clock,
  Video,
  Plus,
  BookOpen,
  Loader2,
  User,
  Edit3,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthModal from "@/components/auth/AuthModal";

interface Lesson {
  id: string;
  title: string;
  video_id: string;
  video_url: string;
  pauses: any[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(true);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setShowAuthModal(true);
      } else {
        loadUserLessons();
      }
    }
  }, [loading, user]);

  const loadUserLessons = async () => {
    if (!user) return;

    setIsLoadingLessons(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/lessons?user_id=${user.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const lessonsData = await response.json();
        setLessons(lessonsData);
      } else {
        console.error("Failed to load user lessons");
      }
    } catch (error) {
      console.error("Error loading user lessons:", error);
    } finally {
      setIsLoadingLessons(false);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/lessons?id=${lessonId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
          <div className="text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-500 mb-6">
              Please sign in to access your dashboard and manage your lessons.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Sign In
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pt-4">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {profile?.username || "My Dashboard"}
              </h1>
              <p className="text-gray-600">Manage your English lessons</p>
            </div>
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
              onClick={() => router.push("/lessons")}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Browse All
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                @{profile?.username}
              </h2>
              <p className="text-gray-600 mb-2">{profile?.email}</p>
              <p className="text-sm text-gray-500">
                Joined{" "}
                {new Date(profile?.created_at || "").toLocaleDateString()}
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {lessons.length}
              </div>
              <div className="text-gray-600 text-sm">Lessons Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {lessons.reduce(
                  (total, lesson) => total + lesson.pauses.length,
                  0
                )}
              </div>
              <div className="text-gray-600 text-sm">Total Segments</div>
            </div>
          </div>
        </div>

        {/* My Lessons */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">My Lessons</h2>
            <span className="text-sm text-gray-500">
              {lessons.length} lessons
            </span>
          </div>

          {isLoadingLessons ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading your lessons...</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No lessons yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first lesson to start practicing English!
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Video Thumbnail */}
                  <div className="relative aspect-video bg-gray-900">
                    <img
                      src={getThumbnailUrl(lesson.video_id)}
                      alt={lesson.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://img.youtube.com/vi/${lesson.video_id}/hqdefault.jpg`;
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                      {lesson.pauses.length} segments
                    </div>
                    <div className="absolute top-2 left-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          lesson.is_public
                            ? "bg-green-500 text-white"
                            : "bg-gray-500 text-white"
                        }`}
                      >
                        {lesson.is_public ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                      {lesson.title}
                    </h3>

                    <div className="text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3 h-3" />
                        <span>Created {formatDate(lesson.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{lesson.pauses.length} practice segments</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startPractice(lesson)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                      >
                        <Play className="w-4 h-4" />
                        Practice
                      </button>
                      <button
                        onClick={() => deleteLesson(lesson.id)}
                        disabled={deletingLessonId === lesson.id}
                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors disabled:opacity-50"
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
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { User, LogOut, Plus, Home, ChevronDown } from "lucide-react";
import AuthModal from "@/components/auth/AuthModal";

export default function Navbar() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowDropdown(false);
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - App name */}
            <div className="flex items-center">
              <button
                onClick={() => router.push("/")}
                className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                Shadow English
              </button>
            </div>

            {/* Right side - Navigation */}
            <div className="flex items-center space-x-4">
              {/* Home Button */}
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </button>

              {/* Create Lesson Button */}
              <button
                onClick={() => {
                  if (user) {
                    router.push("/create");
                  } else {
                    setShowAuthModal(true);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Lesson</span>
              </button>

              {user ? (
                /* User Menu */
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      @{profile?.username}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <button
                        onClick={() => {
                          router.push("/dashboard");
                          setShowDropdown(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <User className="w-4 h-4" />
                        My Lessons
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Sign In Button */
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Close dropdown when clicking outside */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
      />
    </>
  );
}

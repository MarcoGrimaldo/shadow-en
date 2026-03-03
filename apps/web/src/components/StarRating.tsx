"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number; // Current rating (0-5)
  onRate?: (rating: number) => void; // Callback when user rates
  readonly?: boolean; // If true, user can't change rating
  size?: "sm" | "md" | "lg"; // Star size
  showCount?: boolean; // Show rating count
  totalRatings?: number; // Number of ratings
  className?: string;
}

export default function StarRating({
  rating,
  onRate,
  readonly = false,
  size = "md",
  showCount = false,
  totalRatings = 0,
  className = "",
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const starSize = sizeClasses[size];

  const handleClick = (index: number) => {
    if (!readonly && onRate) {
      onRate(index);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (!readonly) {
      setHoverRating(index);
    }
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const displayRating = hoverRating || rating;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((index) => {
          const isFilled = index <= displayRating;
          const isHalfFilled = !isFilled && index - 0.5 <= displayRating;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(index)}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
              disabled={readonly}
              className={`${
                readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
              } transition-transform focus:outline-none`}
              aria-label={`Rate ${index} stars`}
            >
              <Star
                className={`${starSize} ${
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : isHalfFilled
                    ? "fill-yellow-400/50 text-yellow-400"
                    : "fill-gray-200 text-gray-300"
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>
      {showCount && (
        <span className="text-sm text-gray-500 ml-1">
          {rating > 0 ? rating.toFixed(1) : "0"}{" "}
          {totalRatings > 0 && `(${totalRatings})`}
        </span>
      )}
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// GET - Get ratings for a lesson or user's rating for a lesson
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const lessonId = url.searchParams.get("lesson_id");
    const userId = url.searchParams.get("user_id");

    if (!lessonId) {
      return NextResponse.json(
        { error: "lesson_id is required" },
        { status: 400 }
      );
    }

    // Get average rating and count for the lesson
    const { data: ratings, error: ratingsError } = await supabase
      .from("lesson_ratings")
      .select("rating")
      .eq("lesson_id", lessonId);

    if (ratingsError) {
      console.error("Error fetching ratings:", ratingsError);
      return NextResponse.json(
        { error: "Failed to fetch ratings" },
        { status: 500 }
      );
    }

    const totalRatings = ratings?.length || 0;
    const averageRating =
      totalRatings > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

    // If userId is provided, also get the user's specific rating
    let userRating = null;
    if (userId) {
      const { data: userRatingData, error: userRatingError } = await supabase
        .from("lesson_ratings")
        .select("rating")
        .eq("lesson_id", lessonId)
        .eq("user_id", userId)
        .single();

      if (!userRatingError && userRatingData) {
        userRating = userRatingData.rating;
      }
    }

    return NextResponse.json({
      lessonId,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalRatings,
      userRating,
    });
  } catch (error) {
    console.error("Error in GET /api/ratings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Submit or update a rating
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // Create authenticated client
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the user
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { lesson_id, rating } = body;

    // Validate input
    if (!lesson_id) {
      return NextResponse.json(
        { error: "lesson_id is required" },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if user has already rated this lesson
    const { data: existingRating, error: checkError } = await supabaseAuth
      .from("lesson_ratings")
      .select("id")
      .eq("lesson_id", lesson_id)
      .eq("user_id", user.id)
      .single();

    if (existingRating) {
      // Update existing rating
      const { data: updatedRating, error: updateError } = await supabaseAuth
        .from("lesson_ratings")
        .update({ rating, updated_at: new Date().toISOString() })
        .eq("id", existingRating.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating rating:", updateError);
        return NextResponse.json(
          { error: "Failed to update rating" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Rating updated successfully",
        rating: updatedRating,
      });
    } else {
      // Insert new rating
      const { data: newRating, error: insertError } = await supabaseAuth
        .from("lesson_ratings")
        .insert({
          lesson_id,
          user_id: user.id,
          rating,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting rating:", insertError);
        return NextResponse.json(
          { error: "Failed to submit rating" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Rating submitted successfully",
        rating: newRating,
      });
    }
  } catch (error) {
    console.error("Error in POST /api/ratings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

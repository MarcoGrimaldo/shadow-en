import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

interface Pause {
  id: number;
  time: number;
  subtitle: string;
}

// GET - Retrieve all public lessons with user information
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id"); // Optional: filter by user

    let query = supabase
      .from("lessons")
      .select(
        `
        *,
        users (
          id,
          username,
          avatar_url
        )
      `
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    // If user_id is provided, filter by that user
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: lessons, error } = await query;

    if (error) {
      console.error("Error fetching lessons:", error);
      return NextResponse.json(
        { error: "Failed to fetch lessons" },
        { status: 500 }
      );
    }

    return NextResponse.json(lessons || []);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}

// POST - Create a new lesson
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/lessons - Starting request");

    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required - missing or invalid token" },
        { status: 401 }
      );
    }

    // Extract the JWT token
    const token = authHeader.replace("Bearer ", "");
    console.log("Received token length:", token.length);

    // Verify token with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError) {
      console.error("Auth verification error:", authError);
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("No user found for token");
      return NextResponse.json(
        { error: "Invalid token - no user found" },
        { status: 401 }
      );
    }

    console.log("Authenticated user:", user.id, user.email);
    console.log("User auth metadata:", user.user_metadata);
    console.log("Token preview:", token.substring(0, 50) + "...");

    // Ensure user profile exists in users table (use admin client to bypass RLS)
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (userCheckError && userCheckError.code === "PGRST116") {
      // User doesn't exist, create profile using admin client
      console.log("Creating user profile for:", user.id);
      const { error: createUserError } = await supabaseAdmin
        .from("users")
        .insert({
          id: user.id,
          email: user.email || "",
          username:
            user.email?.split("@")[0] + "_" + user.id.substring(0, 8) ||
            "user_" + user.id.substring(0, 8),
        });

      if (createUserError) {
        console.error("Error creating user profile:", createUserError);
        return NextResponse.json(
          {
            error: `Failed to create user profile: ${createUserError.message}`,
          },
          { status: 500 }
        );
      }
      console.log("User profile created successfully");
    } else if (userCheckError) {
      console.error("Error checking user profile:", userCheckError);
      return NextResponse.json(
        { error: `Database error: ${userCheckError.message}` },
        { status: 500 }
      );
    } else {
      console.log("User profile already exists");
    }

    const body = await request.json();
    const { title, video_id, video_url, pauses, is_public = true } = body;

    if (!title || !video_id || !video_url || !pauses) {
      return NextResponse.json(
        {
          error: "Missing required fields: title, video_id, video_url, pauses",
        },
        { status: 400 }
      );
    }

    // Create a Supabase client with the user's auth token for RLS context
    const userSupabase = createClient(
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

    // Insert the lesson using the authenticated client
    // RLS policies will handle the authorization
    const { data: lesson, error } = await userSupabase
      .from("lessons")
      .insert({
        title,
        video_id,
        video_url,
        pauses,
        user_id: user.id,
        is_public,
      })
      .select(
        `
        *,
        users (
          id,
          username,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating lesson:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      console.error("Lesson data being inserted:", {
        title,
        video_id,
        video_url,
        user_id: user.id,
        is_public,
        pauses_length: Array.isArray(pauses) ? pauses.length : "not_array",
      });
      return NextResponse.json(
        { error: `Failed to create lesson: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("Lesson created successfully:", lesson.id);
    return NextResponse.json(lesson, { status: 201 });
  } catch (error: any) {
    console.error("Unexpected error creating lesson:", error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE - Delete a lesson (only by owner)
export async function DELETE(request: NextRequest) {
  try {
    // Get the user from the session
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const lessonId = url.searchParams.get("id");

    if (!lessonId) {
      return NextResponse.json({ error: "Missing lesson ID" }, { status: 400 });
    }

    // Check if the lesson exists and belongs to the user
    const { data: lesson, error: fetchError } = await supabase
      .from("lessons")
      .select("user_id")
      .eq("id", lessonId)
      .single();

    if (fetchError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (lesson.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own lessons" },
        { status: 403 }
      );
    }

    // Delete the lesson
    const { error: deleteError } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (deleteError) {
      console.error("Error deleting lesson:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete lesson" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}

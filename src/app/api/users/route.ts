import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET - Get user profile by username or ID
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get("username");
    const userId = url.searchParams.get("user_id");

    if (!username && !userId) {
      return NextResponse.json(
        { error: "Either username or user_id is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("users")
      .select("id, username, avatar_url, created_at");

    if (username) {
      query = query.eq("username", username);
    } else {
      query = query.eq("id", userId);
    }

    const { data: user, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      console.error("Error fetching user:", error);
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      );
    }

    // Also get user's lesson count and stats
    const { data: lessonStats } = await supabase
      .from("lessons")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("is_public", true);

    const userWithStats = {
      ...user,
      lessonCount: lessonStats?.length || 0,
      joinedDate: user.created_at,
    };

    return NextResponse.json(userWithStats);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT - Update user profile (authenticated)
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { username, avatar_url } = body;

    const updates: any = {};

    if (username !== undefined) {
      // Validate username
      if (username.length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters" },
          { status: 400 }
        );
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json(
          {
            error:
              "Username can only contain letters, numbers, and underscores",
          },
          { status: 400 }
        );
      }

      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 400 }
        );
      }

      updates.username = username;
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }

    // Update the user profile
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({
        success: false,
        error: "No authorization header",
        headers: Object.fromEntries(request.headers.entries()),
      });
    }

    // Extract the JWT token
    const token = authHeader.replace("Bearer ", "");

    // Verify token with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    return NextResponse.json({
      success: !authError,
      user: user ? { id: user.id, email: user.email } : null,
      error: authError?.message || null,
      tokenLength: token.length,
      tokenStart: token.substring(0, 50),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

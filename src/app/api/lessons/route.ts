import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const LESSONS_FILE = path.join(process.cwd(), "data", "lessons.json");

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

// Ensure data directory and lessons file exist
async function ensureLessonsFile() {
  const dataDir = path.dirname(LESSONS_FILE);

  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }

  try {
    await fs.access(LESSONS_FILE);
  } catch {
    await fs.writeFile(LESSONS_FILE, JSON.stringify([]));
  }
}

// GET - Retrieve all lessons
export async function GET() {
  try {
    await ensureLessonsFile();
    const lessonsData = await fs.readFile(LESSONS_FILE, "utf-8");
    const lessons: Lesson[] = JSON.parse(lessonsData);

    return NextResponse.json(lessons);
  } catch (error) {
    console.error("Error reading lessons:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Save a new lesson
export async function POST(request: NextRequest) {
  try {
    await ensureLessonsFile();

    const body = await request.json();
    const { title, videoId, videoUrl, pauses } = body;

    if (!title || !videoId || !videoUrl || !pauses) {
      return NextResponse.json(
        { error: "Missing required fields: title, videoId, videoUrl, pauses" },
        { status: 400 }
      );
    }

    // Read existing lessons
    const lessonsData = await fs.readFile(LESSONS_FILE, "utf-8");
    const lessons: Lesson[] = JSON.parse(lessonsData);

    // Create new lesson
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      videoId,
      videoUrl,
      pauses,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to lessons array
    lessons.push(newLesson);

    // Save back to file
    await fs.writeFile(LESSONS_FILE, JSON.stringify(lessons, null, 2));

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("Error saving lesson:", error);
    return NextResponse.json(
      { error: "Failed to save lesson" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a lesson by ID
export async function DELETE(request: NextRequest) {
  try {
    await ensureLessonsFile();

    const url = new URL(request.url);
    const lessonId = url.searchParams.get("id");

    if (!lessonId) {
      return NextResponse.json({ error: "Missing lesson ID" }, { status: 400 });
    }

    // Read existing lessons
    const lessonsData = await fs.readFile(LESSONS_FILE, "utf-8");
    const lessons: Lesson[] = JSON.parse(lessonsData);

    // Filter out the lesson to delete
    const updatedLessons = lessons.filter((lesson) => lesson.id !== lessonId);

    if (updatedLessons.length === lessons.length) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Save back to file
    await fs.writeFile(LESSONS_FILE, JSON.stringify(updatedLessons, null, 2));

    return NextResponse.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}

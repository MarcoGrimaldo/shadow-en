-- Supabase SQL Schema for Shadow English App
-- Execute these commands in your Supabase SQL editor

-- Enable Row Level Security (RLS)
-- This is done by default in Supabase, but make sure it's enabled

-- Create users table (extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create lessons table
CREATE TABLE public.lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    video_id TEXT NOT NULL,
    video_url TEXT NOT NULL,
    pauses JSONB NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    is_public BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_lessons_updated_at
    BEFORE UPDATE ON public.lessons
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) Policies

-- Users table policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to read all public user profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
    FOR SELECT USING (true);

-- Allow users to insert their own profile and allow triggers to insert
CREATE POLICY "Enable insert for users and triggers" ON public.users
    FOR INSERT WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Lessons table policies
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read public lessons
CREATE POLICY "Public lessons are viewable by everyone" ON public.lessons
    FOR SELECT USING (is_public = true);

-- Allow authenticated users to insert their own lessons
CREATE POLICY "Users can insert their own lessons" ON public.lessons
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own lessons
CREATE POLICY "Users can update their own lessons" ON public.lessons
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own lessons
CREATE POLICY "Users can delete their own lessons" ON public.lessons
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON public.lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_is_public ON public.lessons(is_public);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON public.lessons(created_at DESC);

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(NEW.id::text, 1, 8))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to automatically create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Sample data (optional - you can add this for testing)
-- INSERT INTO auth.users (email, encrypted_password) VALUES 
--   ('demo@example.com', crypt('password123', gen_salt('bf')));

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.lessons IS 'Shadow technique English lessons created by users';
COMMENT ON COLUMN public.lessons.pauses IS 'Array of pause points with time and subtitle data';
COMMENT ON COLUMN public.lessons.is_public IS 'Whether lesson is visible to all users or private';

-- =============================================
-- RATINGS SYSTEM
-- =============================================

-- Create lesson_ratings table
CREATE TABLE public.lesson_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(lesson_id, user_id) -- One rating per user per lesson
);

-- Create trigger for updated_at on ratings
CREATE TRIGGER handle_lesson_ratings_updated_at
    BEFORE UPDATE ON public.lesson_ratings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security for ratings
ALTER TABLE public.lesson_ratings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read ratings
CREATE POLICY "Ratings are viewable by everyone" ON public.lesson_ratings
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own ratings
CREATE POLICY "Users can insert their own ratings" ON public.lesson_ratings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own ratings
CREATE POLICY "Users can update their own ratings" ON public.lesson_ratings
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own ratings
CREATE POLICY "Users can delete their own ratings" ON public.lesson_ratings
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for ratings
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_lesson_id ON public.lesson_ratings(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_user_id ON public.lesson_ratings(user_id);

COMMENT ON TABLE public.lesson_ratings IS 'User ratings for lessons (1-5 stars)';
COMMENT ON COLUMN public.lesson_ratings.rating IS 'Rating value from 1 to 5 stars';
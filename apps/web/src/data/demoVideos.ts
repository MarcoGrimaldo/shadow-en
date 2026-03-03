// Sample YouTube videos for demo purposes
// These are example URLs - replace with actual short English learning videos

export const demoVideos = [
  {
    id: "demo1",
    title: "Basic English Greetings",
    description: "Simple greeting expressions for beginners",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Replace with actual video
    duration: 45,
    difficulty: "Beginner",
    topics: ["greetings", "basic conversation"],
    samplePauses: [
      { time: 5, subtitle: "Hello, how are you today?" },
      { time: 15, subtitle: "I am fine, thank you for asking" },
      { time: 25, subtitle: "What is your name?" },
      { time: 35, subtitle: "Nice to meet you" },
    ],
  },
  {
    id: "demo2",
    title: "Numbers and Time",
    description: "Learning to express time and numbers",
    url: "https://www.youtube.com/watch?v=EXAMPLE2", // Replace with actual video
    duration: 50,
    difficulty: "Beginner",
    topics: ["numbers", "time", "daily routine"],
    samplePauses: [
      { time: 8, subtitle: "It is half past three" },
      { time: 18, subtitle: "The meeting is at nine fifteen" },
      { time: 30, subtitle: "I will call you at six thirty" },
      { time: 42, subtitle: "See you tomorrow at noon" },
    ],
  },
  {
    id: "demo3",
    title: "Weather Conversation",
    description: "Common weather expressions and small talk",
    url: "https://www.youtube.com/watch?v=EXAMPLE3", // Replace with actual video
    duration: 55,
    difficulty: "Intermediate",
    topics: ["weather", "small talk", "adjectives"],
    samplePauses: [
      { time: 7, subtitle: "It is a beautiful sunny day" },
      { time: 17, subtitle: "I think it might rain later" },
      { time: 30, subtitle: "The temperature is quite mild today" },
      { time: 45, subtitle: "Perfect weather for a walk in the park" },
    ],
  },
];

export function getDemoVideoById(id: string) {
  return demoVideos.find((video) => video.id === id);
}

export function getDemoVideosByDifficulty(
  difficulty: "Beginner" | "Intermediate" | "Advanced"
) {
  return demoVideos.filter((video) => video.difficulty === difficulty);
}

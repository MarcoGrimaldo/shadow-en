# Shadow EN - Practice English Pronunciation

A modern **monorepo** application for practicing English pronunciation using the **shadowing technique**. Available as a web app (Next.js) and mobile apps (iOS & Android via Expo).

![Next.js](https://img.shields.io/badge/Next.js-16.0-black) ![Expo](https://img.shields.io/badge/Expo-52-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Turborepo](https://img.shields.io/badge/Turborepo-2.3-EF4444)

## 📁 Project Structure

```
shadow-en/
├── apps/
│   ├── web/          # Next.js web application
│   └── mobile/       # Expo React Native app (iOS & Android)
├── packages/
│   └── shared/       # Shared types, utilities, and Supabase config
├── turbo.json        # Turborepo configuration
└── package.json      # Root workspace configuration
```

## 🌟 Features

- **🤖 Smart Subtitle Generation**: Multiple AI methods ensure you always get practice segments
- **📺 YouTube Integration**: Import any YouTube content - videos, Shorts, mobile URLs (max 1 minute)
- **⏱️ Smart Pause Points**: Automatically generated or manually customized timestamps
- **🎙️ Speech Recognition**: Real-time voice-to-text conversion for accuracy feedback
- **📊 Accuracy Scoring**: Get percentage-based feedback on your pronunciation
- **👥 mimick Technique**: Practice the proven method of repeating speech immediately after hearing it
- **📈 Progress Tracking**: See your improvement across multiple practice segments
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 How It Works

### 1. **Setup Phase**
- Paste a YouTube video URL (duration must be ≤ 1 minute)
- Click **"Auto Generate"** to automatically extract subtitles and create pause points
- Or manually add pause points with timestamps (e.g., 0:10, 0:25, 0:45) and subtitles

### 2. **Practice Phase**
- Video plays automatically
- At each pause point, the video stops
- Click the record button to capture your pronunciation
- Get instant feedback on accuracy percentage
- Continue through all pause points

### 3. **Results**
- View detailed accuracy scores for each segment
- See comparison between expected text and what you said
- Get overall session performance summary

## 🛠️ Technology Stack

### Monorepo Tools
- **Turborepo**: Fast, incremental builds
- **npm workspaces**: Package management

### Web App (`apps/web`)
- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS v4**: Utility-first styling
- **Supabase**: Authentication & database

### Mobile App (`apps/mobile`)
- **Expo SDK 52**: React Native development
- **Expo Router**: File-based navigation
- **React Native**: Cross-platform mobile UI
- **Expo AV**: Audio recording

### Shared Package (`packages/shared`)
- **Types**: User, Lesson, PausePoint interfaces
- **Utilities**: YouTube helpers, text accuracy calculation
- **Supabase**: Client configuration

## 📋 Prerequisites

- Node.js 18+ 
- npm 10+
- For mobile development:
  - iOS: macOS with Xcode
  - Android: Android Studio

## 🏃‍♂️ Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MarcoGrimaldo/shadow-en.git
cd shadow-en
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# For web app
cp apps/web/.env.example apps/web/.env.local

# For mobile app
cp apps/mobile/.env.example apps/mobile/.env
```

4. Start development:
```bash
# Run all apps
npm run dev

# Run only web
npm run dev:web

# Run only mobile
npm run dev:mobile
```

5. Open:
   - Web: [http://localhost:3000](http://localhost:3000)
   - Mobile: Scan QR code with Expo Go app

### Building for Production

```bash
# Build all apps
npm run build

# Build only web
npm run build:web
```

### Mobile App Deployment

```bash
cd apps/mobile

# Build for iOS
npm run build:ios

# Build for Android
npm run build:android
```

## 📱 Web App Usage

1. **Enter Video URL**: Paste a YouTube video link (max 1 minute duration)
2. **Generate Subtitles**: 
   - Click **"Auto Generate"** to extract subtitles automatically ✨
   - If it fails, try fallback methods: Smart Intervals, Template-Based, or AI Segments
   - Or manually add pause points with time format `M:SS` (e.g., `0:15`)
3. **Review & Edit**: Adjust auto-generated pause points if needed
4. **Start Practice**: Click "Start Practice" 
5. **Follow Instructions**: Listen when video plays, record when it pauses
6. **Review Results**: Check your accuracy scores and improve!

## 📱 Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|---------|---------|---------|---------|
| Speech Recognition | ✅ Full | ✅ Full | ❌ Limited | ✅ Full |
| YouTube Embed | ✅ | ✅ | ✅ | ✅ |
| Responsive Design | ✅ | ✅ | ✅ | ✅ |

**Recommended**: Chrome or Safari for optimal speech recognition performance.

## 🎯 Tips for Best Results

1. **Clear Speech**: Speak clearly and at normal pace
2. **Good Microphone**: Use a quality microphone or headset
3. **Quiet Environment**: Minimize background noise
4. **Practice Regularly**: Consistent practice improves pronunciation
5. **Short Videos**: Start with easier, shorter content

## 🔧 Project Structure

```
mimick/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── youtube/
│   │   │       └── transcript/
│   │   │           └── route.ts    # YouTube transcript API
│   │   ├── globals.css             # Global styles
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx               # Home page (setup)
│   │   └── practice/
│   │       └── page.tsx           # Practice page
│   ├── components/
│   │   ├── SpeechRecorder.tsx     # Recording component
│   │   └── Notification.tsx       # Notification component
│   └── utils/
│       └── helpers.ts             # Utility functions
├── public/                        # Static assets
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**Speech Recognition Not Working**
- Ensure microphone permissions are granted
- Use Chrome or Safari browser
- Check microphone is not used by other applications

**Video Not Loading**
- Verify YouTube URL is valid and public
- Check video duration is under 1 minute
- Ensure stable internet connection

**Low Accuracy Scores**
- Speak more clearly and slowly
- Reduce background noise
- Check microphone quality and positioning

**Subtitle Generation Issues**
- If "Auto Generate" fails, try the fallback methods (Smart Intervals, Template-Based, AI Segments)
- Fallback methods work even when videos have no captions
- For best results with original captions, use videos from educational channels
- All methods generate practice-optimized segments for mimick technique
- Manual pause points remain available as the ultimate fallback

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Ensure your browser supports the Web Speech API

---

**Happy Learning! 🎓** 

Practice regularly with mimick.io to improve your pronunciation and fluency!

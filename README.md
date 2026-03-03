# mimick.io - Practice English Pronunciation

A modern web application for practicing English pronunciation using the **mimicking technique**. This app allows you to use YouTube videos for structured pronunciation practice with real-time feedback.

![mimick.io](https://img.shields.io/badge/Next.js-16.0.3-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC)

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

- **Framework**: Next.js 16.0.3 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Speech Recognition**: Web Speech API
- **Video**: YouTube Embed API

## 📋 Prerequisites

- Node.js 18+ 
- Modern web browser with Speech Recognition support (Chrome recommended)
- Microphone access permission

## 🏃‍♂️ Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MarcoGrimaldo/mimick.git
cd mimick
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

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

# ElevenLabs TTS Reader

A beautiful text-to-speech reader with synchronized word highlighting and AI-powered study buddy features. Transform your learning experience with natural-sounding speech and interactive assistance.

![ElevenLabs TTS Reader](https://img.shields.io/badge/TTS-ElevenLabs-blue) ![AI](https://img.shields.io/badge/AI-OpenAI-green) ![React](https://img.shields.io/badge/React-18.2.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-blue)

## Features

### 🎤 Advanced Text-to-Speech
- **ElevenLabs Integration**: High-quality, natural-sounding voice synthesis
- **Word-by-Word Highlighting**: Visual synchronization as text is spoken
- **Multiple Voice Support**: Choose from different ElevenLabs voices
- **Playback Controls**: Play, pause, stop, and seek functionality

### 🤖 AI Study Buddy
- **Interactive Assistant**: AI-powered study companion using OpenAI's GPT
- **Personalized Experience**: Customizable username and voice settings
- **Smart Text Enhancement**: AI can improve and structure your study materials
- **Conversational Learning**: Ask questions and get explanations

### 📝 Rich Text Support
- **Markdown Rendering**: Full support for markdown formatting
- **Real-time Preview**: See formatted text while editing
- **GitHub Flavored Markdown**: Extended markdown features support
- **Clean Text Processing**: Automatic markdown stripping for TTS

### 🎨 Beautiful Interface
- **Modern Design**: Clean, gradient-based UI with Tailwind CSS
- **Responsive Layout**: Works seamlessly on all device sizes
- **Intuitive Controls**: Easy-to-use interface for all features
- **Visual Feedback**: Clear status indicators and loading states

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom gradients
- **TTS**: ElevenLabs API
- **AI**: OpenAI GPT API
- **Markdown**: React Markdown with GitHub Flavored Markdown
- **Icons**: Lucide React
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- ElevenLabs API key
- OpenAI API key (optional, for study buddy features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kylecam625/Studdybutty.git
   cd Studdybutty
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # ElevenLabs API Configuration
   VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   
   # OpenAI API Configuration (optional, for study buddy)
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   
   # Voice Configuration
   VITE_VOICE_ID=your_preferred_voice_id
   VITE_BUDDY_VOICE_ID=your_buddy_voice_id
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### Getting API Keys

#### ElevenLabs API Key
1. Visit [ElevenLabs](https://elevenlabs.io/)
2. Sign up for an account
3. Go to your profile settings
4. Copy your API key

#### OpenAI API Key (Optional)
1. Visit [OpenAI](https://platform.openai.com/)
2. Sign up for an account
3. Go to API keys section
4. Create a new API key

### Voice IDs
You can find voice IDs in your ElevenLabs dashboard or use these popular ones:
- `TX3LPaxmHKxFdv7VOQHJ` - Jessica (default)
- `piTKgcLEGmPE4e6mEKli` - Adam
- `pNInz6obpgDQGcFmaJgB` - Antoni

## Usage

### Basic Text-to-Speech
1. Enter or paste your text in the editor
2. Click the play button to start TTS
3. Watch as words are highlighted in sync with speech
4. Use playback controls to pause, stop, or navigate

### Study Buddy Mode
1. Click the "Study Buddy" tab
2. Enable the study buddy feature
3. Enter your OpenAI API key
4. Set your preferred name
5. Let the AI enhance your text and provide interactive assistance

### Settings
- **Voice Selection**: Choose different ElevenLabs voices
- **API Configuration**: Update your API keys
- **Buddy Settings**: Customize your AI study companion

## API Usage & Rate Limits

### ElevenLabs
- Free tier: 10,000 characters/month
- Check the included `rate_limit_checker.py` for monitoring usage
- See `RATE_LIMIT_GUIDE.md` for detailed information

### OpenAI
- Usage depends on your plan
- Study buddy features use minimal tokens for text enhancement

## Project Structure

```
src/
├── components/
│   └── TTSReader.tsx          # Main TTS component
├── types.ts                   # TypeScript type definitions
├── App.tsx                    # Main application component
├── main.tsx                   # Application entry point
└── index.css                  # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [ElevenLabs](https://elevenlabs.io/) for their amazing TTS API
- [OpenAI](https://openai.com/) for GPT API
- [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/) communities
- [Tailwind CSS](https://tailwindcss.com/) for the beautiful styling system

## Support

If you encounter any issues or have questions:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Provide steps to reproduce any bugs

---

**Happy Learning!** 🎓📚🎤
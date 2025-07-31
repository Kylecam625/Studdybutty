# Environment Setup for TTS Study Buddy

## 🔑 API Keys Setup

### 1. Copy the environment template
```bash
cp .env.example .env
```

### 2. Edit `.env` with your API keys
```bash
# ElevenLabs API Configuration
VITE_ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here

# OpenAI API Configuration  
VITE_OPENAI_API_KEY=your_actual_openai_api_key_here

# Voice Configuration (optional - defaults provided)
VITE_VOICE_ID=TX3LPaxmHKxFdv7VOQHJ
```

### 3. Get Your API Keys

#### ElevenLabs API Key
1. Go to [ElevenLabs.io](https://elevenlabs.io)
2. Sign up/Login to your account
3. Navigate to Profile → API Keys
4. Copy your API key

#### OpenAI API Key (for Study Buddy mode)
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up/Login to your account  
3. Navigate to API Keys section
4. Create a new API key
5. Copy your API key

### 4. Restart Development Server
After adding your keys to `.env`, restart your dev server:
```bash
npm run dev
```

## 🎯 Features

### Regular Mode
- Uses ElevenLabs for direct text-to-speech conversion
- Real-time word highlighting
- Requires only `VITE_ELEVENLABS_API_KEY`

### Study Buddy Mode  
- Uses GPT-4.1 to analyze and enhance your text with study commentary
- AI adds helpful interjections like "Did you catch that..." 
- Requires both `VITE_ELEVENLABS_API_KEY` and `VITE_OPENAI_API_KEY`

## 🔒 Security Notes

- ✅ Your `.env` file is automatically ignored by git
- ✅ API keys are loaded as environment variables
- ✅ Keys can still be overridden in the UI settings if needed
- ⚠️ Never commit `.env` to version control
- ⚠️ Keep your API keys private and secure
export interface ElevenLabsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
  normalized_alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  characterStart: number;
  characterEnd: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentWordIndex: number;
}

export interface ChatGPTResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface StudyBuddyConfig {
  enabled: boolean;
  openaiApiKey: string;
  userName: string;
}

export interface TextSegment {
  text: string;
  type: 'reader' | 'buddy';
}

export interface AudioSegment {
  audioData: string;
  timings: WordTiming[];
  duration: number;
  characterOffset: number;
}
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Settings, Volume2, AlertCircle, Brain, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ElevenLabsResponse, WordTiming, PlaybackState, ChatGPTResponse, StudyBuddyConfig, TextSegment, AudioSegment } from '../types';

const TTSReader: React.FC = () => {
  const [text, setText] = useState('');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_ELEVENLABS_API_KEY || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [wordTimings, setWordTimings] = useState<WordTiming[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentWordIndex: -1,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [voiceId, setVoiceId] = useState(import.meta.env.VITE_VOICE_ID || 'TX3LPaxmHKxFdv7VOQHJ');
  const [buddyVoiceId, setBuddyVoiceId] = useState(import.meta.env.VITE_BUDDY_VOICE_ID || 'piTKgcLEGmPE4e6mEKli'); // Adam voice as default buddy
  const [studyBuddyConfig, setStudyBuddyConfig] = useState<StudyBuddyConfig>({
    enabled: false,
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    userName: 'friend'
  });
  const [enhancedText, setEnhancedText] = useState<string>('');
  const [isProcessingText, setIsProcessingText] = useState(false);
  const [audioQueue, setAudioQueue] = useState<AudioSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [segmentStartTime, setSegmentStartTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();
  const audioQueueRef = useRef<AudioSegment[]>([]);
  const currentSegmentIndexRef = useRef<number>(0);
  const wordTimingsRef = useRef<WordTiming[]>([]);

  // Strip markdown formatting for TTS API (which needs plain text)
  const stripMarkdown = useCallback((markdownText: string): string => {
    return markdownText
      // Remove headers
      .replace(/^#+\s+/gm, '')
      // Remove bold and italic
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove list markers
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }, []);

  // Parse enhanced text into segments for different voices
  const parseTextSegments = useCallback((enhancedText: string): TextSegment[] => {
    const segments: TextSegment[] = [];
    let currentIndex = 0;
    
    // Find all [BUDDY]...[/BUDDY] markers
    const buddyPattern = /\[BUDDY\](.*?)\[\/BUDDY\]/gs;
    let match;
    
    while ((match = buddyPattern.exec(enhancedText)) !== null) {
      // Add reader text before this buddy segment
      if (match.index > currentIndex) {
        const readerText = enhancedText.slice(currentIndex, match.index).trim();
        if (readerText) {
          segments.push({ text: readerText, type: 'reader' });
        }
      }
      
      // Add buddy segment
      const buddyText = match[1].trim();
      if (buddyText) {
        segments.push({ text: buddyText, type: 'buddy' });
      }
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add any remaining reader text
    if (currentIndex < enhancedText.length) {
      const readerText = enhancedText.slice(currentIndex).trim();
      if (readerText) {
        segments.push({ text: readerText, type: 'reader' });
      }
    }
    
    // If no buddy markers found, return entire text as reader segment
    if (segments.length === 0) {
      segments.push({ text: enhancedText, type: 'reader' });
    }
    
    return segments;
  }, []);

  // Sample text for demonstration
  const sampleText = `# Welcome to Interactive TTS Reader

**Transform your learning experience** with our advanced text-to-speech reader featuring:

- **Real-time word highlighting** that flows smoothly as you listen
- *Study Buddy mode* with excited AI commentary that uses your name
- Support for **markdown formatting** to make content more readable
- Perfect for *learning materials*, articles, and educational content

## How to Use
1. Paste your **markdown text** or plain text below
2. Click "Generate Speech" to convert to audio
3. Watch the **smooth highlighting** follow along as it reads

*Ready to get started?* Try it with your own content!`;

  // Convert character timings to word timings
  const processTimings = useCallback((response: ElevenLabsResponse, timeOffset: number = 0, charOffset: number = 0): WordTiming[] => {
    const { characters, character_start_times_seconds, character_end_times_seconds } = response.alignment;
    const words: WordTiming[] = [];
    
    let currentWord = '';
    let wordStartTime = 0;
    let wordCharStart = 0;
    let charIndex = 0;

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      const startTime = character_start_times_seconds[i] + timeOffset;
      const endTime = character_end_times_seconds[i] + timeOffset;

      if (char === ' ' || char === '\n' || char === '\t' || i === characters.length - 1) {
        if (currentWord.length > 0) {
          words.push({
            word: currentWord,
            startTime: wordStartTime,
            endTime: endTime,
            characterStart: wordCharStart + charOffset,
            characterEnd: charIndex + charOffset
          });
          currentWord = '';
        }
      } else {
        if (currentWord.length === 0) {
          wordStartTime = startTime;
          wordCharStart = charIndex;
        }
        currentWord += char;
      }
      charIndex++;
    }

    return words;
  }, []);

  // Generate audio for a single text segment
  const generateSegmentAudio = async (segment: TextSegment): Promise<AudioSegment> => {
    const currentVoiceId = segment.type === 'buddy' ? buddyVoiceId : voiceId;
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${currentVoiceId}/with-timestamps`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: segment.text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: segment.type === 'buddy' ? 0.3 : 0.5, // More expressive for buddy
          similarity_boost: 0.75,
          style: segment.type === 'buddy' ? 0.2 : 0, // More stylized for buddy
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail?.message || `HTTP error! status: ${response.status}`);
    }

    const data: ElevenLabsResponse = await response.json();
    
    // Create temporary audio to get duration
    const tempAudio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
    await new Promise((resolve) => {
      tempAudio.addEventListener('loadedmetadata', resolve);
    });
    
    return {
      audioData: data.audio_base64,
      timings: processTimings(data),
      duration: tempAudio.duration,
      characterOffset: 0 // Will be calculated during concatenation
    };
  };

  // Calculate combined timing data for all segments
  const calculateCombinedTimings = (segments: AudioSegment[], textSegments: TextSegment[]): WordTiming[] => {
    if (segments.length === 1) {
      return segments[0].timings;
    }

    let cumulativeTime = 0;
    let cumulativeCharacters = 0;
    const combinedTimings: WordTiming[] = [];
    
    segments.forEach((segment, index) => {
      // Adjust timings for this segment
      const adjustedTimings = segment.timings.map(timing => ({
        ...timing,
        startTime: timing.startTime + cumulativeTime,
        endTime: timing.endTime + cumulativeTime,
        characterStart: timing.characterStart + cumulativeCharacters,
        characterEnd: timing.characterEnd + cumulativeCharacters
      }));
      
      combinedTimings.push(...adjustedTimings);
      
      // Update offsets for next segment
      cumulativeTime += segment.duration;
      cumulativeCharacters += textSegments[index].text.length;
    });
    
    return combinedTimings;
  };

  // Handle when current audio segment ends - load next segment
  const handleSegmentEnd = useCallback(() => {
    console.log('Segment ended, current index:', currentSegmentIndexRef.current, 'total segments:', audioQueueRef.current.length);
    
    const nextIndex = currentSegmentIndexRef.current + 1;
    
    if (nextIndex < audioQueueRef.current.length) {
      console.log('Loading next segment:', nextIndex);
      
      // Load next segment
      const nextSegment = audioQueueRef.current[nextIndex];
      const audio = new Audio(`data:audio/mp3;base64,${nextSegment.audioData}`);
      
      // Calculate cumulative start time for this segment
      let cumulativeTime = 0;
      for (let i = 0; i < nextIndex; i++) {
        cumulativeTime += audioQueueRef.current[i].duration;
      }
      
      // Update refs
      currentSegmentIndexRef.current = nextIndex;
      
      // Update state
      setCurrentSegmentIndex(nextIndex);
      setSegmentStartTime(cumulativeTime);
      setAudioData(nextSegment.audioData);
      
      // Remove old event listeners and add new ones
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleSegmentEnd);
      }
      
      audioRef.current = audio;
      audio.addEventListener('ended', handleSegmentEnd);
      
      // Continue playing automatically
      audio.play().then(() => {
        console.log('Next segment started playing');
        setPlaybackState(prev => ({ ...prev, isPlaying: true }));
      }).catch(error => {
        console.error('Error playing next segment:', error);
      });
    } else {
      console.log('All segments completed');
      // No more segments, playback complete
      setPlaybackState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        currentTime: prev.duration,
        currentWordIndex: wordTimingsRef.current.length - 1 
      }));
    }
  }, []); // No dependencies since we're using refs

  // Process text with ChatGPT to add study buddy interjections
  const processTextWithStudyBuddy = async (inputText: string): Promise<string> => {
    if (!studyBuddyConfig.openaiApiKey.trim()) {
      throw new Error('OpenAI API key is required for Study Buddy mode');
    }

    const prompt = `You're ${studyBuddyConfig.userName}'s brilliant and fun study buddy! Your job is to enhance the following study text and turn it into a memory-boosting, test-prepping, career-relevant companion.

💡 Your mission:
- Keep ALL original text **exactly as-is**
- Insert **short, smart, and creative interjections** to help ${studyBuddyConfig.userName}:
  - Remember key points
  - Connect concepts to other things
  - Recognize what's likely to show up on a test or matter in a real job

🧠 Use real memory tools like:
- Mnemonics (e.g., "Think of O-ring as 'Oh-no' ring = failure!")
- Reminders (e.g., "You'll definitely want to remember this for data viz questions")
- Analogies (e.g., "Just like hiding veggies under cheese — the real issue is buried!")
- Context links (e.g., "This connects with what we learned about bias in systems!")

📏 Format rules:
- Wrap every interjection in [BUDDY] and [/BUDDY]
- Interjections should be **brief, helpful, and varied**
- Use ${studyBuddyConfig.userName}'s name naturally
- **Don't repeat the same tone** every time — mix hype, insight, humor, and depth
- NEVER say "Woah" unless you mean it, and only once per text if at all

🧙 Tone:
- Be clever, not cringey
- Be useful, not just enthusiastic
- Be that one friend who's fun but *actually helps you remember stuff*

🎯 Example output:
"Original text. [BUDDY]Sir ${studyBuddyConfig.userName}, this bit? Basically guaranteed to be a quiz question. Lock it in.[/BUDDY] More text."

📝 Text to enhance:
${inputText}
`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studyBuddyConfig.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `OpenAI API error! status: ${response.status}`);
      }

      const data: ChatGPTResponse = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('ChatGPT processing error:', error);
      throw error;
    }
  };

  // Generate speech with timestamps (segmented for dual voices)
  const generateSpeech = async () => {
    if (!text.trim() || !apiKey.trim()) {
      setError('Please enter both text and API key');
      return;
    }

    if (studyBuddyConfig.enabled && !studyBuddyConfig.openaiApiKey.trim()) {
      setError('Please enter OpenAI API key for Study Buddy mode');
      return;
    }

    if (studyBuddyConfig.enabled && !studyBuddyConfig.userName.trim()) {
      setError('Please enter your name for Study Buddy mode');
      return;
    }

    if (studyBuddyConfig.enabled && !buddyVoiceId.trim()) {
      setError('Please enter Buddy Voice ID for Study Buddy mode');
      return;
    }

    setIsLoading(true);
    setIsProcessingText(studyBuddyConfig.enabled);
    setError(null);
    
    // Clear any existing audio queue
    setAudioQueue([]);
    setCurrentSegmentIndex(0);
    setSegmentStartTime(0);
    
    // Clear refs
    audioQueueRef.current = [];
    currentSegmentIndexRef.current = 0;
    wordTimingsRef.current = [];

    try {
      let textToSpeak = stripMarkdown(text);
      
      // Process with ChatGPT if Study Buddy mode is enabled
      if (studyBuddyConfig.enabled) {
        try {
          textToSpeak = await processTextWithStudyBuddy(stripMarkdown(text));
          setEnhancedText(textToSpeak);
          setIsProcessingText(false);
        } catch (chatGptError) {
          setError(`Study Buddy processing failed: ${chatGptError instanceof Error ? chatGptError.message : 'Unknown error'}`);
          setIsProcessingText(false);
          setIsLoading(false);
          return;
        }
      } else {
        setEnhancedText('');
      }

      // Parse text into segments for dual voice generation
      const textSegments = studyBuddyConfig.enabled ? parseTextSegments(textToSpeak) : [{ text: textToSpeak, type: 'reader' as const }];
      console.log('Text segments:', textSegments.map(s => ({ type: s.type, length: s.text.length })));
      
      // Generate audio for each segment
      const audioSegments: AudioSegment[] = [];
      for (let i = 0; i < textSegments.length; i++) {
        const segment = textSegments[i];
        console.log(`Generating audio for segment ${i + 1}/${textSegments.length} (${segment.type}):`, segment.text.substring(0, 50) + '...');
        try {
          const audioSegment = await generateSegmentAudio(segment);
          audioSegments.push(audioSegment);
          console.log(`Segment ${i + 1} generated successfully, duration: ${audioSegment.duration}s`);
        } catch (segmentError) {
          throw new Error(`Failed to generate audio for ${segment.type} segment: ${segmentError instanceof Error ? segmentError.message : 'Unknown error'}`);
        }
      }
      
      console.log('Total segments generated:', audioSegments.length);

      // Set up audio queue for sequential playback
      setAudioQueue(audioSegments);
      setCurrentSegmentIndex(0);
      setSegmentStartTime(0);
      
      // Update refs
      audioQueueRef.current = audioSegments;
      currentSegmentIndexRef.current = 0;
      
      // Calculate combined timings for word highlighting
      const combinedTimings = calculateCombinedTimings(audioSegments, textSegments);
      setWordTimings(combinedTimings);
      wordTimingsRef.current = combinedTimings;
      
      // Load first segment
      const firstSegment = audioSegments[0];
      setAudioData(firstSegment.audioData);
      console.log('Loading first segment, duration:', firstSegment.duration);
      
      const audio = new Audio(`data:audio/mp3;base64,${firstSegment.audioData}`);
      audioRef.current = audio;
      
      // Add event listener for when current segment ends
      audio.addEventListener('ended', handleSegmentEnd);
      console.log('Event listener added to first segment');
      
      audio.addEventListener('loadedmetadata', () => {
        // Calculate total duration from all segments
        const totalDuration = audioSegments.reduce((sum, segment) => sum + segment.duration, 0);
        console.log('Total duration calculated:', totalDuration);
        setPlaybackState(prev => ({ ...prev, duration: totalDuration }));
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsProcessingText(false);
    }
  };

  // Update current time and word index
  const updatePlaybackState = useCallback(() => {
    if (audioRef.current && playbackState.isPlaying) {
      // Calculate true current time across all segments
      const segmentCurrentTime = audioRef.current.currentTime;
      const totalCurrentTime = segmentStartTime + segmentCurrentTime;
      
      // Find current word index based on total time
      const currentWordIndex = wordTimings.findIndex(
        (timing) => totalCurrentTime >= timing.startTime && totalCurrentTime <= timing.endTime
      );

      setPlaybackState(prev => ({
        ...prev,
        currentTime: totalCurrentTime,
        currentWordIndex
      }));

      animationFrameRef.current = requestAnimationFrame(updatePlaybackState);
    }
  }, [playbackState.isPlaying, wordTimings, segmentStartTime]);

  // Play/pause audio
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (playbackState.isPlaying) {
      audioRef.current.pause();
      setPlaybackState(prev => ({ ...prev, isPlaying: false }));
    } else {
      audioRef.current.play();
      setPlaybackState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  // Stop audio and reset to beginning
  const stopPlayback = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    
    // Reset to first segment if we have a queue
    if (audioQueueRef.current.length > 0) {
      setCurrentSegmentIndex(0);
      setSegmentStartTime(0);
      
      // Update refs
      currentSegmentIndexRef.current = 0;
      
      // Load first segment again
      const firstSegment = audioQueueRef.current[0];
      const audio = new Audio(`data:audio/mp3;base64,${firstSegment.audioData}`);
      
      // Remove old event listeners
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleSegmentEnd);
      }
      
      audioRef.current = audio;
      audio.addEventListener('ended', handleSegmentEnd);
      setAudioData(firstSegment.audioData);
    }
    
    setPlaybackState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      currentTime: 0, 
      currentWordIndex: -1 
    }));
  };

  // Start animation loop when playing
  useEffect(() => {
    if (playbackState.isPlaying) {
      updatePlaybackState();
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playbackState.isPlaying, updatePlaybackState]);

  // Sync refs with state
  useEffect(() => {
    audioQueueRef.current = audioQueue;
  }, [audioQueue]);

  useEffect(() => {
    currentSegmentIndexRef.current = currentSegmentIndex;
  }, [currentSegmentIndex]);

  useEffect(() => {
    wordTimingsRef.current = wordTimings;
  }, [wordTimings]);

  // Cleanup audio event listeners on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleSegmentEnd);
      }
    };
  }, [handleSegmentEnd]);

  // Static markdown components (no highlighting needed here)
  const markdownComponents = {
    // Headers with clean styling
    h1: ({ children, ...props }: any) => (
      <h1 className="text-3xl font-bold text-gray-800 mb-6 mt-4" {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-6" {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4" {...props}>{children}</h3>
    ),
    
    // Styled paragraphs
    p: ({ children, ...props }: any) => (
      <p className="mb-4 leading-relaxed text-gray-700" {...props}>{children}</p>
    ),
    
    // Enhanced lists
    ul: ({ children, ...props }: any) => (
      <ul className="mb-4 ml-6 list-disc list-outside space-y-2" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="mb-4 ml-6 list-decimal list-outside space-y-2" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-gray-700 leading-relaxed" {...props}>{children}</li>
    ),
    
    // Code styling
    code: ({ children, ...props }: any) => (
      <code className="bg-gray-100 text-purple-700 px-2 py-1 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    ),
    
    // Emphasis styling
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-gray-800" {...props}>{children}</strong>
    ),
    em: ({ children, ...props }: any) => (
      <em className="italic text-gray-700" {...props}>{children}</em>
    ),
  };

  // Simple text highlighting (used during playback)
  const renderSimpleHighlightedText = () => {
    const displayText = studyBuddyConfig.enabled && enhancedText ? enhancedText : stripMarkdown(text);
    
    if (studyBuddyConfig.enabled && enhancedText) {
      // For Study Buddy mode, we need to track buddy segments for different styling
      const segments = parseTextSegments(displayText);
      let wordIndex = 0;
      
      return (
        <div className="text-lg leading-relaxed">
          {segments.map((segment, segmentIndex) => {
            const words = segment.text.split(/(\s+)/);
            
            return words.map((word, wordIndexInSegment) => {
              if (word.trim().length === 0) {
                return <span key={`${segmentIndex}-${wordIndexInSegment}`}>{word}</span>;
              }

              const currentIndex = wordIndex;
              wordIndex++;

              let baseClassName = 'word-highlight';
              let statusClassName = 'word-unspoken';
              
              if (currentIndex < playbackState.currentWordIndex) {
                statusClassName = 'word-spoken';
              } else if (currentIndex === playbackState.currentWordIndex) {
                statusClassName = 'word-current';
              } else if (currentIndex === playbackState.currentWordIndex + 1) {
                statusClassName = 'word-upcoming';
              }

              // Add buddy-specific styling
              const typeClassName = segment.type === 'buddy' ? 'buddy-text' : 'reader-text';
              const className = `${baseClassName} ${statusClassName} ${typeClassName}`;

              return (
                <span key={`${segmentIndex}-${wordIndexInSegment}`} className={className}>
                  {word}
                </span>
              );
            });
          })}
        </div>
      );
    } else {
      // Original simple highlighting for non-Study Buddy mode
      const words = displayText.split(/(\s+)/);
      let wordIndex = 0;

      return (
        <div className="text-lg leading-relaxed">
          {words.map((segment, index) => {
            if (segment.trim().length === 0) {
              return <span key={index}>{segment}</span>;
            }

            const currentIndex = wordIndex;
            wordIndex++;

            let className = 'word-highlight word-unspoken reader-text';
            
            if (currentIndex < playbackState.currentWordIndex) {
              className = 'word-highlight word-spoken reader-text';
            } else if (currentIndex === playbackState.currentWordIndex) {
              className = 'word-highlight word-current reader-text';
            } else if (currentIndex === playbackState.currentWordIndex + 1) {
              className = 'word-highlight word-upcoming reader-text';
            }

            return (
              <span key={index} className={className}>
                {segment}
              </span>
            );
          })}
        </div>
      );
    }
  };

  // Render enhanced text with buddy highlighting (for markdown view)
  const renderEnhancedMarkdown = (text: string) => {
    if (!studyBuddyConfig.enabled || !enhancedText) {
      return (
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {text}
        </ReactMarkdown>
      );
    }

    // Parse and render with buddy segments highlighted
    const segments = parseTextSegments(text);
    
    return (
      <div className="space-y-2">
        {segments.map((segment, index) => (
          <span key={index}>
            {segment.type === 'buddy' ? (
              <span className="buddy-text-static">
                {segment.text}
              </span>
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {segment.text}
              </ReactMarkdown>
            )}
          </span>
        ))}
      </div>
    );
  };

  // Render text with highlighting
  const renderHighlightedText = () => {
    const displayText = studyBuddyConfig.enabled && enhancedText ? enhancedText : text;
    
    // When audio is loaded, use simple text highlighting for accurate sync
    if (wordTimings.length > 0) {
      return renderSimpleHighlightedText();
    }
    
    // When not playing, show beautiful markdown with buddy highlighting
    return (
      <div className="prose prose-lg max-w-none">
        {renderEnhancedMarkdown(displayText)}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="mr-2" size={20} />
            Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ElevenLabs API Key
                {import.meta.env.VITE_ELEVENLABS_API_KEY && (
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✓ Set via .env
                  </span>
                )}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={import.meta.env.VITE_ELEVENLABS_API_KEY ? "Using environment variable" : "Enter your ElevenLabs API key"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reader Voice ID
                {import.meta.env.VITE_VOICE_ID && (
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✓ Set via .env
                  </span>
                )}
              </label>
              <input
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder={import.meta.env.VITE_VOICE_ID ? "Using environment variable" : "Reader Voice ID"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buddy Voice ID (for interjections)
                {import.meta.env.VITE_BUDDY_VOICE_ID && (
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✓ Set via .env
                  </span>
                )}
              </label>
              <input
                type="text"
                value={buddyVoiceId}
                onChange={(e) => setBuddyVoiceId(e.target.value)}
                placeholder={import.meta.env.VITE_BUDDY_VOICE_ID ? "Using environment variable" : "Buddy Voice ID"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          
          {/* Study Buddy Configuration */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <Brain className="mr-2 text-purple-600" size={20} />
              <h4 className="text-md font-medium text-gray-800">Study Buddy Mode</h4>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="studyBuddyEnabled"
                  checked={studyBuddyConfig.enabled}
                  onChange={(e) => setStudyBuddyConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="studyBuddyEnabled" className="text-sm font-medium text-gray-700">
                  Enable Study Buddy (AI adds excited, personalized comments to help you remember)
                </label>
              </div>
              {studyBuddyConfig.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name (for personalized comments)
                    </label>
                    <input
                      type="text"
                      value={studyBuddyConfig.userName}
                      onChange={(e) => setStudyBuddyConfig(prev => ({ ...prev, userName: e.target.value }))}
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Study Buddy will use your name to make comments more personal and engaging
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OpenAI API Key (for GPT-4.1)
                      {import.meta.env.VITE_OPENAI_API_KEY && (
                        <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          ✓ Set via .env
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={studyBuddyConfig.openaiApiKey}
                      onChange={(e) => setStudyBuddyConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                      placeholder={import.meta.env.VITE_OPENAI_API_KEY ? "Using environment variable" : "Enter your OpenAI API key"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Study Buddy will add exciting, personalized commentary to help you remember key points
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Interface */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {studyBuddyConfig.enabled ? (
                <Brain className="mr-3 text-yellow-300" size={24} />
              ) : (
                <Volume2 className="mr-3" size={24} />
              )}
              <div>
                <h2 className="text-xl font-semibold">
                  {studyBuddyConfig.enabled ? 'Study Buddy Reader' : 'Text-to-Speech Reader'}
                </h2>
                {studyBuddyConfig.enabled && (
                  <p className="text-sm text-purple-100">AI-powered interactive learning mode</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Text Input */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Enter your text to convert to speech:
            </label>
            <button
              onClick={() => setText(sampleText)}
              className="text-sm text-purple-600 hover:text-purple-800 transition-colors"
            >
              Load Sample Text
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your markdown text or any content you want to convert to speech. Supports **bold**, *italic*, # headers, lists, and more!"
            className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono text-sm"
          />
        </div>

        {/* Controls */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={generateSpeech}
                disabled={isLoading || !text.trim() || !apiKey.trim() || (studyBuddyConfig.enabled && (!studyBuddyConfig.openaiApiKey.trim() || !studyBuddyConfig.userName.trim() || !buddyVoiceId.trim()))}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isProcessingText ? (
                  <>
                    <Brain className="mr-2 animate-pulse" size={16} />
                    Study Buddy Analyzing...
                  </>
                ) : isLoading ? (
                  <>
                    <Volume2 className="mr-2 animate-pulse" size={16} />
                    Generating Speech...
                  </>
                ) : (
                  <>
                    {studyBuddyConfig.enabled ? (
                      <>
                        <Brain className="mr-2" size={16} />
                        Generate with Study Buddy
                      </>
                    ) : (
                      <>
                        <Volume2 className="mr-2" size={16} />
                        Generate Speech
                      </>
                    )}
                  </>
                )}
              </button>
              
              {audioData && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={togglePlayback}
                    className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                  >
                    {playbackState.isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button
                    onClick={stopPlayback}
                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  >
                    <Square size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Progress */}
            {audioData && (
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <span>
                  {Math.floor(playbackState.currentTime)}s / {Math.floor(playbackState.duration)}s
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {audioData && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full progress-bar"
                  style={{
                    width: `${(playbackState.currentTime / playbackState.duration) * 100}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex items-center">
              <AlertCircle className="mr-2 text-red-400" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Text Display with Highlighting */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              {studyBuddyConfig.enabled ? (
                <>
                  <Brain className="mr-2 text-purple-600" size={20} />
                  Study Buddy Enhanced Text
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 text-gray-600" size={20} />
                  Text Reader
                </>
              )}
              {playbackState.currentWordIndex >= 0 && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  (Word {playbackState.currentWordIndex + 1} of {wordTimings.length})
                </span>
              )}
            </h3>
            {studyBuddyConfig.enabled && enhancedText && (
              <div className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                ✨ Enhanced with AI commentary
              </div>
            )}
          </div>
          
          {studyBuddyConfig.enabled && !enhancedText && !isLoading && !isProcessingText && text && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <Brain className="mr-2 text-yellow-600" size={16} />
                <p className="text-sm text-yellow-800">
                  Study Buddy mode is enabled. Click "Generate with Study Buddy" to enhance your text with interactive commentary!
                </p>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
            {isProcessingText ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-purple-600 flex items-center justify-center">
                  <Brain className="mr-2 animate-spin" size={20} />
                  Study Buddy is analyzing your text and adding helpful commentary...
                </div>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-gray-500">
                  Generating speech with timestamps...
                </div>
              </div>
            ) : (
              renderHighlightedText()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TTSReader;
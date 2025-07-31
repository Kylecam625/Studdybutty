/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ELEVENLABS_API_KEY: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_VOICE_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
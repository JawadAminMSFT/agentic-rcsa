"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Mic, MicOff, Send, Volume2 } from "lucide-react"

function VoiceIndicator({ isSpeaking, who }: { isSpeaking: boolean, who: 'user' | 'assistant' }) {
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative">
        {/* Outer pulsing ring */}
        <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
          isSpeaking 
            ? (who === 'assistant' 
              ? 'bg-blue-400/30 animate-ping' 
              : 'bg-emerald-400/30 animate-ping') 
            : 'bg-gray-200/50'
        }`} style={{ animationDuration: '1.5s' }} />
        
        {/* Middle ring */}
        <div className={`absolute inset-1 rounded-full transition-all duration-200 ${
          isSpeaking 
            ? (who === 'assistant' 
              ? 'bg-blue-400/50 animate-pulse' 
              : 'bg-emerald-400/50 animate-pulse') 
            : 'bg-gray-300/30'
        }`} />
        
        {/* Inner circle with icon */}
        <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
          isSpeaking 
            ? (who === 'assistant' 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25' 
              : 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25') 
            : 'bg-gradient-to-br from-gray-400 to-gray-500'
        }`}>
          {who === 'assistant' ? (
            <Volume2 className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </div>
      </div>
      
      <div className="text-center">
        <div className={`text-sm font-medium transition-colors ${
          isSpeaking 
            ? (who === 'assistant' ? 'text-blue-600' : 'text-emerald-600')
            : 'text-gray-500'
        }`}>
          {who === 'assistant' ? 'AI Assistant' : 'You'}
        </div>
        <div className={`text-xs transition-colors ${
          isSpeaking 
            ? (who === 'assistant' ? 'text-blue-500' : 'text-emerald-500')
            : 'text-gray-400'
        }`}>
          {isSpeaking ? 'Speaking...' : 'Listening'}
        </div>
      </div>
    </div>
  )
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
const WEBRTC_URL = "https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc"
const DEPLOYMENT = "gpt-4o-realtime-preview-2"

export default function ConversationalIntake() {
  const [sessionActive, setSessionActive] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const [assistantSpeaking, setAssistantSpeaking] = useState(false)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  async function startSession() {
    setSessionActive(true)
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/openai/realtime-session`, { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      sessionIdRef.current = data.id
      const ephemeralKey = data.client_secret?.value

      const pc = new RTCPeerConnection()
      // setup audio
      let audioEl = audioRef.current
      if (!audioEl) {
        audioEl = document.createElement('audio')
        audioEl.autoplay = true
        document.body.appendChild(audioEl)
        audioRef.current = audioEl
      }
      pc.ontrack = (e) => { audioEl!.srcObject = e.streams[0] }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      function setupDataChannel(dc: RTCDataChannel) {
        dataChannelRef.current = dc
        let buffer = ""
        dc.onopen = () => {
          setIsConnected(true)
          dc.send(JSON.stringify({
            type: "session.update",
            session: {
              voice: "verse",
              instructions: "You are an AI agent helping a user draft a project description for a risk assessment. Guide the user to provide all necessary details for a thorough and clear project intake. Respond in a friendly, conversational way and ask clarifying questions if needed.",
              modalities: ["text", "audio"]
            }
          }))
        }
        dc.onmessage = (event) => {
          const msg = JSON.parse(event.data)
          
          // Debug logging
          console.log('Server event:', msg.type, msg)
          
          // Handle user speech detection events
          if (msg.type === "input_audio_buffer.speech_started") {
            console.log('User started speaking')
            setUserSpeaking(true)
            // When user starts speaking, assistant should stop
            setAssistantSpeaking(false)
          } else if (msg.type === "input_audio_buffer.speech_stopped") {
            console.log('User stopped speaking')
            setUserSpeaking(false)
          }
          
          // Handle assistant response events
          else if (msg.type === "response.created") {
            console.log('Response created')
            // Set assistant as speaking when response starts
            setAssistantSpeaking(true)
            setUserSpeaking(false)
          } else if (msg.type === "response.audio.delta") {
            console.log('Assistant audio delta')
            setAssistantSpeaking(true)
            setUserSpeaking(false)
          } else if (msg.type === "response.audio.done") {
            console.log('Assistant audio done')
            // Don't immediately set to false, wait for response.done
          } else if (msg.type === "response.text.delta") {
            console.log('Assistant text delta')
            buffer += msg.delta || ""
            // Set speaking when we get text content
            if (msg.delta) {
              setAssistantSpeaking(true)
              setUserSpeaking(false)
            }
          } else if (msg.type === "response.output_item.added") {
            console.log('Output item added')
            // Assistant is generating output
            setAssistantSpeaking(true)
            setUserSpeaking(false)
          } else if (msg.type === "response.done") {
            console.log('Response done')
            setAssistantSpeaking(false)
            setUserSpeaking(false)
          } else if (msg.type === "conversation.item.created") {
            console.log('Conversation item created')
            // Only reset if it's a user message (to prepare for assistant response)
            if (msg.item?.role === "user") {
              setUserSpeaking(false)
              // Don't reset assistant speaking here, let response events handle it
            }
          } else if (msg.type === "session_end" || msg.type === "session.end") {
            setAssistantSpeaking(false)
            setUserSpeaking(false)
            setIsConnected(false)
            dc.close()
          }
        }
        dc.onclose = () => {
          setAssistantSpeaking(false)
          setIsConnected(false)
        }
      }

      // client channel
      const dc = pc.createDataChannel('oai-events')
      setupDataChannel(dc)
      // server channel
      pc.ondatachannel = e => setupDataChannel(e.channel)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const answerRes = await fetch(`${WEBRTC_URL}?model=${DEPLOYMENT}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp!
      })
      const answerSdp = await answerRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

    } catch {
      setError("Failed to start session.")
      setSessionActive(false)
    } finally {
      setLoading(false)
    }
  }

  // Helper to send a user message as a conversation item and trigger a response
  function sendUserMessage(text: string) {
    const dataChannel = dataChannelRef.current
    if (dataChannel && dataChannel.readyState === "open") {
      // 1. Send user message as a conversation item
      dataChannel.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text }
          ]
        }
      }))
      // 2. Trigger model response (text + audio)
      dataChannel.send(JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["text", "audio"]
        }
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Project Intake</h1>
          <p className="text-gray-600">Let's gather your project details through conversation</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          {!sessionActive ? (
            /* Start Session View */
            <div className="p-12 text-center">
              <div className="mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Start?</h2>
                <p className="text-gray-600 text-sm">Click below to begin your AI-powered project intake session</p>
              </div>
              
              <Button 
                onClick={startSession} 
                disabled={loading}
                size="lg" 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-full font-medium shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Start AI Conversation
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Active Session View */
            <div className="p-8">
              {/* Connection Status */}
              <div className="flex items-center justify-center mb-6">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                  isConnected 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                  {isConnected ? 'Connected' : 'Connecting...'}
                </div>
              </div>

              {/* Voice Indicators */}
              <div className="flex justify-between items-center mb-8 px-8">
                <VoiceIndicator isSpeaking={assistantSpeaking} who="assistant" />
                <div className="flex-1 mx-8">
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
                <VoiceIndicator isSpeaking={userSpeaking} who="user" />
              </div>

              {/* Text Input */}
              <UserInput onSend={sendUserMessage} disabled={loading} />
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-6">
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  )
}

function UserInput({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("")
  
  return (
    <form onSubmit={e => { 
      e.preventDefault(); 
      if (value.trim()) { 
        onSend(value.trim()); 
        setValue("") 
      } 
    }} className="relative">
      <div className="flex gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <input 
          value={value} 
          onChange={e => setValue(e.target.value)} 
          disabled={disabled}
          placeholder="Type your message or just speak..." 
          className="flex-1 bg-transparent border-0 outline-none text-gray-900 placeholder-gray-500"
        />
        <Button 
          type="submit" 
          disabled={disabled || !value.trim()}
          size="sm"
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 shadow-sm transition-all hover:shadow-md"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}

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

// Message interface for conversation storage
interface ConversationMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  type: "text" | "audio" | "mixed"
}

// Conversation context interface
interface ConversationContext {
  conversationId: string
  sessionId: string | null
  messages: ConversationMessage[]
  status: "active" | "completed" | "error"
  createdAt: string
  updatedAt: string
  metadata: {
    totalMessages: number
    lastActivity: string
  }
}

export default function ConversationalIntake() {
  const [sessionActive, setSessionActive] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const [assistantSpeaking, setAssistantSpeaking] = useState(false)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  
  // Conversation storage state
  const [conversationContext, setConversationContext] = useState<ConversationContext | null>(null)
  const conversationIdRef = useRef<string | null>(null)

  // Initialize conversation context
  function initializeConversation() {
    const conversationId = `conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    conversationIdRef.current = conversationId
    
    const context: ConversationContext = {
      conversationId,
      sessionId: null,
      messages: [],
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        totalMessages: 0,
        lastActivity: new Date().toISOString()
      }
    }
    
    setConversationContext(context)
    return context
  }

  // Add message to conversation
  function addMessage(role: "user" | "assistant", content: string, type: "text" | "audio" | "mixed" = "text") {
    if (!conversationContext) return
    
    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      type
    }
    
    const updatedContext = {
      ...conversationContext,
      messages: [...conversationContext.messages, message],
      updatedAt: new Date().toISOString(),
      metadata: {
        totalMessages: conversationContext.messages.length + 1,
        lastActivity: new Date().toISOString()
      }
    }
    
    setConversationContext(updatedContext)
    
    // Save to backend
    saveConversationContext(updatedContext)
  }

  // Save conversation context to backend
  async function saveConversationContext(context: ConversationContext) {
    try {
      await fetch(`${API_BASE_URL}/save-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      })
    } catch (error) {
      console.error('Failed to save conversation:', error)
    }
  }

  // Complete conversation and finalize storage
  async function completeConversation() {
    if (!conversationContext) return
    
    const finalContext = {
      ...conversationContext,
      status: "completed" as const,
      updatedAt: new Date().toISOString()
    }
    
    setConversationContext(finalContext)
    await saveConversationContext(finalContext)
  }

  // End session function to clean up all resources
  async function endSession() {
    setLoading(true)
    
    try {
      // Stop all media tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        mediaStreamRef.current = null
      }
      
      // Close data channel
      if (dataChannelRef.current) {
        dataChannelRef.current.close()
        dataChannelRef.current = null
      }
      
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      
      // Clean up audio element
      if (audioRef.current) {
        audioRef.current.srcObject = null
        if (audioRef.current.parentNode) {
          audioRef.current.parentNode.removeChild(audioRef.current)
        }
        audioRef.current = null
      }
      
      // Complete conversation tracking
      await completeConversation()
      
      // Reset states
      setSessionActive(false)
      setIsConnected(false)
      setAssistantSpeaking(false)
      setUserSpeaking(false)
      sessionIdRef.current = null
      
    } catch (error) {
      console.error('Error ending session:', error)
      setError("Error ending session")
    } finally {
      setLoading(false)
    }
  }

  async function startSession() {
    setSessionActive(true)
    setError("")
    setLoading(true)
    
    // Initialize conversation tracking
    const context = initializeConversation()
    
    try {
      const res = await fetch(`${API_BASE_URL}/openai/realtime-session`, { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      sessionIdRef.current = data.id
      const ephemeralKey = data.client_secret?.value

      // Update conversation context with session ID
      const updatedContext = { ...context, sessionId: data.id }
      setConversationContext(updatedContext)
      await saveConversationContext(updatedContext)

      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc
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
      mediaStreamRef.current = stream

      function setupDataChannel(dc: RTCDataChannel) {
        dataChannelRef.current = dc
        let assistantBuffer = ""
        
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
            setAssistantSpeaking(false)
          } else if (msg.type === "input_audio_buffer.speech_stopped") {
            console.log('User stopped speaking')
            setUserSpeaking(false)
          } else if (msg.type === "input_audio_buffer.committed") {
            console.log('User audio committed', msg)
            // User speech was processed and committed - add placeholder message
            addMessage("user", "[Audio input - processing...]", "audio")
          }
          
          // Handle assistant response events
          else if (msg.type === "response.created") {
            console.log('Response created')
            setAssistantSpeaking(true)
            setUserSpeaking(false)
            assistantBuffer = "" // Reset buffer for new response
          } else if (msg.type === "response.audio.delta") {
            setAssistantSpeaking(true)
            setUserSpeaking(false)
          } else if (msg.type === "response.text.delta") {
            console.log('Assistant text delta:', msg.delta)
            assistantBuffer += msg.delta || ""
            if (msg.delta) {
              setAssistantSpeaking(true)
              setUserSpeaking(false)
            }
          } else if (msg.type === "response.output_item.added") {
            console.log('Output item added', msg)
            setAssistantSpeaking(true)
            setUserSpeaking(false)
          } else if (msg.type === "response.done") {
            console.log('Response done, buffer:', assistantBuffer)
            setAssistantSpeaking(false)
            setUserSpeaking(false)
            
            // Save the complete assistant response
            if (assistantBuffer.trim()) {
              addMessage("assistant", assistantBuffer.trim(), "mixed")
              console.log('Added assistant message:', assistantBuffer.trim())
            }
            assistantBuffer = ""
          } else if (msg.type === "conversation.item.created") {
            console.log('Conversation item created', msg)
            // Handle conversation item creation for both user and assistant
            if (msg.item?.role === "user") {
              console.log('User conversation item:', msg.item)
              // Check if this has audio content or text content
              if (msg.item.content) {
                // Look for text content first
                const textContent = msg.item.content
                  .filter((c: any) => c.type === "input_text")
                  .map((c: any) => c.text)
                  .join(" ")
                
                if (textContent.trim()) {
                  addMessage("user", textContent.trim(), "text")
                  console.log('Added user text message:', textContent.trim())
                } else {
                  // Check for audio content
                  const hasAudio = msg.item.content.some((c: any) => c.type === "input_audio")
                  if (hasAudio) {
                    addMessage("user", "[Spoken message - awaiting transcription]", "audio")
                    console.log('Added user audio message placeholder')
                  }
                }
              } else {
                // No content structure, but user item was created - likely audio
                addMessage("user", "[Spoken message]", "audio")
                console.log('Added user message fallback')
              }
              setUserSpeaking(false)
            } else if (msg.item?.role === "assistant") {
              console.log('Assistant conversation item:', msg.item)
              // For assistant items, we might get text content here too
              if (msg.item.content) {
                const textContent = msg.item.content
                  .filter((c: any) => c.type === "text")
                  .map((c: any) => c.text)
                  .join(" ")
                
                if (textContent.trim() && textContent !== assistantBuffer) {
                  // Only add if it's different from what we're buffering
                  addMessage("assistant", textContent.trim(), "text")
                  console.log('Added assistant message from conversation item:', textContent.trim())
                }
              }
            }
          } else if (msg.type === "conversation.item.input_audio_transcription.completed") {
            console.log('Audio transcription completed', msg)
            // This event contains the transcribed text from user's audio
            if (msg.transcript) {
              console.log('Transcript received:', msg.transcript)
              // Update the last user audio message with the actual transcription
              setConversationContext(prev => {
                if (!prev) return prev
                const messages = [...prev.messages]
                // Find the last user message with audio type and update it
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].role === "user" && 
                      (messages[i].type === "audio" || messages[i].content.includes("processing") || messages[i].content.includes("transcription"))) {
                    console.log('Updating message with transcript:', messages[i])
                    messages[i] = {
                      ...messages[i],
                      content: msg.transcript,
                      type: "mixed" // Now it has both audio and text
                    }
                    break
                  }
                }
                const updatedContext = {
                  ...prev,
                  messages,
                  updatedAt: new Date().toISOString(),
                  metadata: {
                    ...prev.metadata,
                    lastActivity: new Date().toISOString()
                  }
                }
                // Save updated context
                saveConversationContext(updatedContext)
                console.log('Updated conversation with transcript')
                return updatedContext
              })
            }
          } else if (msg.type === "session_end" || msg.type === "session.end") {
            setAssistantSpeaking(false)
            setUserSpeaking(false)
            setIsConnected(false)
            completeConversation()
            dc.close()
          }
        }
        
        dc.onclose = () => {
          setAssistantSpeaking(false)
          setIsConnected(false)
          completeConversation()
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
      // Mark conversation as error state
      if (conversationContext) {
        const errorContext = { ...conversationContext, status: "error" as const }
        setConversationContext(errorContext)
        await saveConversationContext(errorContext)
      }
    } finally {
      setLoading(false)
    }
  }

  // Helper to send a user message as a conversation item and trigger a response
  function sendUserMessage(text: string) {
    const dataChannel = dataChannelRef.current
    if (dataChannel && dataChannel.readyState === "open") {
      // Add user message to conversation immediately
      addMessage("user", text, "text")
      
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

  // Export conversation for backend processing
  async function exportConversationForDraft() {
    if (!conversationContext || conversationContext.messages.length === 0) {
      setError("No conversation to export")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/generate-draft-from-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversationContext.conversationId,
          messages: conversationContext.messages
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Draft generation initiated:', result)
        
        // Redirect to workflow progress page
        if (result.context_id) {
          window.location.href = `/workflows/${result.context_id}`
        } else {
          setError("Draft generation started but no workflow ID returned")
        }
      } else {
        throw new Error('Failed to generate draft')
      }
    } catch (error) {
      setError("Failed to generate project draft from conversation")
      console.error('Export error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Project Intake</h1>
          <p className="text-gray-600">Let's gather your project details through conversation</p>
          {conversationContext && (
            <div className="mt-2 text-xs text-gray-500">
              Conversation ID: {conversationContext.conversationId} | Messages: {conversationContext.metadata.totalMessages}
            </div>
          )}
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

              {/* Session Controls */}
              <div className="mt-6 flex justify-center gap-4">
                <Button 
                  onClick={endSession}
                  variant="outline"
                  disabled={loading}
                  className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-300 border-t-red-700 rounded-full animate-spin mr-2" />
                      Ending...
                    </>
                  ) : (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      End Session
                    </>
                  )}
                </Button>
                
                {/* Export to Draft Button */}
                {conversationContext && conversationContext.messages.length > 0 && (
                  <Button 
                    onClick={exportConversationForDraft}
                    variant="outline"
                    className="bg-white hover:bg-gray-50 border-gray-300"
                    disabled={loading}
                  >
                    Generate Project Draft ({conversationContext.messages.length} messages)
                  </Button>
                )}
              </div>

              {/* Debug Info - Show conversation state */}
              {conversationContext && (
                <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
                  <div>Messages: {conversationContext.messages.length}</div>
                  <div>Status: {conversationContext.status}</div>
                  <div>Last message: {conversationContext.messages.length > 0 ? 
                    conversationContext.messages[conversationContext.messages.length - 1].content.substring(0, 50) + '...' : 
                    'None'}</div>
                </div>
              )}
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

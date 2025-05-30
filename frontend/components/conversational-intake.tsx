"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Mic, Loader2 } from "lucide-react"

function VoicePulse({ isSpeaking, who }: { isSpeaking: boolean, who: 'user' | 'assistant' }) {
  return (
    <div className={`flex items-center gap-2 ${who === 'assistant' ? 'justify-start' : 'justify-end'}`}> 
      <div className={`w-3 h-3 rounded-full ${isSpeaking ? (who === 'assistant' ? 'bg-blue-500 animate-pulse' : 'bg-green-500 animate-pulse') : 'bg-gray-300'}`}></div>
      <span className="text-xs text-muted-foreground">{who === 'assistant' ? 'AI' : 'You'}</span>
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
  const containerRef = useRef<HTMLDivElement | null>(null)

  // auto-scroll on new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth"
      })
    }
  }, [])

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

      // setMessages([{ role: "assistant", text: "Hello! I will help you collect your project details. What is the project title? (You can speak now)" }])

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
          dc.send(JSON.stringify({
            type: "start_session",
            voice: "verse",
            model: DEPLOYMENT,
            instructions: "You are an AI agent helping a user draft a project description for a risk assessment. Guide the user to provide all necessary details for a thorough and clear project intake. Respond in a friendly, conversational way and ask clarifying questions if needed."
          }))
        }
        dc.onmessage = (event) => {
          const msg = JSON.parse(event.data)
          if (msg.type === "response.text.delta") {
            buffer += msg.delta || ""
            setAssistantSpeaking(true)
            clearTimeout((window as any)._aiPulseTimeout)
            ;(window as any)._aiPulseTimeout = setTimeout(() => setAssistantSpeaking(false), 600)
          } else if (msg.type === "response.done") {
            setAssistantSpeaking(false)
          } else if (msg.type === "session_end" || msg.type === "session.end") {
            setAssistantSpeaking(false)
            dc.close()
          }
        }
        dc.onclose = () => {
          setAssistantSpeaking(false)
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
    setUserSpeaking(true)
    setTimeout(() => setUserSpeaking(false), 1000)
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
    <Card>
      <CardHeader><CardTitle>Conversational Project Intake (AI)</CardTitle></CardHeader>
      <CardContent>
        {!sessionActive ? (
          <Button onClick={startSession} size="lg" className="w-full"><Mic className="mr-2 h-5 w-5"/>Start AI Conversation</Button>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 items-center justify-center py-8">
              <VoicePulse isSpeaking={assistantSpeaking} who="assistant" />
              <VoicePulse isSpeaking={userSpeaking} who="user" />
            </div>
            <UserInput onSend={sendUserMessage} disabled={loading} />
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4"/>
            <AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function UserInput({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("")
  return (
    <form onSubmit={e => { e.preventDefault(); if (value.trim()) { onSend(value.trim()); setValue("") } }} className="flex gap-2">
      <input value={value} onChange={e => setValue(e.target.value)} disabled={disabled}
             placeholder="Type your answer..." className="flex-1 border rounded px-3 py-2" />
      <Button type="submit" disabled={disabled || !value.trim()}>Send</Button>
    </form>
  )
}

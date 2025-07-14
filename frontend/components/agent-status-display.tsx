"use client"

import { ArrowRight, CheckCircle, Loader2 } from "lucide-react"
import { AgentDisplayStatus } from "@/hooks/use-agent-status"

interface AgentStatusDisplayProps {
  agentStatus: AgentDisplayStatus;
}

export default function AgentStatusDisplay({ agentStatus }: AgentStatusDisplayProps) {
  if (!agentStatus.isActive) return null;

  return (
    <div className="flex items-center space-x-3 p-3 bg-blue-50/50 border-l-3 border-blue-300 mb-4 rounded-r-md">
      <div className="flex-shrink-0">
        {agentStatus.isWaitingForResponse ? (
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        ) : (
          <div className="relative">
            <div className="h-4 w-4 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-blue-900">
            {agentStatus.agentName}
          </p>
          {agentStatus.messageIndex >= 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
              {agentStatus.messageIndex + 1}/4
            </span>
          )}
        </div>
        <p className="text-xs text-blue-700/80 mt-0.5">
          {agentStatus.currentMessage}
        </p>
      </div>
      {agentStatus.isWaitingForResponse && (
        <div className="flex-shrink-0">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      )}
    </div>
  );
}

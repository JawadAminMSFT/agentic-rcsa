"use client"

import { ArrowDown, CheckCircle } from "lucide-react"
import { getAgentConfig } from "@/lib/agent-messages"

interface AgentTransitionProps {
  fromStep: string;
  toStep: string;
}

export default function AgentTransition({ fromStep, toStep }: AgentTransitionProps) {
  const toAgentConfig = getAgentConfig(toStep);
  
  if (!toAgentConfig) return null;

  return (
    <div className="flex items-start py-2 my-1 ml-4">
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <ArrowDown className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-muted-foreground/80">{toAgentConfig.starting_message}</span>
      </div>
    </div>
  );
}

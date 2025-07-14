import { useState, useEffect, useRef } from 'react';
import { getAgentConfig, AgentMessageConfig } from '../lib/agent-messages';

export interface AgentDisplayStatus {
  isActive: boolean;
  currentMessage: string;
  agentName: string;
  messageIndex: number;
  isWaitingForResponse: boolean;
}

export function useAgentStatus(
  currentStep: string | null,
  isStepComplete: boolean,
  workflowStatus: string
) {
  const [agentStatus, setAgentStatus] = useState<AgentDisplayStatus>({
    isActive: false,
    currentMessage: '',
    agentName: '',
    messageIndex: -1,
    isWaitingForResponse: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentStepRef = useRef<string | null>(null);

  useEffect(() => {
    // Clean up existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset if no current step
    if (!currentStep) {
      setAgentStatus({
        isActive: false,
        currentMessage: '',
        agentName: '',
        messageIndex: -1,
        isWaitingForResponse: false
      });
      currentStepRef.current = null;
      return;
    }

    // Don't show if explicitly awaiting feedback
    if (workflowStatus === 'awaiting_feedback') {
      setAgentStatus({
        isActive: false,
        currentMessage: '',
        agentName: '',
        messageIndex: -1,
        isWaitingForResponse: false
      });
      currentStepRef.current = null;
      return;
    }

    // If this is a new step, start the agent sequence
    if (currentStepRef.current !== currentStep) {
      currentStepRef.current = currentStep;
      
      const agentConfig = getAgentConfig(currentStep);
      if (!agentConfig) {
        setAgentStatus({
          isActive: false,
          currentMessage: '',
          agentName: '',
          messageIndex: -1,
          isWaitingForResponse: false
        });
        return;
      }

      // Start with the starting message immediately
      setAgentStatus({
        isActive: true,
        currentMessage: agentConfig.starting_message,
        agentName: agentConfig.agent_name,
        messageIndex: -1,
        isWaitingForResponse: false
      });

      // Function to cycle through working messages
      let messageIndex = 0;
      
      const showNextWorkingMessage = () => {
        // Check if step is still active and not complete
        if (currentStepRef.current === currentStep && !isStepComplete) {
          if (messageIndex < agentConfig.working_messages.length) {
            setAgentStatus(prev => ({
              ...prev,
              currentMessage: agentConfig.working_messages[messageIndex],
              messageIndex: messageIndex,
              isWaitingForResponse: false
            }));
            
            messageIndex++;
            
            // If this is the last working message, don't schedule another one
            // Instead, wait for backend response
            if (messageIndex < agentConfig.working_messages.length) {
              timeoutRef.current = setTimeout(showNextWorkingMessage, agentConfig.message_delay_ms);
            } else {
              // Show waiting state after all working messages
              timeoutRef.current = setTimeout(() => {
                if (currentStepRef.current === currentStep && !isStepComplete) {
                  setAgentStatus(prev => ({
                    ...prev,
                    currentMessage: `${agentConfig.agent_name} is completing the analysis...`,
                    isWaitingForResponse: true
                  }));
                }
              }, agentConfig.message_delay_ms);
            }
          }
        }
      };

      // Start showing working messages after initial delay
      timeoutRef.current = setTimeout(showNextWorkingMessage, agentConfig.message_delay_ms);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentStep, isStepComplete, workflowStatus]);

  return agentStatus;
}

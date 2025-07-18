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

      console.log('Starting agent sequence for:', currentStep, 'Config:', agentConfig);

      // Function to cycle through working messages
      let messageIndex = 0;
      
      const showNextWorkingMessage = () => {
        console.log('showNextWorkingMessage called, messageIndex:', messageIndex, 'currentStep:', currentStepRef.current, 'isStepComplete:', isStepComplete);
        
        // Check if step is still active and not complete
        if (currentStepRef.current === currentStep && !isStepComplete) {
          if (messageIndex < agentConfig.working_messages.length) {
            console.log('Setting message:', agentConfig.working_messages[messageIndex]);
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
              console.log('Scheduling next message in', agentConfig.message_delay_ms, 'ms');
              timeoutRef.current = setTimeout(showNextWorkingMessage, agentConfig.message_delay_ms);
            } else {
              // Show waiting state after all working messages
              console.log('All messages shown, showing completion state');
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
        } else {
          console.log('Stopping message sequence - step changed or completed');
        }
      };

      // Start showing working messages after initial delay
      console.log('Scheduling first working message in', agentConfig.message_delay_ms, 'ms');
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

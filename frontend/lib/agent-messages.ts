export interface AgentMessageConfig {
  agent_name: string;
  starting_message: string;
  working_messages: string[];
  message_delay_ms: number;
}

export const AGENT_MESSAGES: Record<string, AgentMessageConfig> = {
  generate_draft: {
    agent_name: "Draft Agent",
    starting_message: "Passing to Draft Agent for submission generation",
    working_messages: [
      "Analyzing project description and requirements",
      "Researching similar submissions from catalog",
      "Generating draft structure and content",
      "Finalizing submission details and formatting"
    ],
    message_delay_ms: 2000
  },
  map_risks: {
    agent_name: "Risk Mapping Agent", 
    starting_message: "Passing to Risk Agent for risk identification",
    working_messages: [
      "Scanning comprehensive risk catalog",
      "Identifying risks relevant to your project",
      "Categorizing risks by type and severity",
      "Cross-referencing with similar past submissions"
    ],
    message_delay_ms: 2000
  },
  map_controls: {
    agent_name: "Controls Agent",
    starting_message: "Passing to Controls Agent for control mapping", 
    working_messages: [
      "Analyzing identified risks and requirements",
      "Scanning controls catalog for matches",
      "Mapping optimal controls to each risk",
      "Validating control coverage and effectiveness"
    ],
    message_delay_ms: 2000
  },
  generate_mitigations: {
    agent_name: "Mitigation Agent",
    starting_message: "Passing to Mitigation Agent for proposal generation",
    working_messages: [
      "Analyzing risk-control pairs for gaps",
      "Researching best practice mitigation strategies", 
      "Generating tailored mitigation proposals",
      "Optimizing recommendations for your context"
    ],
    message_delay_ms: 2000
  },
  flag_issues: {
    agent_name: "QA Agent", 
    starting_message: "Passing to QA Agent for quality assessment",
    working_messages: [
      "Reviewing submission completeness and quality",
      "Analyzing mitigation effectiveness and feasibility",
      "Scanning for potential gaps and deficiencies", 
      "Flagging issues that require attention"
    ],
    message_delay_ms: 2000
  },
  evaluate_decision: {
    agent_name: "Decision Agent",
    starting_message: "Passing to Decision Agent for final evaluation",
    working_messages: [
      "Evaluating overall submission strength",
      "Weighing identified risks against proposed controls",
      "Analyzing severity and impact of flagged issues",
      "Making final approval or rejection decision"
    ],
    message_delay_ms: 2000
  }
};

export function getAgentConfig(stepName: string): AgentMessageConfig | null {
  return AGENT_MESSAGES[stepName] || null;
}

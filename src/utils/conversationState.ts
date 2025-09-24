// In-memory conversation state manager for multi-step bot interactions  
// NOTE: In production, this should be replaced with persistent storage

// Maps phone number to conversational state object
const conversationState = new Map<string, any>();

// Set conversational state for a user (creates or updates)
export function setConversationState(phoneNumber: string, state: any) {
  conversationState.set(phoneNumber, state);
  console.log(`[STATE] Set for ${phoneNumber}:`, JSON.stringify(state));
}

// Get current conversational state for a user
export function getConversationState(phoneNumber: string): any {
  const state = conversationState.get(phoneNumber);
  console.log(`[STATE] Get for ${phoneNumber}:`, JSON.stringify(state));
  return state;
}

// Clear conversational state for a user (end of flow)
export function clearConversationState(phoneNumber: string) {
  conversationState.delete(phoneNumber);
  console.log(`[STATE] Cleared for ${phoneNumber}`);
}

// In-memory conversation state store for demo purposes
// Maps phoneNumber to a state object
const conversationState = new Map<string, any>();

export function setConversationState(phoneNumber: string, state: any) {
  conversationState.set(phoneNumber, state);
  console.log(`[STATE] Set for ${phoneNumber}:`, JSON.stringify(state));
}

export function getConversationState(phoneNumber: string): any {
  const state = conversationState.get(phoneNumber);
  console.log(`[STATE] Get for ${phoneNumber}:`, JSON.stringify(state));
  return state;
}

export function clearConversationState(phoneNumber: string) {
  conversationState.delete(phoneNumber);
  console.log(`[STATE] Cleared for ${phoneNumber}`);
}

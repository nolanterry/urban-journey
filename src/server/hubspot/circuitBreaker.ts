/**
 * Circuit Breaker Pattern
 * 
 * Prevents repeated failures from overwhelming the system.
 * Opens circuit after threshold failures, allows retry after cooldown.
 */

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const CIRCUIT_STATES = new Map<string, CircuitState>();

// Circuit breaker configuration
const MAX_FAILURES = 5; // Open circuit after 5 failures
const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown before retry
const RESET_WINDOW_MS = 5 * 60 * 1000; // Reset failure count after 5 minutes

/**
 * Get or create circuit state for a key
 */
function getCircuitState(key: string): CircuitState {
  const existing = CIRCUIT_STATES.get(key);
  if (existing) {
    return existing;
  }

  const state: CircuitState = {
    failures: 0,
    lastFailureTime: 0,
    isOpen: false,
  };
  CIRCUIT_STATES.set(key, state);
  return state;
}

/**
 * Check if circuit is open (should reject requests)
 */
export function isCircuitOpen(key: string): boolean {
  const state = getCircuitState(key);
  const now = Date.now();

  // Reset failure count if enough time has passed
  if (now - state.lastFailureTime > RESET_WINDOW_MS) {
    state.failures = 0;
    state.isOpen = false;
    return false;
  }

  // If circuit is open, check if cooldown period has passed
  if (state.isOpen) {
    if (now - state.lastFailureTime > COOLDOWN_MS) {
      // Cooldown passed, allow one retry
      state.isOpen = false;
      return false;
    }
    return true; // Still in cooldown
  }

  return false; // Circuit is closed
}

/**
 * Record a success (reset circuit state)
 */
export function recordSuccess(key: string): void {
  const state = getCircuitState(key);
  state.failures = 0;
  state.isOpen = false;
}

/**
 * Record a failure (increment failure count, open circuit if threshold reached)
 */
export function recordFailure(key: string): void {
  const state = getCircuitState(key);
  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= MAX_FAILURES) {
    state.isOpen = true;
  }
}

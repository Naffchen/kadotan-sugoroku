/** Pure state transitions for the cooperative, ten-square sugoroku game. */

const PHASES = new Set(['ready', 'activity', 'turnDone', 'checkpoint', 'ended']);

function validPlayerCount(value) {
  return Number.isInteger(value) && value >= 2 && value <= 12;
}

function assertState(state) {
  if (!state || typeof state !== 'object'
    || !validPlayerCount(state.playerCount)
    || !Number.isInteger(state.position) || state.position < 0 || state.position > 10
    || !Number.isInteger(state.lap) || state.lap < 1
    || !Number.isInteger(state.turnIndex) || state.turnIndex < 0 || state.turnIndex >= state.playerCount
    || !Number.isInteger(state.completedTurns) || state.completedTurns < 0
    || !Number.isInteger(state.rollIndex) || state.rollIndex < state.completedTurns
    || !PHASES.has(state.phase)
    || typeof state.continueToGoal !== 'boolean'
    || !Array.isArray(state.turns) || state.turns.length !== state.rollIndex
    || !Array.isArray(state.history)) {
    throw new TypeError('Invalid game state.');
  }
}

function requirePhase(state, phase, operation) {
  assertState(state);
  if (state.phase !== phase) {
    throw new Error(`${operation} requires phase "${phase}"; received "${state.phase}".`);
  }
}

function snapshot(state) {
  // Undo history is kept outside each snapshot to avoid recursively nested history.
  const { history, ...saved } = state;
  return saved;
}

/** Create a game before the first player's turn. Player indices are zero-based. */
export function createGame(playerCount = 6) {
  if (!validPlayerCount(playerCount)) {
    throw new RangeError('playerCount must be an integer from 2 to 12.');
  }
  return {
    playerCount,
    position: 0,
    lap: 1,
    turnIndex: 0,
    completedTurns: 0,
    rollIndex: 0,
    phase: 'ready',
    continueToGoal: false,
    turns: [],
    history: [],
    movement: null,
  };
}

/**
 * Enter the activity at the destination square. A goal always stops movement;
 * unused pips are discarded. Moving from the goal starts a new lap.
 * movement.steps is the actual distance, while the original roll is turn.die.
 */
export function move(state, die) {
  requirePhase(state, 'ready', 'move');
  if (!Number.isInteger(die) || die < 1 || die > 3) {
    throw new RangeError('die must be an integer from 1 to 3.');
  }

  const wrapped = state.position === 10;
  const base = wrapped ? 0 : state.position;
  const position = Math.min(10, base + die);
  const lap = state.lap + (wrapped ? 1 : 0);
  const rollIndex = state.rollIndex + 1;
  const movement = {
    from: state.position,
    to: position,
    steps: position - base,
    goal: position === 10,
    wrapped,
  };
  const turn = {
    rollIndex,
    playerIndex: state.turnIndex,
    die,
    lap,
    ...movement,
    completed: false,
  };

  return {
    ...state,
    position,
    lap,
    rollIndex,
    phase: 'activity',
    movement,
    turns: [...state.turns, turn],
    history: [...state.history, snapshot(state)],
  };
}

/** Mark the landing-square activity complete before allowing another roll. */
export function completeActivity(state) {
  requirePhase(state, 'activity', 'completeActivity');
  const completedTurns = state.completedTurns + 1;
  let phase;

  if (state.continueToGoal) {
    phase = state.position === 10 ? 'ended' : 'turnDone';
  } else {
    phase = completedTurns >= state.playerCount ? 'checkpoint' : 'turnDone';
  }

  return {
    ...state,
    completedTurns,
    phase,
    turns: [
      ...state.turns.slice(0, -1),
      { ...state.turns[state.turns.length - 1], completed: true },
    ],
  };
}

/** Advance to the next player after an ordinary, completed activity. */
export function nextTurn(state) {
  requirePhase(state, 'turnDone', 'nextTurn');
  return {
    ...state,
    turnIndex: (state.turnIndex + 1) % state.playerCount,
    phase: 'ready',
    movement: null,
  };
}

/**
 * After everyone has played once, continue until the next goal activity ends.
 * Continuing while at the goal deliberately starts another lap on the next roll.
 */
export function continueGame(state) {
  requirePhase(state, 'checkpoint', 'continueGame');
  return {
    ...state,
    turnIndex: (state.turnIndex + 1) % state.playerCount,
    phase: 'ready',
    continueToGoal: true,
    movement: null,
  };
}

/** The teacher may finish at any time, including during an unfinished activity. */
export function finishGame(state) {
  assertState(state);
  return { ...state, phase: 'ended', movement: null };
}

/**
 * Restore the state immediately before the latest roll. Completion, player
 * advancement, extension and finishing after that roll are undone together.
 */
export function undo(state) {
  assertState(state);
  if (state.history.length === 0) {
    throw new Error('There is no move to undo.');
  }
  const restored = {
    ...state.history[state.history.length - 1],
    history: state.history.slice(0, -1),
  };
  assertState(restored);
  return restored;
}

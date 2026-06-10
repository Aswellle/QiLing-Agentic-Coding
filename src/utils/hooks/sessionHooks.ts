import {
  HOOK_EVENTS,
  type HookEvent,
} from "../../entrypoints/agentSdkTypes.js";
import type { AppState } from "../../state/AppStateStore.js";
import type { Message } from "../../types/message.js";
import { logForDebugging } from "../debug.js";
import type { AggregatedHookResult } from "../hooks.js";
import type { HookCommand } from "../settings/types.js";
import { isHookEqual } from "./hooksSettings.js";

// FROM CC: AppState sessionHooks is Map<string, unknown> to avoid
// duplicating the SessionStore shape. These helpers provide typed access.
function getStore(
  appState: AppState,
  sessionId: string,
): SessionStore | undefined {
  return appState.sessionHooks.get(sessionId) as SessionStore | undefined;
}

type OnHookSuccess = (
  hook: HookCommand | FunctionHook,
  result: AggregatedHookResult,
) => void;

/** Function hook callback - returns true if check passes, false to block */
export type FunctionHookCallback = (
  messages: Message[],
  signal?: AbortSignal,
) => boolean | Promise<boolean>;

/**
 * Function hook type with callback embedded.
 * Session-scoped only, cannot be persisted to settings.json.
 */
export type FunctionHook = {
  type: "function";
  id?: string;
  timeout?: number;
  callback: FunctionHookCallback;
  errorMessage: string;
  statusMessage?: string;
};

type SessionHookMatcher = {
  matcher: string;
  skillRoot?: string;
  hooks: Array<{
    hook: HookCommand | FunctionHook;
    onHookSuccess?: OnHookSuccess;
  }>;
};

export type SessionStore = {
  hooks: {
    [event in HookEvent]?: SessionHookMatcher[];
  };
};

/**
 * Add a command or prompt hook to the session.
 */
export function addSessionHook(
  setAppState: (updater: (prev: AppState) => AppState) => void,
  sessionId: string,
  event: HookEvent,
  matcher: string,
  hook: HookCommand,
  onHookSuccess?: OnHookSuccess,
  skillRoot?: string,
): void {
  addHookToSession(
    setAppState,
    sessionId,
    event,
    matcher,
    hook,
    onHookSuccess,
    skillRoot,
  );
}

/**
 * Add a function hook to the session.
 * @returns The hook ID (for removal)
 */
export function addFunctionHook(
  setAppState: (updater: (prev: AppState) => AppState) => void,
  sessionId: string,
  event: HookEvent,
  matcher: string,
  callback: FunctionHookCallback,
  errorMessage: string,
  options?: {
    timeout?: number;
    id?: string;
  },
): string {
  const id = options?.id || `function-hook-${Date.now()}-${Math.random()}`;
  const hook: FunctionHook = {
    type: "function",
    id,
    timeout: options?.timeout || 5000,
    callback,
    errorMessage,
  };
  addHookToSession(setAppState, sessionId, event, matcher, hook);
  return id;
}

/**
 * Remove a function hook by ID from the session.
 */
export function removeFunctionHook(
  setAppState: (updater: (prev: AppState) => AppState) => void,
  sessionId: string,
  event: HookEvent,
  hookId: string,
): void {
  setAppState((prev) => {
    const store = getStore(prev, sessionId);
    if (!store) return prev;

    const eventMatchers = store.hooks[event] || [];
    const updatedMatchers = eventMatchers
      .map((m) => {
        const updatedHooks = m.hooks.filter((h) => {
          if (h.hook.type !== "function") return true;
          return h.hook.id !== hookId;
        });
        return updatedHooks.length > 0 ? { ...m, hooks: updatedHooks } : null;
      })
      .filter((m): m is SessionHookMatcher => m !== null);

    const newHooks =
      updatedMatchers.length > 0
        ? { ...store.hooks, [event]: updatedMatchers }
        : Object.fromEntries(
            Object.entries(store.hooks).filter(([e]) => e !== event),
          );

    (prev.sessionHooks as Map<string, SessionStore>).set(sessionId, {
      hooks: newHooks,
    });
    return prev;
  });

  logForDebugging(
    `Removed function hook ${hookId} for event ${event} in session ${sessionId}`,
  );
}

/**
 * Internal helper to add a hook to session state
 */
function addHookToSession(
  setAppState: (updater: (prev: AppState) => AppState) => void,
  sessionId: string,
  event: HookEvent,
  matcher: string,
  hook: HookCommand | FunctionHook,
  onHookSuccess?: OnHookSuccess,
  skillRoot?: string,
): void {
  setAppState((prev) => {
    const store = getStore(prev, sessionId) ?? { hooks: {} };
    const eventMatchers: SessionHookMatcher[] = store.hooks[event] || [];

    const existingMatcherIndex = eventMatchers.findIndex(
      (m) => m.matcher === matcher && m.skillRoot === skillRoot,
    );

    let updatedMatchers: SessionHookMatcher[];
    if (existingMatcherIndex >= 0) {
      updatedMatchers = [...eventMatchers];
      updatedMatchers[existingMatcherIndex] = {
        matcher,
        skillRoot,
        hooks: [
          ...updatedMatchers[existingMatcherIndex]!.hooks,
          { hook, onHookSuccess },
        ],
      };
    } else {
      updatedMatchers = [
        ...eventMatchers,
        { matcher, skillRoot, hooks: [{ hook, onHookSuccess }] },
      ];
    }

    (prev.sessionHooks as Map<string, SessionStore>).set(sessionId, {
      hooks: { ...store.hooks, [event]: updatedMatchers },
    });
    return prev;
  });
}

/**
 * Remove a specific hook from the session
 */
export function removeSessionHook(
  setAppState: (updater: (prev: AppState) => AppState) => void,
  sessionId: string,
  event: HookEvent,
  hook: HookCommand,
): void {
  setAppState((prev) => {
    const store = getStore(prev, sessionId);
    if (!store) return prev;

    const eventMatchers = store.hooks[event] || [];
    const updatedMatchers = eventMatchers
      .map((m) => {
        const updatedHooks = m.hooks.filter((h) => !isHookEqual(h.hook, hook));
        return updatedHooks.length > 0 ? { ...m, hooks: updatedHooks } : null;
      })
      .filter((m): m is SessionHookMatcher => m !== null);

    const newHooks = { ...store.hooks };
    if (updatedMatchers.length > 0) {
      newHooks[event] = updatedMatchers;
    } else {
      delete newHooks[event];
    }

    (prev.sessionHooks as Map<string, SessionStore>).set(sessionId, {
      ...store,
      hooks: newHooks,
    });
    return prev;
  });
}

export type SessionDerivedHookMatcher = {
  matcher: string;
  hooks: HookCommand[];
  skillRoot?: string;
};

function convertToHookMatchers(
  sessionMatchers: SessionHookMatcher[],
): SessionDerivedHookMatcher[] {
  return sessionMatchers.map((sm) => ({
    matcher: sm.matcher,
    skillRoot: sm.skillRoot,
    hooks: sm.hooks
      .map((h) => h.hook)
      .filter((h): h is HookCommand => h.type !== "function"),
  }));
}

/**
 * Get all session hooks for a specific event (excluding function hooks)
 */
export function getSessionHooks(
  appState: AppState,
  sessionId: string,
  event?: HookEvent,
): Map<HookEvent, SessionDerivedHookMatcher[]> {
  const store = getStore(appState, sessionId);
  if (!store) return new Map();

  const result = new Map<HookEvent, SessionDerivedHookMatcher[]>();
  if (event) {
    const matchers = store.hooks[event];
    if (matchers) result.set(event, convertToHookMatchers(matchers));
    return result;
  }
  for (const evt of HOOK_EVENTS) {
    const matchers = store.hooks[evt];
    if (matchers) result.set(evt, convertToHookMatchers(matchers));
  }
  return result;
}

type FunctionHookMatcher = {
  matcher: string;
  hooks: FunctionHook[];
};

/**
 * Get all session function hooks for a specific event
 */
export function getSessionFunctionHooks(
  appState: AppState,
  sessionId: string,
  event?: HookEvent,
): Map<HookEvent, FunctionHookMatcher[]> {
  const store = getStore(appState, sessionId);
  if (!store) return new Map();

  const extract = (s: SessionHookMatcher[]): FunctionHookMatcher[] =>
    s
      .map((sm) => ({
        matcher: sm.matcher,
        hooks: sm.hooks
          .map((h) => h.hook)
          .filter((h): h is FunctionHook => h.type === "function"),
      }))
      .filter((m) => m.hooks.length > 0);

  const result = new Map<HookEvent, FunctionHookMatcher[]>();
  if (event) {
    const matchers = store.hooks[event];
    if (matchers) {
      const fns = extract(matchers);
      if (fns.length > 0) result.set(event, fns);
    }
    return result;
  }
  for (const evt of HOOK_EVENTS) {
    const matchers = store.hooks[evt];
    if (matchers) {
      const fns = extract(matchers);
      if (fns.length > 0) result.set(evt, fns);
    }
  }
  return result;
}

/**
 * Get the full hook entry (including callbacks) for a specific session hook
 */
export function getSessionHookCallback(
  appState: AppState,
  sessionId: string,
  event: HookEvent,
  matcher: string,
  hook: HookCommand | FunctionHook,
):
  | {
      hook: HookCommand | FunctionHook;
      onHookSuccess?: OnHookSuccess;
    }
  | undefined {
  const store = getStore(appState, sessionId);
  if (!store) return undefined;

  const eventMatchers = store.hooks[event];
  if (!eventMatchers) return undefined;

  for (const me of eventMatchers) {
    if (me.matcher === matcher || matcher === "") {
      const entry = me.hooks.find((h) => isHookEqual(h.hook, hook));
      if (entry) return entry;
    }
  }
  return undefined;
}

/**
 * Clear all session hooks for a specific session
 */
export function clearSessionHooks(
  setAppState: (updater: (prev: AppState) => AppState) => void,
  sessionId: string,
): void {
  setAppState((prev) => {
    (prev.sessionHooks as Map<string, SessionStore>).delete(sessionId);
    return prev;
  });
  logForDebugging(`Cleared all session hooks for session ${sessionId}`);
}

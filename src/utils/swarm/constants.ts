/**
 * Swarm/team coordination constants — adapted from CC's utils/swarm/constants.ts
 *
 * Constants for the multi-agent swarm system (coordinator + teammates).
 */

export const TEAM_LEAD_NAME = 'team-lead'
export const SWARM_SESSION_NAME = 'qiling-swarm'
export const SWARM_VIEW_WINDOW_NAME = 'swarm-view'
export const TMUX_COMMAND = 'tmux'
export const HIDDEN_SESSION_NAME = 'qiling-hidden'

/**
 * Gets the socket name for external swarm sessions.
 * Includes PID to prevent conflicts between multiple QiLing instances.
 */
export function getSwarmSocketName(): string {
  return `qiling-swarm-${process.pid}`
}

/** Override the command used to spawn teammate instances. */
export const TEAMMATE_COMMAND_ENV_VAR = 'QILING_TEAMMATE_COMMAND'

/** Set on spawned teammates to indicate their assigned color. */
export const TEAMMATE_COLOR_ENV_VAR = 'QILING_AGENT_COLOR'

/** Set on spawned teammates to require plan mode before implementation. */
export const PLAN_MODE_REQUIRED_ENV_VAR = 'QILING_PLAN_MODE_REQUIRED'

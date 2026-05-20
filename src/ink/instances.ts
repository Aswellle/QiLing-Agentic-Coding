/**
 * Ink instance map — adapted from CC's ink/instances.ts
 *
 * Stores all Ink instances keyed by output stream so consecutive render()
 * calls reuse the same instance instead of creating a new one.
 * Instance is deleted from the map on unmount.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const instances = new Map<NodeJS.WriteStream, any>()
export default instances

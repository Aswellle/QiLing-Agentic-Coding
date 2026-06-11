/**
 * Command type — STUB.
 * FROM CC: types/command.js
 * CC's Command is a union of prompt/local/local-jsx commands; this minimal
 * shape covers the type positions used by ported agent code.
 */
export type Command = {
  name: string;
  description?: string;
  type?: string;
  [key: string]: unknown;
};

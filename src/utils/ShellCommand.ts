export type ExecResult = {
  stdout: string;
  stderr: string;
  code: number;
  interrupted: boolean;
};
export type ShellCommand = {
  background: (btid: string) => boolean;
  result: Promise<ExecResult>;
  kill: () => void;
  status: "running" | "backgrounded" | "completed" | "killed";
};
export function wrapSpawn(): never {
  throw new Error("NOT PORTED");
}
export function createAbortedCommand(): never {
  throw new Error("NOT PORTED");
}
export function createFailedCommand(e: string): ShellCommand {
  return {
    background: () => false,
    result: Promise.resolve({
      stdout: "",
      stderr: e,
      code: -1,
      interrupted: false,
    }),
    kill: () => {},
    status: "killed",
  };
}

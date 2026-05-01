// Production stub for react-devtools-core.
// Ink imports this only when process.env.DEV === 'true'.
// This stub is aliased via tsconfig paths so bun build --compile resolves it
// without requiring the real package to be installed.
const devtools = {
  connectToDevTools: () => {},
}

export default devtools

/**
 * App context — adapted from CC's ink/components/AppContext.ts
 *
 * React context exposing a method to exit (unmount) the Ink app.
 */

import { createContext } from 'react'

export type Props = {
  readonly exit: (error?: Error) => void
}

const AppContext = createContext<Props>({
  exit() {},
})

AppContext.displayName = 'InternalAppContext'

export default AppContext

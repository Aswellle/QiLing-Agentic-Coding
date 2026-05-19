/**
 * Mailbox React context — adapted from CC's context/mailbox.tsx
 *
 * Provides a Mailbox instance to the component tree.
 * Used for inter-agent and teammate message queuing in swarm mode.
 */

import React, { createContext, useContext, useMemo } from 'react'
import { Mailbox } from '../utils/mailbox.js'

const MailboxContext = createContext<Mailbox | undefined>(undefined)

export function MailboxProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  const mailbox = useMemo(() => new Mailbox(), [])
  return (
    <MailboxContext.Provider value={mailbox}>
      {children}
    </MailboxContext.Provider>
  )
}

export function useMailbox(): Mailbox {
  const mailbox = useContext(MailboxContext)
  if (!mailbox) throw new Error('useMailbox must be used within a MailboxProvider')
  return mailbox
}

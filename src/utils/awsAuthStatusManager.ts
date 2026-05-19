/**
 * Cloud provider auth status manager — adapted from CC's utils/awsAuthStatusManager.ts
 *
 * Singleton manager for AWS Bedrock/GCP Vertex authentication status.
 * Communicates auth refresh state between auth utilities and React components.
 * Provider-agnostic — serves all cloud auth refresh flows.
 */

import { createSignal } from './signal.js'

export type AwsAuthStatus = {
  isAuthenticating: boolean
  output: string[]
  error?: string
}

export class AwsAuthStatusManager {
  private static instance: AwsAuthStatusManager | null = null
  private status: AwsAuthStatus = { isAuthenticating: false, output: [] }
  private changed = createSignal<[status: AwsAuthStatus]>()

  static getInstance(): AwsAuthStatusManager {
    if (!AwsAuthStatusManager.instance) {
      AwsAuthStatusManager.instance = new AwsAuthStatusManager()
    }
    return AwsAuthStatusManager.instance
  }

  getStatus(): AwsAuthStatus {
    return { ...this.status, output: [...this.status.output] }
  }

  startAuthentication(): void {
    this.status = { isAuthenticating: true, output: [] }
    this.changed.emit(this.getStatus())
  }

  addOutput(line: string): void {
    this.status.output.push(line)
    this.changed.emit(this.getStatus())
  }

  setError(error: string): void {
    this.status.error = error
    this.changed.emit(this.getStatus())
  }

  endAuthentication(success: boolean): void {
    if (success) {
      this.status = { isAuthenticating: false, output: [] }
    } else {
      this.status.isAuthenticating = false
    }
    this.changed.emit(this.getStatus())
  }

  subscribe = this.changed.subscribe

  static reset(): void {
    if (AwsAuthStatusManager.instance) {
      AwsAuthStatusManager.instance.changed.clear()
      AwsAuthStatusManager.instance = null
    }
  }
}

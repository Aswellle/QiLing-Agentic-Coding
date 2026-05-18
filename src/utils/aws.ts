/**
 * AWS utilities — adapted from CC's utils/aws.ts
 *
 * Type guards and credential helpers for Bedrock provider integration.
 * Keeps AWS SDK imports dynamic to avoid loading ~929KB at startup when
 * Bedrock is not configured.
 */

import { logForDebugging } from './log.js'

export type AwsCredentials = {
  AccessKeyId: string
  SecretAccessKey: string
  SessionToken: string
  Expiration?: string
}

export type AwsStsOutput = {
  Credentials: AwsCredentials
}

type AwsError = { name: string }

/**
 * Check if an error is from the AWS credentials provider chain
 * (e.g., no credentials found in env/~/.aws/credentials/EC2 metadata).
 */
export function isAwsCredentialsProviderError(err: unknown): boolean {
  return (err as AwsError | undefined)?.name === 'CredentialsProviderError'
}

/**
 * Type guard for AWS STS assume-role / get-session-token output.
 */
export function isValidAwsStsOutput(obj: unknown): obj is AwsStsOutput {
  if (!obj || typeof obj !== 'object') return false
  const output = obj as Record<string, unknown>
  if (!output.Credentials || typeof output.Credentials !== 'object') return false
  const creds = output.Credentials as Record<string, unknown>
  return (
    typeof creds.AccessKeyId === 'string' && creds.AccessKeyId.length > 0 &&
    typeof creds.SecretAccessKey === 'string' && creds.SecretAccessKey.length > 0 &&
    typeof creds.SessionToken === 'string' && creds.SessionToken.length > 0
  )
}

/**
 * Verify AWS credentials are valid by calling STS GetCallerIdentity.
 * Throws if credentials are invalid or not configured.
 * Requires @aws-sdk/client-sts to be installed.
 */
export async function checkStsCallerIdentity(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts') as {
    STSClient: new (opts: object) => { send: (cmd: object) => Promise<unknown> }
    GetCallerIdentityCommand: new () => object
  }
  await new STSClient({}).send(new GetCallerIdentityCommand())
}

/**
 * Force-refresh AWS credential provider cache.
 * Call this after the user modifies ~/.aws/credentials.
 * Requires @aws-sdk/credential-providers to be installed.
 */
export async function clearAwsIniCache(): Promise<void> {
  try {
    logForDebugging('Clearing AWS credential provider cache')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fromIni } = require('@aws-sdk/credential-providers') as {
      fromIni: (opts: { ignoreCache?: boolean }) => () => Promise<unknown>
    }
    const iniProvider = fromIni({ ignoreCache: true })
    await iniProvider()
    logForDebugging('AWS credential provider cache refreshed')
  } catch {
    logForDebugging(
      'Failed to clear AWS credential cache (expected if no credentials configured)',
    )
  }
}

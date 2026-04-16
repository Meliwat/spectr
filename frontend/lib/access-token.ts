/**
 * Opaque random access tokens for anonymous project progress views.
 *
 * A project row carries an `access_token` column; the owner either is a
 * signed-in user (user_id match) OR holds the token via the URL. The token
 * is generated once at project creation, stored in the DB, and handed back
 * to the anonymous client — there is no HMAC secret to rotate.
 *
 * Verification is a direct DB lookup via `findProjectByToken` (see below),
 * so we never trust token contents — only the row the token unlocks.
 */

import crypto from 'crypto'

/** 32 random bytes → base64url (~43 chars). Collisions are cryptographically
 * implausible; the unique index on projects.access_token provides a hard
 * guarantee even if they did happen. */
export function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** Constant-time string compare. Use when you already have the expected token. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

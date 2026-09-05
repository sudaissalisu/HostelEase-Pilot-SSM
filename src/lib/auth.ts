import { SignJWT, jwtVerify } from 'jose'
import argon2 from 'argon2'
import { db } from './db'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'ssm-pilot-secret-change-me')

export interface SsmSession {
  userId: string
  email: string
  name: string
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

export async function createSession(user: SsmSession): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secret)
}

export async function verifySession(token: string): Promise<SsmSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SsmSession
  } catch {
    return null
  }
}

export async function getSession(): Promise<SsmSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('ssm_session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('ssm_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('ssm_session')
}

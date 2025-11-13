import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatCore from '@/components/ChatCore'

vi.mock('@/lib/peer-manager', () => ({
  initPeer: vi.fn(() => ({
    on: vi.fn(),
    id: 'test-peer-id'
  })),
  connectToPeer: vi.fn(),
  sendToAll: vi.fn(),
  destroy: vi.fn(),
}))

vi.mock('@/lib/invite-manager', () => ({
  inviteManager: {
    validateInvite: vi.fn(() => Promise.resolve('valid-peer-id')),
    createInvite: vi.fn(() => Promise.resolve('invite-id')),
  },
}))

vi.mock('@/lib/mobile-utils', () => ({
  isMobile: vi.fn(() => false),
  ensureHTTPS: vi.fn(),
  requestWakeLock: vi.fn(),
  isIOSPWA: vi.fn(() => false),
}))

describe('ChatCore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders chat interface', () => {
    render(<ChatCore invitePeerId={null} />)
    expect(screen.getByText(/Your ID:/i)).toBeInTheDocument()
  })

  it('displays message input and send button', () => {
    render(<ChatCore invitePeerId={null} />)
    expect(screen.getByPlaceholderText(/waiting for connection/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('shows create invite button when no peer connected', () => {
    render(<ChatCore invitePeerId={null} />)
    expect(screen.getByText(/Create Invite Link/i)).toBeInTheDocument()
  })

  it('shows disconnected status initially', () => {
    render(<ChatCore invitePeerId={null} />)
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument()
  })

  it('disables input when not connected', () => {
    render(<ChatCore invitePeerId={null} />)
    const input = screen.getByPlaceholderText(/waiting for connection/i) as HTMLInputElement
    expect(input.disabled).toBe(true)
  })
})

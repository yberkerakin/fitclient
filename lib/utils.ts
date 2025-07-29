import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the base URL for the application
 * - In development: Uses local IP address instead of localhost for QR codes
 * - In production: Uses the actual domain
 */
export function getBaseUrl(): string {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  }

  const { hostname, protocol, port } = window.location

  // If we're on localhost, we need to get the local IP address
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // For development, we'll use a placeholder that needs to be replaced
    // The actual IP will be detected by the QRCodeModal component
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`
  }

  // For production or other domains, use the current origin
  return window.location.origin
}

/**
 * Get the local IP address for development
 * This function attempts to get the local IP address for QR code generation
 */
export async function getLocalIPAddress(): Promise<string | null> {
  try {
    // Try to get local IP using WebRTC
    const pc = new RTCPeerConnection({ iceServers: [] })
    
    pc.createDataChannel('')
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    return new Promise((resolve) => {
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const ipMatch = event.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/)
          if (ipMatch) {
            resolve(ipMatch[1])
          }
        }
      }
      
      // Timeout after 1 second
      setTimeout(() => resolve(null), 1000)
    })
  } catch (error) {
    console.warn('Could not detect local IP address:', error)
    return null
  }
}

/**
 * Get the optimal base URL for QR code generation
 * - Tries to get local IP in development
 * - Falls back to localhost if IP detection fails
 * - Uses actual domain in production
 */
export async function getQRBaseUrl(): Promise<string> {
  const baseUrl = getBaseUrl()
  
  // If we're in development (localhost), try to get local IP
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    const localIP = await getLocalIPAddress()
    if (localIP) {
      const { protocol, port } = window.location
      return `${protocol}//${localIP}${port ? `:${port}` : ''}`
    }
  }
  
  return baseUrl
}

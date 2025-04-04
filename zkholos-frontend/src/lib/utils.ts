import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a timestamp to a human-readable date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

/**
 * Formats an Ethereum address to a shortened form
 */
export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

/**
 * Validates election timing
 */
export function validateElectionTiming(startTime: number, endTime: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const minDuration = 60 * 60 // 1 hour
  return startTime > now && endTime > startTime && (endTime - startTime) >= minDuration
}

/**
 * Checks if an election is currently active
 */
export function isElectionActive(startTime: number, endTime: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  return now >= startTime && now <= endTime
}

/**
 * Formats a number of votes with appropriate suffix
 */
export function formatVoteCount(count: number): string {
  if (count === 1) return '1 vote'
  return `${count} votes`
}

/**
 * Formats a percentage with appropriate precision
 */
export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
} 
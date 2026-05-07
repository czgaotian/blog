/**
 * Version utility
 *
 * Provides the current version of the server package
 */

import pkg from '../../package.json'

export const WORKER_BLOG_VERSION = pkg.version

/**
 * Get the current Worker Blog version
 */
export function getCoreVersion(): string {
  return WORKER_BLOG_VERSION
}

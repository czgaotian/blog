/**
 * Built-in feature exports.
 */

export { analyticsFeature } from './analytics'
export { emailFeature } from './email-plugin'
export { otpLoginFeature, createOTPLoginFeature } from './otp-login-plugin'
export { aiSearchFeature, AISearchService, IndexManager } from './ai-search-plugin'
export { oauthProvidersFeature, createOAuthProvidersFeature } from './oauth-providers'
export { OAuthService, BUILT_IN_PROVIDERS } from './oauth-providers/oauth-service'
export { resolveVariables, resolveVariablesInObject } from './global-variables-plugin'
export { getVariableBlotScript, getVariableTinyMceScript } from './global-variables-plugin'
export { resolveShortcodes, resolveShortcodesInObject, registerShortcodeHandler } from './shortcodes-plugin'
export { getShortcodeBlotScript, getShortcodeTinyMceScript } from './shortcodes-plugin'
export { wrapAdminPage } from './_shared/admin-template'
export { getSharedQuillStyles, getSharedQuillScript, getQuillEnhancerPollerScript } from './_shared/quill-shared'
export { getSharedTinyMceStyles, getTinyMcePluginScript } from './_shared/tinymce-shared'
export { securityAuditFeature, SecurityAuditService, BruteForceDetector, securityAuditMiddleware } from './security-audit-plugin'
export { userProfilesFeature, createUserProfilesFeature, defineUserProfile, getUserProfileConfig } from './user-profiles'
export type { ProfileFieldDefinition, UserProfileConfig } from './user-profiles'
export { stripeFeature, SubscriptionService, StripeAPI, requireSubscription } from './stripe-plugin'
export { TurnstileService, verifyTurnstile, createTurnstileMiddleware } from './turnstile-plugin'

export const SETUP_REQUIRED_CODE = 'SETUP_REQUIRED' as const

export interface SetupRequiredResponse {
  error: string
  code: typeof SETUP_REQUIRED_CODE
}


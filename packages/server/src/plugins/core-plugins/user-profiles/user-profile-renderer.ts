/**
 * User Profile Custom Fields Renderer
 *
 * Generates a legacy HTML section for custom profile fields.
 *
 * The SPA profile page consumes the JSON schema directly. This renderer remains
 * for compatibility with older server-rendered consumers without depending on
 * the admin templates package.
 */

import type { UserProfileConfig, ProfileFieldDefinition } from './user-profile-registry'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderField(field: ProfileFieldDefinition, value: unknown): string {
  const id = `custom_${field.name}`
  const label = escapeHtml(field.label)
  const required = field.required ? 'required' : ''
  const placeholder = escapeHtml(field.placeholder || '')
  const helpText = field.helpText ? `<p class="mt-1 text-xs text-zinc-500">${escapeHtml(field.helpText)}</p>` : ''

  if (field.type === 'select') {
    const options = (field.options || []).map(option => `
      <option value="${escapeHtml(option)}" ${String(value ?? field.default ?? '') === option ? 'selected' : ''}>${escapeHtml(option)}</option>
    `).join('')
    return `
      <label class="block">
        <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">${label}</span>
        <select id="${id}" name="${id}" ${required} class="mt-1 block w-full rounded-md border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900">
          ${options}
        </select>
        ${helpText}
      </label>`
  }

  if (field.type === 'boolean' || field.type === 'checkbox') {
    return `
      <label class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input id="${id}" name="${id}" type="checkbox" ${value ? 'checked' : ''} class="rounded border-zinc-300 dark:border-zinc-700">
        ${label}
      </label>
      ${helpText}`
  }

  const type = field.type === 'number'
    ? 'number'
    : field.type === 'date'
      ? 'date'
      : field.type === 'datetime'
        ? 'datetime-local'
        : 'text'

  return `
    <label class="block">
      <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">${label}</span>
      <input id="${id}" name="${id}" type="${type}" value="${escapeHtml(value ?? field.default ?? '')}" placeholder="${placeholder}" ${required} class="mt-1 block w-full rounded-md border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900">
      ${helpText}
    </label>`
}

export function renderCustomProfileSection(
  config: UserProfileConfig | null,
  customData: Record<string, any>
): string {
  if (!config || config.fields.length === 0) return ''

  const visibleFields = config.fields.filter(f => !f.hidden)
  if (visibleFields.length === 0) return ''

  const fieldsHtml = visibleFields
    .map((field) => {
      const value = customData[field.name] ?? field.default ?? ''
      return renderField(field, value)
    })
    .join('\n')

  return `
              <!-- Custom Profile Fields -->
              <div class="py-6 border-t border-b border-zinc-950/5 dark:border-white/5">
                <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Custom Profile Fields</h3>
                <div class="space-y-4">
                  ${fieldsHtml}
                </div>
              </div>`
}

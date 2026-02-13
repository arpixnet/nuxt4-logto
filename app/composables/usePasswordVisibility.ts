import { ref } from 'vue'

/**
 * Password Visibility Composable
 *
 * Provides a reusable way to toggle password field visibility.
 * Instead of creating multiple refs and toggle functions for each password field,
 * use this composable to get a consistent interface.
 *
 * Usage:
 * ```ts
 * const currentPassword = usePasswordVisibility()
 * const newPassword = usePasswordVisibility()
 *
 * // In template:
 * <UInput :type="currentPassword.type" ... />
 * <UButton @click="currentPassword.toggle" :icon="currentPassword.icon" />
 * ```
 */
export const usePasswordVisibility = (initialState = false) => {
  const visible = ref(initialState)

  const toggle = () => {
    visible.value = !visible.value
  }

  const show = () => {
    visible.value = true
  }

  const hide = () => {
    visible.value = false
  }

  // Computed properties for convenience
  const type = computed(() => visible.value ? 'text' : 'password')
  const icon = computed(() => visible.value ? 'i-lucide-eye-off' : 'i-lucide-eye')
  const ariaLabel = computed(() => visible.value ? 'Hide password' : 'Show password')

  return {
    visible,
    toggle,
    show,
    hide,
    type,
    icon,
    ariaLabel
  }
}

export type PasswordVisibility = ReturnType<typeof usePasswordVisibility>

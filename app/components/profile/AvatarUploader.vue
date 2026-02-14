<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const { refresh } = useAuthSession()

const fileInput = ref<HTMLInputElement | null>(null)
const isHovering = ref(false)

const { uploading, previewUrl, handleFileChange, reset } = useAvatarUpload({
  onSuccess: async () => {
    toast.add({
      title: t('profile.toasts.avatarUpdated'),
      color: 'success'
    })

    // Refresh session to get updated avatar
    await refresh()

    // Reset state
    reset()
  },
  onError: (error) => {
    toast.add({
      title: t('profile.errors.avatarUpload'),
      description: error,
      color: 'error'
    })
  }
})

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  handleFileChange(event)
  // Reset input so same file can be selected again
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="relative group">
    <!-- Avatar with upload overlay -->
    <button
      type="button"
      class="relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-none squircle"
      :disabled="uploading"
      @click="triggerFileInput"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    >
      <!-- Show preview during upload, otherwise show current avatar -->
      <div
        v-if="previewUrl"
        class="overflow-hidden rounded-none squircle"
        style="width: 56px; height: 56px;"
      >
        <img
          :src="previewUrl"
          alt="Preview"
          class="w-full h-full object-cover"
        >
      </div>
      <UiUserAvatar
        v-else
        size="lg"
      />

      <!-- Upload overlay -->
      <div
        class="absolute inset-0 flex items-center justify-center rounded-none squircle transition-opacity"
        :class="[
          uploading || isHovering
            ? 'opacity-100 bg-black/50'
            : 'opacity-0 bg-black/0'
        ]"
      >
        <div
          v-if="uploading"
          class="size-6 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        <UIcon
          v-else
          name="i-lucide-camera"
          class="size-6 text-white"
        />
      </div>
    </button>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      @change="onFileSelected"
    >
  </div>
</template>

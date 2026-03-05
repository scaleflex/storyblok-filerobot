import { ref } from 'vue'

const STORAGE_KEY = 'fr_preview'
const INDEX_KEY = 'fr_preview_idx'

// Read localStorage to restore preview state passed from the main iframe
// (Storyblok creates a new iframe for the portal modal, so we use localStorage
// as a cross-iframe communication channel).
// Immediately clear after reading so a full page reload always starts fresh.
const wasPreview = localStorage.getItem(STORAGE_KEY) === '1'
localStorage.removeItem(STORAGE_KEY)

export const isPreviewMode = ref(wasPreview)

export const setPreviewMode = (active: boolean, index?: number) => {
  isPreviewMode.value = active
  if (active) {
    localStorage.setItem(STORAGE_KEY, '1')
    if (index !== undefined) localStorage.setItem(INDEX_KEY, String(index))
  } else {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(INDEX_KEY)
  }
}

export const getSavedPreviewIndex = (): number =>
  parseInt(localStorage.getItem(INDEX_KEY) ?? '0', 10)

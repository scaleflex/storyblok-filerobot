<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFieldPlugin } from '@storyblok/field-plugin/vue3'
import { isPreviewMode, setPreviewMode } from './usePreviewState'
import { fetchSettings, getFieldTitle } from './useSettingsStore'

const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const formatValueText = (val: any): string => {
  if (val === null || val === undefined) return '-'
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return item.label ?? item.value ?? item.name ?? JSON.stringify(item)
        }
        return String(item)
      })
      .join(', ')
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${formatValueText(v)}`)
      .join('\n')
  }
  return String(val)
}

const formatValueHtml = (val: any): string => {
  if (val === null || val === undefined) return '-'
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return escapeHtml(String(item.label ?? item.value ?? item.name ?? JSON.stringify(item)))
        }
        return escapeHtml(String(item))
      })
      .join(', ')
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `<b>${escapeHtml(k)}</b>: ${formatValueHtml(v)}`)
      .join('<br>')
  }
  return escapeHtml(String(val))
}

const isMultiline = (val: any): boolean => {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

const isEmpty = (val: any): boolean => {
  if (val === null || val === undefined || val === '') return true
  if (Array.isArray(val)) return val.length === 0
  if (typeof val === 'object') return Object.keys(val).length === 0
  return false
}

// Hub stores locales like "cs-cz" while Storyblok's storyLang is the base code ("cs")
const normalizeLangCode = (code: string): string => code?.toLowerCase().split('-')[0] ?? ''

const isLangCode = (key: string): boolean => /^[a-z]{2,3}(-[a-z0-9]+)?$/i.test(key)

const isLangMap = (val: any): boolean => {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false
  const keys = Object.keys(val)
  return keys.length > 0 && keys.every(isLangCode)
}

// Resolves a multi-language attribute value down to the story's language.
// Storyblok's root/default language has no explicit code and maps to English.
// Hides the attribute (returns undefined) when no matching language is found.
const resolveAttributeValue = (val: any): any => {
  if (!isLangMap(val)) return val
  const rawLang = (plugin.data as any)?.storyLang
  const lang = !rawLang || rawLang === 'default' ? 'en' : rawLang
  const keys = Object.keys(val)
  const matchKey =
    keys.find((k) => k.toLowerCase() === lang.toLowerCase()) ??
    keys.find((k) => normalizeLangCode(k) === normalizeLangCode(lang))
  return matchKey ? val[matchKey] : undefined
}

const props = defineProps<{
  files: any[]
  currentFileIndex: number
}>()

const emit = defineEmits<{
  navigate: [index: number]
}>()

const plugin = useFieldPlugin({
  enablePortalModal: true,
})

watch(plugin, (newPlugin: any) => {
  if (newPlugin.type === 'loaded' && newPlugin.data?.options?.token) {
    fetchSettings(newPlugin.data.options.token)
  }
}, { once: true })

const currentFile = computed(() => props.files[props.currentFileIndex] ?? null)

const hasPrev = computed(() => props.currentFileIndex > 0)
const hasNext = computed(() => props.currentFileIndex < props.files.length - 1)

// Zoom state
const zoomScale = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const panStartX = ref(0)
const panStartY = ref(0)

const MIN_ZOOM = 0.5
const MAX_ZOOM = 5
const ZOOM_STEP = 0.25

const isZoomed = computed(() => zoomScale.value !== 1)
const isImage = computed(() => currentFile.value && getTypeAssets(currentFile.value.type) === 'image')
const zoomPercent = computed(() => Math.round(zoomScale.value * 100))

const resetZoom = () => {
  zoomScale.value = 1
  panX.value = 0
  panY.value = 0
}

const zoomIn = () => {
  zoomScale.value = Math.min(MAX_ZOOM, +(zoomScale.value + ZOOM_STEP).toFixed(2))
  if (zoomScale.value === 1) { panX.value = 0; panY.value = 0 }
}

const zoomOut = () => {
  zoomScale.value = Math.max(MIN_ZOOM, +(zoomScale.value - ZOOM_STEP).toFixed(2))
  if (zoomScale.value === 1) { panX.value = 0; panY.value = 0 }
}

const onWheel = (e: WheelEvent) => {
  if (!isImage.value) return
  e.preventDefault()
  if (e.deltaY < 0) zoomIn()
  else zoomOut()
}

const onMouseDown = (e: MouseEvent) => {
  if (!isZoomed.value || !isImage.value) return
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  panStartX.value = panX.value
  panStartY.value = panY.value
}

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  panX.value = panStartX.value + (e.clientX - dragStartX.value)
  panY.value = panStartY.value + (e.clientY - dragStartY.value)
}

const onMouseUp = () => {
  isDragging.value = false
}

const imageTransform = computed(() => ({
  transform: `scale(${zoomScale.value}) translate(${panX.value / zoomScale.value}px, ${panY.value / zoomScale.value}px)`,
  cursor: isZoomed.value ? (isDragging.value ? 'grabbing' : 'grab') : 'default',
  transition: isDragging.value ? 'none' : 'transform 0.15s ease',
}))

// Reset zoom when navigating files
watch(() => props.currentFileIndex, () => resetZoom())

const closePreview = () => {
  setPreviewMode(false)
  if (plugin.actions) plugin.actions.setModalOpen(false)
}

const navigatePrev = () => {
  if (hasPrev.value) emit('navigate', props.currentFileIndex - 1)
}

const navigateNext = () => {
  if (hasNext.value) emit('navigate', props.currentFileIndex + 1)
}

const getTypeAssets = (type: string) => type.split('/')[0]

const getPreviewUrl = (url: string) => {
  if (!url) return ''
  try {
    const [base, query] = url.split('?')
    const params = new URLSearchParams(query || '')
    // params.set('width', '800')
    return `${base}?${params.toString()}`
  } catch {
    return url
  }
}
</script>

<template>
  <div v-if="plugin.data?.isModalOpen && isPreviewMode && currentFile" class="fr-preview-overlay">
    <div class="fr-preview-header">
      <span class="fr-preview-title">{{ currentFile.name }}</span>
    </div>

    <div class="fr-preview-body">
      <div
        class="fr-preview-area"
        @wheel="onWheel"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
      >
        <button v-if="hasPrev" class="fr-nav-arrow fr-nav-prev" @click="navigatePrev">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
          </svg>
        </button>

        <div class="fr-preview-content">
          <img
            v-if="getTypeAssets(currentFile.type) === 'image'"
            :src="getPreviewUrl(currentFile.cdn)"
            :alt="currentFile.name"
            class="fr-preview-img"
            :style="imageTransform"
            draggable="false"
          />
          <video
            v-else-if="getTypeAssets(currentFile.type) === 'video'"
            class="fr-preview-video"
            controls
          >
            <source :src="currentFile.cdn" :type="currentFile.type" />
          </video>
          <audio
            v-else-if="getTypeAssets(currentFile.type) === 'audio'"
            controls
            class="fr-preview-audio"
          >
            <source :src="currentFile.cdn" :type="currentFile.type" />
          </audio>
          <div v-else class="fr-preview-file">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" width="80" height="80">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p>.{{ currentFile.extension }}</p>
          </div>
        </div>

        <button v-if="hasNext" class="fr-nav-arrow fr-nav-next" @click="navigateNext">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </button>

        <!-- Zoom controls -->
        <div v-if="isImage" class="fr-zoom-toolbar">
          <button class="fr-zoom-btn" @click="zoomOut" :disabled="zoomScale <= MIN_ZOOM" title="Zoom out">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
          </button>
          <span class="fr-zoom-level" @click="resetZoom" title="Reset zoom">{{ zoomPercent }}%</span>
          <button class="fr-zoom-btn" @click="zoomIn" :disabled="zoomScale >= MAX_ZOOM" title="Zoom in">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="fr-preview-sidebar">
        <div class="fr-sidebar-detail">
          <div class="fr-detail-row">
            <span class="fr-detail-label">Format</span>
            <span class="fr-detail-value">{{ currentFile.extension?.toUpperCase() }}</span>
          </div>
          <div class="fr-detail-row">
            <span class="fr-detail-label">Type</span>
            <span class="fr-detail-value">{{ currentFile.type }}</span>
          </div>
          <div class="fr-detail-row">
            <span class="fr-detail-label">Owner</span>
            <span class="fr-detail-value">{{ currentFile.ownerName || '-' }}</span>
          </div>
          <div class="fr-detail-row">
            <span class="fr-detail-label">UUID</span>
            <span class="fr-detail-value fr-detail-uuid">{{ currentFile.uuid?.split('_')[0] }}</span>
          </div>
          <div class="fr-detail-row">
            <span class="fr-detail-label">Name</span>
            <span class="fr-detail-value">{{ currentFile.name }}</span>
          </div>
          <template v-if="currentFile.attributes">
            <div class="fr-section-divider"></div>
            <div class="fr-detail-label-header">Attributes</div>
            <template v-for="(val, key) in currentFile.attributes" :key="key">
              <div v-if="String(key) !== 'meta' && !isEmpty(resolveAttributeValue(val))" class="fr-detail-row">
                <span class="fr-detail-label">{{ key }}</span>
                <span v-if="isMultiline(resolveAttributeValue(val))" class="fr-detail-value fr-detail-multiline" v-html="formatValueHtml(resolveAttributeValue(val))"></span>
                <span v-else class="fr-detail-value">{{ formatValueText(resolveAttributeValue(val)) }}</span>
              </div>
              <template v-else>
                <template v-for="(metaVal, metaKey) in val" :key="metaKey">
                  <div v-if="!isEmpty(resolveAttributeValue(metaVal))" class="fr-detail-row">
                    <span class="fr-detail-label">{{ getFieldTitle(String(metaKey)) }}</span>
                    <span v-if="isMultiline(resolveAttributeValue(metaVal))" class="fr-detail-value fr-detail-multiline" v-html="formatValueHtml(resolveAttributeValue(metaVal))"></span>
                    <span v-else class="fr-detail-value">{{ formatValueText(resolveAttributeValue(metaVal)) }}</span>
                  </div>
                </template>
              </template>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

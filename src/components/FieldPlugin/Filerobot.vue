<script setup lang="ts">
import { useFieldPlugin } from '@storyblok/field-plugin/vue3'
import { watch, onMounted, ref } from 'vue'
import { isPreviewMode } from './usePreviewState'

const SFX_UPLOADER_JS = 'https://cdn.scaleflex.com/uploader/1.0.8/sfx-uploader.min.js'
const SFX_ASSET_PICKER_JS = 'https://cdn.scaleflex.com/asset-picker/1.0.8/asset-picker.min.js'

interface SelectedFiles {
  (files: any[]): void
}

const props = defineProps<{
  selectedFiles: SelectedFiles
}>()

const plugin = useFieldPlugin({ enablePortalModal: true })
const pickerEl = ref<HTMLElement | null>(null)
let scriptsLoaded = false
let listenerAttached = false

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load: ${src}`))
    document.head.appendChild(s)
  })

const convertForceFilters = (str: string) => {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const replaced = str.replace(/\$CURRENT_DATE/g, `${y}-${m}-${d}`)
  try {
    return JSON.parse(replaced)
  } catch (e) {
    console.error('forceFilters: invalid JSON', e)
    return []
  }
}

const DEFAULT_PICKER_CONFIG = {
  multiSelect: true,
  showMetadata: true,
  rememberLastTab: true,
  rememberLastFolder: true,
  rememberLastView: true,
  folderCreation: true
}

const buildConfig = (options: any) => {
  const { token, secTemplate, rootDir, limitType, forceFilters, assetPickerConfig, disableTransformations, enableAIEmbed } = options
  let extraConfig: Record<string, any> = {}
  if (assetPickerConfig && assetPickerConfig.trim() !== '') {
    try {
      extraConfig = JSON.parse(assetPickerConfig);
    } catch (e) {
      console.error('assetPickerConfig: invalid JSON', e);
    }
  }

  const pickerConfig: Record<string, any> = {
    auth: {
      mode: 'securityTemplate',
      securityTemplateKey: secTemplate,
      projectToken: token,
    },
    uploader: {},
    rootFolderPath: rootDir ?? '/',
    displayMode: 'inline',
    ...DEFAULT_PICKER_CONFIG,
    ...extraConfig,
  }

  //This is to cover the old version when we removed the two options disableTransformations and enableAIEmbed
  pickerConfig.transformations = (disableTransformations === undefined) ? false : Boolean(!parseInt(disableTransformations));
  pickerConfig.enableAISearch = (enableAIEmbed === undefined) ? false : Boolean(parseInt(enableAIEmbed));
  
  const forcedFilters: Record<string, any> = {}

  if (limitType && limitType.trim() !== '') {
    const values = limitType
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
    if (values.length > 0) {
      forcedFilters.type = { type: 'string', values }
    }
  }

  if (forceFilters && forceFilters.trim() !== '') {
    const parsed = convertForceFilters(forceFilters)
    if (parsed.length > 0) {
      forcedFilters.metadata = parsed
    }
  }

  if (Object.keys(forcedFilters).length > 0) {
    pickerConfig.forcedFilters = forcedFilters
  }

  return pickerConfig
}

const initPicker = async (options: any) => {
  if (!scriptsLoaded) {
    await loadScript(SFX_UPLOADER_JS)
    await loadScript(SFX_ASSET_PICKER_JS)
    scriptsLoaded = true
  }

  const el = pickerEl.value as any
  if (!el) return

  el.config = buildConfig(options)

  if (!listenerAttached) {
    el.addEventListener('ap-select', (e: CustomEvent) => {
      const assets = (e.detail?.assets ?? []).map((asset: any) => ({
        ...asset,
        url: {
          ...asset.url,
          cdn: asset.transformation?.url?.cdn
            ?? asset.transformation?.url?.permalink_cdn
            ?? asset.url?.cdn,
        },
      }))
      props.selectedFiles(assets)
    })
    listenerAttached = true
  }
}

watch(() => plugin.data, (data) => {
  if (data?.isModalOpen && !isPreviewMode.value) {
    initPicker(data.options)
  }
})
</script>

<template>
  <div v-show="!isPreviewMode" class="sfx-picker-wrapper">
    <sfx-asset-picker ref="pickerEl" />
  </div>
</template>

<style scoped>
.sfx-picker-wrapper {
  width: 100%;
  height: 100%;
}

sfx-asset-picker {
  --ap-inline-height: calc(100vh - 60px);
}
</style>

<script setup lang="ts">
import { useFieldPlugin } from '@storyblok/field-plugin/vue3'
import { watch, onMounted } from 'vue'
import { loadScript } from "vue-plugin-load-script";
import { isPreviewMode } from './usePreviewState'

interface SelectedFiles {
  (files: any[]): void; // Adjust the type of 'files' based on its structure
}

const props = defineProps<{
  selectedFiles: SelectedFiles
}>()

const plugin = useFieldPlugin({
  enablePortalModal: true,
})

const convertForceFilters = (forceFiltersStr: any) => {
    // ex: [{"key": "gueltig_bis", "value": ["$CURRENT_DATE..", "EMPTY"]}]
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(today.getDate()).padStart(2, '0');

    // Combine into the desired format
    const currentDate = `${year}-${month}-${day}`;

    // Replace $CURRENT_DATE with actual date
    forceFiltersStr = forceFiltersStr.replace(/\$CURRENT_DATE/g, currentDate);
    // Convert string to an array (parse JSON safely)
    try {
        return JSON.parse(forceFiltersStr);
    } catch (error) {
        console.error("Invalid JSON format:", error);
        return [];
    }
}

onMounted(() => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://scaleflex.cloudimg.io/v7/plugins/widget/v4/latest/scaleflex-widget.min.css';
  document.head.appendChild(link);
})

watch(() => plugin.data, (newPlugin) => {
    if (newPlugin && newPlugin.isModalOpen && !isPreviewMode.value) {
      // Script is loaded, do something
      loadScript("https://scaleflex.cloudimg.io/v7/plugins/widget/v4/latest/scaleflex-widget.min.js")
      .then(() => {
        let limitTypeArr: any = []
        if ('limitType' in newPlugin.options && newPlugin.options.limitType && newPlugin.options.limitType != '') {
          limitTypeArr = newPlugin.options.limitType.split(",").map(function(item) {
            return item.trim();
          })
        }
        const forceFilters = newPlugin.options.forceFilters;
        const container = newPlugin.options.token;

        const securityTemplateID = newPlugin.options.secTemplate;
        const rootFolderPath = newPlugin.options.rootDir ?? '/';
        const disableTransformations = (newPlugin.options.disableTransformations === undefined) ? 1 : parseInt(newPlugin.options.disableTransformations);
        const enableAIEmbed = (newPlugin.options.enableAIEmbed === undefined) ? 0 : parseInt(newPlugin.options.enableAIEmbed);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment     
        // @ts-ignore
        const ScaleflexWidget = window.ScaleflexWidget;
        const Core = ScaleflexWidget.Core; // required (docs: https://www.npmjs.com/package/@filerobot/core)
        const Explorer = ScaleflexWidget.Explorer; // required (docs: https://www.npmjs.com/package/@filerobot/explorer)
        const XHRUpload = ScaleflexWidget.XHRUpload; // required (docs: https://www.npmjs.com/package/@filerobot/xhr-upload)
        const ProgressPanel = ScaleflexWidget.ProgressPanel
        const scaleflexWidget = Core({
          securityTemplateId: securityTemplateID,
          // sassKey:
          //   "SASS__v1.05__wM0gTO0UTO3AzN4AjN4YTMxYDN6AXC0QTM6QWamlAMwQjN4oTZnFWCtlmbox2ZiZ2Lt92YuQ3bi9mclxWam5SawFGHvlmLlJ3b0NncpFmLpBXYu0WauhGbnJmZboDZJADMwIjM6AXatVXCwADMyIjOtBXb1lAMwAjMyoTb1lQNwIzM5MjN3YTM6Q3c__b3609fa624",
          container: container,
          dev: false // optional, default: false
        });

        interface Filters {
          mimeTypes: any;
          metadata?: any; // Optional 'metadata' property
        }

        let configs: {
          target: string;
          config: { rootFolderPath: string };
          inline: boolean;
          width: string;
          height: string;
          resetAfterClose: boolean;
          disableExportButton: boolean;
          hideExportButtonIcon: boolean;
          preventExportDefaultBehavior: boolean;
          disableDownloadButton: boolean;
          hideDownloadButtonIcon: boolean;
          preventDownloadDefaultBehavior: boolean;
          hideDownloadVariationsOption: any;
          disableFileResolutionFallback: boolean;
          showFoldersTree: boolean;
          defaultFieldKeyOfBulkEditPanel: string;
          disableFiltersAndSearch: boolean;
          showProgressDetails: boolean;
          locale: {
            strings: { mutualizedExportButtonLabel: string; mutualizedDownloadButton: string };
          };
          filters: Filters;
          forceFilters?: boolean;
          ExploreViewComponent: any;
          enableAIEmbed: any;
        } = {
          target: '#filerobot-widget',
          config: { rootFolderPath: rootFolderPath },
          inline: true,
          width: '100%',
          height: '100vh',
          resetAfterClose: true,
          disableExportButton: false,
          hideExportButtonIcon: true,
          preventExportDefaultBehavior: true,
          disableDownloadButton: false,
          hideDownloadButtonIcon: true,
          preventDownloadDefaultBehavior: true,
          hideDownloadVariationsOption: disableTransformations,
          disableFileResolutionFallback: true,
          showFoldersTree: false,
          defaultFieldKeyOfBulkEditPanel: 'title',
          disableFiltersAndSearch: false,
          showProgressDetails: true,
          locale: {
            strings: {
              mutualizedExportButtonLabel: 'Insert',
              mutualizedDownloadButton: 'Insert',
            },
          },
          filters: {
            mimeTypes: limitTypeArr,
          },
          ExploreViewComponent: ScaleflexWidget.Explorer.ExploreViewComponent,
          enableAIEmbed: enableAIEmbed,
        };

        if (forceFilters && forceFilters.trim() != '') {
          configs.filters.metadata = convertForceFilters(forceFilters);
          configs.forceFilters = true;
        }

        scaleflexWidget
        .use(Explorer, configs)
        .use(ProgressPanel, {
          target: '#filerobot-widget-progress-panel',
        })
        .use(XHRUpload)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment     
        // @ts-ignore
        .on('export', function(files) {
          console.log(files[0].file.url.download);
          // Define these functions or replace them with actual logic
          props.selectedFiles(files)
          files = []
          return false
        });
      })
    .catch(() => {
      // Failed to fetch script
    });
    }
})

</script>

<template>
  <div v-show="!isPreviewMode">
    <div id='filerobot-widget'></div>
    <div id='filerobot-widget-progress-panel'></div>
  </div>
</template>
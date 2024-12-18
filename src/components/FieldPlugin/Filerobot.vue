<script setup lang="ts">
import { useFieldPlugin } from '@storyblok/field-plugin/vue3'
import { watch, onMounted } from 'vue'
import { loadScript } from "vue-plugin-load-script";

interface SelectedFiles {
  (files: any[]): void; // Adjust the type of 'files' based on its structure
}

const props = defineProps<{
  selectedFiles: SelectedFiles
}>()

const plugin = useFieldPlugin({
  enablePortalModal: true,
})

onMounted(() => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.scaleflex.com/plugins/filerobot-widget/v3/latest/filerobot-widget.min.css';
  document.head.appendChild(link);
})

watch(() => plugin.data, (newPlugin) => {
    if (newPlugin && newPlugin.isModalOpen) {
      // Script is loaded, do something
      loadScript("https://cdn.scaleflex.com/plugins/filerobot-widget/v3/latest/filerobot-widget.min.js")
      .then(() => {
        let limitTypeArr: any = []
        if ('limitType' in newPlugin.options && newPlugin.options.limitType && newPlugin.options.limitType != '') {
          limitTypeArr = newPlugin.options.limitType.split(",").map(function(item) {
            return item.trim();
          })
        }
        const imageNotExpired = newPlugin.options.imageNotExpired;
        const container = newPlugin.options.token;
        const securityTemplateID = newPlugin.options.secTemplate;
        const rootFolderPath = newPlugin.options.rootDir ?? '/';
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment     
        // @ts-ignore
        const Filerobot = window.Filerobot;
        const Core = Filerobot.Core; // required (docs: https://www.npmjs.com/package/@filerobot/core)
        const Explorer = Filerobot.Explorer; // required (docs: https://www.npmjs.com/package/@filerobot/explorer)
        const XHRUpload = Filerobot.XHRUpload; // required (docs: https://www.npmjs.com/package/@filerobot/xhr-upload)
        const filerobot = Core({
          securityTemplateId: securityTemplateID,
          // sassKey:
          //   "SASS__v1.05__wM0gTO0UTO3AzN4AjN4YTMxYDN6AXC0QTM6QWamlAMwQjN4oTZnFWCtlmbox2ZiZ2Lt92YuQ3bi9mclxWam5SawFGHvlmLlJ3b0NncpFmLpBXYu0WauhGbnJmZboDZJADMwIjM6AXatVXCwADMyIjOtBXb1lAMwAjMyoTb1lQNwIzM5MjN3YTM6Q3c__b3609fa624",
          container: container,
          dev: false // optional, default: false
        });

        interface Filters {
          mimeTypes: any;
          metadata?: { key: string; value: string[] }[]; // Optional 'metadata' property
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
          noImgOperationsAndDownload: boolean;
          hideDownloadTransformationOption: boolean;
          disableFileResolutionFallback: boolean;
          showFoldersTree: boolean;
          defaultFieldKeyOfBulkEditPanel: string;
          disableFiltersAndSearch: boolean;
          locale: {
            strings: { mutualizedExportButtonLabel: string; mutualizedDownloadButton: string };
          };
          filters: Filters;
          forceFilters?: boolean;
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
          noImgOperationsAndDownload: true,
          hideDownloadTransformationOption: true,
          disableFileResolutionFallback: true,
          showFoldersTree: false,
          defaultFieldKeyOfBulkEditPanel: 'title',
          disableFiltersAndSearch: false,
          locale: {
            strings: {
              mutualizedExportButtonLabel: 'Insert',
              mutualizedDownloadButton: 'Insert',
            },
          },
          filters: {
            mimeTypes: limitTypeArr,
          },
        };

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const day = String(today.getDate()).padStart(2, '0');

        // Combine into the desired format
        const currentDate = `${year}-${month}-${day}`;

        if (imageNotExpired == 'true') {
          configs.filters.metadata = [{ key: 'gueltig_bis', value: [`${currentDate}..`, 'EMPTY'] }];
          //configs.forceFilters = true;
        }

        filerobot
        .use(Explorer, configs)
        .use(XHRUpload)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment     
        // @ts-ignore
        .on('export', function(files) {
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
  <div id='filerobot-widget'></div>
</template>
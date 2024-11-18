<script setup lang="ts">
import { useFieldPlugin } from '@storyblok/field-plugin/vue3'

import Filerobot from '@filerobot/core'
import Explorer from '@filerobot/explorer'
import XHRUpload from '@filerobot/xhr-upload'
import '@filerobot/core/dist/style.min.css'
import '@filerobot/explorer/dist/style.min.css'
import { ref, watch } from 'vue'

interface SelectedFiles {
  (files: any[]): void; // Adjust the type of 'files' based on its structure
}

const props = defineProps<{
  selectedFiles: SelectedFiles
}>()

const plugin = useFieldPlugin({
  enablePortalModal: true,
})

watch(() => plugin.data, (newPlugin) => {
    if (newPlugin && newPlugin.isModalOpen) {
        let limitTypeArr: any = []
        if ('limitType' in newPlugin.options && newPlugin.options.limitType && newPlugin.options.limitType != '') {
          limitTypeArr = newPlugin.options.limitType.split(",").map(function(item) {
            return item.trim();
          })
        }
        const demoContainer = newPlugin.options.token;
        const demoSecurityTemplateID = newPlugin.options.secTemplate;
        const rootFolderPath = newPlugin.options.rootDir ?? '/';
        const filerobot = Filerobot({
            securityTemplateId: demoSecurityTemplateID,
            container: demoContainer,
            dev: false // optional, default: false
        });

        filerobot
        .use(Explorer, {
            target: '#filerobot-widget',
            config: {
              rootFolderPath: rootFolderPath,
            },
            inline: true,
            width: '100%',
            height: '100%',
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
            locale: {
            strings: {
                mutualizedExportButtonLabel: 'Insert',
                mutualizedDownloadButton: 'Insert',
            },
            },
            filters: {
            mimeTypes: limitTypeArr, // Replace with an array of MIME types if needed
            }
        })
        .use(XHRUpload)
        .on('export', function(files) {
            // Define these functions or replace them with actual logic
            props.selectedFiles(files)
            files = []
            return false
        });
    }
})

</script>

<template>
  <div id='filerobot-widget'></div>
</template>
import { FunctionComponent, useRef, useEffect } from 'react'
import Filerobot from '@filerobot/core'
import Explorer from '@filerobot/explorer'
import XHRUpload from '@filerobot/xhr-upload'
import { useFieldPlugin } from '@storyblok/field-plugin/react'

import '@filerobot/core/dist/style.min.css'
import '@filerobot/explorer/dist/style.min.css'


const FilerobotWidget: FunctionComponent<{
  selectedFiles:(files: never[]) => void,
  closeModal:() => void,
  options: {
    token: string,
    secTemplate: string,
    rootDir: string,
    limitType: string
  }
}> = ({ selectedFiles, closeModal, options }) => {
  const filerobot = useRef<any>(null)
  const { data } = useFieldPlugin()

  useEffect(() => {
    const container = options.token
    const secTemplate = options.secTemplate
    let limitTypeArr: any = []
    if ('limitType' in options && options.limitType && options.limitType != '') {
      limitTypeArr = options.limitType.split(",").map(function(item) {
        return item.trim();
      })
    }
    
    if (data?.isModalOpen) {
    
    filerobot.current = Filerobot({
      securityTemplateId: secTemplate,
      container: container,
      dev: false,
    })
      .use(Explorer, {
        target: '#filerobot-widget',
        config: {
          rootFolderPath: options.rootDir ?? '/',
        },
        inline: true,
        width: '100%',
        height: '100%',
        resetAfterClose: true,
        disableExportButton: false, // default: false, if the page name = filerobot-fmaw the value is true
        hideExportButtonIcon: true,
        preventExportDefaultBehavior: true,
        disableDownloadButton: false,
        hideDownloadButtonIcon: true,
        preventDownloadDefaultBehavior: true,
        noImgOperationsAndDownload: true, // default: false, if the page name = filerobot-fmaw the value is true
        hideDownloadTransformationOption: true,
        disableFileResolutionFallback: true,
        showFoldersTree: false,
        // showProductsTree: true,
        // showCollectionsTree: true,
        // showLabelsTree: true,
        // showDetailsView: true,
        defaultFieldKeyOfBulkEditPanel: 'title',
        locale: {
          strings: {
            mutualizedExportButtonLabel: 'Insert',
            mutualizedDownloadButton: 'Insert',
          },
        },
        // search: {
        //   query: '01basic',
        // }
        
        filters: {
          mimeTypes: limitTypeArr,
        }
      })
      .use(XHRUpload)
      .on('export', function(
        files: never[]) {
          selectedFiles(files)
          closeModal()
          files = []
          return false
      })
    }
  }, [data?.isModalOpen])


  return (
    <div style={{
      marginTop: 30
    }} id='filerobot-widget' />
  )
}

export default FilerobotWidget

import { FunctionComponent, useRef, useEffect } from 'react'
import Filerobot from '@filerobot/core'
import Explorer from '@filerobot/explorer'
import XHRUpload from '@filerobot/xhr-upload'

import '@filerobot/core/dist/style.min.css'
import '@filerobot/explorer/dist/style.min.css'


const FilerobotWidget: FunctionComponent<{
  selectedFiles:(files: never[]) => void,
  closeModal:() => void,
  options: {
    token: string,
    secTemplate: string,
    rootDir: string
  }
}> = ({ selectedFiles, closeModal, options }) => {
  const filerobot = useRef(null)

  useEffect(() => {
    const container = options.token
    const secTemplate = options.secTemplate

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
        defaultFieldKeyOfBulkEditPanel: 'title',
        locale: {
          strings: {
            mutualizedExportButtonLabel: 'Insert',
            mutualizedDownloadButton: 'Insert',
          },
        },
      })
      .use(XHRUpload)
      .on('export', function(
        files: never[]) {
          selectedFiles(files)
          closeModal()
          files = []
          return false
      })


    return () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      filerobot.current.close()
    }
  }, [])


  return (
    <div style={{
      marginTop: 30
    }} id='filerobot-widget' />
  )
}

export default FilerobotWidget

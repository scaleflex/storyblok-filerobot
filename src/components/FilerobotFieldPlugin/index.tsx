import './style.css'
import ModalToggle from './ModalToggle'
import FilerobotWidget from './Filerobot'
import { FunctionComponent, useEffect, useState } from 'react'
import { useFieldPlugin } from '@storyblok/field-plugin/react'

const FieldPlugin: FunctionComponent = () => {
  const { type, data, actions } = useFieldPlugin()

  const [files, setFiles] = useState<never[]>([])
  const [isValid, setIsValid] = useState<boolean>(false)
  const [options, setOptions] = useState<{
    token: string,
    secTemplate: string,
    rootDir: string
  }>({
    token: '',
    secTemplate: '',
    rootDir: '/'
  })

  useEffect(() => {
    if (type === 'loaded') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      setFiles(data?.content || []);

      if (data?.options.token && data?.options.secTemplate && data?.options.rootDir) {
        setIsValid(true)
        setOptions({
          token: data?.options.token,
          secTemplate: data?.options.secTemplate,
          rootDir: data?.options.rootDir,
        })
      }
    }
  }, [type, data?.content]);

  const closeModal = () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    actions.setModalOpen(false)
  }

  const fileTypePresent = (asset: { name: string, uuid: string, cdn: string, type: string, source: string, extension: string }, key: number) => {
    if(asset.type.includes('image')) {
      return (
        <div className="thumb-wrapper">
          <div className="thumbnail"  key={key}>
            <img src={asset.cdn + '&width=50&height=50'} alt={asset.uuid} />
            <button
              type="button"
              className="btn-remove"
              onClick={() => {
                removeAsset(key)
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                   stroke="currentColor" className="btn-remove-svg">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
          <div className="content-wrapper">
           <span>Filename: { asset.name }</span>
           <span>Type: { asset.type }</span>
           <span>Source: { asset.source }</span>
          </div>
        </div>
      )
    } else {
      return (
        <div className="thumb-wrapper">
          <div className="thumbnail notimage"  key={key}>
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"
                   className="asset-viewer">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span>.{ asset.extension }</span>
            </div>
            <button
              type="button"
              className="btn-remove"
              onClick={() => {removeAsset(key)}}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                   stroke="currentColor" className="btn-remove-svg">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
          <div className="content-wrapper">
            <span>Filename: { asset.name }</span>
            <span>Type: { asset.type }</span>
            <span>Source: { asset.source }</span>
          </div>
        </div>
      )
    }
  }

  const checkExist = (file: { uuid: string, name: string, cdn: string, type: string, source: string, extension: string }) => {
    files.forEach((fli: { uuid: string, name: string, cdn: string, type: string, source: string, extension: string }) => {
        if (fli.uuid === file.uuid) {
          return true
        }
    })
    return false
  }


  const onSelectedFiles = (selectedFiles: never[]) => {
    const tempFiles: never[] = []
    selectedFiles.forEach((file: { file: { uuid: string, name: string, url: { cdn: string }, type: string, extension: string } }) => {
      const tempFile: { uuid: string, name: string, cdn: string, type: string, source: string, extension: string } = {
        uuid: file?.file?.uuid,
        name: file?.file?.name,
        cdn: file?.file?.url?.cdn,
        extension: file?.file?.extension,
        source: 'filerobot',
        type: file?.file?.type,
      }

      if (!checkExist(tempFile)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tempFiles.push(tempFile)
      }
    })

    const updatedFiles = [...files, ...tempFiles]

    setFiles(updatedFiles)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    actions?.setContent(updatedFiles)
  }

  const removeAsset = (key: number) => {
    const tempFiles: never[] = []
    files.forEach((file: { uuid: string, name: string, cdn: string, type: string, source: string, extension: string }, indexKey: number) => {
      if (indexKey !== key) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tempFiles.push(file)
      }
    })
    setFiles(tempFiles)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    actions?.setContent(tempFiles)
  }

  if (type !== 'loaded') {
    return null
  }

  return (
    <div>
      { isValid && (
        <div>
          <div>
            {!data?.isModalOpen && Array.isArray(files) && files.length > 0 && (
              <div className="remove-all">
                <p onClick={() => {
                  setFiles([])
                  actions?.setContent([])
                }}>
                  Remove all assets
                </p>
              </div>
            )}
            {!data?.isModalOpen && (
              <div className="image-container">
                {Array.isArray(files) && files.map((file: { uuid: string, name: string, cdn: string, type: string, source: string, extension: string }, key: number) => (
                  fileTypePresent(file, key)
                ))}
              </div>
            )}
            <div className={data?.isModalOpen ? 'container' : 'container hidden'}>
              <FilerobotWidget
                selectedFiles={onSelectedFiles}
                closeModal={closeModal}
                options={options}
              />
            </div>
            <div className={data?.isModalOpen  ? 'hidden' : ''}>
              <ModalToggle
                isModalOpen={data.isModalOpen}
                setModalOpen={actions?.setModalOpen}
              />
            </div>
          </div>
          {data.isModalOpen && (
            <button
              type="button"
              className="btn-close"
              onClick={closeModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                   stroke="currentColor" className="btn-close-svg">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="sr-only">Close Modal</span>
            </button>
          )}
        </div>
      ) }

      { !isValid && (
        <div className={"missConfig"}>
          <span>Please add 3 required options: <strong>token, secTemplate, rootDir</strong> from Filerobot</span>
        </div>
      )}
    </div>
  )
}

export default FieldPlugin

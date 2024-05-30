import './style.css'
import ModalToggle from './ModalToggle'
import FilerobotWidget from './Filerobot'
import { FunctionComponent, useEffect, useState } from 'react'
import { useFieldPlugin } from '@storyblok/field-plugin/react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

const FieldPlugin: FunctionComponent = () => {
  const { type, data, actions } = useFieldPlugin()

  const [files, setFiles] = useState<never[]>([])
  const [isValid, setIsValid] = useState<boolean>(false)
  const [options, setOptions] = useState<{
    token: string,
    secTemplate: string,
    rootDir: string,
    limit: number,
    attributes: string,
  }>({
    token: '',
    secTemplate: '',
    rootDir: '/',
    limit: -1,
    attributes: ''
  })

  const reorder = (list: never[], startIndex: number, endIndex: number): never[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const newItems = reorder(
      files,
      result.source.index,
      result.destination.index
    );

    setFiles(newItems);
    actions?.setContent(newItems)
  };

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
          limit: Number(data?.options.limit),
          attributes: data?.options.attributes
        })
      }
    }
  }, [type, data?.content]);

  const closeModal = () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    actions.setModalOpen(false)
  }

  const hasQueryString = (url: string) => {
    try {
      const urlObject = new URL(url);
      return urlObject.search.length > 0;
    } catch (error) {
      return false;
    }
  }

  const createThumbnail = (url: string) => {
    if (!hasQueryString(url)) return url + '?width=50&height=50'
    else return url + '&width=50&height=50'
  } 

  const DragHandleIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="#000000"
      version="1.1"
      width="24px"
      height="24px"
      viewBox="0 0 32 32"
      xmlSpace="preserve"
    >
      <style type="text/css">
        {`.st0{fill:none;}`}
      </style>
      <title>draggable</title>
      <rect x="10" y="6" width="4" height="4" />
      <rect x="18" y="6" width="4" height="4" />
      <rect x="10" y="14" width="4" height="4" />
      <rect x="18" y="14" width="4" height="4" />
      <rect x="10" y="22" width="4" height="4" />
      <rect x="18" y="22" width="4" height="4" />
      <rect id="_Transparent_Rectangle_" className="st0" width="32" height="32" />
    </svg>
  );

  const fileTypePresent = (asset: { name: string, uuid: string, cdn: string, type: string, source: string, extension: string }, key: number) => {
    if(asset.type.includes('image')) {
      return (
        <Draggable key={asset.uuid} draggableId={asset.uuid} index={key}>
          {(provided) => (
          <div className="thumb-wrapper" ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          >
            <div className="thumbnail"  key={key}>
              <img src={createThumbnail(asset.cdn)} alt={asset.uuid} />
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
              <span 
                {...provided.dragHandleProps} 
                style={{ position: 'absolute',
                  cursor: 'grab',
                  right: '1px',
                  top: '2px' }}
              >
                <DragHandleIcon />
              </span>
            </div>
            <div className="content-wrapper">
            <span>Filename: { asset.name }</span>
            <span>Type: { asset.type }</span>
            <span>Source: { asset.source }</span>
            </div>
          </div>
          )}
        </Draggable>
      )
    } else {
      return (
        <Draggable key={asset.uuid} draggableId={asset.uuid} index={key}>
          {(provided) => (
          <div className="thumb-wrapper" ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            userSelect: 'none',
            padding: '16px',
            margin: '0 0 8px 0',
            minHeight: '50px',
            backgroundColor: '#fff',
            color: '#333',
            ...provided.draggableProps.style,
          }}>
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
          )}
        </Draggable>
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

  const removeURLParameter = (url: string, parameter: string) => {
    //prefer to use l.search if you have a location/link object
    var urlparts = url.split('?');   
    if (urlparts.length >= 2) {

        var prefix = encodeURIComponent(parameter) + '=';
        var pars = urlparts[1].split(/[&;]/g);

        //reverse iteration as may be destructive
        for (var i = pars.length; i-- > 0;) {    
            //idiom for string.startsWith
            if (pars[i].lastIndexOf(prefix, 0) !== -1) {  
                pars.splice(i, 1);
            }
        }

        return urlparts[0] + (pars.length > 0 ? '?' + pars.join('&') : '');
    }
    return url;
  }

  const limitFiles = () => {
    if ('limit' in options) return Number(options?.limit)
    return -1
  }

  const getAttributesData = (file: any) => {
    let r: { [key: string]: any } = {};

    if ('attributes' in options && options.attributes != undefined) {
      let arr = options.attributes.split(",");
      for (let value of arr) {
        r[value.trim()] = file[value.trim()]
      }
      return r
    }
  }


  const onSelectedFiles = (selectedFiles: never[]) => {
    const tempFiles: never[] = []
    if (limitFiles() > 0) selectedFiles = selectedFiles.slice(0, limitFiles());
    console.log(selectedFiles);
    selectedFiles.forEach((file: { file: { uuid: string, name: string, url: { cdn: string }, type: string, extension: string, meta: object, tags: object,  }, link: string }) => {
      const tempFile: { uuid: string, name: string, cdn: string, type: string, source: string, extension: string, attributes?: object } = {
        uuid: file?.file?.uuid,
        name: file?.file?.name,
        cdn: removeURLParameter(file?.link, 'vh'),
        extension: file?.file?.extension,
        source: 'filerobot',
        type: file?.file?.type,
      }

      if ('attributes' in options) {
        tempFile.attributes = getAttributesData(file?.file)
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
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="droppable">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        style={{ padding: '10px' }}
                      >
                        {Array.isArray(files) && files.map((file: { uuid: string, name: string, cdn: string, type: string, source: string, extension: string }, key: number) => (
                          fileTypePresent(file, key)
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>               
            )}
            {
              limitFiles() > 0 && (
                <div style={{ marginTop: 10}}><span><strong>Limit: </strong> {options?.limit}</span> </div>
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
        <div>
          <div className={"missConfig"}>
            <span>Please add 3 required options: <strong>token, secTemplate, rootDir</strong> from Filerobot <br/> 
            <strong>limit</strong> is optional (ex: 3, 4)<br/> 
            <strong>attributes</strong> is optional (ex: meta, tags)
            </span> 
          </div>
          <div>
            <span></span> 
          </div>
        </div>
      )}

      
     
    </div>
  )
}

export default FieldPlugin

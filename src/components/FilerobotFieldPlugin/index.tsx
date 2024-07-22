import './style.css'
import ModalToggle from './ModalToggle'
import FilerobotWidget from './Filerobot'
import { FunctionComponent, useEffect, useState, useRef } from 'react'
import { useFieldPlugin } from '@storyblok/field-plugin/react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { e } from 'vitest/dist/reporters-QGe8gs4b.js'

const FieldPlugin: FunctionComponent = () => {
  type LimitKeys = 'limitImage' | 'limitVideoAndAudio' | 'limitDocument';
  const { type, data, actions } = useFieldPlugin()
  const [files, setFiles] = useState<never[]>([])
  const [metaData, setMetaData] = useState<any[]>([])
  const [showMetaDataSetting, setshowMetaDataSetting] = useState<boolean>(false)
  const [isValid, setIsValid] = useState<boolean>(false)
  const [isOverLimit, setIsOverLimit] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isCanMetaData, setIsCanMetaData] = useState<boolean>(true)
  const [endpoint, setEndpoint] = useState<string>('')
  const [currentFile, setCurrentFile] = useState<any>({})
  const [popupShow, setPopupShow] = useState<boolean>(false)
  const wrapperRef = useRef<any>(null);
    
  const [options, setOptions] = useState<{
    token: string,
    secTemplate: string,
    rootDir: string,
    limit: number,
    attributes: string,
    limitImage: number,
    limitVideoAndAudio: number,
    limitDocument: number,
    limitType: string,
    metaData: string
  }>({
    token: '',
    secTemplate: '',
    rootDir: '/',
    limit: -1,
    attributes: '',
    limitImage: -1,
    limitVideoAndAudio: -1,
    limitDocument: -1,
    limitType: '',
    metaData: ''
  })

  const [isOverLimitTypes, setIsOverLimitTypes] = useState<{
    limitImage: boolean,
    limitVideoAndAudio: boolean,
    limitDocument: boolean
  }>({
    limitImage: false,
    limitVideoAndAudio: false,
    limitDocument: false
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

  let documentArr = ['video', 'image', 'audio']

  async function fetchSassKey(): Promise<any> {
    const url = `${endpoint}/key/${options.secTemplate}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        return data;
    } else {
        const responseText = await response.text();
        throw new Error(`Expected JSON response, but got: ${responseText}`);
    }
  }

  async function fetchMetaData(xFilerobotKey: string): Promise<any> {
    const url = `${endpoint}/meta/model/fields`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'X-Filerobot-Key': xFilerobotKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseText}`);
    } else {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          return data;
      } else {
          const responseText = await response.text();
          throw new Error(`Expected JSON response, but got: ${responseText}`);
      }
    }
  }

  async function getMetaData() {
    try {
        const sassKeyData = await fetchSassKey();
        if (sassKeyData.status == 'success') {
          const xFilerobotKey = sassKeyData.key; // Assuming the key is stored in 'key' property
          const metaData = await fetchMetaData(xFilerobotKey);
          if (metaData.status == 'success') setMetaData(metaData.fields)
      }
    } catch (error) {
      setIsCanMetaData(false)
      //console.error(error);
    }
  }

  useEffect(() => {
    document.addEventListener("click", handleClickOutside, false);
    return () => {
      document.removeEventListener("click", handleClickOutside, false);
    };
  }, []);

  const handleClickOutside = (event: any) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
      setPopupShow(false);
    }
  };


  useEffect(() => {
    if (type === 'loaded') {
      if (typeof data?.content === 'string') {
        actions?.setContent([]);
        setFiles([]);
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        setFiles(data?.content || []);
      }
        
      if (data?.options.token && data?.options.secTemplate && data?.options.rootDir) {
        setIsValid(true)
        setOptions({
          token: data?.options.token,
          secTemplate: data?.options.secTemplate,
          rootDir: data?.options.rootDir,
          limit: Number(data?.options.limit),
          attributes: data?.options.attributes,
          limitImage: Number(data?.options.limitImage),
          limitVideoAndAudio: Number(data?.options.limitVideoAndAudio),
          limitDocument: Number(data?.options.limitDocument),
          limitType: data?.options.limitType,
          metaData: data?.options.metaData,
        })
        setEndpoint('https://api.filerobot.com/' + data?.options.token + '/v5')
      }
    }
  }, [type, data?.content]);

//   useEffect(() => {
//     if (options.token && options.secTemplate && options.token != '' && options.secTemplate != '') {
//       getMetaData()
//     }
//  }, [endpoint]);

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
    if (!hasQueryString(url)) return url + '?width=55&height=55'
    else return url + '&width=55&height=55'
  } 

  const createReviewImage = (url: string) => {
    if (!hasQueryString(url)) return url + '?width=350'
    else return url + '&width=350'
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

  const previewAsset = (file: any) => {
    setCurrentFile(file)
    setPopupShow(true)
  }
  
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
                onClick={() => {removeAsset(key)}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                    stroke="currentColor" className="btn-remove-svg">
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
              <div className="preview-icon cursor-pointer" onClick={() => {previewAsset(asset)}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M15 12c0 1.654-1.346 3-3 3s-3-1.346-3-3 1.346-3 3-3 3 1.346 3 3zm9-.449s-4.252 8.449-11.985 8.449c-7.18 0-12.015-8.449-12.015-8.449s4.446-7.551 12.015-7.551c7.694 0 11.985 7.551 11.985 7.551zm-7 .449c0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5 5-2.243 5-5z"/></svg>
              </div>
              <span
                className="drag-handle-icon"
                {...provided.dragHandleProps} 
              >
                <DragHandleIcon />
              </span>
            </div>
            <div className="content-wrapper">
            <span className="file-name">Filename: { asset.name }</span>
            <span className="file-name">Type: { asset.type }</span>
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
          >
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
              { documentArr.includes(getTypeAssets(asset.type)) && ( <div className="preview-icon cursor-pointer" onClick={() => { previewAsset(asset)}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M15 12c0 1.654-1.346 3-3 3s-3-1.346-3-3 1.346-3 3-3 3 1.346 3 3zm9-.449s-4.252 8.449-11.985 8.449c-7.18 0-12.015-8.449-12.015-8.449s4.446-7.551 12.015-7.551c7.694 0 11.985 7.551 11.985 7.551zm-7 .449c0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5 5-2.243 5-5z"/></svg>
              </div>)}
              <div 
                className="drag-handle-icon"
                {...provided.dragHandleProps} 
              >
                <DragHandleIcon />
              </div>
            </div>
            <div className="content-wrapper">
              <span className="file-name">Filename: { asset.name }</span>
              <span className="file-name">Type: { asset.type }</span>
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

  const popupClose = () => {
    setPopupShow(false)
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

  const showFilePreview = () => {
      return popupShow && 
          <div className="popup">
            <div className="position-relative">
              <div className="close-popup cursor-pointer" onClick={() => popupClose()}>
                <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 122.88"><defs></defs><title>cross</title><path className="cls-1" d="M6,6H6a20.53,20.53,0,0,1,29,0l26.5,26.49L87.93,6a20.54,20.54,0,0,1,29,0h0a20.53,20.53,0,0,1,0,29L90.41,61.44,116.9,87.93a20.54,20.54,0,0,1,0,29h0a20.54,20.54,0,0,1-29,0L61.44,90.41,35,116.9a20.54,20.54,0,0,1-29,0H6a20.54,20.54,0,0,1,0-29L32.47,61.44,6,34.94A20.53,20.53,0,0,1,6,6Z"/></svg>
              </div>
              <div className="popup-content">
                {getTypeAssets(currentFile.type) == 'image' && (
                  <>
                    <img src={createReviewImage(currentFile.cdn)} className="img-responsive margin-auto " />
                  </>
                )}

                {getTypeAssets(currentFile.type) == 'video' && (
                    <video className="video-style" width="350" controls>
                      <source src={currentFile.cdn} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                )}

                {getTypeAssets(currentFile.type) == 'audio' && (
                    <audio controls>
                      <source src={currentFile.cdn} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                )}
              </div>
            </div>
          </div>
  }

  const limitFilesByType = (type: LimitKeys) => {
    if (type in options) return Number(options[type])
    return -1
  }

  const getAttributesData = (file: any) => {
    let r: { [key: string]: any } = {};
    let metaCurrent = ['title', 'description']

    if ('metaData' in options && options.metaData && options.metaData !='' && options.attributes != undefined && options.attributes != '') {
      metaCurrent = metaCurrent.concat(options.metaData.split(","))
    }

    if ('attributes' in options && options.attributes != undefined) {
      let arr = options.attributes.split(",");
      for (let value of arr) {
        let valueTrim = value.trim();
        if (valueTrim == 'meta') {
            let rMeta: any = {}
            metaCurrent.forEach(meta => {
              let metaTrim = meta.trim();
              rMeta[metaTrim] = file[valueTrim][metaTrim]
            })
            r[valueTrim] = rMeta
        }else {
          r[valueTrim] = file[valueTrim]
        }
      }
      return r
    }
  }

  const makeIndexFiles = (index: number) => {
    return index + files.length
  }

  const checkLimit = (updatedFiles: any) => {
    if (limitFiles() > 0 && updatedFiles.length > limitFiles()) setIsOverLimit(true)
    else setIsOverLimit(false)
  }

  const checkLimitByType = (updatedFiles: any, type: LimitKeys) => {
    if (limitFilesByType(type) > 0 && updatedFiles.length > limitFilesByType(type)) {
      setIsOverLimitTypes(prevState => ({ ...prevState, [type]: true }));
    } else {
      setIsOverLimitTypes(prevState => ({ ...prevState, [type]: false }));
    }
  };

  const getFilesByLimitType = (updatedFiles: any, limitType: string) => {
    if ('limitType' in options && options.limitType && limitType != '') {
      const limitTypeArr = limitType.split(",").map(function(item) {
        return item.trim()
      })
      if (limitTypeArr.includes('document')) return updatedFiles.filter((file: any) => limitTypeArr.includes(getTypeAssets(file.type)) || !['image', 'video', 'audio'].includes(getTypeAssets(file.type)))
      else return updatedFiles.filter((file: any) => limitTypeArr.includes(getTypeAssets(file.type)))
    }
    return updatedFiles
  }

  const updatFiles = (updatedFiles: any) => {

    checkLimitByType(getAssetsByType(updatedFiles, 'image'), 'limitImage')
    if (limitFilesByType('limitImage') > -1) updatedFiles = [...getAssetsByExceptType(updatedFiles, 'image'), ...getAssetsByType(updatedFiles, 'image').slice(0, limitFilesByType('limitImage'))]

    checkLimitByType(getAssetsByType(updatedFiles, 'video_and_audio'), 'limitVideoAndAudio')
    if (limitFilesByType('limitVideoAndAudio') > -1)  updatedFiles = [...getAssetsByExceptType(updatedFiles, 'video_and_audio'), ...getAssetsByType(updatedFiles, 'video_and_audio').slice(0, limitFilesByType('limitVideoAndAudio'))]

    checkLimitByType(getAssetsByType(updatedFiles, 'application'), 'limitDocument')
    if (limitFilesByType('limitDocument') > -1) updatedFiles = [...getAssetsByExceptType(updatedFiles, 'application'), ...getAssetsByType(updatedFiles, 'application').slice(0, limitFilesByType('limitDocument'))]
    
    checkLimit(updatedFiles)
    if (limitFiles() > 0) updatedFiles = updatedFiles.slice(0, limitFiles())

    if ('limitType' in options &&  ( options.limitType != undefined || options.limitType != '') ) {
      updatedFiles = getFilesByLimitType(updatedFiles, options.limitType)
    }
    
    setFiles(updatedFiles)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    actions?.setContent(updatedFiles)
  }

  const onSelectedFiles = (selectedFiles: never[]) => {
    const tempFiles: never[] = []
    console.log(selectedFiles)

    selectedFiles.forEach((file: { file: { uuid: string, name: string, url: { cdn: string }, type: string, extension: string, meta: object, tags: object,  }, link: string }, index: number) => {
      const tempFile: { uuid: string, name: string, cdn: string, type: string, source: string, extension: string, attributes?: object } = {
        uuid: file?.file?.uuid + '_' + makeIndexFiles(index),
        name: file?.file?.name,
        cdn: removeURLParameter(file?.link, 'vh'),
        extension: file?.file?.extension,
        source: 'filerobot',
        type: file?.file?.type,
      }

      if ('attributes' in options && options.attributes != undefined) {
        tempFile.attributes = getAttributesData(file?.file)
      }

      if (!checkExist(tempFile)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tempFiles.push(tempFile)
      }
    })

    let updatedFiles = [...files, ...tempFiles]

    updatFiles(updatedFiles)
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

    updatFiles(tempFiles)
  }

  // Function to fetch data from an API
  async function fetchfileData(uuid: string): Promise<any> {
    const url = endpoint + '/files/' + uuid
    const response = await fetch(url);

    // Check if the request was successful
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse the response data as JSON
    const data: any = await response.json();
    return data;
  }

  const refreshAssets = async () => {
    // Use 'tempFiles' to collect the promises from 'fetchfileData' calls
    setIsLoading(true)
    const promises = files.map(async (file: any, index: number) => {
      const uuid = file.uuid.split('_');
      try {
        const response = await fetchfileData(uuid[0]);
        if (response.status !== 'success') {
          throw new Error('Network response was not ok ' + response.statusText);
        }
  
        const tempFile: { uuid: string, name: string, cdn: string, type: string, source: string, extension: string, attributes?: object } = {
          uuid: response?.file?.uuid + '_' + index,
          name: response?.file?.name,
          cdn: removeURLParameter(response?.file?.url?.cdn, 'vh'),
          extension: response?.file?.extension,
          source: 'filerobot',
          type: response?.file?.type,
        };

        if ('attributes' in options && options.attributes != undefined) {
          tempFile.attributes = getAttributesData(response?.file);
        }
  
        if (!checkExist(tempFile)) {
          return tempFile;
        }
      } catch (error) {
        console.error('Error fetching file data:', error);
      }
    });
  
    // Await all promises and filter out undefined values
    const results = await Promise.all(promises);
    const tempFiles = results.filter(file => file !== undefined);
   
    let updatedFiles = [...tempFiles];

    updatFiles(updatedFiles)

    setIsLoading(false)
  };

  if (type !== 'loaded') {
    return null
  }

  const removeAllAssets = () => {
    setFiles([])
    actions?.setContent([])
    setIsOverLimit(false)
  }

  const getTotalAssets = () => {
    if (files) return files.length
    return 0;
  }

  const getTypeAssets = (type: any) => {
    let arr = type.split("/");
    return arr[0]
  }

  const countAssetsByType = (type: string) => {
    if (type == 'document') {
      const assets = files.filter((file: any) => !documentArr.includes(getTypeAssets(file.type)))
      return assets.length
    }else {
      const assets = files.filter((file: any) => getTypeAssets(file.type) == type)
      return assets.length
    }
    
  }

  const getAssetsByType = (updatedFiles: any, type: string) => {
    if (type == 'video_and_audio') return updatedFiles.filter((file: any) => getTypeAssets(file.type) == 'video' || getTypeAssets(file.type) == 'audio')
    else return updatedFiles.filter((file: any) => getTypeAssets(file.type) == type)
  }

  const getAssetsByExceptType = (updatedFiles: any, type: string) => {
    if (type == 'video_and_audio') return updatedFiles.filter((file: any) => getTypeAssets(file.type) != 'video' && getTypeAssets(file.type) != 'audio')
    else return updatedFiles.filter((file: any) => getTypeAssets(file.type) != type)
  }

  const overText = (type: LimitKeys) => {
    if (isOverLimitTypes[type]) return ' <span class="red">( is over limit )</span>'
    else return ''
  }

  const countTypeAssets = () => {
    return {
      'image': (countAssetsByType('image') + overText('limitImage')),
      'video_and_audio': (countAssetsByType('video') + countAssetsByType('audio') + overText('limitVideoAndAudio')),
      'document': (countAssetsByType('document') + overText('limitDocument')),
    }
  }

  return (
    <div>
      { showFilePreview() }
      { isValid && (
        <div>
          <div>
            {!data?.isModalOpen && Array.isArray(files) && files.length > 0 && (
              <div className="remove-all">
                <span onClick={() => removeAllAssets()}>
                  Remove all assets
                </span>
              </div>
            )}
            {!data?.isModalOpen && (
                <div className="asset-content">
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
                </div>             
            )}
            <div className="flex">
              {!data?.isModalOpen && (
                <>
                  <div className="column align-left text-small-size">
                   {getTotalAssets() > 0 && (
                     <>
                     <span>Total: {getTotalAssets()}</span>
                     {limitFiles() > 0 && (
                       <span> / Limit: {limitFiles()}</span>
                     )}
                     </>
                   )}
                  </div>
                  {isOverLimit && (
                    <div className="column exceeds-the-limit">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="red" version="1.1"  width="12px" height="12px" viewBox="0 0 478.125 478.125">
                        <g>
                          <g>
                            <g>
                              <circle cx="239.904" cy="314.721" r="35.878"/>
                              <path d="M256.657,127.525h-31.9c-10.557,0-19.125,8.645-19.125,19.125v101.975c0,10.48,8.645,19.125,19.125,19.125h31.9     c10.48,0,19.125-8.645,19.125-19.125V146.65C275.782,136.17,267.138,127.525,256.657,127.525z"/>
                              <path d="M239.062,0C106.947,0,0,106.947,0,239.062s106.947,239.062,239.062,239.062c132.115,0,239.062-106.947,239.062-239.062     S371.178,0,239.062,0z M239.292,409.734c-94.171,0-170.595-76.348-170.595-170.596c0-94.248,76.347-170.595,170.595-170.595     s170.595,76.347,170.595,170.595C409.887,333.387,333.464,409.734,239.292,409.734z"/>
                            </g>
                          </g>
                        </g>
                      </svg>
                      <span className="ml-1">Exceeded maximum number of assets</span>
                    </div> // Corrected the fragment to a valid HTML element
                  )}
                </>
              )}
            </div>
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
                refreshAssets={refreshAssets}
                isLoading={isLoading}
                totalAssets={getTotalAssets()}
                countTypeAssets={countTypeAssets}
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
            <span>Please add 3 required options: <strong>token, secTemplate, rootDir</strong> from Filerobot <br/></span> 
            <span><strong>limit</strong> is optional (limit for all files type ex: 3)<br/> </span> 
            <span><strong>attributes</strong> is optional (ex: meta, tags)<br/> </span> 
            {/* <span><strong>limitImage</strong> is optional (ex: 4)<br/> </span> 
            <span><strong>limitVideoAndAudio</strong> is optional (ex: 5)<br/> </span> 
            <span><strong>limitDocument</strong> is optional (ex: 6)</span>  */}
            <span><strong>limitType</strong> is optional (ex: image, document, video, audio)<br/> </span>
            <span><strong>metaData</strong> is optional (value depends on the your token)<br/> </span>
          </div>
        </div>
      )}
      {/* {isValid && !data.isModalOpen && (
      <div className='mt-1 show-meta-setting' onClick={() => {
                  setshowMetaDataSetting(!showMetaDataSetting)
                }}>Show list metaData
      </div>
      )}
      {isCanMetaData ? (
        <>
        {metaData && metaData.length > 0 && !data.isModalOpen && showMetaDataSetting && (
          <div className='mt-1'>
            <strong>metaData</strong> is optional ( working when <strong>'attributes'</strong> filed have vaule <strong>'meta' </strong><br/> ex:&nbsp;
            {metaData.map((meta, i, arr) => (
              <span key={meta.sys_key}>{arr.length - 1 === i ? meta.api_slug + ' ' : meta.api_slug + ', '}</span>
            ))}
            )
          </div>
        )}</>) : (
       <>
       {showMetaDataSetting && (
        <div className='mt-1'>
          Your token don't have the permission to get meta data
        </div>
       )}
       </>
      )} */}
    </div>
  )
}

export default FieldPlugin

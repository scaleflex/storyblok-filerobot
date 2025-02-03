<script setup lang="ts">

import { ref, watch } from 'vue';
import './index.css'
import ModalToggle from './ModalToggle.vue'
import { useFieldPlugin } from '@storyblok/field-plugin/vue3'
import Filerobot from './Filerobot.vue'
import { VueDraggableNext } from 'vue-draggable-next'

interface File {
  uuid: string;
  name: string;
  type: string;
  source: string;
  extension: string;
  ownerName: string;  // Define the ownerName property here
  cdn: string;
  attributes?: any; // Define attributes as optional
}

const plugin = useFieldPlugin({
  enablePortalModal: true
})

const isValid = ref(false);
const endpoint = ref('');
const isLoading = ref(false);
const files = ref<File[]>([]);
const error = ref<string | null>(null)
const isOverLimit = ref(false)
const options = ref({
  token: '',
  secTemplate: '',
  rootDir: '',
  limitType: '',
  limit: 0,
  attributes: '',
  metaData: ''
})
const currentFile = ref<File>({
  uuid: '', 
  name: '', 
  type: '', 
  extension: '',
  cdn: '', // Optional
  ownerName: '', // Optional
  source: '',
})
const popupShow = ref(false)

let documentArr = ['video', 'image', 'audio']

function isEmpty(str: string) {
  return (!str || str.length === 0 );
}

watch(plugin, (newPlugin) => {
  if (newPlugin.type === 'loaded') {
    if (typeof newPlugin.data.content === 'string') {
      newPlugin.actions.setContent([]);
      files.value = []
    } else {
      files.value = newPlugin.data.content as File[]
    }

    if (!isEmpty(newPlugin.data.options.token) && !isEmpty(newPlugin.data.options.secTemplate) && !isEmpty(newPlugin.data.options.rootDir)) {
      isValid.value = true;
      endpoint.value = `https://api.filerobot.com/${newPlugin.data.options.token}/v5`;
      options.value = {
        token: newPlugin.data.options.token,
        secTemplate: newPlugin.data.options.secTemplate,
        rootDir: newPlugin.data.options.rootDir,
        limit: Number(newPlugin.data.options.limit),
        attributes: newPlugin.data.options.attributes,
        limitType: newPlugin.data.options.limitType,
        metaData: newPlugin.data.options.metaData,
      }
    } else {
      isValid.value = false;
    }
  }
},{ once: true });


const getTypeAssets = (type: any) => {
  let arr = type.split("/");
  return arr[0]
}

const getAttributesData = (file: any) => {
  let r: { [key: string]: any } = {};
  let metaCurrent = ['title', 'description']
  if ('attributes' in options.value && options.value.attributes != undefined) {
    let arr = options.value.attributes.split(",");
    for (let value of arr) {
      let valueTrim = value.trim();
      r[valueTrim] = file[valueTrim]
    }
    return r
  }
}

const getFilesByLimitType = (updatedFiles: any, limitType: string) => {
  if ('limitType' in options.value && options.value.limitType && limitType != '') {
    const limitTypeArr = limitType.split(",").map(function(item) {
      return item.trim()
    })
    if (limitTypeArr.includes('document')) return updatedFiles.filter((file: any) => limitTypeArr.includes(getTypeAssets(file.type)) || !['image', 'video', 'audio'].includes(getTypeAssets(file.type)))
    else return updatedFiles.filter((file: any) => limitTypeArr.includes(getTypeAssets(file.type)))
  }
  return updatedFiles
}

const updatFiles = (updatedFiles: any) => {

  checkLimit(updatedFiles)

  if (limitFiles() > 0) updatedFiles = updatedFiles.slice(0, limitFiles())

  if ('limitType' in options.value &&  ( options.value.limitType != undefined || options.value.limitType != '') ) {
    updatedFiles = getFilesByLimitType(updatedFiles, options.value.limitType)
  }
  
  files.value = updatedFiles
  if (plugin?.actions) plugin.actions.setContent(updatedFiles)
}

const limitFiles = () => {
  if ('limit' in options.value) return Number(options.value.limit)
  return -1
}

const fetchfileData = async (uuid: string) => {
  isLoading.value = true;
  error.value = null;
  const url = endpoint.value + '/files/' + uuid + '?format=select:human';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    const result = await response.json();
    return result; // Return the result to be collected in the parent function
  } catch (err) {
    error.value = (err as Error).message;
    return null; // Return null in case of error
  } finally {
    isLoading.value = false;
  }
};

const makeIndexFiles = (index: number) => {
  return index + files.value.length
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


const selectedFiles = async (filesSelected: Array<any>) => {
  // Set loading state to true before starting the fetch calls
  isLoading.value = true;
  error.value = null;

  // Create an array to hold all the fetch promises and collect the results
  const fetchPromises = filesSelected.map(async (file, index) => {
    try {
      // Call fetchfileData for each file's uuid (assuming file has a 'uuid' property)
      const uuid = file.file.uuid;
      const response = await fetchfileData(uuid);

      const tempFile: File = {
        uuid: response?.file?.uuid + '_' + makeIndexFiles(index),
        name: response?.file?.name,
        cdn: removeURLParameter(response?.file?.url?.cdn, 'vh'),
        extension: response?.file?.extension,
        source: 'filerobot',
        type: response?.file?.type,
        ownerName: response?.file?.owner?.name,
      };

      if ('attributes' in options.value && options.value.attributes != undefined) {
        tempFile.attributes = getAttributesData(response?.file);
      }

      return tempFile; // Return the data for each file
    } catch (err) {
      return null; // Return null in case of error for this file
    }
  });

  // Wait for all fetch operations to complete and collect all results
  try {
    const results = await Promise.all(fetchPromises);
   
    const tempFiles = results.filter(file => file !== undefined);
 
    let updatedFiles = [...files.value, ...tempFiles];

    updatFiles(updatedFiles)
    // Handle the results (e.g., store them or update UI)
  } catch (err) {
    console.error('Error fetching files:', err);
  } finally {
    // Set loading state to false after all fetches are done
    isLoading.value = false;
    // Optionally close the modal if needed
    if (plugin?.actions) plugin.actions.setModalOpen(false);
  }
};

const hasQueryString = (url: string) => {
  try {
    const urlObject = new URL(url);
    return urlObject.search.length > 0;
  } catch (error) {
    return false;
  }
}

// Type guard to check if item has a uuid property
function isItemWithUuid(item: unknown): item is { uuid: string } {
  return typeof (item as { uuid: unknown }).uuid === 'string';
}

const checkExist = (file: any) => {
  return files.value.some((item) => {isItemWithUuid(item) && item.uuid === file.uuid});
};

const refreshAssets = async () => {
  // Use 'tempFiles' to collect the promises from 'fetchfileData' calls
  isLoading.value = true
  const promises = files.value.map(async (file: any, index: number) => {
    const uuid = file.uuid.split('_');
    try {
      const response = await fetchfileData(uuid[0]);
      if (response.status !== 'success') {
        throw new Error('Network response was not ok ' + response.statusText);
      }

      const tempFile: File = {
        uuid: response?.file?.uuid + '_' + makeIndexFiles(index),
        name: response?.file?.name,
        cdn: removeURLParameter(response?.file?.url?.cdn, 'vh'),
        extension: response?.file?.extension,
        source: 'filerobot',
        type: response?.file?.type,
        ownerName: response?.file?.owner?.name,
      };

      if ('attributes' in options.value && options.value.attributes != undefined) {
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

  isLoading.value = false
};

const createThumbnail = (url: string) => {
    if (!hasQueryString(url)) return url + '?width=55&height=55'
    else return url + '&width=55&height=55'
} 

const removeAsset = (key: number) => {
  files.value = files.value.filter((_, indexKey: number) => indexKey !== key);

  // Check if 'plugin' and 'plugin.actions' are defined
  if (plugin?.actions) {
    plugin.actions.setContent(files.value);
  } else {
    console.warn('plugin.actions is undefined');
  }
};

const removeAllAssets = () => {
  files.value = [];
  // Check if 'plugin.actions' is defined before calling 'setContent'
  if (plugin?.actions) {
    plugin.actions.setContent([]);
  } else {
    console.warn('plugin.actions is undefined');
  }
  isOverLimit.value = false;
};

const getTotalAssets = () => {
  return files.value.length;
}

const previewAsset = (file: any) => {
  currentFile.value = file
  popupShow.value = true
}

const popupClose = () => {
  popupShow.value = false
}

const createReviewImage = (url: string) => {
  if (!hasQueryString(url)) return url + '?width=350&'
  else return url + '&width=350'
}

const checkFileIncludesImage = (file: any) => {
  return file.type.includes('image')
}

const getIsOverLimit = () => {
  return isOverLimit.value
}


const checkLimit = (updatedFiles: any) => {
 
  if (limitFiles() > 0 && updatedFiles.length > limitFiles()) {
    isOverLimit.value = true
  } else {
    isOverLimit.value = false
  }
}

const log = () => {
  updatFiles(files.value)
}

</script>

<template>
  <div v-if="plugin.type === 'loaded'">
    <div class="popup" v-if="popupShow">
      <div class="position-relative">
        <div class="close-popup cursor-pointer" @click="() => popupClose()">
          <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 122.88"><defs></defs><title>cross</title><path class="cls-1" d="M6,6H6a20.53,20.53,0,0,1,29,0l26.5,26.49L87.93,6a20.54,20.54,0,0,1,29,0h0a20.53,20.53,0,0,1,0,29L90.41,61.44,116.9,87.93a20.54,20.54,0,0,1,0,29h0a20.54,20.54,0,0,1-29,0L61.44,90.41,35,116.9a20.54,20.54,0,0,1-29,0H6a20.54,20.54,0,0,1,0-29L32.47,61.44,6,34.94A20.53,20.53,0,0,1,6,6Z"/></svg>
        </div>
        <div class="popup-content">
          <img v-if="getTypeAssets(currentFile.type) == 'image'" :src="createReviewImage(currentFile.cdn)" class="img-responsive margin-auto " />
          <video v-if="getTypeAssets(currentFile.type) == 'video'" class="video-style" width="350" controls>
            <source :src="currentFile.cdn" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <audio v-if="getTypeAssets(currentFile.type) == 'audio'" controls>
            <source :src="currentFile.cdn" type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    </div>
    <div class="missConfig" v-if="!isValid">
      <div>Please add 3 required options: <strong>token, secTemplate, rootDir</strong> from Filerobot <br/></div> 
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />
        </svg>
        <strong>limit</strong> is optional (limit for all files type ex: 3)</div> 
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />
        </svg>
        <strong>attributes</strong> is optional (ex: meta, tags, info)
      </div> 
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />
        </svg>
        <strong>limitType</strong> is optional (ex: image, document, video, audio) </div>
    </div>
    <div v-if="isValid">
      <div class="remove-all" v-if="!plugin.data.isModalOpen && files.length > 0">
        <span @click="() => removeAllAssets()">
          Remove all assets
        </span>
      </div>
            
      <div class="asset-content" v-if="!plugin.data.isModalOpen && files.length > 0">
        <VueDraggableNext v-model="files" @change="log">
          <transition-group>
            <template v-for="(file, index) in files">
              <div class="thumb-wrapper"  v-if="file && checkFileIncludesImage(file)">
                <div class="thumbnail" :key="index">
                  <img :src="createThumbnail(file.cdn)" :alt="file.uuid" />
                  <button
                    type="button"
                    class="btn-remove"
                    @click="() => removeAsset(index)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                        stroke="currentColor" class="btn-remove-svg">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                  <div class="preview-icon cursor-pointer" @click="() => previewAsset(file)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M15 12c0 1.654-1.346 3-3 3s-3-1.346-3-3 1.346-3 3-3 3 1.346 3 3zm9-.449s-4.252 8.449-11.985 8.449c-7.18 0-12.015-8.449-12.015-8.449s4.446-7.551 12.015-7.551c7.694 0 11.985 7.551 11.985 7.551zm-7 .449c0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5 5-2.243 5-5z"/></svg>
                  </div>
                  <span
                    class="drag-handle-icon"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#000000"
                      version="1.1"
                      width="24px"
                      height="24px"
                      viewBox="0 0 32 32"
                      xmlSpace="preserve"
                    >
                      <title>draggable</title>
                      <rect x="10" y="6" width="4" height="4" />
                      <rect x="18" y="6" width="4" height="4" />
                      <rect x="10" y="14" width="4" height="4" />
                      <rect x="18" y="14" width="4" height="4" />
                      <rect x="10" y="22" width="4" height="4" />
                      <rect x="18" y="22" width="4" height="4" />
                      <rect id="_Transparent_Rectangle_" class="st0" width="32" height="32" />
                    </svg>
                  </span>
                </div>
                <div class="content-wrapper">
                  <span class="file-name">Filename: {{ file.name }}</span>
                  <span class="file-name">Type: {{ file.type }}</span>
                  <span>Owner: {{ file.ownerName }}</span>
                </div>
              </div>
              <div class="thumb-wrapper"  v-if="file && !checkFileIncludesImage(file)">
                <div class="thumbnail notimage" :key="index">
                  <div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"
                        class="asset-viewer">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <span>.{{file.extension}}</span>
                  </div>
                  <button
                    type="button"
                    class="btn-remove"
                    @click="() => removeAsset(index)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                        stroke="currentColor" class="btn-remove-svg">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                  <div v-if="documentArr.includes(getTypeAssets(file.type))" class="preview-icon cursor-pointer" @click="() => previewAsset(file)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M15 12c0 1.654-1.346 3-3 3s-3-1.346-3-3 1.346-3 3-3 3 1.346 3 3zm9-.449s-4.252 8.449-11.985 8.449c-7.18 0-12.015-8.449-12.015-8.449s4.446-7.551 12.015-7.551c7.694 0 11.985 7.551 11.985 7.551zm-7 .449c0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5 5-2.243 5-5z"/></svg>
                  </div>
                  <span class="drag-handle-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#000000"
                      version="1.1"
                      width="24px"
                      height="24px"
                      viewBox="0 0 32 32"
                      xmlSpace="preserve"
                    >
                      <title>draggable</title>
                      <rect x="10" y="6" width="4" height="4" />
                      <rect x="18" y="6" width="4" height="4" />
                      <rect x="10" y="14" width="4" height="4" />
                      <rect x="18" y="14" width="4" height="4" />
                      <rect x="10" y="22" width="4" height="4" />
                      <rect x="18" y="22" width="4" height="4" />
                      <rect id="_Transparent_Rectangle_" class="st0" width="32" height="32" />
                    </svg>
                  </span>
                </div>
                <div class="content-wrapper">
                  <span class="file-name">Filename: {{ file.name }}</span>
                  <span class="file-name">Type: {{ file.type }}</span>
                  <span>Owner: {{ file.ownerName }}</span>
                </div>
              </div>
            </template>
          </transition-group>
        </VueDraggableNext>
      </div>

      <div class="flex" v-if="!plugin.data.isModalOpen">    
        <div v-if="getTotalAssets() > 0" class="column align-left text-small-size">
          <span>Total: {{getTotalAssets()}}</span>
          <span v-if="limitFiles() > 0"> / Limit: {{limitFiles()}}</span>
        </div>
          
        <div v-if="getIsOverLimit()" class="column exceeds-the-limit">
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
          <span class="ml-1">Exceeded maximum number of assets</span>
        </div> 
      </div>

      <Filerobot
        :selected-files="selectedFiles"
      />

      <ModalToggle
        :is-modal-open="plugin.data.isModalOpen"
        :set-modal-open="plugin.actions.setModalOpen"
        :refresh-assets="refreshAssets"
        :isLoading="isLoading"
        :totalAssets="getTotalAssets()"
      />
    </div>
  </div>
</template>

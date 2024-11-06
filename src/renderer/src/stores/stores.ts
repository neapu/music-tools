import {defineStore} from "pinia";
import { computed, ref } from "vue";

export interface AudioMetadataTags {
  title: string;
  artist: string;
  album: string;
}

export enum FileState {
  WAITING = 'waiting',
  CONVERTING = 'converting',
  DONE = 'done',
  ERROR = 'error',
}

export interface FileItem {
  name: string;
  path: string;
  state: FileState;
  metadata: AudioMetadataTags;
}

export interface EncoderConfig {
  outputDir: string,
  targetFormat: string,
}
export const useStores = defineStore("stores", ()=>{
  const fileItems = ref<FileItem[]>([]);
  const selectedItems = ref<FileItem[]>([]);
  const showConvertOptionDialog = ref(false);
  const showEditMetadataDialog = ref(false);
  const isBatchEditMetadata = ref(false);
  const editingMetadataItem = ref<FileItem|null>(null);

  const isSelectedItem = computed(() => selectedItems.value.length > 0);

  const init = () => {
    window.electron.ipcRenderer.on('state-changed', (_event, data) => {
      const { name, state } = data;
      const item = fileItems.value.find((item) => item.name === name);
      if (item) {
        item.state = state;
      }
    });
  }

  const openFiles = async () => {
    const ret: FileItem[]|null = await window.electron.ipcRenderer.invoke('open-files');
    if (ret === null) {
      return;
    }
    fileItems.value = ret;
  };

  const selectOutputPath = async () : Promise<string|null> => {
    const ret: {canceled: boolean, filePaths: string[] } = await window.electron.ipcRenderer.invoke('select-output-path');
    if (!ret.canceled) {
      return ret.filePaths[0];
    }
    return null;
  };

  const multipleSelectedHandler = (item: FileItem[]) => {
    selectedItems.value = item;
  };

  const convert = () => {
    showConvertOptionDialog.value = true;
  }

  const startConvert = async (config: EncoderConfig) => {
    const temp = JSON.stringify({
      files: selectedItems.value,
      config
    });
    await window.electron.ipcRenderer.invoke('convert', temp);
  };

  const removeSelectedItems = () => {
    fileItems.value = fileItems.value.filter((item) => !selectedItems.value.includes(item));
    selectedItems.value = [];
  };

  const editMetadata = (item: FileItem) => {
    isBatchEditMetadata.value = false;
    editingMetadataItem.value = item;
    showEditMetadataDialog.value = true;
  };

  const batchEditMetadata = () => {
    isBatchEditMetadata.value = true;
    editingMetadataItem.value = null;
    showEditMetadataDialog.value = true;
  };

  const startModifyMetadata = async (title: string, artist: string, album: string) => {
    let success = false;
    if (isBatchEditMetadata.value) {
      console.log('batch edit');
      for (const item of selectedItems.value) {
        const tempItem = JSON.parse(JSON.stringify(item));
        // 批量编辑不修改标题
        tempItem.metadata.artist = artist;
        tempItem.metadata.album = album;
        const ret = await window.electron.ipcRenderer.invoke('modify-metadata', JSON.stringify({file: tempItem}));
        if (ret) { // 有一个成功就算成功
          success = true;
          item.metadata.artist = artist;
          item.metadata.album = album;
        }
      }
    } else {
      console.log('single edit');
      const tempItem = JSON.parse(JSON.stringify(editingMetadataItem.value));
      tempItem.metadata.title = title;
      tempItem.metadata.artist = artist;
      tempItem.metadata.album = album;
      const ret = await window.electron.ipcRenderer.invoke('modify-metadata', JSON.stringify({file: tempItem}));
      if (ret) {
        success = true;
        editingMetadataItem.value!.metadata.title = title;
        editingMetadataItem.value!.metadata.artist = artist;
        editingMetadataItem.value!.metadata.album = album;
      }
    }
    return success;
  }

  const batchRename = async () => {
    // 重命名为 artist-title.xxx
    for (const item of selectedItems.value) {
      const newName = `${item.metadata.artist}-${item.metadata.title}.${item.path.split('.').pop()}`;
      const newPath = item.path.replace(item.name, newName);
      const ret = await window.electron.ipcRenderer.invoke('reaname-file', item.path, newPath);
      if (ret) {
        item.name = newName;
        item.path = newPath;
      } else {
        console.error('rename failed');
        return false;
      }
    }
    return true;
  }

  return {
    // refs
    fileItems,
    selectedItems,
    showConvertOptionDialog,
    showEditMetadataDialog,
    isBatchEditMetadata,
    editingMetadataItem,

    // computed
    isSelectedItem,

    // functions
    init,
    openFiles,
    selectOutputPath,
    multipleSelectedHandler,
    convert,
    startConvert,
    removeSelectedItems,
    editMetadata,
    batchEditMetadata,
    startModifyMetadata,
    batchRename,
  };
});
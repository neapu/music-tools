<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
// const ipcHandle = () => window.electron.ipcRenderer.send('ping')

enum FileState {
  WAITING = 'waiting',
  CONVERTING = 'converting',
  DONE = 'done',
  ERROR = 'error',
}

interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  // year: string;
  track: string;
  // genre: string;
}

interface FileItem {
  name: string;
  path: string;
  state: FileState;
  metadata: AudioMetadata;
}

export interface EncoderConfig {
    targetFormat: string,
}

const fileList = ref<FileItem[]>([]);
const multipleSelectedFiles = ref<FileItem[]>([]);

onMounted(() => {
  window.electron.ipcRenderer.on('state-changed', (_event, data) => {
    const { name, state } = data;
    const index = fileList.value.findIndex((item) => item.name === name);
    fileList.value[index].state = state;
  });
})

const openFiles = async () => {
  const ret: FileItem[]|null = await window.electron.ipcRenderer.invoke('open-files');
  if (ret === null) {
    return;
  }
  fileList.value = ret;
}

const multipleSelectedHandle = (items: FileItem[]) => {
  multipleSelectedFiles.value = items;
}

const showConvertOptionDialog = ref(false);
const encoderConfig = ref<EncoderConfig>({
  targetFormat: 'mp3',
});
const outputPath = ref<string>('');
const convertHandle = async () => {
  showConvertOptionDialog.value = false;
  const temp = JSON.stringify({
    files: multipleSelectedFiles.value,
    config: encoderConfig.value,
    outputPath: outputPath.value,
  });
  await window.electron.ipcRenderer.invoke('convert', temp);
}
const selectOutputPathHandle = async () => {
  const ret = await window.electron.ipcRenderer.invoke('select-output-path');
  console.log(outputPath);
  if (ret.canceled === false) {
    outputPath.value = ret.filePaths[0];
  }
}

const removeItemsHandle = () => {
  fileList.value = fileList.value.filter((item) => !multipleSelectedFiles.value.includes(item));
  multipleSelectedFiles.value = [];
}

const showMetadataDialog = ref(false);
const editingMetadataItem = ref<FileItem>({
  name: '',
  path: '',
  state: FileState.WAITING,
  metadata: {
    title: '',
    artist: '',
    album: '',
    // year: '',
    track: '',
    // genre: '',
  },
});
const editMetadataHandle = (item: FileItem) => {
  editingMetadataItem.value = JSON.parse(JSON.stringify(item));
  showMetadataDialog.value = true;
}
const editMetadataConfirmHandle = async () => {
  showMetadataDialog.value = false;
  const loading = ElLoading.service({
    lock: true,
    text: '修改中...',
    spinner: 'el-icon-loading',
    background: 'rgba(0, 0, 0, 0.7)',
  });
  const temp = JSON.stringify({
    file: editingMetadataItem.value,
  });
  const ret = await window.electron.ipcRenderer.invoke('modify-metadata', temp);
  if (ret === true) {
    ElMessage.success('修改成功');
    const index = fileList.value.findIndex((item) => item.name === editingMetadataItem.value.name);
    const metadata: AudioMetadata|null = await window.electron.ipcRenderer.invoke('read-file-metadata', editingMetadataItem.value.path);
    if (metadata !== null) {
      fileList.value[index].metadata = metadata;
    } else {
      ElMessage.error('读取元数据失败');
    }
  } else {
    ElMessage.error('修改失败');
  }
  loading.close();
}

const testHandle = () => {
  window.electron.ipcRenderer.send('test', 'hello');
}
</script>

<template>
  <div>
    <div class="header">
      <el-button @click="openFiles">添加文件</el-button>
      <el-button v-if="multipleSelectedFiles.length !== 0" @click="showConvertOptionDialog = true">转换格式</el-button>
      <el-button v-if="multipleSelectedFiles.length !== 0" @click="removeItemsHandle">移除</el-button>
      <el-button>批量重命名</el-button>
      <!-- <el-button @click="testHandle">test</el-button> -->
    </div>
    <div class="content">
      <el-table :data="fileList" style="width: 100%" @selection-change="multipleSelectedHandle">
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column prop="name" label="文件名"></el-table-column>
        <el-table-column label="标题">
          <template #default="{ row }">
            {{ row.metadata.title }}
          </template>
        </el-table-column>
        <el-table-column label="艺术家">
          <template #default="{ row }">
            {{ row.metadata.artist }}
          </template>
        </el-table-column>
        <el-table-column label="专辑">
          <template #default="{ row }">
            {{ row.metadata.album }}
          </template>
        </el-table-column>
<!--        <el-table-column label="年份">-->
<!--          <template #default="{ row }">-->
<!--            {{ row.metadata.year }}-->
<!--          </template>-->
<!--        </el-table-column>-->
        <el-table-column label="音轨">
          <template #default="{ row }">
            {{ row.metadata.track }}
          </template>
        </el-table-column>
<!--        <el-table-column label="流派">-->
<!--          <template #default="{ row }">-->
<!--            {{ row.metadata.genre }}-->
<!--          </template>-->
<!--        </el-table-column>-->
        <el-table-column prop="state" label="状态"></el-table-column>
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button :disabled="row.state !== 'waiting'" size="small" @click="editMetadataHandle(row)">编辑元数据</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-dialog v-model="showConvertOptionDialog">
      <el-form>
        <el-form-item label="输出路径">
          <el-input v-model="outputPath" placeholder="选择输出路径">
            <template #append>
              <el-button @click="selectOutputPathHandle">浏览</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="目标格式">
          <el-select v-model="encoderConfig.targetFormat" placeholder="选择目标格式">
            <el-option label="mp3" value="mp3"></el-option>
            <el-option label="flac" value="flac"></el-option>
          </el-select>
        </el-form-item>
        <el-button @click="convertHandle">开始转换</el-button>
      </el-form>
    </el-dialog>
    <el-dialog v-model="showMetadataDialog">
      <el-form label-width="auto">
        <el-form-item label="标题">
          <el-input v-model="editingMetadataItem.metadata.title"></el-input>
        </el-form-item>
        <el-form-item label="艺术家">
          <el-input v-model="editingMetadataItem.metadata.artist"></el-input>
        </el-form-item>
        <el-form-item label="专辑">
          <el-input v-model="editingMetadataItem.metadata.album"></el-input>
        </el-form-item>
<!--        <el-form-item label="年份">-->
<!--          <el-input v-model="editingMetadataItem.metadata.year"></el-input>-->
<!--        </el-form-item>-->
        <el-form-item label="音轨">
          <el-input v-model="editingMetadataItem.metadata.track"></el-input>
        </el-form-item>
<!--        <el-form-item label="流派">-->
<!--          <el-input v-model="editingMetadataItem.metadata.genre"></el-input>-->
<!--        </el-form-item>-->
        <el-button @click="editMetadataConfirmHandle">确定</el-button>
      </el-form>

    </el-dialog>
  </div>
</template>

<style scoped>
.header {
  padding: 20px;
  display: flex;
}

.content {
  margin: 20px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
</style>

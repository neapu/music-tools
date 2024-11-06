<script setup lang="ts">
import {useStores} from "@renderer/stores/stores";
import { ref, watch } from "vue";
import { ElNotification } from "element-plus";

const stores = useStores();

const title = ref('');
const artist = ref('');
const album = ref('');
const loading = ref(false);

watch(() => stores.showEditMetadataDialog, (newVal) => {
  if (newVal == true && !stores.isBatchEditMetadata) {
    title.value = stores.editingMetadataItem!.metadata.title;
    artist.value = stores.editingMetadataItem!.metadata.artist;
    album.value = stores.editingMetadataItem!.metadata.album;

  }
});

const confirmHandle = async () => {
  loading.value = true;
  const ret = await stores.startModifyMetadata(title.value, artist.value, album.value);
  loading.value = false;
  if (ret) {
    stores.showEditMetadataDialog = false;
    ElNotification({
      title: '成功',
      message: '修改元数据成功',
      type: 'success',
    });
  } else {
    ElNotification({
      title: '错误',
      message: '修改元数据失败',
      type: 'error',
    });
  }
}

const closeHandler = (done: () => void) => {
  if (loading.value) {
    return;
  }
  done();
}
</script>

<template>
  <el-dialog v-model="stores.showEditMetadataDialog" :before-close="closeHandler">
    <el-form label-width="auto">
      <el-form-item label="标题" v-if="!stores.isBatchEditMetadata">
        <el-input v-model="title"></el-input>
      </el-form-item>
      <el-form-item label="艺术家">
        <el-input v-model="artist"></el-input>
      </el-form-item>
      <el-form-item label="专辑">
        <el-input v-model="album"></el-input>
      </el-form-item>
      <el-button @click="confirmHandle" :loading="loading">确定</el-button>
    </el-form>

  </el-dialog>
</template>

<style scoped>

</style>
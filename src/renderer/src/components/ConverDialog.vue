<script setup lang="ts">
import {useStores, EncoderConfig} from "@renderer/stores/stores";
import { ref } from 'vue';

const stores = useStores();

const encoderConfig = ref<EncoderConfig>({
  outputDir: '',
  targetFormat: 'mp3',
});

const selectOutputPathHandle = async () => {
  const ret = await stores.selectOutputPath();
  if (!ret) {
    return;
  }
  encoderConfig.value.outputDir = ret;
}

const convertHandle = async () => {
  stores.showConvertOptionDialog = false;
  await stores.startConvert(encoderConfig.value);
}

</script>

<template>
  <el-dialog v-model="stores.showConvertOptionDialog">
    <el-form>
      <el-form-item label="输出路径">
        <el-input v-model="encoderConfig.outputDir" placeholder="选择输出路径">
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
</template>

<style scoped>

</style>
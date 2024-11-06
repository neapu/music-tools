<script setup lang="ts">
import { onMounted } from 'vue';
import ConverDialog from "@renderer/components/ConverDialog.vue";
import EditMetadataDialog from "@renderer/components/EditMetadataDialog.vue";
import {useStores} from "@renderer/stores/stores";
import { ElNotification, ElLoading, ElMessageBox } from "element-plus";

const stores = useStores();

onMounted(() => {
  stores.init();
})

const batchRenameHandle = async () => {
  const retConfirm = await ElMessageBox.confirm('确定要批量重命名吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).catch(() => {
    return 'cancel';
  });
  if (retConfirm !== 'confirm') {
    return;
  }
  const loading = ElLoading.service({
    lock: true,
    text: '正在加载...',
    spinner: 'el-icon-loading',
    background: 'rgba(0, 0, 0, 0.7)'
  });
  const ret = await stores.batchRename();
  loading.close();
  if (ret) {
    ElNotification({
      title: '成功',
      message: '批量重命名成功',
      type: 'success',
    });
  } else {
    ElNotification({
      title: '错误',
      message: '批量重命名失败',
      type: 'error',
    });
  }
}

</script>

<template>
  <div>
    <div class="header">
      <el-button @click="stores.openFiles()">添加文件</el-button>
      <el-button v-if="stores.isSelectedItem" @click="stores.convert()">转换格式</el-button>
      <el-button v-if="stores.isSelectedItem" @click="stores.batchEditMetadata()">批量编辑专辑和艺术家</el-button>
      <el-button v-if="stores.isSelectedItem" @click="stores.removeSelectedItems()">移除</el-button>
      <el-button v-if="stores.isSelectedItem" @click="batchRenameHandle">批量重命名</el-button>
      <!-- <el-button @click="testHandle">test</el-button> -->
    </div>
    <div class="content">
      <el-table :data="stores.fileItems" style="width: 100%" @selection-change="stores.multipleSelectedHandler">
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
<!--        <el-table-column label="音轨">-->
<!--          <template #default="{ row }">-->
<!--            {{ row.metadata.track }}-->
<!--          </template>-->
<!--        </el-table-column>-->
<!--        <el-table-column label="流派">-->
<!--          <template #default="{ row }">-->
<!--            {{ row.metadata.genre }}-->
<!--          </template>-->
<!--        </el-table-column>-->
        <el-table-column prop="state" label="状态"></el-table-column>
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button :disabled="row.state !== 'waiting'" size="small" @click="stores.editMetadata(row)">编辑元数据</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <ConverDialog />
    <EditMetadataDialog />
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

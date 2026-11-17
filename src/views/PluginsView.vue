<script setup>
import { useDataset } from '../composables/useDataset.js'
import DataState from '../components/DataState.vue'
import PluginTable from '../components/PluginTable.vue'
const { data, error, loading, reload } = useDataset()
</script>
<template>
  <div class="page">
    <header class="page-heading">
      <h1>Plugins</h1>
      <p>Search current, disabled and historical plugins by name, author or tag.</p>
    </header>
    <DataState :loading="loading" :error="error" @retry="reload"
      ><section v-if="data" class="panel table-panel"><PluginTable :plugins="data" /></section
    ></DataState>
  </div>
</template>

import './assets/main.css'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App)
  .use(createPinia())
  .mount('#app')

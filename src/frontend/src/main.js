import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { addCollection } from '@iconify/vue'
import lineMdIcons from '@iconify-json/line-md/icons.json'
addCollection(lineMdIcons)

const app = createApp(App)

app.use(router)

app.mount('#app')

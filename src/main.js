import { createApp } from 'vue'
import './style.css'
import router from './router'
import RootApp from './RootApp.vue'

const app = createApp(RootApp)
app.use(router)
app.mount('#app')
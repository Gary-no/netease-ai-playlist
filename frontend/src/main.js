import { createApp } from 'vue';
import App from './App.vue';
// 自托管可变字体（Space Grotesk 标题 / Inter 正文），离线与国内网络均可用
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import './style.css';

createApp(App).mount('#app');

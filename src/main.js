import { createSSRApp } from 'vue'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  
  // 全局音频管理
  app.config.globalProperties.$audio = {
    // 音频文件路径
    sounds: {
      start: '/static/start.mp3',
      countdown3: '/static/3.mp3',
      countdown2: '/static/2.mp3',
      countdown1: '/static/1.mp3',
      countdown0: '/static/0.mp3',
      banEnd: '/static/4.mp3'
    },
    
    // 播放音频
    play(soundName) {
      const innerAudioContext = uni.createInnerAudioContext()
      innerAudioContext.src = this.sounds[soundName]
      innerAudioContext.play()
      
      innerAudioContext.onError((res) => {
        console.log('音频播放失败:', res)
      })
    }
  }
  
  return {
    app
  }
}

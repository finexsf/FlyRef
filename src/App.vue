<script>
export default {
  onLaunch: function() {
    console.log('App Launch')
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  }
}
</script>

<style>
/* 全局样式 */
page {
  background-color: #4a5568;
  font-family: Arial, sans-serif;
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
}

/* 横屏适配 */
@media screen and (orientation: landscape) {
  page {
    min-height: 100vh;
    width: 100vw;
  }
}

/* 按钮点击效果 */
button:active {
  transform: scale(0.95);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* 横屏模式下的特殊样式 */
@media screen and (orientation: landscape) {
  .container {
    min-height: 100vh;
    width: 100vw;
    overflow-x: auto;
    overflow-y: hidden;
  }
  
  .game-area {
    min-height: calc(100vh - 150px);
  }
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import Pipe from '../WindowPipe';
import LogList from './LogList.vue';

const message = ref<string>('')
const logList = ref<string[]>([])

const pipe: Pipe = new Pipe();
const init = (frame: HTMLIFrameElement) => {
  pipe.targetOrigin = frame.src
  pipe.targetWindow = frame.contentWindow!
  pipe.authKey = 'MY-PIPE'

  pipe.connect().then(() => {
    // setInterval(() => {
    //   pipe.send({
    //     method: 'ping',
    //     params: {
    //       timestamp: new Date().getTime()
    //     }
    //   }).then(responseData => {
    //     logList.value.push(`>> ${JSON.stringify(responseData)}`)
    //   })
    // }, 10000)
  })
}
pipe.onReceived = (cmd) => {
  if (cmd.method === 'message') {
    logList.value.push(`>> MESSAGE: ${cmd.params?.text}`)
  } else {
    logList.value.push(`>> GOT COMMAND: ${cmd.method}`)
  }

}
pipe.onLog = (log) => {
  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  logList.value.push(
    `${timestamp} [${log.severity}] ${log.message}`
  )
}

const sendMessage = (text: string) => {
  pipe.send({
    method: 'message',
    params: {
      text
    },
    timeout: 0
  })
  message.value = ''
}
</script>

<template>
  <div class="panel">
    <div class="pane pd1">
      <h2>Parent window</h2>
      <div>
        <input v-model="message" class="send"
          @keydown.enter="() => sendMessage(message)" />
          <button class="send" @click="() => sendMessage(message)">Send</button>
      </div>
      <Log-List :items="logList"></Log-List>
    </div>
    <div class="pane" style="display: flex;">
      <iframe src="/child" @load="(evt) => init(evt.target as HTMLIFrameElement)"></iframe>
    </div>
  </div>
</template>

<style scoped>
.panel {
  width: 100vw;
  height: 100vh;
  display: flex;
}

.pane {
  flex-basis: 50%;
  position: relative;
  border: 1px dashed gray;
}

.pane iframe {
  flex-grow: 1;
}
</style>

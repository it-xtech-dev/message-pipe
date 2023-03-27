<script setup lang="ts">
import { ref } from 'vue'
import MessagePipe from '../MessagePipe';
import LogList from './LogList.vue';

const message = ref<string>('')
const logList = ref<string[]>([])
const targetOrigin = `${window.location.protocol}//${window.location.host}`;

const pipe: MessagePipe = new MessagePipe(window.parent, targetOrigin, 'MY-PIPE');
pipe.onLog = (log) => {
  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  logList.value.push(
    `${timestamp} [${log.severity}] ${log.message}`
  )
}
pipe.onReceived = cmd => {
  if (cmd.method === 'ping') {
    cmd.respondWith({
      context: 'ping-back',
      timestamp: cmd.params?.timestamp
    })
  } else if (cmd.method === 'message') {
    logList.value.push(`>> MESSAGE: ${cmd.params?.text}`)
  }
}
pipe.connect();

const sendMessage = (text: string) => {
  pipe.send({
    method: 'message',
    params: {
      text
    }
  })
  message.value = ''
}
</script>

<template>
  <div class="pd1">
    <h2>Child window</h2>
    <div>
      <input v-model="message" class="send"
          @keydown.enter="() => sendMessage(message)" />
        <button class="send" @click="() => sendMessage(message)">Send</button>
    </div>
    <Log-List :items="logList"></Log-List>
  </div>
</template>

<style scoped>
</style>

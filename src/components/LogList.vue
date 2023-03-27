<script setup lang="ts">
import { PropType } from 'vue';
defineProps({
    items: {
        type: Array as PropType<string[]>,
        required: true
    }
})
</script>

<template>
    <div class="list">
        <div v-for="item in items" :class="{ violet: item.startsWith('>>')}">{{ item }}</div>
    </div>
</template>

<style scoped>
.list {
    display: flex;
    flex-direction: column-reverse;
}
.violet {
    background-color: blueviolet;
    color: white;
}
</style>
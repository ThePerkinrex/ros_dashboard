<script setup lang="ts">
import { ConnectionStatus } from '@/ros/ros'
import { computed } from 'vue'

const props = defineProps<{
	connectionStatus: ConnectionStatus
}>()

const emoji = computed(() => {
	switch (props.connectionStatus) {
		case ConnectionStatus.CLOSED:
			return '⛔️'
		case ConnectionStatus.CONNECTED:
			return '✅️'
		case ConnectionStatus.CONNECTING:
			return '⚡'
		case ConnectionStatus.ERROR:
			return '⚠️'
	}
})
</script>

<template>
	<span class="status">{{ emoji }}</span>
</template>

<style scoped></style>

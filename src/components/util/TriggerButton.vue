<script setup lang="ts">
import { connection_status, ConnectionStatus } from '@/ros/ros'
import { RosService } from '@/ros/service'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
	service: string
}>()

const service = ref<RosService | null>(null)

watch(connection_status, (s) => {
	if (s === ConnectionStatus.CONNECTED) {
		service.value = new RosService(props.service, 'std_srvs/srv/Trigger')
	} else {
		service.value = null
	}
})
</script>

<template>
	<button @click="service?.call({}).then(console.log)"><slot></slot></button>
</template>

<style scoped></style>

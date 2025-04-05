<script setup lang="ts">
import { connection_status, ConnectionStatus } from '@/ros/ros'
import { RosTopic } from '@/ros/topics'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
	topic: string
}>()

watch(connection_status, (s) => {
	if (s === ConnectionStatus.CONNECTED) {
		new RosTopic(props.topic, 'std_msgs/msg/Bool').subscribe((message) => {
			on.value = message.data
		})
	}
})

const on = ref(false)
</script>

<template>
	<div :class="['light', { on: on }]"></div>
</template>

<style scoped>
.light {
	width: 1em;
	height: 1em;
	border-radius: 0.5em;
	border: 1px solid black;
	background-color: gray;
}
.light.on {
	background-color: rgb(224, 179, 30);
}
</style>

<script setup lang="ts">
import type GetMap from '@/ros/data/nav_msgs/srv/GetMap'
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { RosService } from '@/ros/service'
import { cssColors } from '@/util/color'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
	colorGenerator?: Generator<string, never, undefined>
}>()

const defaultColorGen = cssColors()
const colorGenerator = computed(() => props.colorGenerator ?? defaultColorGen)

const ros = new Ros()

const service = ref<RosService | undefined>(undefined)

watch(
	connection_status,
	async (c) => {
		if (c === ConnectionStatus.CONNECTED) {
			service.value = new RosService(
				'/map_server/map',
				'nav_msgs/srv/GetMap',
			)
		}
	},
	{ immediate: true },
)
</script>

<template></template>

<style scoped></style>

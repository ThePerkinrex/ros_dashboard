<script setup lang="ts">
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { reactive, ref, watch } from 'vue'
import type { RosParam } from '@/ros/params'
import { Line } from 'vue-chartjs'
import type { ChartData } from 'chart.js'
import {
	Chart as ChartJS,
	Title,
	Tooltip,
	Legend,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
} from 'chart.js'
import type { RosTopic } from '@/ros/topics'
import type { Topic } from 'roslib'

// Register the necessary Chart.js components
ChartJS.register(
	Title,
	Tooltip,
	Legend,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
)

type TopicData = { a: RosTopic; b: { s: Topic; i: number } | null }

const ros = new Ros()
const topics = ref<TopicData[]>([])

watch(
	connection_status,
	async (c) => {
		if (c === ConnectionStatus.CONNECTED) {
			topics.value = (await ros.getTopics())
				.filter((t) => t.isPlottable())
				.map((t) => ({ a: t, b: null }))
		}
	},
	{ immediate: true },
)

const data = reactive<ChartData<'line'>>({
	datasets: [],
	labels: [],
})

function addDataset(t: TopicData) {}
</script>

<template>
	<div class="content">
		<aside>
			<div class="topic" v-for="topic in topics">
				{{ topic.a.getName() + ' - ' + topic.a.getType() }}
			</div>
		</aside>
		<div class="main"><Line :data="data" /></div>
	</div>
</template>

<style scoped>
.main,
aside {
	padding: 1rem;
}
.content {
	display: flex;
	flex-direction: row;
	gap: 1em;
}
.main {
	flex-grow: 1;
}
</style>

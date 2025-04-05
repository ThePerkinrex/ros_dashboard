<script setup lang="ts">
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { reactive, ref, shallowRef, watch } from 'vue'
import type { RosParam } from '@/ros/params'
import { Line } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import {
	Chart as ChartJS,
	Title,
	Tooltip,
	Legend,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
	TimeScale,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import type { RosTopic } from '@/ros/topics'
import type { Topic } from 'roslib'
import type { ShallowRefMarker } from '@vue/reactivity'

// Register the necessary Chart.js components
ChartJS.register(
	Title,
	Tooltip,
	Legend,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
	TimeScale,
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

const data = ref<ChartData<'line'>>({
	datasets: [
		{
			data: [
				{ x: 1, y: 0 },
				{ x: 2, y: 1 },
				{ x: 4, y: 0.5 },
			],
			label: 'Data 1',
		},
		{
			data: [
				{ x: 2, y: 0 },
				{ x: 3, y: 1 },
				{ x: 4.5, y: 0.5 },
			],
			label: 'Data 2',
		},
	],
})

const options: ChartOptions<'line'> = {
	scales: {
		x: {
			type: 'time',
		},
	},
}

setTimeout(() => {
	data.value.datasets[1].data.push({ x: 5.5, y: 0.5 })
}, 1000)

function addDataset(t: TopicData) {}
</script>

<template>
	<div class="content">
		<aside>
			<div class="topic" v-for="topic in topics">
				{{ topic.a.getName() + ' - ' + topic.a.getType() }}
			</div>
		</aside>
		<div class="main">
			<Line :data="JSON.parse(JSON.stringify(data))" :options="options" />
		</div>
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

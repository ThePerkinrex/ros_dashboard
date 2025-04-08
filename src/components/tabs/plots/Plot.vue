<script setup lang="ts">
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { reactive, ref, shallowRef, watch } from 'vue'
import type { RosParam } from '@/ros/params'

import type { RosTopic } from '@/ros/topics'
import type { Topic } from 'roslib'
import { computed, type ShallowRefMarker } from '@vue/reactivity'
import type { PlotDatasets } from '@/components/util/TimeSeries.vue'
import TimeSeries from '@/components/util/TimeSeries.vue'
import { CircularBuffer } from '@/util'
import { cssColors } from '@/util/color'

const props = defineProps<{
	colorGenerator?: Generator<string, never, undefined>
}>()

const defaultColorGen = cssColors()
const colorGenerator = computed(() => props.colorGenerator ?? defaultColorGen)

type TopicData = {
	rosTopic: RosTopic
	subscription: { subscribed: Topic } | null
}

const ros = new Ros()
const topics = ref<TopicData[]>([])

watch(
	connection_status,
	async (c) => {
		if (c === ConnectionStatus.CONNECTED) {
			topics.value = (await ros.getTopics())
				.filter((t) => t.isPlottable())
				.map((t) => ({ rosTopic: t, subscription: null }))
		}
	},
	{ immediate: true },
)

const datasets: PlotDatasets = {}

// const data = computed<ChartData<'line'>>(() => {
// 	const d: ChartData<'line'> = {
// 		datasets: Object.getOwnPropertySymbols(datasets.value).map(
// 			(x) => datasets.value[x],
// 		),
// 	}
// 	console.log('Compute data: ', d, datasets.value)
// 	return d
// })

// const options: ChartOptions<'line'> = {
// 	scales: {
// 		x: {
// 			type: 'time',
// 			ticks: {
// 				// minRotation: 0,
// 				// maxRotation: 0,
// 				// sampleSize: 3,
// 				// maxTicksLimit: 5,
// 				display: false,
// 			},
// 		},
// 	},
// 	plugins: {
// 		colors: {
// 			forceOverride: true,
// 		},
// 	},
// 	borderColor: '#FFFFFF',
// 	backgroundColor: '#DDDDDD',
// 	animation: false,
// 	normalized: true,
// 	spanGaps: true,
// 	elements: {
// 		point: {
// 			radius: 0,
// 		},
// 	},
// }

const plot = ref<{ update: (datasets: PlotDatasets) => void } | null>(null)

function getColor(): string {
	return colorGenerator.value.next().value
}

function toggleDataset(t: TopicData) {
	console.log('toggle', t.rosTopic.getName())
	if (t.subscription === null) {
		const color = getColor()
		console.log('Adding', color)
		const id = t.rosTopic.getName()
		datasets[id] = {
			data: new CircularBuffer(),
			color: color,
		}
		t.subscription = {
			subscribed: t.rosTopic.subscribePlot((data) => {
				datasets[id].data.push({ x: Date.now() / 1000, y: data })
				if (plot.value !== null) plot.value.update(datasets)
			}),
		}
	} else {
		delete datasets[t.rosTopic.getName()]
		t.rosTopic.unsubscribe(t.subscription.subscribed)
		t.subscription = null
	}
}
</script>

<template>
	<div class="content">
		<aside>
			<slot></slot>
			<div
				class="topic"
				v-for="topic in topics"
				:key="topic.rosTopic.getName()"
			>
				<input
					type="checkbox"
					:id="topic.rosTopic.getName()"
					@change="toggleDataset(topic as TopicData)"
				/>
				<label :for="topic.rosTopic.getName()">{{
					topic.rosTopic.getName()
				}}</label>
			</div>
		</aside>
		<div class="main">
			<TimeSeries ref="plot" />
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
	width: fit-content;
}
.main {
	flex-grow: 1;
}
.topic {
	display: flex;
	flex-direction: row;
	gap: 0.5em;
	align-items: center;
}
aside {
	display: flex;
	flex-direction: column;
	gap: 0.25em;
}
</style>

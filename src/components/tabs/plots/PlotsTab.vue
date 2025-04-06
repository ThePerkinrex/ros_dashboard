<script setup lang="ts">
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { reactive, ref, shallowRef, watch } from 'vue'
import type { RosParam } from '@/ros/params'

import type { RosTopic } from '@/ros/topics'
import type { Topic } from 'roslib'
import { computed, type ShallowRefMarker } from '@vue/reactivity'
import type { PlotDatasets } from '@/components/util/TimeSeries.vue'
import TimeSeries from '@/components/util/TimeSeries.vue'

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

const datasets = ref<PlotDatasets>({})

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

function toggleDataset(t: TopicData) {
	console.log('toggle')
	if (t.subscription === null) {
		const id = t.rosTopic.getName()
		datasets.value[id] = {
			data: [],
		}
		t.subscription = {
			subscribed: t.rosTopic.subscribePlot((data) => {
				datasets.value[id].data.push({ x: Date.now() / 1000, y: data })
			}),
		}
	} else {
		delete datasets.value[t.rosTopic.getName()]
		t.rosTopic.unsubscribe(t.subscription.subscribed)
		t.subscription = null
	}
}
</script>

<template>
	<div class="content">
		<aside>
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
			<TimeSeries :datasets="datasets" />
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

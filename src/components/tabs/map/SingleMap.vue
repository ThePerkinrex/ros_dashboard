<script setup lang="ts">
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { reactive, ref, shallowRef, watch } from 'vue'
import type { RosParam } from '@/ros/params'

import type { RosTopic } from '@/ros/topics'
import type { Topic } from 'roslib'
import { computed, type ShallowRefMarker } from '@vue/reactivity'
import { CircularBuffer } from '@/util'
import { cssColors } from '@/util/color'
import type { MapDatasets } from '@/components/util/graph/Map.vue'
import Map from '@/components/util/graph/Map.vue'

const props = defineProps<{
	colorGenerator?: Generator<string, never, undefined>
}>()

const defaultColorGen = cssColors()
const colorGenerator = computed(() => props.colorGenerator ?? defaultColorGen)

type TopicData = {
	rosTopic: RosTopic
	subscription: { subscribed: Topic } | null
}

type KeyedTopicData = {
	key: string
} & TopicData

const ros = new Ros()
const mapTopics = ref<RosTopic<'nav_msgs/msg/OccupancyGrid'>[]>([])

watch(
	connection_status,
	async (c) => {
		if (c === ConnectionStatus.CONNECTED) {
			mapTopics.value = (await ros.getTopics())
				// .map((t) => {
				// 	console.log('Before filtering', t)
				// 	return t
				// })
				.filter((t) => t.is('nav_msgs/msg/OccupancyGrid'))
			// .map((t) => {
			// 	console.log('After filtering', t)
			// 	return t
			// })
		}
	},
	{ immediate: true },
)

let datasets: MapDatasets | undefined = undefined

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

const map = ref<{ update: (datasets: MapDatasets) => void } | null>(null)

function getColor(): string {
	return colorGenerator.value.next().value
}

let lastSelectedMap:
	| { rostopic: RosTopic<'nav_msgs/msg/OccupancyGrid'>; subscription: Topic }
	| undefined

function setMap(t: RosTopic<'nav_msgs/msg/OccupancyGrid'>) {
	console.log('set map', t.getName())
	if (lastSelectedMap !== undefined) {
		lastSelectedMap.rostopic.unsubscribe(lastSelectedMap.subscription)
		lastSelectedMap = undefined
	}
	lastSelectedMap = {
		rostopic: t,
		subscription: t.subscribe(
			(m) => {
				console.log('Received value: ', m)
				datasets = {
					...(datasets || {}),
					map: {
						map: m,
						color: '#0000',
					},
				}
				if (map.value !== null) map.value.update(datasets)
			},
			{
				compression: 'cbor',
			},
		),
	}
}
</script>

<template>
	<div class="content">
		<aside>
			<slot></slot>
			<details>
				<summary>Map Topics</summary>
				<div
					class="topic"
					v-for="topic in mapTopics"
					:key="topic.getName()"
				>
					<input
						type="radio"
						:id="topic.getName()"
						@change="
							setMap(
								topic as RosTopic<'nav_msgs/msg/OccupancyGrid'>,
							)
						"
						name="map"
					/>
					<label :for="topic.getName()">{{ topic.getName() }}</label>
				</div>
			</details>
		</aside>
		<div class="main">
			<Map ref="map" />
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

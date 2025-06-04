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
const pointTopics = ref<
	RosTopic<'geometry_msgs/msg/PointStamped' | 'nav_msgs/msg/Odometry'>[]
>([])

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

			pointTopics.value = (await ros.getTopics()).filter(
				(t) =>
					t.is('geometry_msgs/msg/PointStamped') ||
					t.is('nav_msgs/msg/Odometry'),
			)
		}
	},
	{ immediate: true },
)

let datasets: MapDatasets | undefined = undefined

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
					...(datasets || { traces: {} }),
					map: {
						type: 'map',
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

let traces: Record<
	string,
	{
		rostopic: RosTopic<
			'geometry_msgs/msg/PointStamped' | 'nav_msgs/msg/Odometry'
		>
		subscription: Topic
	}
> = {}

function toggleTrace(
	t: RosTopic<'geometry_msgs/msg/PointStamped' | 'nav_msgs/msg/Odometry'>,
) {
	console.log('Trace toggled', t.getName(), traces, datasets)
	const datasets_const = datasets
	if (datasets_const === undefined) {
		return
	}
	const trace = traces[t.getName()]
	if (trace !== undefined) {
		trace.rostopic.unsubscribe(trace.subscription)
		delete traces[t.getName()]
	} else if (t.is('geometry_msgs/msg/PointStamped')) {
		traces[t.getName()] = {
			rostopic: t,
			subscription: t.subscribe(
				(point) => {
					if (datasets_const.traces[t.getName()] === undefined) {
						datasets_const.traces[t.getName()] = {
							color: getColor(),
							data: new CircularBuffer(20),
							type: 'trace',
						}
					}
					const d = {
						x: point.point.x,
						y: point.point.y,
						time:
							point.header.stamp.sec +
							point.header.stamp.nanosec * 10e-9,
					}
					// console.log(d)
					datasets_const.traces[t.getName()]!.data.push(d)

					if (map.value !== null) map.value.update(datasets_const)
				},
				{
					throttle_rate: 100,
					queue_length: 1,
				},
			),
		}
	} else if (t.is('nav_msgs/msg/Odometry')) {
		traces[t.getName()] = {
			rostopic: t,
			subscription: t.subscribe(
				(point) => {
					if (datasets_const.traces[t.getName()] === undefined) {
						datasets_const.traces[t.getName()] = {
							color: getColor(),
							data: new CircularBuffer(20),
							type: 'trace',
						}
					}
					const d = {
						x: point.pose.pose.position.x,
						y: point.pose.pose.position.y,
						time:
							point.header.stamp.sec +
							point.header.stamp.nanosec * 10e-9,
					}
					// console.log(d)
					datasets_const.traces[t.getName()]!.data.push(d)

					if (map.value !== null) map.value.update(datasets_const)
				},
				{
					throttle_rate: 100,
					queue_length: 1,
				},
			),
		}
	}
}
</script>

<template>
	<div class="content">
		<aside>
			<slot></slot>
			<details open>
				<summary>Map Topics</summary>
				<div
					class="topic"
					v-for="topic in mapTopics"
					:key="topic.getName()"
				>
					<input
						type="radio"
						:id="'map-' + topic.getName()"
						@change="
							setMap(
								topic as RosTopic<'nav_msgs/msg/OccupancyGrid'>,
							)
						"
						name="map"
					/>
					<label :for="'map-' + topic.getName()">{{
						topic.getName()
					}}</label>
				</div>
			</details>
			<details open>
				<summary>Point Topics</summary>
				<div
					class="topic"
					v-for="topic in pointTopics"
					:key="topic.getName()"
				>
					<input
						type="checkbox"
						:id="'point-' + topic.getName()"
						@change="
							toggleTrace(
								topic as RosTopic<'geometry_msgs/msg/PointStamped'>,
							)
						"
					/>
					<label :for="'point-' + topic.getName()">{{
						topic.getName()
					}}</label>
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

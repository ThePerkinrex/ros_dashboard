<script setup lang="ts">
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { reactive, ref, shallowRef, watch } from 'vue'
import type { RosParam } from '@/ros/params'

import { RosTopic } from '@/ros/topics'
import type { Topic } from 'roslib'
import { computed, type ShallowRefMarker } from '@vue/reactivity'
import { CircularBuffer } from '@/util'
import { rgbColors, type RGB } from '@/util/color'
import type { MapDatasets } from '@/components/util/graph/Map.vue'
import Map from '@/components/util/graph/Map.vue'

const props = defineProps<{
	colorGenerator?: Generator<RGB, never, undefined>
}>()

const defaultColorGen = rgbColors()
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
const pathTopics = ref<RosTopic<'nav_msgs/msg/Path'>[]>([])

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
			pathTopics.value = (await ros.getTopics()).filter((t) =>
				t.is('nav_msgs/msg/Path'),
			)
		}
	},
	{ immediate: true },
)

let datasets: MapDatasets | undefined = undefined

const map = ref<{ update: (datasets: MapDatasets) => void } | null>(null)

function getColor(): RGB {
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
					...(datasets || { traces: {}, paths: {} }),
					map: {
						type: 'map',
						map: m,
						color: {
							type: 'regular',
							color: { r: 0, g: 0, b: 0, a: 0 },
						},
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

let paths: Record<
	string,
	{
		rostopic: RosTopic<'nav_msgs/msg/Path'>
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
							color: { color: getColor(), type: 'transparent' },
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
					throttle_rate: 250,
					queue_length: 0,
					queue_size: 0,
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
							color: { color: getColor(), type: 'transparent' },
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
					throttle_rate: 250,
					queue_length: 0,
					queue_size: 0,
				},
			),
		}
	}
}

function togglePath(t: RosTopic<'nav_msgs/msg/Path'>) {
	console.log('Path toggled', t.getName(), paths, datasets)
	const datasets_const = datasets
	if (datasets_const === undefined) {
		return
	}
	const path = paths[t.getName()]
	if (path !== undefined) {
		path.rostopic.unsubscribe(path.subscription)
		if (datasets_const.paths[t.getName()] === undefined) {
			datasets_const.paths[t.getName()] = {
				color: { color: getColor(), type: 'regular' },
				data: [],
				type: 'path',
			}
		}
		// console.log(d)
		datasets_const.paths[t.getName()]!.data = []

		if (map.value !== null) map.value.update(datasets_const)
		delete paths[t.getName()]
	} else {
		paths[t.getName()] = {
			rostopic: t,
			subscription: t.subscribe((path) => {
				if (datasets_const.paths[t.getName()] === undefined) {
					datasets_const.paths[t.getName()] = {
						color: { color: getColor(), type: 'regular' },
						data: [],
						type: 'path',
					}
				}
				// console.log(d)
				datasets_const.paths[t.getName()]!.data = path.poses.map(
					(p) => ({
						x: p.pose.position.x,
						y: p.pose.position.y,
						speed: 1,
					}),
				)

				if (map.value !== null) map.value.update(datasets_const)
			}),
		}
	}
}

const timeout = ref<number>(20)
</script>

<template>
	<div class="content">
		<aside>
			<slot></slot>
			<div>
				<input
					type="range"
					min="4"
					max="30"
					step="0.5"
					v-model="timeout"
				/>
				<span>{{ timeout }} s</span>
			</div>

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
			<details open>
				<summary>Path Topics</summary>
				<div
					class="topic"
					v-for="topic in pathTopics"
					:key="topic.getName()"
				>
					<input
						type="checkbox"
						:id="'point-' + topic.getName()"
						@change="
							togglePath(topic as RosTopic<'nav_msgs/msg/Path'>)
						"
					/>
					<label :for="'point-' + topic.getName()">{{
						topic.getName()
					}}</label>
				</div>
			</details>
		</aside>
		<div class="main">
			<Map ref="map" :timeout="timeout" />
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

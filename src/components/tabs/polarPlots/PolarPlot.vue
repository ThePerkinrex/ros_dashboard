<script setup lang="ts">
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { reactive, ref, shallowRef, watch } from 'vue'

import type { RosTopic } from '@/ros/topics'
import type { Topic } from 'roslib'
import { computed } from '@vue/reactivity'
import { rgbColors, type RGB } from '@/util/color'
import InstantPolar, {
	type PlotDatasets,
} from '@/components/util/graph/InstantPolar.vue'

const props = defineProps<{
	colorGenerator?: Generator<RGB, never, undefined>
}>()

const defaultColorGen = rgbColors()
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
				.filter((t) => t.isPolarPlottable())
				.map((t) => ({ rosTopic: t, subscription: null }))
		}
	},
	{ immediate: true },
)

const datasets: PlotDatasets = {}

const plot = ref<{ update: (datasets: PlotDatasets) => void } | null>(null)

const minAngle = ref(0)
const maxAngle = ref(Math.PI * 2)

function getColor(): RGB {
	return colorGenerator.value.next().value
}

function toggleDataset(t: TopicData) {
	console.log('toggle', t.rosTopic.getName())
	if (t.subscription === null) {
		const color = getColor()
		console.log('Adding', color)
		const id = t.rosTopic.getName()
		datasets[id] = {
			data: [],
			color: { type: 'regular', color },
		}
		t.subscription = {
			subscribed: t.rosTopic.subscribePolarPlot(
				(ranges, minAngleP, maxAngleP) => {
					if (minAngle.value !== minAngleP) minAngle.value = minAngleP
					if (maxAngle.value !== maxAngleP) maxAngle.value = maxAngleP
					datasets[id].data = ranges.map((radius, angle_idx) => ({
						angle_idx,
						radius,
					}))
					if (plot.value !== null) plot.value.update(datasets)
				},
			),
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
			<InstantPolar
				ref="plot"
				:min-angle="minAngle"
				:max-angle="maxAngle"
			/>
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

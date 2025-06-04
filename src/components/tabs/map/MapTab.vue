<script setup lang="ts">
import type { MapDatasets } from '@/components/util/graph/Map.vue'
import Map from '@/components/util/graph/Map.vue'
import type GetMap from '@/ros/data/nav_msgs/srv/GetMap'
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { RosService } from '@/ros/service'
import { rgbColors } from '@/util/color'
import { computed, ref, watch } from 'vue'
import SingleMap from './SingleMap.vue'

const maps = ref([Symbol()])
const colorGen = rgbColors()
</script>

<template>
	<div class="content">
		<div v-for="k in maps" :key="k" class="plot">
			<SingleMap :color-generator="colorGen">
				<button
					@click="maps.splice(maps.indexOf(k), 1)"
					:disabled="maps.length <= 1"
					class="remove"
				>
					Remove
				</button>
			</SingleMap>
		</div>
		<button @click="maps.push(Symbol())" class="add">Add</button>
	</div>
</template>

<style scoped>
.content {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
}

.remove {
	align-self: center;
}

.add {
	height: fit-content;
	margin: 2em;
}
</style>

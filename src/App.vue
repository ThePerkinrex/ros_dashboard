<script setup lang="ts">
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { computed, provide, ref, watch } from 'vue'
import ConnectionStatusImage from './components/ConnectionStatusImage.vue'
import Tabs from './components/tabs/Tabs.vue'
import ParametersTabTitle from './components/tabs/parameters/ParametersTabTitle.vue'
import ParametersTab from './components/tabs/parameters/ParametersTab.vue'
import PlotsTabTitle from './components/tabs/plots/PlotsTabTitle.vue'
import PlotsTab from './components/tabs/plots/PlotsTab.vue'
import EmergencyBrake from './components/EmergencyBrake.vue'
import PolarPlotsTabTitle from './components/tabs/polarPlots/PolarPlotsTabTitle.vue'
import PolarPlotsTab from './components/tabs/polarPlots/PolarPlotsTab.vue'
import MapTabTitle from './components/tabs/map/MapTabTitle.vue'
import MapTab from './components/tabs/map/MapTab.vue'
import PathTabTitle from './components/tabs/path/PathTabTitle.vue'
import PathTab from './components/tabs/path/PathTab.vue'

const ros = new Ros()

const url = ref('ws://localhost:9090')
</script>

<template>
	<div class="main">
		<header>
			<div class="connection">
				<label for="ros-url">ROS URL: </label>
				<input type="url" v-model="url" id="ros-url" />
				<button @click="ros.setURL(url)">Connect</button>
				<ConnectionStatusImage :connection-status="connection_status" />
			</div>
			<EmergencyBrake />
		</header>

		<main>
			<Tabs
				:tabs="[
					{ title: ParametersTabTitle, content: ParametersTab },
					{ title: PlotsTabTitle, content: PlotsTab },
					{ title: PolarPlotsTabTitle, content: PolarPlotsTab },
					{ title: MapTabTitle, content: MapTab },
					{ title: PathTabTitle, content: PathTab },
				]"
			/>
		</main>
	</div>
</template>

<style scoped>
header {
	border-bottom: 2px solid black;
	padding: 1rem;
	display: flex;
	flex-direction: row;
	gap: 1em;
}
.connection {
	display: flex;
	flex-direction: row;
	gap: 0.5em;
}

.main {
	display: flex;
	flex-direction: column;
	height: 100%;
}

main {
	flex-grow: 1;
}
</style>

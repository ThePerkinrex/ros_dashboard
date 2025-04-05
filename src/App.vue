<script setup lang="ts">
import { connection_status, ConnectionStatus, Ros } from '@/ros/ros'
import { computed, provide, ref, watch } from 'vue'
import ConnectionStatusImage from './components/ConnectionStatusImage.vue'
import Tabs from './components/tabs/Tabs.vue'
import ParametersTabTitle from './components/tabs/parameters/ParametersTabTitle.vue'
import ParametersTab from './components/tabs/parameters/ParametersTab.vue'
import PlotsTabTitle from './components/tabs/plots/PlotsTabTitle.vue'
import PlotsTab from './components/tabs/plots/PlotsTab.vue'

const ros = new Ros()

const url = ref('ws://localhost:9090')
ros.setURL(url.value)

watch(url, ros.setURL)
</script>

<template>
	<div class="main">
		<header>
			<label for="ros-url">ROS URL: </label>
			<input type="url" v-model="url" id="ros-url" />
			<ConnectionStatusImage :connection-status="connection_status" />
		</header>

		<main>
			<Tabs
				:tabs="[
					{ title: ParametersTabTitle, content: ParametersTab },
					{ title: PlotsTabTitle, content: PlotsTab },
				]"
			/>
		</main>
	</div>
</template>

<style scoped>
header {
	border-bottom: 2px solid black;
	padding: 1rem;
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

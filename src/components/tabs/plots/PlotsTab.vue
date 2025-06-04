<script setup lang="ts">
import { ref } from 'vue'
import Plot from './Plot.vue'
import { rgbColors } from '@/util/color'

const plots = ref([Symbol()])
const colorGen = rgbColors()
</script>

<template>
	<div class="content">
		<div v-for="k in plots" :key="k" class="plot">
			<Plot :color-generator="colorGen">
				<button
					@click="plots.splice(plots.indexOf(k), 1)"
					:disabled="plots.length <= 1"
					class="remove"
				>
					Remove
				</button>
			</Plot>
		</div>
		<button @click="plots.push(Symbol())" class="add">Add</button>
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

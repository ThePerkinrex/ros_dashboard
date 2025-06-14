<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as yaml from 'js-yaml'
import { PathCanvas } from '@/path/path_canvas'
import { PathDrawer } from '@/path/path_drawer'

interface MapYaml {
	freeThres: number
	image: string
	mode: string
	negate: number
	occupied_thresh: number
	origin: [number, number, number]
	resolution: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const pathCanvas = new PathCanvas(canvasRef, containerRef)
let pathDrawer: PathDrawer | null = new PathDrawer(pathCanvas)

onMounted(() => {
	window.addEventListener('resize', () => {
		console.log('Resize')
		pathCanvas.redraw()
	})
})
</script>

<template>
	<div class="main" ref="containerRef">
		<div class="inputs">
			<label>
				Load YAML:
				<input
					type="file"
					@change="pathCanvas.handleYamlChange"
					accept=".yml,.yaml"
				/>
			</label>
			<label>
				Load Image:
				<input
					type="file"
					@change="pathCanvas.handleImageChange"
					accept="image/*,.pgm"
				/>
			</label>
		</div>
		<canvas ref="canvasRef" class="image-canvas"></canvas>
	</div>
</template>

<style scoped>
.main {
	padding: 2rem;
	width: 100%;
	height: 100%;
	position: relative;
}
.inputs {
	margin-bottom: 1rem;
	display: flex;
	gap: 1rem;
}
.image-canvas {
	display: block;
	margin: 0 auto;
}
</style>

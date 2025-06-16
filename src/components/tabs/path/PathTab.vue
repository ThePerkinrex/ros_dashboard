<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as yaml from 'js-yaml'
import { PathCanvas } from '@/path/path_canvas'
import { PathDrawer } from '@/path/path_drawer'
import type { SampledPathPreview } from '@/path/sampled_path_preview'

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
const sampled = ref<SampledPathPreview | null>(null)

const pathCanvas = new PathCanvas(canvasRef, containerRef)
const pathDrawer: PathDrawer = new PathDrawer(pathCanvas)
let observer: IntersectionObserver

// Handle loading a path from JSON file
function handlePathLoad(event: Event) {
	const files = (event.target as HTMLInputElement).files
	if (files && files.length) {
		const file = files[0]
		const reader = new FileReader()
		reader.onload = (ev) => {
			try {
				const json = JSON.parse(ev.target?.result as string)
				pathDrawer?.load(json)
			} catch (err) {
				console.error('Invalid path JSON', err)
			}
		}
		reader.readAsText(file)
	}
}

// Handle saving current path to a JSON file
function savePath() {
	if (!pathDrawer) return
	const data = pathDrawer.save()
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: 'application/json',
	})
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = 'path.json'
	link.click()
	URL.revokeObjectURL(url)
}
function clearPath() {
	if (!pathDrawer) return
	pathDrawer.load({ loopFinished: false, points: [] })
}

onMounted(async () => {
	window.addEventListener('resize', () => {
		pathCanvas.redraw()
	})
	window.addEventListener('beforeunload', () => {
		const p = pathDrawer.save()
		localStorage.setItem('mapPath', JSON.stringify(p))
	})

	observer = new IntersectionObserver(
		(entries) => {
			entries.forEach(async (entry) => {
				if (entry.isIntersecting) {
					// if you only want it once, you can unobserve here:
					observer.unobserve(entry.target)
					// component is now visible: do your load/redraw
					pathCanvas.onAfterLoadOrResize(() => {
						const savedPath = localStorage.getItem('mapPath')
						if (savedPath) {
							try {
								const p = JSON.parse(savedPath)
								pathDrawer.load(p)
							} catch {}
						}
						return false
					})
					pathCanvas.load()
				}
			})
		},
		{ root: null, threshold: 0.1 /* ≥10% visible*/ },
	)

	if (containerRef.value) {
		observer.observe(containerRef.value)
	}
})

onUnmounted(() => {
	const p = pathDrawer.save()
	localStorage.setItem('mapPath', JSON.stringify(p))
	observer.disconnect()
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
			<label>
				Load Path JSON:
				<input type="file" @change="handlePathLoad" accept=".json" />
			</label>
			<button @click="sampled = pathDrawer.asPath()">Sample</button>
			<button
				v-if="sampled !== null"
				@click="((sampled = null), pathDrawer.hideSampled())"
			>
				Hide
			</button>
			<button @click="savePath">Save Path</button>
			<button @click="clearPath">Clear Path</button>
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

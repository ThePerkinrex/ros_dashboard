<script setup lang="ts">
import { connection_status, ConnectionStatus } from '@/ros/ros'
import { RosService } from '@/ros/service'
import type { CircularBuffer } from '@/util'
import { computed, onMounted, ref, watch } from 'vue'

export type Timestamp = number

export type Point = {
	x: Timestamp
	y: number
}

export type PlotDataset = {
	data: CircularBuffer<Point>
	color: string
}

export type PlotDatasets = {
	//% Each timeseries should be ordered
	[name: string]: PlotDataset
}

export type PlotData = {
	timeLength?: number
	width?: number
	height?: number
}

const props = defineProps<PlotData>()

const canvas = ref<HTMLCanvasElement | null>(null)

const timeLength = computed(() => {
	return props.timeLength ?? 5.0
})

const update = (datasets: PlotDatasets) => {
	const c = canvas.value
	if (c === null || Object.keys(datasets).length === 0) return
	const ctx = c.getContext('2d')
	if (ctx === null) return
	let latestX = 0
	let maxY = -Infinity
	let minY = Infinity
	for (const name in datasets) {
		const dataset = datasets[name]
		if (dataset.data.size() === 0) continue
		const latestInDataset = dataset.data.get(dataset.data.size() - 1)
		if (latestInDataset.x > latestX) latestX = latestInDataset.x
		for (let i = dataset.data.size() - 1; i >= 0; i--) {
			const p = dataset.data.get(i)
			if (p.y < minY) minY = p.y
			else if (p.y > maxY) maxY = p.y
		}
	}
	if (maxY === -Infinity) return

	const minX = latestX - timeLength.value
	const diffX = latestX - minX
	const xRatio = canvas.value?.width! / diffX
	let diffY = maxY - minY
	if (diffY === 0) {
		maxY = 1.1
		minY = -0.1
		diffY = 1.2
	} else {
		maxY += diffY * 0.1
		minY -= diffY * 0.1
		diffY = maxY - minY
	}
	const yRatio = canvas.value?.height! / diffY
	const map = (p: Point): Point => ({
		x: (p.x - minX) * xRatio,
		y: (p.y - minY) * yRatio,
	})

	ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height)

	for (const name in datasets) {
		const dataset = datasets[name]
		if (dataset.data.size() === 0) continue
		const lastMapped = map(dataset.data.get(dataset.data.size() - 1))

		ctx.strokeStyle = dataset.color // 'rgb(255, 0, 0)'
		ctx.beginPath()
		ctx.moveTo(lastMapped.x, lastMapped.y)
		// console.log(lastMapped, map(dataset.data[0]))
		for (let i = dataset.data.size() - 2; i >= 0; i--) {
			const p = dataset.data.get(i)
			if (p.x < minX) {
				// console.log(name, i, p.x, p.y, map(p))
				dataset.data.removeUpTo(i)
				break
			}
			const mapped = map(p)
			ctx.lineTo(mapped.x, mapped.y)
		}
		ctx.stroke()
	}
}

defineExpose({ update })

// watch([props.datasets, canvas], ([datasets, c]) => {
// 	if (c !== null && Object.keys(datasets).length > 0) {
// 		const ctx = c.getContext('2d')
// 		if (ctx === null) return
// 		let latestX = 0
// 		let maxY = -Infinity
// 		let minY = Infinity
// 		for (const name in datasets) {
// 			const dataset = datasets[name]
// 			if (dataset.data.length === 0) continue
// 			const latestInDataset = dataset.data[dataset.data.length - 1]
// 			if (latestInDataset.x > latestX) latestX = latestInDataset.x
// 			for (let i = dataset.data.length - 1; i >= 0; i--) {
// 				const p = dataset.data[i]
// 				if (p.y < minY) minY = p.y
// 				else if (p.y > maxY) maxY = p.y
// 			}
// 		}
// 		if (maxY === -Infinity) return

// 		const minX = latestX - timeLength.value
// 		const diffX = latestX - minX
// 		const xRatio = canvas.value?.width! / diffX
// 		let diffY = maxY - minY
// 		if (diffY === 0) {
// 			maxY = 1.1
// 			minY = -0.1
// 			diffY = 1.2
// 		} else {
// 			maxY += diffY * 0.1
// 			minY -= diffY * 0.1
// 			diffY = maxY - minY
// 		}
// 		const yRatio = canvas.value?.height! / diffY
// 		const map = (p: Point): Point => ({
// 			x: (p.x - minX) * xRatio,
// 			y: (p.y - minY) * yRatio,
// 		})

// 		ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height)

// 		for (const name in datasets) {
// 			const dataset = datasets[name]
// 			if (dataset.data.length === 0) continue
// 			let deleting = false
// 			const lastMapped = map(dataset.data[dataset.data.length - 1])

// 			ctx.strokeStyle = dataset.color // 'rgb(255, 0, 0)'
// 			ctx.beginPath()
// 			ctx.moveTo(lastMapped.x, lastMapped.y)
// 			// console.log(lastMapped, map(dataset.data[0]))
// 			for (let i = dataset.data.length - 2; i >= 0; i--) {
// 				if (deleting) {
// 					dataset.data.splice(i, 1)
// 					continue
// 				}
// 				const p = dataset.data[i]
// 				if (p.x < minX) {
// 					// console.log(name, i, p.x, p.y, map(p))
// 					dataset.data.splice(i, 1)
// 					deleting = true
// 					continue
// 				}
// 				const mapped = map(p)
// 				ctx.lineTo(mapped.x, mapped.y)
// 			}
// 			ctx.stroke()
// 		}
// 	}
// })
</script>

<template>
	<canvas
		ref="canvas"
		:width="props.width ?? 600"
		:height="props.height ?? 400"
	></canvas>
</template>

<style scoped>
canvas {
	background-color: white;
}
</style>

<script setup lang="ts">
import { connection_status, ConnectionStatus } from '@/ros/ros'
import { RosService } from '@/ros/service'
import type { CircularBuffer } from '@/util'
import { computed, onMounted, ref, watch } from 'vue'
import Graph, { type ExposedGraph, type GraphDataset } from './Graph.vue'

const COLOR_NON_SIGNIFICANT = 'rgb(30,30,30)'
const COLOR_SIGNIFICANT = 'rgb(50,50,50)'
const COLOR_TICK_TEXT = 'rgb(240,240,240)'

export type Timestamp = number

export type Point = {
	x: Timestamp
	y: number
}

export type PlotDataset = {
	data: CircularBuffer<Point>
	color: string
}

type ExtendedPlotDataset = PlotDataset & GraphDataset

export type PlotDatasets<D extends PlotDataset = PlotDataset> = {
	//% Each timeseries should be ordered
	[name: string]: D
}

export type PlotData = {
	timeLength?: number
	width?: number
	height?: number
}

const props = defineProps<PlotData>()

const graph = ref<ExposedGraph<ExtendedPlotDataset> | null>(null)

const timeLength = computed(() => {
	return props.timeLength ?? 5.0
})

const marginLeft = ref<number>(0)
const legendStyle = computed(() => ({ left: `${marginLeft}px` }))

let preparedData = {
	latestX: 0,
	maxY: -Infinity,
	minY: Infinity,
	minX: 0,
	map: (p: Point): Point => p,
}

const prepare = (ctx: CanvasRenderingContext2D) => {
	ctx.textBaseline = 'middle'
	ctx.font = '12px sans-serif'
	preparedData = {
		latestX: 0,
		maxY: -Infinity,
		minY: Infinity,
		minX: 0,
		map: (p: Point): Point => p,
	}
}

const prepareDataset = (name: string, dataset: ExtendedPlotDataset) => {
	const latestInDataset = dataset.data.get(dataset.data.size() - 1)
	if (latestInDataset.x > preparedData.latestX)
		preparedData.latestX = latestInDataset.x
	for (let i = dataset.data.size() - 1; i >= 0; i--) {
		const p = dataset.data.get(i)
		if (p.y < preparedData.minY) preparedData.minY = p.y
		else if (p.y > preparedData.maxY) preparedData.maxY = p.y
	}
}

const drawBackground = (ctx: CanvasRenderingContext2D) => {
	let diffY = preparedData.maxY - preparedData.minY
	if (diffY === 0) {
		preparedData.maxY = 1.1
		preparedData.minY = -0.1
		diffY = 1.2
	} else {
		preparedData.maxY += diffY * 0.1
		preparedData.minY -= diffY * 0.1
		diffY = preparedData.maxY - preparedData.minY
	}
	const height = graph.value!.height
	const yRatio = height / diffY
	const yTicks = getYTicks(diffY, preparedData.minY, preparedData.maxY, ctx)

	const margin = 10
	const baseX = yTicks.longestTickTextWidth + margin

	if (marginLeft.value != baseX) {
		marginLeft.value = baseX
	}

	const minX = preparedData.latestX - timeLength.value

	const diffX = preparedData.latestX - minX
	const xRatio = (graph.value!.width - baseX) / diffX

	const map = (p: Point): Point => ({
		x: (p.x - minX) * xRatio + baseX,
		y: height - (p.y - preparedData.minY) * yRatio,
	})

	preparedData.minX = minX

	ctx.lineWidth = 1
	for (const tick of yTicks.ticks) {
		ctx.strokeStyle = tick.significant
			? COLOR_SIGNIFICANT
			: COLOR_NON_SIGNIFICANT
		const mapped = map({ x: 0, y: tick.y })
		ctx.beginPath()
		ctx.moveTo(baseX, mapped.y)
		ctx.lineTo(graph.value!.width, mapped.y)
		ctx.stroke()
		if (tick.significant) {
			ctx.fillStyle = COLOR_TICK_TEXT
			ctx.fillText(tick.text, 5, mapped.y)
		}
	}

	preparedData.map = map
}

const update = (datasets: PlotDatasets) => {
	const g = graph.value
	if (g !== null) {
		const newDatasets: PlotDatasets<ExtendedPlotDataset> = {}
		for (const name in datasets) {
			newDatasets[name] = {
				...datasets[name],
				*getDataPoints() {
					for (let i = this.data.size() - 1; i >= 0; i--) {
						const p = this.data.get(i)
						if (p.x < preparedData.minX) {
							// console.log(name, i, p.x, p.y, map(p))
							this.data.removeUpTo(i)
							break
						}
						yield preparedData.map(p)
					}
				},
				isEmpty() {
					return this.data.size() === 0
				},
			}
		}
		g.update(newDatasets)
	}

	// const c = canvas.value
	// const datasetsLength = Object.keys(datasets).length
	// if (c === null || datasetsLength === 0) return
	// const ctx = c.getContext('2d')
	// if (ctx === null) return

	// for (const name in datasets) {
	// 	const dataset = datasets[name]
	// 	newLegend[legendI++] = { name, color: dataset.color }
	// 	if (dataset.data.size() === 0) continue
	// 	const latestInDataset = dataset.data.get(dataset.data.size() - 1)
	// 	if (latestInDataset.x > latestX) latestX = latestInDataset.x
	// 	for (let i = dataset.data.size() - 1; i >= 0; i--) {
	// 		const p = dataset.data.get(i)
	// 		if (p.y < minY) minY = p.y
	// 		else if (p.y > maxY) maxY = p.y
	// 	}
	// }

	// newLegend.sort((a, b) => a.name.localeCompare(b.name))
	// if (!compareLegends(legend.value, newLegend)) {
	// 	legend.value = newLegend // Only update if they're really different
	// }

	// if (maxY === -Infinity) return

	// let diffY = maxY - minY
	// if (diffY === 0) {
	// 	maxY = 1.1
	// 	minY = -0.1
	// 	diffY = 1.2
	// } else {
	// 	maxY += diffY * 0.1
	// 	minY -= diffY * 0.1
	// 	diffY = maxY - minY
	// }
	// const yRatio = canvas.value?.height! / diffY
	// const yTicks = getYTicks(diffY, minY, maxY, ctx)

	// const margin = 10
	// const baseX = yTicks.longestTickTextWidth + margin

	// if (marginLeft.value != baseX) {
	// 	marginLeft.value = baseX
	// }

	// const minX = latestX - timeLength.value
	// const diffX = latestX - minX
	// const xRatio = (canvas.value?.width! - baseX) / diffX

	// const map = (p: Point): Point => ({
	// 	x: (p.x - minX) * xRatio + baseX,
	// 	y: canvas.value?.height! - (p.y - minY) * yRatio,
	// })

	// ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height)

	// ctx.lineWidth = 1
	// for (const tick of yTicks.ticks) {
	// 	ctx.strokeStyle = tick.significant
	// 		? COLOR_SIGNIFICANT
	// 		: COLOR_NON_SIGNIFICANT
	// 	const mapped = map({ x: 0, y: tick.y })
	// 	ctx.beginPath()
	// 	ctx.moveTo(baseX, mapped.y)
	// 	ctx.lineTo(canvas.value?.width!, mapped.y)
	// 	ctx.stroke()
	// 	if (tick.significant) {
	// 		ctx.fillStyle = COLOR_TICK_TEXT
	// 		ctx.fillText(tick.text, 5, mapped.y)
	// 	}
	// }

	// ctx.lineWidth = 1
	// for (const name in datasets) {
	// 	const dataset = datasets[name]
	// 	if (dataset.data.size() === 0) continue
	// 	const lastMapped = map(dataset.data.get(dataset.data.size() - 1))

	// 	ctx.strokeStyle = dataset.color // 'rgb(255, 0, 0)'
	// 	ctx.beginPath()
	// 	ctx.moveTo(lastMapped.x, lastMapped.y)
	// 	// console.log(lastMapped, map(dataset.data[0]))
	// 	for (let i = dataset.data.size() - 2; i >= 0; i--) {
	// 		const p = dataset.data.get(i)
	// 		if (p.x < minX) {
	// 			// console.log(name, i, p.x, p.y, map(p))
	// 			dataset.data.removeUpTo(i)
	// 			break
	// 		}
	// 		const mapped = map(p)
	// 		ctx.lineTo(mapped.x, mapped.y)
	// 	}
	// 	ctx.stroke()
	// }
}

defineExpose({ update })

type TickMark = { y: number } & (
	| { significant: true; text: string }
	| { significant: false }
)

function getYTicks(
	diffY: number,
	minY: number,
	maxY: number,
	ctx: CanvasRenderingContext2D,
): { ticks: TickMark[]; longestTickTextWidth: number } {
	// Determine the order of magnitude for the overall range.
	const msd = Math.floor(Math.log10(diffY))
	const dec_digits = Math.min(Math.max(0, -msd), 10)
	// console.log(diffY, msd, dec_digits)
	// The minor tick spacing is one order of magnitude smaller.
	const sd = msd - 1

	// Compute step sizes for minor and major ticks.
	const minorStep = Math.pow(10, sd)
	const majorStep = Math.pow(10, msd)

	const ticks: TickMark[] = []
	// A small epsilon to counter floating-point precision issues.
	const epsilon = minorStep * 1e-6

	// Start at the first tick that is at or above minY.
	let startTick = Math.ceil(minY / minorStep) * minorStep
	let longestTickTextWidth = 0

	// Generate ticks from startTick up to maxY (inclusive).
	for (let tick = startTick; tick <= maxY + epsilon; tick += minorStep) {
		// Round to avoid floating point imprecision.
		const currentTick = Math.round(tick / minorStep) * minorStep
		// A tick is significant if it aligns with a multiple of majorStep.
		const isSignificant =
			Math.abs(
				currentTick / majorStep - Math.round(currentTick / majorStep),
			) < epsilon
		if (isSignificant) {
			const text = currentTick.toFixed(dec_digits)
			const len = ctx.measureText(text).width
			if (len > longestTickTextWidth) longestTickTextWidth = len
			ticks.push({ y: currentTick, significant: isSignificant, text })
		} else {
			ticks.push({ y: currentTick, significant: isSignificant })
		}
	}

	return { ticks, longestTickTextWidth }
}
</script>

<template>
	<Graph
		:height="props.height"
		:width="props.width"
		:legend-style="legendStyle"
		:draw-background="drawBackground"
		:prepare="prepare"
		:prepare-dataset="prepareDataset"
		ref="graph"
	/>
</template>

<style scoped>
.content {
	position: relative;
	font-size: small;
	border: 1px solid gray;
	padding: 0.5em;
}

.legend {
	position: absolute;
	top: 0;
	left: 0;
	margin: 0.5em;
	padding: 0.1em 0.1em;
	border: 1px solid white;
	background-color: #fff2;
	display: flex;
	flex-direction: column;
	gap: 0.25em;
	align-items: start;
}

.legend-item {
	display: flex;
	flex-direction: row;
	gap: 0.5em;
	align-items: center;
	margin: 0 0.5em;
}

.legend-box {
	width: 0.7em;
	height: 0.7em;
}
</style>

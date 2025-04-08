<script setup lang="ts">
import { connection_status, ConnectionStatus } from '@/ros/ros'
import { RosService } from '@/ros/service'
import type { CircularBuffer } from '@/util'
import { computed, onMounted, ref, watch } from 'vue'

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

const marginLeft = ref<number>(0)

type LegendItem = { name: string; color: string }

const legend = ref<LegendItem[]>([])

const update = (datasets: PlotDatasets) => {
	const c = canvas.value
	const datasetsLength = Object.keys(datasets).length
	if (c === null || datasetsLength === 0) return
	const ctx = c.getContext('2d')
	if (ctx === null) return

	const newLegend = new Array<LegendItem>(datasetsLength)

	ctx.textBaseline = 'middle'
	ctx.font = '12px sans-serif'

	let latestX = 0
	let maxY = -Infinity
	let minY = Infinity
	let legendI = 0
	for (const name in datasets) {
		const dataset = datasets[name]
		newLegend[legendI++] = { name, color: dataset.color }
		if (dataset.data.size() === 0) continue
		const latestInDataset = dataset.data.get(dataset.data.size() - 1)
		if (latestInDataset.x > latestX) latestX = latestInDataset.x
		for (let i = dataset.data.size() - 1; i >= 0; i--) {
			const p = dataset.data.get(i)
			if (p.y < minY) minY = p.y
			else if (p.y > maxY) maxY = p.y
		}
	}

	newLegend.sort((a, b) => a.name.localeCompare(b.name))
	if (!compareLegends(legend.value, newLegend)) {
		legend.value = newLegend // Only update if they're really different
	}

	if (maxY === -Infinity) return

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
	const yTicks = getYTicks(diffY, minY, maxY, ctx)

	const margin = 10
	const baseX = yTicks.longestTickTextWidth + margin

	if (marginLeft.value != baseX) {
		marginLeft.value = baseX
	}

	const minX = latestX - timeLength.value
	const diffX = latestX - minX
	const xRatio = (canvas.value?.width! - baseX) / diffX

	const map = (p: Point): Point => ({
		x: (p.x - minX) * xRatio + baseX,
		y: canvas.value?.height! - (p.y - minY) * yRatio,
	})

	ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height)

	ctx.lineWidth = 1
	for (const tick of yTicks.ticks) {
		ctx.strokeStyle = tick.significant
			? COLOR_SIGNIFICANT
			: COLOR_NON_SIGNIFICANT
		const mapped = map({ x: 0, y: tick.y })
		ctx.beginPath()
		ctx.moveTo(baseX, mapped.y)
		ctx.lineTo(canvas.value?.width!, mapped.y)
		ctx.stroke()
		if (tick.significant) {
			ctx.fillStyle = COLOR_TICK_TEXT
			ctx.fillText(tick.text, 5, mapped.y)
		}
	}

	ctx.lineWidth = 1
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
	const dec_digits = Math.max(0, -msd)
	console.log(diffY, msd, dec_digits)
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

// Assumes they're sorted
function compareLegends(legend1: LegendItem[], legend2: LegendItem[]): boolean {
	if (legend1.length != legend2.length) return false
	for (let i = 0; i < legend1.length; i++) {
		const i1 = legend1[i]
		const i2 = legend2[i]
		if (i1.name != i2.name || i1.color != i2.color) return false
	}
	return true
}
</script>

<template>
	<div class="content">
		<canvas
			ref="canvas"
			:width="props.width ?? 600"
			:height="props.height ?? 400"
		></canvas>
		<div
			class="legend"
			:style="{ left: `${marginLeft}px` }"
			v-if="legend.length > 0"
		>
			<div class="legend-item" v-for="i in legend">
				<div
					class="legend-box"
					:style="{ backgroundColor: i.color }"
				></div>
				<span class="legend-name">{{ i.name }}</span>
			</div>
		</div>
	</div>
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

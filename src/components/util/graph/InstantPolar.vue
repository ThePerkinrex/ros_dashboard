<script setup lang="ts">
import { connection_status, ConnectionStatus } from '@/ros/ros'
import { RosService } from '@/ros/service'
import type { CircularBuffer } from '@/util'
import { computed, onMounted, ref, watch } from 'vue'
import Graph, {
	type ExposedGraph,
	type GraphDataset,
	type RegularColor,
	type Theme,
} from './Graph.vue'

const MARGIN_LABEL = 4

export type Angle = number

export type PolarPoint = {
	angle_idx: number
	radius: number
}

export type PlotDataset = {
	data: Array<PolarPoint>
	color: RegularColor
}

type ExtendedPlotDataset = PlotDataset & GraphDataset

export type PlotDatasets<D extends PlotDataset = PlotDataset> = {
	//% Each timeseries should be ordered
	[name: string]: D
}

export type PlotData = {
	minAngle: Angle
	maxAngle: Angle
	width?: number
	height?: number
}

const props = defineProps<PlotData>()

const graph = ref<ExposedGraph<ExtendedPlotDataset> | null>(null)

const marginLeft = ref<number>(0)
const legendStyle = computed(() => ({ left: `${marginLeft}px` }))

const DEFAULT_PREPARED_DATA = () => ({
	maxRadius: 1,
	minRadius: 0.1,
	minAngle: 0,
	angleDiff: Math.PI * 2,
	map: (p: PolarPoint, angleIncr: number): { x: number; y: number } => ({
		x: p.radius * Math.cos(p.angle_idx * angleIncr),
		y: p.radius * Math.sin(p.angle_idx * angleIncr),
	}),
})

let preparedData = DEFAULT_PREPARED_DATA()

const prepare = (ctx: CanvasRenderingContext2D) => {
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.font = '11px sans-serif'
	const minAngle = props.minAngle
	const angleDiff = props.maxAngle - minAngle
	preparedData = { ...DEFAULT_PREPARED_DATA(), minAngle, angleDiff }
}

const prepareDataset = (name: string, dataset: ExtendedPlotDataset) => {
	let newMaxRadius = 0
	let newMinRadius = 0
	for (let i = dataset.data.length - 1; i >= 0; i--) {
		const p = dataset.data[i]
		if (p.radius > newMaxRadius) newMaxRadius = p.radius
		if (p.radius > newMinRadius) newMinRadius = p.radius
	}
	if (newMaxRadius > 0 && newMaxRadius > preparedData.maxRadius)
		preparedData.maxRadius = newMaxRadius
	if (newMinRadius > 0 && newMinRadius < preparedData.minRadius)
		preparedData.minRadius = newMinRadius
}

const drawBackground = (ctx: CanvasRenderingContext2D, theme: Theme) => {
	preparedData.maxRadius += preparedData.maxRadius * 0.1

	const height = graph.value!.height
	const width = graph.value!.width

	const minSize = Math.min(width, height)

	const ratio = minSize / (2 * preparedData.maxRadius)

	const minAngle = preparedData.minAngle

	const centerX = width / 2
	const centerY = height / 2

	const map = (
		p: PolarPoint,
		angleIncr: number,
	): { x: number; y: number } => {
		const r = p.radius * ratio
		const theta = angleIncr * p.angle_idx + minAngle - Math.PI / 2
		return {
			x: -r * Math.cos(theta) + centerX,
			y: r * Math.sin(theta) + centerY,
		}
	}

	ctx.fillStyle = theme.COLOR_SIGNIFICANT
	ctx.beginPath()
	ctx.arc(centerX, centerY, 2, 0, Math.PI * 2)
	ctx.fill()

	ctx.lineWidth = 1
	// TODO Create ticks

	const minRadius = preparedData.minRadius
	const maxRadius = preparedData.maxRadius
	const diffRadius = maxRadius - minRadius
	const ticks = getRadiusTicks(diffRadius, minRadius, maxRadius, ctx)
	// console.log(ticks)

	for (const tick of ticks) {
		ctx.strokeStyle = tick.significant
			? theme.COLOR_SIGNIFICANT
			: theme.COLOR_NON_SIGNIFICANT
		const r = tick.radius * ratio
		ctx.beginPath()
		ctx.arc(centerX, centerY, r, 0, Math.PI * 2)
		ctx.stroke()
	}

	for (const tick of ticks) {
		if (tick.significant) {
			const r = tick.radius * ratio
			const metrics = ctx.measureText(tick.text)
			const y = centerY + r
			ctx.clearRect(
				centerX - metrics.actualBoundingBoxLeft - MARGIN_LABEL,
				y - metrics.actualBoundingBoxAscent - MARGIN_LABEL,
				metrics.actualBoundingBoxLeft +
					metrics.actualBoundingBoxRight +
					MARGIN_LABEL * 2,
				metrics.actualBoundingBoxAscent +
					metrics.actualBoundingBoxDescent +
					MARGIN_LABEL * 2,
			)
			ctx.fillStyle = theme.COLOR_TICK_TEXT
			ctx.fillText(tick.text, centerX, y)
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
					const angleIncr = preparedData.angleDiff / this.data.length
					for (let i = 0; i < this.data.length; i++) {
						const p = this.data[i]

						yield preparedData.map(p, angleIncr)
					}
				},
				isEmpty() {
					return this.data.length === 0
				},
			}
		}
		g.update(newDatasets)
	}
}

defineExpose({ update })

type TickMark = { radius: number } & (
	| { significant: true; text: string }
	| { significant: false }
)

function getRadiusTicks(
	diffRadius: number,
	minRadius: number,
	maxRadius: number,
	ctx: CanvasRenderingContext2D,
): TickMark[] {
	// Determine the order of magnitude for the overall range.
	const msd = Math.floor(Math.log10(diffRadius))
	const dec_digits = Math.max(0, -msd)
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
	let startTick = Math.ceil(minRadius / minorStep) * minorStep

	// Generate ticks from startTick up to maxY (inclusive).
	for (let tick = startTick; tick <= maxRadius + epsilon; tick += minorStep) {
		// Round to avoid floating point imprecision.
		const currentTick = Math.round(tick / minorStep) * minorStep
		// A tick is significant if it aligns with a multiple of majorStep.
		const isSignificant =
			Math.abs(
				currentTick / majorStep - Math.round(currentTick / majorStep),
			) < epsilon
		if (isSignificant) {
			const text = currentTick.toFixed(dec_digits)
			ticks.push({
				radius: currentTick,
				significant: isSignificant,
				text,
			})
		} else {
			ticks.push({ radius: currentTick, significant: isSignificant })
		}
	}

	return ticks
}
</script>

<template>
	<Graph
		:height="props.height ?? 400"
		:width="props.width ?? 400"
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

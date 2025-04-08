<script setup lang="ts" generic="D extends GraphDataset">
import { computed, ref, type Ref, type StyleValue } from 'vue'

export interface GraphPoint {
	x: number
	y: number
}

export interface GraphDataset {
	color: string
	getDataPoints(): Iterator<GraphPoint, void, undefined>
	isEmpty(): boolean
}

export type GraphDatasets<D extends GraphDataset> = {
	//% Each timeseries should be ordered
	[name: string]: D
}

export type Props<D extends GraphDataset> = {
	width?: number
	height?: number
	legendStyle?: StyleValue
	drawBackground(ctx: CanvasRenderingContext2D): void
	prepare(ctx: CanvasRenderingContext2D): void
	prepareDataset(name: string, dataset: D): void
}

export type ExposedGraph<D extends GraphDataset> = {
	width: Ref<number>
	height: Ref<number>
	update(datasets: GraphDatasets<D>): void
}

const props = defineProps<Props<D>>()

const canvas = ref<HTMLCanvasElement | null>(null)

type LegendItem = { name: string; color: string }

const legend = ref<LegendItem[]>([])

const update = (datasets: GraphDatasets<D>) => {
	const c = canvas.value
	const datasetsLength = Object.keys(datasets).length
	if (c === null || datasetsLength === 0) return
	const ctx = c.getContext('2d')
	if (ctx === null) return

	const newLegend = new Array<LegendItem>(datasetsLength)

	props.prepare(ctx)

	let validDatasets = 0
	let legendI = 0
	for (const name in datasets) {
		const dataset = datasets[name]
		newLegend[legendI++] = { name, color: dataset.color }
		if (dataset.isEmpty()) continue
		props.prepareDataset(name, dataset)
		validDatasets++
	}

	newLegend.sort((a, b) => a.name.localeCompare(b.name))
	if (!compareLegends(legend.value, newLegend)) {
		legend.value = newLegend // Only update if they're really different
	}

	if (validDatasets === 0) return

	ctx.clearRect(0, 0, width.value, height.value)

	props.drawBackground(ctx)

	ctx.lineWidth = 1
	for (const name in datasets) {
		const dataset = datasets[name]
		if (dataset.isEmpty()) continue

		const gen = dataset.getDataPoints()
		const startPoint = gen.next().value!
		// const lastMapped = map(dataset.data.get(dataset.data.size() - 1))

		ctx.strokeStyle = dataset.color // 'rgb(255, 0, 0)'
		ctx.beginPath()
		ctx.moveTo(startPoint.x, startPoint.y)
		// console.log(lastMapped, map(dataset.data[0]))
		for (let p = gen.next(); p.done !== true; p = gen.next()) {
			ctx.lineTo(p.value.x, p.value.y)
		}
		ctx.stroke()
	}
}

const width = computed(() => props.width ?? 600)
const height = computed(() => props.height ?? 400)

defineExpose<ExposedGraph<D>>({ update, width, height })
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
		<canvas ref="canvas" :width="width" :height="height"></canvas>
		<div class="legend" :style="props.legendStyle" v-if="legend.length > 0">
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

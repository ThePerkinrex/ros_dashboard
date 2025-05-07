<script setup lang="ts">
import { connection_status, ConnectionStatus } from '@/ros/ros'
import { RosService } from '@/ros/service'
import type { CircularBuffer } from '@/util'
import { computed, onMounted, ref, watch } from 'vue'
import Graph, {
	type ExposedGraph,
	type GraphDataset,
	type GraphDatasets,
	type Theme,
} from './Graph.vue'
import type OccupancyGrid from '@/ros/data/nav_msgs/OccupancyGrid'
import map from '@/util/map'

type Point = {
	x: number
	y: number
}

export type MapDataset = {
	map: OccupancyGrid
	color: string
}

type ExtendedMapDataset = MapDataset & GraphDataset

export type MapData = {
	width?: number
	height?: number
}

const props = defineProps<MapData>()

const graph = ref<ExposedGraph<ExtendedMapDataset> | null>(null)

let preparedData: {
	data: OccupancyGrid | undefined
	ratio: number
	map: (p: Point) => Point
} = {
	// latestX: 0,
	// maxY: -Infinity,
	// minY: Infinity,
	// minX: 0,
	data: undefined,
	ratio: 1,
	map: (p) => p,
}

const prepare = (ctx: CanvasRenderingContext2D) => {
	ctx.textBaseline = 'middle'
	ctx.font = '12px sans-serif'
	preparedData = {
		// latestX: 0,
		// maxY: -Infinity,
		// minY: Infinity,
		// minX: 0,
		ratio: 1,
		data: undefined,
		map: (p) => p,
	}
}

const prepareDataset = (name: string, dataset: ExtendedMapDataset) => {
	const g = graph.value
	if (name === 'map' && g !== null) {
		const hMap = dataset.map.info.height
		const wMap = dataset.map.info.width

		const h = g.height
		const w = g.width

		const hRatio = h / hMap
		const wRatio = w / wMap

		const minRatio = Math.min(hRatio, wRatio)

		preparedData.map = (p) => ({
			x: p.x * minRatio,
			y: (hMap - p.y) * minRatio,
		})
		preparedData.data = dataset.map
		preparedData.ratio = minRatio
	}
	// const latestInDataset = dataset.data.get(dataset.data.size() - 1)
	// if (latestInDataset.x > preparedData.latestX)
	// 	preparedData.latestX = latestInDataset.x
	// for (let i = dataset.data.size() - 1; i >= 0; i--) {
	// 	const p = dataset.data.get(i)
	// 	if (p.y < preparedData.minY) preparedData.minY = p.y
	// 	else if (p.y > preparedData.maxY) preparedData.maxY = p.y
	// }
}

const drawBackground = (ctx: CanvasRenderingContext2D, theme: Theme) => {
	const colorMap = map(
		0,
		100,
		theme.MAP_OCCUPANCY.not_occupied,
		theme.MAP_OCCUPANCY.occupied,
		-1,
	)
	if (preparedData.data !== undefined) {
		const mappedSize = preparedData.ratio
		for (let x = 0; x < preparedData.data.info.width; x++) {
			for (let y = 0; y < preparedData.data.info.height; y++) {
				const i = y * preparedData.data.info.height + x
				const prob = preparedData.data.data[i]
				const color = colorMap(prob)
				if (color === undefined) continue
				const mappedPoint = preparedData.map({ x, y })
				ctx.fillStyle = `rgb(${color}, ${color}, ${color})`
				ctx.fillRect(
					mappedPoint.x,
					mappedPoint.y,
					mappedSize,
					mappedSize,
				)
			}
		}
	}
	// let diffY = preparedData.maxY - preparedData.minY
	// if (diffY === 0) {
	// 	preparedData.maxY = 1.1
	// 	preparedData.minY = -0.1
	// 	diffY = 1.2
	// } else {
	// 	preparedData.maxY += diffY * 0.1
	// 	preparedData.minY -= diffY * 0.1
	// 	diffY = preparedData.maxY - preparedData.minY
	// }
	// const height = graph.value!.height
	// const yRatio = height / diffY
	// const yTicks = getYTicks(diffY, preparedData.minY, preparedData.maxY, ctx)
	// const margin = 10
	// const baseX = yTicks.longestTickTextWidth + margin
	// if (marginLeft.value != baseX) {
	// 	marginLeft.value = baseX
	// }
	// const minX = preparedData.latestX - timeLength.value
	// const diffX = preparedData.latestX - minX
	// const xRatio = (graph.value!.width - baseX) / diffX
	// const map = (p: Point): Point => ({
	// 	x: (p.x - minX) * xRatio + baseX,
	// 	y: height - (p.y - preparedData.minY) * yRatio,
	// })
	// preparedData.minX = minX
	// ctx.lineWidth = 1
	// for (const tick of yTicks.ticks) {
	// 	ctx.strokeStyle = tick.significant
	// 		? theme.COLOR_SIGNIFICANT
	// 		: theme.COLOR_NON_SIGNIFICANT
	// 	const mapped = map({ x: 0, y: tick.y })
	// 	ctx.beginPath()
	// 	ctx.moveTo(baseX, mapped.y)
	// 	ctx.lineTo(graph.value!.width, mapped.y)
	// 	ctx.stroke()
	// 	if (tick.significant) {
	// 		ctx.fillStyle = theme.COLOR_TICK_TEXT
	// 		ctx.fillText(tick.text, 5, mapped.y)
	// 	}
	// }
	// // — 4. Fixed-per-second vertical ticks (seconds ago) —
	// ctx.textBaseline = 'top'
	// ctx.textAlign = 'center'
	// const bottomMargin = 15
	// const totalSecs = Math.floor(timeLength.value)
	// for (let sAgo = 0; sAgo <= totalSecs; sAgo += 1) {
	// 	// X in canvas = baseX + (timeLength - sAgo) * xRatio
	// 	const xC = baseX + (timeLength.value - sAgo) * xRatio
	// 	// vertical line
	// 	ctx.strokeStyle = theme.COLOR_SIGNIFICANT
	// 	ctx.lineWidth = 1
	// 	ctx.beginPath()
	// 	ctx.moveTo(xC, 0)
	// 	ctx.lineTo(xC, height)
	// 	ctx.stroke()
	// 	// label = seconds ago
	// 	ctx.fillStyle = theme.COLOR_TICK_TEXT
	// 	ctx.fillText(`-${sAgo}s`, xC, height - bottomMargin)
	// }
	// preparedData.map = map
}

export interface MapDatasets {
	map: MapDataset
}

const update = (datasets: MapDatasets) => {
	console.log('UPdate', datasets)
	const g = graph.value
	if (g !== null) {
		g.update({
			map: {
				...datasets.map,
				*getDataPoints() {
					// for (let i = this.data.size() - 1; i >= 0; i--) {
					// 	const p = this.data.get(i)
					// 	if (p.x < preparedData.minX) {
					// 		// console.log(name, i, p.x, p.y, map(p))
					// 		this.data.removeUpTo(i)
					// 		break
					// 	}
					// 	yield preparedData.map(p)
					// }
					for (const x of [0, g.width]) {
						for (const y of [0, g.height]) {
							yield { x, y }
						}
					}
				},
				isEmpty() {
					return false
				},
			},
		})
	}
}

defineExpose({ update })
</script>

<template>
	<Graph
		:height="props.height ?? 800"
		:width="props.width ?? 800"
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

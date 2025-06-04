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
	type: 'map'
	map: OccupancyGrid
	color: string
}

export type TraceDataset = {
	type: 'trace'
	data: CircularBuffer<{ x: number; y: number; time: number }>
	color: string
}

type ExtendedMapDataset = MapDataset & GraphDataset
type ExtendedTraceDataset = TraceDataset & GraphDataset

export type MapData = {
	width?: number
	height?: number
}

const props = defineProps<MapData>()

const graph = ref<ExposedGraph<
	ExtendedMapDataset | ExtendedTraceDataset
> | null>(null)

let preparedData: {
	data: OccupancyGrid | undefined
	bg: { canvas: OffscreenCanvas; theme: Theme } | undefined
	ratio: number
	latestTime: number
	map: (p: Point) => Point
	map_ratio: (p: Point) => Point
} = {
	// latestX: 0,
	// maxY: -Infinity,
	// minY: Infinity,
	// minX: 0,
	bg: undefined,
	data: undefined,
	ratio: 1,
	latestTime: 0,
	map: (p) => p,
	map_ratio: (p) => p,
}

const prepare = (ctx: CanvasRenderingContext2D) => {
	ctx.textBaseline = 'middle'
	ctx.font = '12px sans-serif'
	preparedData = {
		// latestX: 0,
		// maxY: -Infinity,
		// minY: Infinity,
		// minX: 0,
		bg: undefined,
		ratio: 1,
		data: undefined,
		latestTime: 0,
		map: (p) => p,
		map_ratio: (p) => p,
	}
}

const triggerRedraw = () => {
	preparedData.bg = undefined // Trigger a redraw
}

const prepareDataset = (
	name: string,
	dataset: ExtendedMapDataset | ExtendedTraceDataset,
) => {
	const g = graph.value
	if (g !== null) {
		if (dataset.type == 'map') {
			const hMap = dataset.map.info.height
			const wMap = dataset.map.info.width

			const h = g.height
			const w = g.width

			const hRatio = h / hMap
			const wRatio = w / wMap

			const minRatio = Math.min(hRatio, wRatio)

			preparedData.map_ratio = (p) => ({
				x: p.x * minRatio,
				y: (hMap - p.y) * minRatio,
			})
			preparedData.map = (p) =>
				preparedData.map_ratio({
					x:
						(p.x - dataset.map.info.origin.position.x) /
						dataset.map.info.resolution,
					y:
						(p.y - dataset.map.info.origin.position.y) /
						dataset.map.info.resolution,
				})
			preparedData.data = dataset.map
			triggerRedraw()
			preparedData.ratio = minRatio
		} else {
			const latestInDataset = dataset.data.get(dataset.data.size() - 1)
			if (latestInDataset.time > preparedData.latestTime)
				preparedData.latestTime = latestInDataset.time
		}
	}
}

const drawBackground = (
	ctx: CanvasRenderingContext2D,
	theme: Theme,
	useCache: boolean = true,
) => {
	const colorMap = map(
		0,
		100,
		theme.MAP_OCCUPANCY.not_occupied,
		theme.MAP_OCCUPANCY.occupied,
		-1,
	)
	// if (preparedData.bg !== undefined) {
	// 	ctx.drawImage(preparedData.bg.canvas, 0, 0)
	// 	return
	// }
	if (
		(!useCache ||
			preparedData.bg === undefined ||
			preparedData.bg.theme != theme) &&
		preparedData.data !== undefined
	) {
		let ctxToUse: Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'> =
			ctx
		if (useCache) {
			const bg = new OffscreenCanvas(ctx.canvas.width, ctx.canvas.height)
			preparedData.bg = { canvas: bg, theme }
			const bgCtx = bg.getContext('2d')
			if (bgCtx === null) return
			ctxToUse = bgCtx
		}
		const mappedSize = preparedData.ratio
		for (let x = 0; x < preparedData.data.info.width; x++) {
			for (let y = 0; y < preparedData.data.info.height; y++) {
				const i = y * preparedData.data.info.width + x
				const prob = preparedData.data.data[i]
				const color = colorMap(prob)
				if (color === undefined) continue
				const mappedPoint = preparedData.map_ratio({ x, y })
				ctxToUse.fillStyle = `rgb(${color}, ${color}, ${color})`
				ctxToUse.fillRect(
					mappedPoint.x,
					mappedPoint.y,
					mappedSize,
					mappedSize,
				)
			}
		}
	}
	if (preparedData.bg !== undefined) {
		ctx.drawImage(preparedData.bg.canvas, 0, 0)
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

export type MapDatasets = {
	map: MapDataset
	traces: Record<string, TraceDataset>
}

const update = (datasets: MapDatasets) => {
	// console.log('UPdate', datasets, preparedData)
	const g = graph.value
	if (g !== null) {
		const update: GraphDatasets<ExtendedMapDataset | ExtendedTraceDataset> =
			{
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
			}
		for (const traceName in datasets.traces) {
			const trace = datasets.traces[traceName]
			update[traceName] = {
				...trace,
				*getDataPoints() {
					for (let i = this.data.size() - 1; i >= 0; i--) {
						const p = this.data.get(i)
						if (p.time < preparedData.latestTime - 20) {
							// console.log(
							// 	traceName,
							// 	i,
							// 	p.x,
							// 	p.y,
							// 	preparedData.map(p),
							// )
							this.data.removeUpTo(i)
							break
						}
						yield preparedData.map(p)
					}
					// for (const x of [0, g.width]) {
					// 	for (const y of [0, g.height]) {
					// 		yield { x, y }
					// 	}
					// }
				},
				isEmpty() {
					return trace.data.size() == 0
				},
			} as ExtendedTraceDataset
		}
		g.update(update)
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

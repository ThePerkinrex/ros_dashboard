<script setup lang="ts" generic="D extends GraphDataset">
import {
	computed,
	onMounted,
	onUnmounted,
	ref,
	type Ref,
	type StyleValue,
} from 'vue'
import C2S from 'canvas2svg'
import playIcon from '@/assets/icons/play.svg'
import pauseIcon from '@/assets/icons/pause.svg'
import { rgbToCSS, type RGB } from '@/util/color'

export interface GraphPoint {
	x: number
	y: number
	extra?: any
}
export interface RegularColor {
	color: RGB
	type: 'regular'
}

export interface TransparentColor {
	color: RGB
	type: 'transparent'
}

export type Color = RegularColor | TransparentColor

export interface GraphDataset {
	color: Color
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
	drawBackground(
		ctx: CanvasRenderingContext2D,
		theme: Theme,
		useCache?: boolean,
	): void
	prepare(ctx: CanvasRenderingContext2D): void
	prepareDataset(name: string, dataset: D): void
}

export type ExposedGraph<D extends GraphDataset> = {
	width: Ref<number>
	height: Ref<number>
	update(datasets: GraphDatasets<D>): void
}

export type Theme = {
	COLOR_NON_SIGNIFICANT: string
	COLOR_SIGNIFICANT: string
	COLOR_TICK_TEXT: string
	MAP_OCCUPANCY: {
		not_occupied: number
		occupied: number
	}
}

const DARK_THEME: Theme = {
	COLOR_NON_SIGNIFICANT: 'rgb(30,30,30)',
	COLOR_SIGNIFICANT: 'rgb(50,50,50)',
	COLOR_TICK_TEXT: 'rgb(240,240,240)',
	MAP_OCCUPANCY: {
		not_occupied: 0,
		occupied: 150,
	},
}

// Example light theme (customize as needed)
const LIGHT_THEME: Theme = {
	COLOR_NON_SIGNIFICANT: '#f0f0f0',
	COLOR_SIGNIFICANT: '#c0c0c0',
	COLOR_TICK_TEXT: '#333333',
	MAP_OCCUPANCY: {
		not_occupied: 255,
		occupied: 0,
	},
}

const props = defineProps<Props<D>>()

const canvas = ref<HTMLCanvasElement | null>(null)

// hold the latest datasets for SVG export
const lastDatasets = ref<GraphDatasets<D> | null>(null)

type LegendItem = { name: string; color: string }

const legend = ref<LegendItem[]>([])

const paused = ref<boolean>(false)

const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)

const isDragging = ref(false)
const lastMouse = ref({ x: 0, y: 0 })

function getLegendColor(color: Color): string {
	switch (color.type) {
		case 'transparent':
			return rgbToCSS({ ...color.color, a: 255 })
		case 'regular':
			return rgbToCSS({ ...color.color, a: 255 })
		default:
			break
	}
	throw new Error('Unexpected color type')
}

function getDatasetColoring(
	color: Exclude<Color, RegularColor>,
): (p: GraphPoint) => string {
	switch (color.type) {
		case 'transparent':
			return (p) => {
				return rgbToCSS({
					...color.color,
					a: (p.extra ?? {}).alpha ?? 1,
				})
			}
			break

		default:
			break
	}
	throw new Error('Unexpected color type')
}

function paintGraph(
	datasets: GraphDatasets<D>,
	ctx: CanvasRenderingContext2D,
	theme: Theme,
	datasetsLength?: number,
	useCache: boolean = true,
) {
	const newLegend = new Array<LegendItem>(
		datasetsLength ?? Object.keys(datasets).length,
	)

	props.prepare(ctx)

	let validDatasets = 0
	let legendI = 0
	for (const name in datasets) {
		const dataset = datasets[name]
		newLegend[legendI++] = { name, color: getLegendColor(dataset.color) }
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

	props.drawBackground(ctx, theme, useCache)

	ctx.lineWidth = 1
	for (const name in datasets) {
		const dataset = datasets[name]
		if (dataset.isEmpty()) continue

		const gen = dataset.getDataPoints()
		const next = gen.next()
		if (next.done) continue
		const startPoint = next.value
		// const lastMapped = map(dataset.data.get(dataset.data.size() - 1))

		if (dataset.color.type === 'regular') {
			ctx.strokeStyle = rgbToCSS(dataset.color.color) // 'rgb(255, 0, 0)'
			ctx.beginPath()
			ctx.moveTo(startPoint.x, startPoint.y)
			// console.log(lastMapped, map(dataset.data[0]))
			for (let p = gen.next(); p.done !== true; p = gen.next()) {
				ctx.lineTo(p.value.x, p.value.y)
			}
			ctx.stroke()
		} else {
			const coloring = getDatasetColoring(dataset.color)
			let prev = startPoint
			for (let p = gen.next(); p.done !== true; p = gen.next()) {
				ctx.strokeStyle = coloring(prev) // 'rgb(255, 0, 0)'
				ctx.beginPath()
				ctx.moveTo(prev.x, prev.y)
				ctx.lineTo(p.value.x, p.value.y)
				ctx.stroke()
				prev = p.value
			}
		}
	}
}

const update = (datasets: GraphDatasets<D>) => {
	const c = canvas.value
	const datasetsLength = Object.keys(datasets).length
	if (c === null || datasetsLength === 0) return
	const ctx = c.getContext('2d')
	if (ctx === null) return
	if (paused.value) return
	lastDatasets.value = datasets

	ctx.setTransform(1, 0, 0, 1, 0, 0)
	ctx.clearRect(0, 0, width.value, height.value)

	ctx.save()
	ctx.translate(offsetX.value, offsetY.value)
	ctx.scale(zoom.value, zoom.value)
	paintGraph(datasets, ctx, DARK_THEME, datasetsLength)
	ctx.restore()
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

function togglePlayPause() {
	paused.value = !paused.value
}

function save() {
	if (!lastDatasets.value) return
	const svgCtx = new C2S(width.value, height.value)

	paintGraph(lastDatasets.value, svgCtx, LIGHT_THEME, undefined, false)

	const svgString = svgCtx.getSerializedSvg()
	const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `graph-${new Date().toISOString()}.svg`
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

// ─── ZOOM / PAN HANDLERS ─────────────────────────────────

function clamp(v: number, min: number, max: number) {
	return v < min ? min : v > max ? max : v
}

function onWheel(event: WheelEvent) {
	event.preventDefault()
	if (!canvas.value) return
	const rect = canvas.value.getBoundingClientRect()
	const mouseX = event.clientX - rect.left
	const mouseY = event.clientY - rect.top

	const xInGraph = (mouseX - offsetX.value) / zoom.value
	const yInGraph = (mouseY - offsetY.value) / zoom.value

	const delta = -event.deltaY * 0.001
	const newZoom = clamp(zoom.value * (1 + delta), 0.1, 10)

	zoom.value = newZoom
	offsetX.value = mouseX - xInGraph * zoom.value
	offsetY.value = mouseY - yInGraph * zoom.value

	// if (lastDatasets.value) update(lastDatasets.value)
}

function onMouseDown(event: MouseEvent) {
	isDragging.value = true
	lastMouse.value = { x: event.clientX, y: event.clientY }
}

function onMouseMove(event: MouseEvent) {
	if (!isDragging.value) return
	const dx = event.clientX - lastMouse.value.x
	const dy = event.clientY - lastMouse.value.y
	lastMouse.value = { x: event.clientX, y: event.clientY }

	offsetX.value += dx
	offsetY.value += dy

	// if (lastDatasets.value) update(lastDatasets.value)
}

function onMouseUp() {
	isDragging.value = false
}

onMounted(() => {
	if (canvas.value) {
		canvas.value.addEventListener('wheel', onWheel, { passive: false })
		canvas.value.addEventListener('mousedown', onMouseDown)
		window.addEventListener('mousemove', onMouseMove)
		window.addEventListener('mouseup', onMouseUp)
	}
})

onUnmounted(() => {
	if (canvas.value) {
		canvas.value.removeEventListener('wheel', onWheel)
		canvas.value.removeEventListener('mousedown', onMouseDown)
		window.removeEventListener('mousemove', onMouseMove)
		window.removeEventListener('mouseup', onMouseUp)
	}
})
</script>

<template>
	<div class="content">
		<canvas ref="canvas" :width="width" :height="height"></canvas>
		<div class="controlbar overlay">
			<img
				:src="paused ? playIcon : pauseIcon"
				class="iconbutton"
				@click="togglePlayPause"
			/>
			<img
				src="@/assets/icons/save.svg"
				class="iconbutton"
				@click="save"
			/>
		</div>
		<div
			class="legend overlay"
			:style="props.legendStyle"
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

.overlay {
	margin: 0.5em;
	padding: 0.1em 0.1em;
	border: 1px solid white;
	background-color: #fff2;
}

.legend {
	position: absolute;
	top: 0;
	left: 0;
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

.content canvas:hover + .controlbar,
.content .controlbar:hover {
	position: absolute;
	top: 0;
	right: 0;
	display: flex;
	flex-direction: row;
	gap: 0.25em;
	align-items: center;
}

.controlbar {
	display: none;
}

.iconbutton {
	width: 1.8em;
	padding: 0.2em;
}
</style>

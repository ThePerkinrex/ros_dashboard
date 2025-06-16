import { type Ref, ref, watch } from 'vue'
import * as yaml from 'js-yaml'
import { KeyManager } from './key_manager'

interface MapYaml {
	freeThres: number
	image: string
	mode: string
	negate: number
	occupied_thresh: number
	origin: [number, number, number]
	resolution: number
}

type PointerEventHandler = (position: Point) => void

export interface IPathCanvas {
	getContext(): CanvasRenderingContext2D | null
	drawBackground(): void
	canvasToMap(x: number): number
	canvasToMap(p: Point): Point
	mapToCanvas(p: Point): Point
	onPointerDown(handler: PointerEventHandler): void
	onPointerUp(handler: PointerEventHandler): void
	onPointerMove(handler: PointerEventHandler): void
	onPointerEnter(handler: PointerEventHandler): void
	onPointerleave(handler: PointerEventHandler): void
	onBeforeLoadOrResize(handler: () => boolean): void
	onAfterLoadOrResize(handler: () => boolean): void
	getKeyManager(): KeyManager
}

function toPointerEvtHandler(
	canvas: HTMLCanvasElement,
	handler: PointerEventHandler,
): (evt: PointerEvent) => void {
	return (evt) => {
		const rect = canvas.getBoundingClientRect()
		handler({
			x: evt.clientX - rect.left,
			y: evt.clientY - rect.top,
		})
	}
}

export interface Point {
	x: number
	y: number
}

export class PathCanvas implements IPathCanvas {
	// reactive state
	public yamlContent = ref<MapYaml | null>(null)
	private pgmDataUrl = ref<string | null>(null)
	private imageUrl = ref<string | null>(null)

	// offscreen buffer for background (image + axes)
	private offscreenCanvas: HTMLCanvasElement | null = null
	private imgWidth = 0
	private imgHeight = 0
	private scale = 1
	private resolution = 1
	private origin: Point = { x: 0, y: 0 }
	private onAfterCanvasLoadOrResize: (() => boolean)[] = []
	private onBeforeCanvasLoadOrResize: (() => boolean)[] = []
	private hasRedrawn = false
	private keyManager = new KeyManager()

	constructor(
		private canvasRef: Ref<HTMLCanvasElement | null>,
		private containerRef: Ref<HTMLDivElement | null>,
	) {
		watch(
			[this.yamlContent, this.pgmDataUrl, this.imageUrl],
			() => this.redraw(),
			{ flush: 'post' },
		)

		document.addEventListener('keydown', (e) =>
			this.keyManager.onKeyDown(e),
		)
		document.addEventListener('keyup', (e) => this.keyManager.onKeyUp(e))
	}

	public load() {
		const yaml = localStorage.getItem('mapYaml')
		if (yaml !== null) {
			this.loadYamlString(yaml)
		}
		const pgm = localStorage.getItem('mapPgm')
		if (pgm !== null) {
			this.pgmDataUrl.value = pgm
		}
		const image = localStorage.getItem('mapImage')
		if (image !== null) {
			this.imageUrl.value = image
		}
	}

	getKeyManager(): KeyManager {
		return this.keyManager
	}

	onPointerDown(handler: PointerEventHandler): void {
		this.canvasRef.value!.addEventListener(
			'pointerdown',
			toPointerEvtHandler(this.canvasRef.value!, handler),
		)
	}
	onPointerUp(handler: PointerEventHandler): void {
		this.canvasRef.value!.addEventListener(
			'pointerup',
			toPointerEvtHandler(this.canvasRef.value!, handler),
		)
	}
	onPointerMove(handler: PointerEventHandler): void {
		this.canvasRef.value!.addEventListener(
			'pointermove',
			toPointerEvtHandler(this.canvasRef.value!, handler),
		)
	}
	onPointerEnter(handler: PointerEventHandler): void {
		this.canvasRef.value!.addEventListener(
			'pointerenter',
			toPointerEvtHandler(this.canvasRef.value!, handler),
		)
	}
	onPointerleave(handler: PointerEventHandler): void {
		this.canvasRef.value!.addEventListener(
			'pointerleave',
			toPointerEvtHandler(this.canvasRef.value!, handler),
		)
	}
	onBeforeLoadOrResize(handler: () => boolean): void {
		this.onBeforeCanvasLoadOrResize.push(handler)
	}
	onAfterLoadOrResize(handler: () => boolean): void {
		if (!(this.hasRedrawn && handler()))
			this.onAfterCanvasLoadOrResize.push(handler)
	}

	private scalarScaleCanvasToMap(x: number): number {
		return (x / this.scale) * this.resolution
	}

	public canvasToMap(p: number): number
	public canvasToMap(p: Point): Point
	public canvasToMap(p: Point | number): Point | number {
		if (typeof p === 'number') return this.scalarScaleCanvasToMap(p)
		return {
			x:
				(p.x / this.scale - this.imgWidth / 2 + this.origin.x) *
				this.resolution,
			y:
				(p.y / this.scale - this.imgHeight / 2 + this.origin.y) *
				this.resolution,
		}
	}

	mapToCanvas(p: Point): Point {
		console.log(this)
		return {
			x:
				(p.x / this.resolution + this.imgWidth / 2 - this.origin.x) *
				this.scale,
			y:
				(p.y / this.resolution + this.imgHeight / 2 - this.origin.y) *
				this.scale,
		}
	}

	private loadYamlString(s: string) {
		try {
			this.yamlContent.value = yaml.load(s) as MapYaml
			this.resolution = this.yamlContent.value.resolution
			this.origin = {
				x: this.yamlContent.value.origin[0],
				y: this.yamlContent.value.origin[1],
			}
			localStorage.setItem('mapYaml', s)
		} catch (err) {
			console.error('YAML parse error', err)
		}
	}

	public handleYamlChange(e: Event): void {
		const files = (e.target as HTMLInputElement).files
		if (!files?.[0]) return

		const reader = new FileReader()
		reader.onload = (evt) => {
			this.loadYamlString(evt.target?.result as string)
		}
		reader.readAsText(files[0])
	}

	public handleImageChange(e: Event): void {
		const file = (e.target as HTMLInputElement).files?.[0]
		if (!file) return

		const reader = new FileReader()
		reader.onload = () => {
			// will be something like "data:image/png;base64,...."
			const dataUrl = reader.result as string

			if (file.name.endsWith('.pgm')) {
				// store the PGM data URL
				this.pgmDataUrl.value = dataUrl
				localStorage.setItem('mapPgm', dataUrl)
			} else {
				// store the normal image data URL
				this.imageUrl.value = dataUrl
				localStorage.setItem('mapImage', dataUrl)
			}
		}

		// read everything as DataURL
		reader.readAsDataURL(file)
	}

	public getContext(): CanvasRenderingContext2D | null {
		const canvas = this.canvasRef.value
		if (!canvas) return null
		const ctx = canvas.getContext('2d')
		if (!ctx) return null
		ctx.setTransform(1, 0, 0, 1, 0, 0)
		return ctx
	}

	/**
	 * Main redraw: regenerate background buffer, then blit to visible canvas
	 */
	public async redraw(): Promise<void> {
		if (!this.yamlContent.value) return

		this.onBeforeCanvasLoadOrResize.filter((h) => h())
		await this.createBackground() // compute scale + set sizes once
		await this.drawBackground()
		this.hasRedrawn = true
		this.onAfterCanvasLoadOrResize.filter((h) => h())
	}

	/**
	 * Build or rebuild the offscreen canvas: draw image/PGM + axes and compute scale
	 */
	private async createBackground(): Promise<void> {
		const y = this.yamlContent.value!
		let width = 0,
			height = 0

		if (this.pgmDataUrl.value) {
			const pgm = await this.loadPGM(this.pgmDataUrl.value)
			width = pgm.width
			height = pgm.height
		} else if (this.imageUrl.value) {
			const img = await this.loadImageElement(this.imageUrl.value)
			width = img.width
			height = img.height
		} else return

		// Offscreen buffer
		if (
			!this.offscreenCanvas ||
			this.offscreenCanvas.width !== width ||
			this.offscreenCanvas.height !== height
		) {
			this.offscreenCanvas = document.createElement('canvas')
			this.offscreenCanvas.width = width
			this.offscreenCanvas.height = height
		}
		const offCtx = this.offscreenCanvas.getContext('2d')!
		offCtx.imageSmoothingEnabled = false
		offCtx.clearRect(0, 0, width, height)

		this.imgWidth = width
		this.imgHeight = height

		if (this.pgmDataUrl.value) {
			const pgm = await this.loadPGM(this.pgmDataUrl.value)
			const imgData = offCtx.createImageData(width, height)
			console.log(
				'pgm',
				pgm.pixels.length,
				pgm.pixels.length * 4,
				'image',
				imgData.data.length,
			)
			for (let i = 0; i < pgm.pixels.length; i++) {
				const v = pgm.pixels[i]
				imgData.data.set([v, v, v, 255], i * 4)
			}
			offCtx.putImageData(imgData, 0, 0)
		} else {
			const img = await this.loadImageElement(this.imageUrl.value!)
			offCtx.drawImage(img, 0, 0)
		}

		// draw axes
		const ox = Math.round(width / 2 + y.origin[0])
		const oy = Math.round(height / 2 + y.origin[1])
		offCtx.save()
		offCtx.translate(0.5, 0.5)
		offCtx.strokeStyle = '#71000088'
		offCtx.lineWidth = 1
		offCtx.beginPath()
		offCtx.moveTo(ox - 5, oy)
		offCtx.lineTo(ox + 5, oy)
		offCtx.stroke()
		offCtx.beginPath()
		offCtx.moveTo(ox, oy - 5)
		offCtx.lineTo(ox, oy + 5)
		offCtx.stroke()
		offCtx.restore()

		// ---- MOVE SCALE CALC & CANVAS RESIZE HERE ----
		const canvas = this.canvasRef.value!
		const container = this.containerRef.value!
		this.scale = Math.min(
			container.clientWidth / width,
			(window.innerHeight - canvas.clientTop) / height,
		)
		const w = Math.round(width * this.scale)
		const h = Math.round(height * this.scale)
		canvas.width = w
		canvas.height = h
		canvas.style.width = `${w}px`
		canvas.style.height = `${h}px`
	}

	/**
	 * Draw the prepared offscreen buffer onto the visible canvas
	 */
	public drawBackground(): void {
		if (!this.offscreenCanvas) return
		const ctx = this.getContext()
		if (!ctx) return
		// apply the precomputed scale
		ctx.scale(this.scale, this.scale)
		ctx.imageSmoothingEnabled = false
		ctx.clearRect(0, 0, this.imgWidth, this.imgHeight)
		ctx.drawImage(this.offscreenCanvas, 0, 0)
	}

	private loadImageElement(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve) => {
			const img = new Image()
			img.onload = () => resolve(img)
			img.src = src
		})
	}

	private async loadPGM(
		file: string,
	): Promise<{ width: number; height: number; pixels: Uint8Array }> {
		const [, b64] = file.split(',', 2)
		const bin = atob(b64)
		const bufArray = new Uint8Array(bin.length)
		for (let i = 0; i < bin.length; i++) {
			bufArray[i] = bin.charCodeAt(i)
		}
		const buf = bufArray.buffer
		const view = new DataView(buf)
		let offset = 0
		const magic = String.fromCharCode(
			view.getUint8(offset++),
			view.getUint8(offset++),
		)
		if (magic !== 'P5') throw new Error('Only binary PGM (P5) supported.')
		const readToken = (): string => {
			while (view.getUint8(offset) <= 32) offset++
			if (view.getUint8(offset) === 35) {
				while (view.getUint8(offset++) !== 10);
				return readToken()
			}
			let tok = ''
			while (view.getUint8(offset) > 32)
				tok += String.fromCharCode(view.getUint8(offset++))
			return tok
		}
		const width = parseInt(readToken(), 10)
		const height = parseInt(readToken(), 10)
		const maxval = parseInt(readToken(), 10)
		if (maxval > 255) throw new Error('Only maxval ≤ 255 supported.')
		const pixelStart = offset
		const pixels = new Uint8Array(buf, pixelStart, width * height)
		return { width, height, pixels }
	}
}

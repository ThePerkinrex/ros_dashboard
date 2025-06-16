import { drawColoredBezier } from './bezier'
import { CurvatureColoring } from './curvature_coloring'
import type { IPathCanvas, Point } from './path_canvas'
import { SampledPathPreview } from './sampled_path_preview'

export interface SavedPath {
	loopFinished: boolean
	points: Point[]
}

export class PathDrawer {
	private shouldUpdate = false

	private points: Point[] = []
	private mouse: Point | null = null
	private mouseDown = false
	private shiftDown = false
	// New: track if loop is finished
	private loopFinished = false

	// New: which point index is being dragged (if any)
	private selectedPointIndex: number | null = null
	// New: radius (in px) within which you can grab a point
	private snapRadius = 6

	private sampled: SampledPathPreview | null = null
	private savedState: null | SavedPath = null

	constructor(private canvas: IPathCanvas) {
		canvas.onBeforeLoadOrResize(() => {
			this.savedState = this.save()
			return true
		})
		canvas.onAfterLoadOrResize(() => {
			if (this.savedState) {
				const state = this.savedState
				this.savedState = null
				this.load(state)
			}
			canvas.onPointerDown((p) => this.onPointerDown(p))
			canvas.onPointerUp((p) => this.onPointerUp(p))
			canvas.onPointerMove((p) => this.onPointerMove(p))
			canvas.onPointerleave((p) => this.onPointerLeave(p))
			setInterval(() => this.update(), 1000.0 / 60.0)
			return true
		})
		// Handle undo with Ctrl+Z
		canvas.getKeyManager().setOnKeyDownHandler('z', () => this.OnZDown())
		canvas
			.getKeyManager()
			.setOnKeyDownHandler('Shift', () => this.onShiftDown())
		canvas
			.getKeyManager()
			.setOnKeyUpHandler('Shift', () => this.onShiftUp())
		// Handle loop finish toggle with Ctrl
		canvas
			.getKeyManager()
			.setOnKeyDownHandler('Control', () => this.onControlDown())
	}

	private onShiftDown() {
		this.shiftDown = true
		this.shouldUpdate = true
	}

	private onShiftUp() {
		this.shiftDown = false
		this.shouldUpdate = true
	}

	private onControlDown() {
		// Toggle loop finished state
		this.loopFinished = !this.loopFinished
		this.shouldUpdate = true
	}

	private OnZDown() {
		if (
			this.canvas.getKeyManager().isKeyDown('Control') &&
			this.points.length > 0 &&
			!this.loopFinished
		) {
			this.points.pop()
			this.shouldUpdate = true
		}
	}

	private onPointerDown(p: Point) {
		if (this.mouseDown) return
		this.mouseDown = true

		if (this.shiftDown && !this.loopFinished) {
			// Add a new control point when Shift is held, only if loop not finished
			this.points.push(p)
			this.shouldUpdate = true
		} else {
			// Try to pick an existing point to drag
			this.selectedPointIndex = this.findNearbyPointIndex(p)
			// If we grabbed something, immediately update
			if (this.selectedPointIndex !== null) {
				this.shouldUpdate = true
			}
		}
	}

	private onPointerUp(_p: Point) {
		this.mouseDown = false
		// Stop dragging any point
		this.selectedPointIndex = null
	}

	private onPointerLeave(_p: Point) {
		this.onPointerUp(_p)
		this.mouse = null
		this.shouldUpdate = true
	}

	// helper: “anchor” points live at index 0, and then at odd indices ≥ 3
	private isAnchorIndex(i: number): boolean {
		return i === 0 || (i >= 3 && i % 2 === 1)
	}

	private onPointerMove(p: Point) {
		this.mouse = p

		if (
			this.mouseDown &&
			!this.shiftDown &&
			this.selectedPointIndex !== null
		) {
			const i = this.selectedPointIndex
			// 1) compute how far we moved
			const old = this.points[i]
			const dx = p.x - old.x
			const dy = p.y - old.y
			// 2) move the dragged point
			this.points[i] = { x: p.x, y: p.y }

			// 3) if it’s an anchor, shift its neighboring handles too
			if (this.isAnchorIndex(i)) {
				// previous handle
				const prev = i - 1
				if (prev >= 0 && !this.isAnchorIndex(prev)) {
					const h = this.points[prev]
					this.points[prev] = { x: h.x + dx, y: h.y + dy }
				}
				// next handle
				const next = i + 1
				if (
					i === 0 &&
					next < this.points.length &&
					!this.isAnchorIndex(next)
				) {
					const h = this.points[next]
					this.points[next] = { x: h.x + dx, y: h.y + dy }
				}
			}
		}

		this.shouldUpdate = true
	}

	private update() {
		if (this.shouldUpdate) {
			this.shouldUpdate = false
			this.draw()
		}
	}

	/** Return index of a point within snapRadius, or null */
	private findNearbyPointIndex(p: Point): number | null {
		for (let i = 0; i < this.points.length; i++) {
			const pt = this.points[i]
			const dx = pt.x - p.x
			const dy = pt.y - p.y
			if (Math.hypot(dx, dy) <= this.snapRadius) {
				return i
			}
		}
		return null
	}

	private draw() {
		this.canvas.drawBackground()
		const ctx = this.canvas.getContext()
		if (!ctx) return
		const radius = 4

		if (this.points.length > 0) {
			const orig = this.points
			const pts: Point[] = []
			if (orig.length >= 4) {
				// First segment as-is
				pts.push(orig[0], orig[1], orig[2], orig[3])
				// Subsequent segments: one cp2 and anchor each
				for (let i = 4; i + 1 < orig.length; i += 2) {
					const cp2 = orig[i]
					const anchor = orig[i + 1]
					const prevAnchor = pts[pts.length - 1]
					const prevCp2 = pts[pts.length - 2]
					const cp1: Point = {
						x: prevAnchor.x * 2 - prevCp2.x,
						y: prevAnchor.y * 2 - prevCp2.y,
					}
					pts.push(cp1, cp2, anchor)
				}
			} else {
				pts.push(...orig)
			}

			const segmentCount = Math.floor((pts.length - 1) / 3)
			if (segmentCount > 0) {
				let pos = pts[0]
				const coloringManager = new CurvatureColoring()
				// add existing segments
				for (let i = 0; i < segmentCount; i++) {
					const cp1 = pts[i * 3 + 1]
					const cp2 = pts[i * 3 + 2]
					const p2 = pts[i * 3 + 3]
					coloringManager.addBezier(pos, cp1, cp2, p2)
					pos = p2
				}
				// add closing segment if loop finished
				let cp1Closure: Point,
					cp2Closure: Point,
					firstAnchor: Point,
					lastAnchor: Point,
					firstCp1: Point,
					lastCp2: Point

				if (this.loopFinished) {
					firstAnchor = pts[0]
					firstCp1 = pts[1]
					lastAnchor = pts[pts.length - 1]
					lastCp2 = pts[pts.length - 2]
					// mirror handles
					cp1Closure = {
						x: lastAnchor.x * 2 - lastCp2.x,
						y: lastAnchor.y * 2 - lastCp2.y,
					}
					cp2Closure = {
						x: firstAnchor.x * 2 - firstCp1.x,
						y: firstAnchor.y * 2 - firstCp1.y,
					}
					coloringManager.addBezier(
						pos,
						cp1Closure,
						cp2Closure,
						firstAnchor,
					)
				}

				// draw legend
				coloringManager.legend(ctx, (x) => this.canvas.canvasToMap(x))

				const coloring = coloringManager.getColoring()

				// draw colored segments
				pos = pts[0]
				for (let i = 0; i < segmentCount; i++) {
					const cp1 = pts[i * 3 + 1]
					const cp2 = pts[i * 3 + 2]
					const p2 = pts[i * 3 + 3]
					drawColoredBezier(ctx, pos, cp1, cp2, p2, coloring)
					pos = p2
				}
				// draw closing colored bezier
				if (this.loopFinished) {
					drawColoredBezier(
						ctx,
						pos,
						cp1Closure!,
						cp2Closure!,
						firstAnchor!,
						coloring,
					)
					// draw mirrored handles in same style as others
					ctx.strokeStyle = 'gray'
					ctx.lineWidth = 1
					// line to cp1Closure and handle circle
					ctx.beginPath()
					ctx.moveTo(lastAnchor!.x, lastAnchor!.y)
					ctx.lineTo(cp1Closure!.x, cp1Closure!.y)
					ctx.stroke()
					ctx.beginPath()
					ctx.arc(
						cp1Closure!.x,
						cp1Closure!.y,
						radius,
						0,
						Math.PI * 2,
					)
					ctx.stroke()
					// line to cp2Closure and handle circle
					ctx.beginPath()
					ctx.moveTo(firstAnchor!.x, firstAnchor!.y)
					ctx.lineTo(cp2Closure!.x, cp2Closure!.y)
					ctx.stroke()
					ctx.beginPath()
					ctx.arc(
						cp2Closure!.x,
						cp2Closure!.y,
						radius,
						0,
						Math.PI * 2,
					)
					ctx.stroke()
				}
			}

			// draw points and handles as before
			ctx.lineWidth = 2
			ctx.strokeStyle = 'black'
			ctx.beginPath()
			ctx.arc(pts[0].x, pts[0].y, radius, 0, Math.PI * 2)
			ctx.stroke()

			for (let i = 0; i < segmentCount; i++) {
				const start = pts[i * 3]
				const cp1 = pts[i * 3 + 1]
				const cp2 = pts[i * 3 + 2]
				const end = pts[i * 3 + 3]
				// existing handle and anchor drawing
				ctx.strokeStyle = 'black'
				ctx.lineWidth = 1
				ctx.beginPath()
				ctx.moveTo(end.x, end.y)
				ctx.lineTo(cp2.x, cp2.y)
				ctx.stroke()
				ctx.strokeStyle = i === 0 ? 'black' : 'gray'
				ctx.beginPath()
				ctx.moveTo(start.x, start.y)
				ctx.lineTo(cp1.x, cp1.y)
				ctx.stroke()
				ctx.beginPath()
				ctx.arc(cp1.x, cp1.y, radius, 0, Math.PI * 2)
				ctx.stroke()
				ctx.strokeStyle = 'black'
				ctx.beginPath()
				ctx.arc(cp2.x, cp2.y, radius, 0, Math.PI * 2)
				ctx.stroke()
				ctx.strokeStyle = 'black'
				ctx.lineWidth = 2
				ctx.beginPath()
				ctx.arc(end.x, end.y, radius, 0, Math.PI * 2)
				ctx.stroke()
			}

			// leftover original points
			const usedOrig = orig.length >= 4 ? 2 + segmentCount * 2 : 0
			for (let j = usedOrig; j < orig.length; j++) {
				const p = orig[j]
				ctx.lineWidth = 1
				ctx.strokeStyle = 'black'
				ctx.beginPath()
				ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
				ctx.stroke()
			}
		}

		const sampled = this.sampled
		if (sampled !== null) {
			sampled.draw(ctx)
		}

		let mouse = this.mouse
		if (mouse) {
			ctx.strokeStyle = this.shiftDown ? 'green' : 'blue'
			if (!this.shiftDown) {
				const pt_idx = this.findNearbyPointIndex(mouse)
				if (pt_idx !== null) {
					mouse = this.points[pt_idx]
					ctx.strokeStyle = 'red'
				}
			}

			// Draw cursor indicator
			ctx.lineWidth = 2
			ctx.beginPath()
			ctx.arc(mouse.x, mouse.y, radius / 3, 0, Math.PI * 2)
			ctx.stroke()
		}
	}

	public save(): SavedPath {
		console.log('saving', this.points)
		const points = this.points.map((p) => this.canvas.canvasToMap(p))
		console.log('as', points)
		return {
			loopFinished: this.loopFinished,
			points,
		}
	}

	public load(p: SavedPath) {
		if (this.savedState != null) {
			this.savedState = p
			return
		}
		this.loopFinished = p.loopFinished
		this.points = p.points.map((p) => this.canvas.mapToCanvas(p))
		console.log('from', p.points)
		console.log('loaded', this.points)
		this.shouldUpdate = true
	}

	public hideSampled() {
		this.sampled = null
		this.shouldUpdate = true
	}

	public asPath(sampleDist: number = 5): SampledPathPreview | null {
		const orig = this.points.slice()
		if (orig.length < 4) return null

		// build full bezier control list (pts)
		const pts: Point[] = []
		// first segment
		pts.push(orig[0], orig[1], orig[2], orig[3])
		// subsequent segments
		for (let i = 4; i + 1 < orig.length; i += 2) {
			const prevAnchor = pts[pts.length - 1]
			const prevCp2 = pts[pts.length - 2]
			const cp1: Point = {
				x: prevAnchor.x * 2 - prevCp2.x,
				y: prevAnchor.y * 2 - prevCp2.y,
			}
			pts.push(cp1, orig[i], orig[i + 1])
		}

		// collect cubic segments
		interface Segment {
			p0: Point
			p1: Point
			p2: Point
			p3: Point
		}
		const segments: Segment[] = []
		for (let i = 0; i + 3 < pts.length; i += 3) {
			segments.push({
				p0: pts[i],
				p1: pts[i + 1],
				p2: pts[i + 2],
				p3: pts[i + 3],
			})
		}

		// closing segment
		if (this.loopFinished) {
			const firstAnchor = pts[0]
			const firstCp1 = pts[1]
			const lastLen = pts.length
			const lastAnchor = pts[lastLen - 1]
			const lastCp2 = pts[lastLen - 2]
			const cp1Closure = {
				x: lastAnchor.x * 2 - lastCp2.x,
				y: lastAnchor.y * 2 - lastCp2.y,
			}
			const cp2Closure = {
				x: firstAnchor.x * 2 - firstCp1.x,
				y: firstAnchor.y * 2 - firstCp1.y,
			}
			segments.push({
				p0: lastAnchor,
				p1: cp1Closure,
				p2: cp2Closure,
				p3: firstAnchor,
			})
		}

		// helper to get point on cubic at t
		const cubicPoint = (seg: Segment, t: number): Point => {
			const u = 1 - t
			const w1 = u * u * u
			const w2 = 3 * u * u * t
			const w3 = 3 * u * t * t
			const w4 = t * t * t
			return {
				x:
					seg.p0.x * w1 +
					seg.p1.x * w2 +
					seg.p2.x * w3 +
					seg.p3.x * w4,
				y:
					seg.p0.y * w1 +
					seg.p1.y * w2 +
					seg.p2.y * w3 +
					seg.p3.y * w4,
			}
		}

		const samples: Point[] = []
		// sample each segment
		for (const seg of segments) {
			// approximate length by control polygon
			const len =
				Math.hypot(seg.p0.x - seg.p1.x, seg.p0.y - seg.p1.y) +
				Math.hypot(seg.p1.x - seg.p2.x, seg.p1.y - seg.p2.y) +
				Math.hypot(seg.p2.x - seg.p3.x, seg.p2.y - seg.p3.y)
			const steps = Math.max(1, Math.ceil(len / sampleDist))
			for (let i = 0; i < steps; i++) {
				const t = i / steps
				samples.push(cubicPoint(seg, t))
			}
		}

		// convert to map coordinates
		this.sampled = new SampledPathPreview(
			samples,
			samples.map((p) => this.canvas.canvasToMap(p)),
		)
		this.shouldUpdate = true
		return this.sampled
	}
}

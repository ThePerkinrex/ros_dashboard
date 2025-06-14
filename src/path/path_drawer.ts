import type { IPathCanvas, Point } from './path_canvas'

export class PathDrawer {
	private points: Point[] = []
	private mouse: Point | null = null
	private mouseDown = false

	constructor(private canvas: IPathCanvas) {
		canvas.onLoadOrResize(() => {
			canvas.onPointerDown((p) => this.onPointerDown(p))
			canvas.onPointerUp((p) => this.onPointerUp(p))
			canvas.onPointerMove((p) => this.onPointerMove(p))
		})
	}

	private onPointerDown(p: Point) {
		if (!this.mouseDown) {
			this.mouseDown = true
			this.points.push(p)
			this.draw()
		}
	}

	private onPointerUp(p: Point) {
		this.mouseDown = false
	}

	private onPointerMove(p: Point) {
		this.mouse = p
		this.draw()
	}

	private draw() {
		if (this.mouse == null) return
		this.canvas.drawBackground()
		const ctx = this.canvas.getContext()
		if (!ctx) return

		// --- Draw main cubic beziers in green, thick ---
		ctx.strokeStyle = 'green'
		ctx.lineWidth = 3
		const points = [...this.points, this.mouse]

		ctx.beginPath()
		// Move to first point
		ctx.moveTo(points[0].x, points[0].y)

		// Draw full cubic segments
		const segmentCount = Math.floor((points.length - 1) / 3)
		console.log('segments', segmentCount, points.length)
		for (let i = 0; i < segmentCount; i++) {
			const cp1 = points[1 + i * 3]
			const cp2 = points[2 + i * 3]
			const p2 = points[3 + i * 3]
			ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y)
		}
		ctx.stroke()

		// --- Draw remaining points/segments in lighter gray ---
		const remStart = 1 + segmentCount * 3
		const rem = points.length - remStart
		if (rem > 0) {
			ctx.strokeStyle = 'lightgray'
			ctx.lineWidth = 1
			const last = points[remStart - 1]
			if (rem === 1) {
				// Straight line for single leftover
				const p1 = points[remStart]
				ctx.beginPath()
				ctx.moveTo(last.x, last.y)
				ctx.lineTo(p1.x, p1.y)
				ctx.stroke()
			} else if (rem === 2) {
				// Quadratic curve for two leftovers
				const cp = points[remStart]
				const end = points[remStart + 1]
				ctx.beginPath()
				ctx.moveTo(last.x, last.y)
				ctx.quadraticCurveTo(cp.x, cp.y, end.x, end.y)
				ctx.stroke()
			}
		}

		// --- Draw circles on each point (small gray, no fill) ---
		ctx.strokeStyle = 'gray'
		ctx.lineWidth = 1
		const radius = 4
		for (const pt of points) {
			ctx.beginPath()
			ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2)
			ctx.stroke()
		}
	}
}

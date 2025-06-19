import type { Point } from './path_canvas'

// First derivative P′(t)
function getFirstDeriv(
	t: number,
	p0: Point,
	p1: Point,
	p2: Point,
	p3: Point,
): Point {
	const u = 1 - t
	return {
		x:
			3 *
			(u * u * (p1.x - p0.x) +
				2 * u * t * (p2.x - p1.x) +
				t * t * (p3.x - p2.x)),
		y:
			3 *
			(u * u * (p1.y - p0.y) +
				2 * u * t * (p2.y - p1.y) +
				t * t * (p3.y - p2.y)),
	}
}

// Second derivative P″(t)
function getSecondDeriv(
	t: number,
	p0: Point,
	p1: Point,
	p2: Point,
	p3: Point,
): Point {
	const u = 1 - t
	return {
		x: 6 * (u * (p2.x - 2 * p1.x + p0.x) + t * (p3.x - 2 * p2.x + p1.x)),
		y: 6 * (u * (p2.y - 2 * p1.y + p0.y) + t * (p3.y - 2 * p2.y + p1.y)),
	}
}

// Curvature κ = |x'y'' - y'x''| / (x'² + y'²)^(3/2)
export function curvatureAt(
	t: number,
	p0: Point,
	p1: Point,
	p2: Point,
	p3: Point,
): number {
	const d1 = getFirstDeriv(t, p0, p1, p2, p3)
	const d2 = getSecondDeriv(t, p0, p1, p2, p3)
	const num = Math.abs(d1.x * d2.y - d1.y * d2.x)
	const denom = Math.pow(d1.x * d1.x + d1.y * d1.y, 1.5)
	return denom === 0 ? 0 : num / denom
}

// Map a value v ∈ [vmin, vmax] to a color via HSL
function valueToColor(v: number, vmin: number, vmax: number): string {
	const t = Math.max(0, Math.min(1, (v - vmin) / (vmax - vmin)))
	const hue = 240 - 240 * t // 240° (blue) → 0° (red)
	return `hsl(${hue}, 100%, 50%)`
}

export class CurvatureColoring {
	private kmin: number | undefined = undefined
	private kmax: number | undefined = undefined

	constructor(private sampling = 200) {}

	// Add a bezier to take into account for kmin and kmax
	public addBezier(p0: Point, p1: Point, p2: Point, p3: Point): void {
		for (let i = 0; i <= this.sampling; i++) {
			const t = i / this.sampling
			const k = curvatureAt(t, p0, p1, p2, p3)

			if (this.kmin === undefined || k < this.kmin) this.kmin = k
			if (this.kmax === undefined || k > this.kmax) this.kmax = k
		}
	}

	public getColoring(): (
		t: number,
		p0: Point,
		p1: Point,
		p2: Point,
		p3: Point,
	) => string {
		if (this.kmin === undefined || this.kmax === undefined)
			throw new Error('No beziers')
		return curvatureColoring(this.kmin, this.kmax)
	}

	/**
	 * Draws a legend with color bar, title, labels in meters, and a scale bar.
	 * @param ctx Canvas rendering context
	 * @param scaling Function mapping pixels to meters
	 * @param topLeft Top-left corner of legend box in canvas units
	 * @param length Width of the color bar in pixels
	 */
	public legend(
		ctx: CanvasRenderingContext2D,
		scaling: (pixels: number) => number,
		topLeft: Point = { x: 5, y: 5 },
		length = 200,
	) {
		if (this.kmin === undefined || this.kmax === undefined) {
			throw new Error('No curvature range to draw legend')
		}

		const { x: x0, y: y0 } = topLeft
		const barHeight = 12
		const padding = 8
		const fontSize = 12
		const titleHeight = fontSize + 4
		const labelsHeight = fontSize + 4
		// Additional space for scale bar
		const scaleBarHeight = 20

		// Total legend box height
		const totalHeight =
			titleHeight +
			padding +
			barHeight +
			padding +
			labelsHeight +
			padding +
			scaleBarHeight +
			padding

		ctx.save()
		ctx.strokeStyle = '#000'
		ctx.lineWidth = 1
		// Outer box
		ctx.strokeRect(x0, y0, length + padding * 2, totalHeight)

		// Translate origin to inside padding
		ctx.translate(x0 + padding, y0 + padding + titleHeight)

		// Draw title
		ctx.fillStyle = '#000'
		ctx.font = `${fontSize}px sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText('Curvature Radius (m)', length / 2, -titleHeight / 2)

		// Draw color bar
		for (let i = 0; i < length; i++) {
			const t = i / (length - 1)
			const v = this.kmin! + t * (this.kmax! - this.kmin!)
			ctx.fillStyle = valueToColor(v, this.kmin!, this.kmax!)
			ctx.fillRect(i, 0, 1, barHeight)
		}

		// Draw min/mid/max labels in meters
		const range = this.kmax! - this.kmin!
		ctx.fillStyle = '#000'
		ctx.font = `${fontSize}px sans-serif`
		ctx.textBaseline = 'top'

		const labelValues = [
			scaling(1 / this.kmin!),
			scaling(1 / (this.kmin! + range / 2)),
			scaling(1 / this.kmax!),
		]
		const positions = [0, length / 2, length]
		const aligns: CanvasTextAlign[] = ['left', 'center', 'right']

		for (let i = 0; i < 3; i++) {
			ctx.textAlign = aligns[i]
			ctx.fillText(
				labelValues[i].toFixed(1) + ' m',
				positions[i],
				barHeight + 4,
			)
		}

		// Move down for scale bar
		ctx.translate(0, barHeight + labelsHeight)

		// Draw scale bar line
		const idealPx = Math.min(length / 3, 100) // px length of scale bar
		const meters = scaling(idealPx)
		// Line
		ctx.beginPath()
		ctx.moveTo(0, padding)
		ctx.lineTo(idealPx, padding)
		ctx.lineTo(idealPx, padding + 5)
		ctx.moveTo(0, padding + 5)
		ctx.lineTo(0, padding)
		ctx.stroke()

		// Scale label centered under the bar
		ctx.textAlign = 'center'
		ctx.textBaseline = 'top'
		ctx.fillText(`${meters.toFixed(0)} m`, idealPx / 2, padding + 7)

		ctx.restore()
	}
}

function curvatureColoring(
	kmin: number,
	kmax: number,
): (t: number, p0: Point, p1: Point, p2: Point, p3: Point) => string {
	return (t, p0, p1, p2, p3) => {
		const k = curvatureAt(t, p0, p1, p2, p3)
		return valueToColor(k, kmin, kmax)
	}
}

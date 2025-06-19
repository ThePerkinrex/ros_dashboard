import { valueToColor } from './curvature_coloring'
import type { Point } from './path_canvas'
import type { SamplePoint } from './path_drawer'

export class SampledPathPreview {
	private min_curv: number
	private max_curv: number

	public constructor(
		private canvasPoints: SamplePoint[],
		private mapPoints: SamplePoint[],
	) {
		this.min_curv = Infinity
		this.max_curv = 0
		for (const p of canvasPoints) {
			this.max_curv = Math.max(this.max_curv, p.curvature)
			this.min_curv = Math.min(this.min_curv, p.curvature)
		}
		console.log('sample curv:', this.min_curv, this.max_curv)
	}

	public draw(ctx: CanvasRenderingContext2D) {
		if (this.canvasPoints.length > 0) {
			ctx.lineWidth = 2

			for (let i = 1; i < this.canvasPoints.length; i++) {
				ctx.beginPath()
				ctx.moveTo(
					this.canvasPoints[i - 1].x,
					this.canvasPoints[i - 1].y,
				)
				ctx.strokeStyle = valueToColor(
					this.canvasPoints[i].curvature,
					this.min_curv,
					this.max_curv,
				)
				ctx.lineTo(this.canvasPoints[i].x, this.canvasPoints[i].y)
				ctx.stroke()
			}
		}
	}

	public toJson(): Point[] {
		return this.mapPoints
	}
}

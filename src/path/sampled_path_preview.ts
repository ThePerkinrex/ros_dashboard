import type { Point } from './path_canvas'
import type { SamplePoint } from './path_drawer'

export class SampledPathPreview {
	public constructor(
		private canvasPoints: SamplePoint[],
		private mapPoints: SamplePoint[],
	) {}

	public draw(ctx: CanvasRenderingContext2D) {
		// TODO handle speed
		if (this.canvasPoints.length > 0) {
			ctx.lineWidth = 2
			ctx.strokeStyle = 'blue'
			ctx.beginPath()
			ctx.moveTo(this.canvasPoints[0].x, this.canvasPoints[0].y)

			for (let i = 1; i < this.canvasPoints.length; i++) {
				ctx.lineTo(this.canvasPoints[i].x, this.canvasPoints[i].y)
			}
			ctx.stroke()
		}
	}

	public toJson(): Point[] {
		return this.mapPoints
	}
}

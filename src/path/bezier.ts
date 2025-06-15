import type { Point } from './path_canvas'

// Evaluate cubic Bézier at parameter t ∈ [0,1]
function getPoint(
	t: number,
	p0: Point,
	p1: Point,
	p2: Point,
	p3: Point,
): Point {
	const u = 1 - t
	const tt = t * t
	const uu = u * u
	const uuu = uu * u
	const ttt = tt * t
	return {
		x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
		y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
	}
}

// Draw the Bézier, coloring each tiny segment by curvature (or any value)
export function drawColoredBezier(
	ctx: CanvasRenderingContext2D,
	p0: Point,
	p1: Point,
	p2: Point,
	p3: Point,
	coloring: (t: number, p0: Point, p1: Point, p2: Point, p3: Point) => string,
	segments: number = 200,
): void {
	// Find min/max curvature
	// let κmin = Infinity
	// let κmax = -Infinity
	// for (let i = 0; i <= segments; i++) {
	// 	const t = i / segments
	// 	const κ = curvatureAt(t, p0, p1, p2, p3)
	// 	if (κ < κmin) κmin = κ
	// 	if (κ > κmax) κmax = κ
	// }

	// Draw each small line segment
	let prev = getPoint(0, p0, p1, p2, p3)
	for (let i = 1; i <= segments; i++) {
		const t = i / segments
		const pt = getPoint(t, p0, p1, p2, p3)
		// const κ = curvatureAt(t, p0, p1, p2, p3)
		ctx.strokeStyle = coloring(t, p0, p1, p2, p3) // valueToColor(κ, κmin, κmax)
		ctx.beginPath()
		ctx.moveTo(prev.x, prev.y)
		ctx.lineTo(pt.x, pt.y)
		ctx.stroke()
		prev = pt
	}
}

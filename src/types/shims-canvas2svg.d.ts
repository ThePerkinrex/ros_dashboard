declare module 'canvas2svg' {
	// 1) Extend the DOM CanvasRenderingContext2D
	export interface C2S extends CanvasRenderingContext2D {
		getSerializedSvg(): string
	}
	// 2) Declare the constructor signature
	const C2S: {
		new (width: number, height: number): C2S
	}
	export default C2S
}

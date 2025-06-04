/// Based on https://stackoverflow.com/questions/470690/how-to-automatically-generate-n-distinct-colors/13781114#13781114
import type { def } from '@vue/shared'
import { fracToNum, type Fraction } from './frac'

function* count(): Generator<number, never, undefined> {
	let i = 0
	while (true) {
		yield i++
	}
}

function* zenos_dichotomy(): Generator<Fraction, never, undefined> {
	/// http://en.wikipedia.org/wiki/1/2_%2B_1/4_%2B_1/8_%2B_1/16_%2B_%C2%B7_%C2%B7_%C2%B7
	const g = count()
	while (true) {
		const k = g.next().value
		yield { numerator: 1, denominator: Math.pow(2, k) }
	}
}

function* fracs(): Generator<Fraction, never, undefined> {
	/// [Fraction(0, 1), Fraction(1, 2), Fraction(1, 4), Fraction(3, 4), Fraction(1, 8), Fraction(3, 8), Fraction(5, 8), Fraction(7, 8), Fraction(1, 16), Fraction(3, 16), ...]
	/// [0.0, 0.5, 0.25, 0.75, 0.125, 0.375, 0.625, 0.875, 0.0625, 0.1875, ...]
	yield { numerator: 0, denominator: 1 }
	const g = zenos_dichotomy()
	while (true) {
		const k = g.next().value
		const i = k.denominator
		for (let j = 1; j < i; j += 2) {
			yield { numerator: j, denominator: i }
		}
	}
}

function* hueToTones(hue: Fraction): Generator<HSV, void, undefined> {
	// for s in [Fraction(6,10)]:
	//     for v in [Fraction(8,10),Fraction(5,10)]:
	//         yield (h, s, v)
	for (const s of [{ numerator: 6, denominator: 10 }]) {
		for (const v of [
			{ numerator: 8, denominator: 10 },
			// { numerator: 5, denominator: 10 },
		]) {
			yield { h: fracToNum(hue), s: fracToNum(s), v: fracToNum(v) }
		}
	}
}

export type RGB = { r: number; g: number; b: number; a: number }
type HSV = { h: number; s: number; v: number }

function HSVtoRGB(hsv: HSV): RGB {
	let r, g, b, i, f, p, q, t, h, s, v
	s = hsv.s
	v = hsv.v
	h = hsv.h
	i = Math.floor(h * 6)
	f = h * 6 - i
	p = v * (1 - s)
	q = v * (1 - f * s)
	t = v * (1 - (1 - f) * s)
	switch (i % 6) {
		case 0:
			;(r = v), (g = t), (b = p)
			break
		case 1:
			;(r = q), (g = v), (b = p)
			break
		case 2:
			;(r = p), (g = v), (b = t)
			break
		case 3:
			;(r = p), (g = q), (b = v)
			break
		case 4:
			;(r = t), (g = p), (b = v)
			break
		default:
			;(r = v), (g = p), (b = q)
			break
	}
	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255),
		a: 1,
	}
}

export function* rgbColors(): Generator<RGB, never, undefined> {
	const g = fracs()
	while (true) {
		const f = g.next().value
		for (const hsv of hueToTones(f)) {
			const rgb = HSVtoRGB(hsv)
			yield rgb
		}
	}
}

export function rgbToCSS(color: RGB) {
	return `rgba(${color.r},${color.g},${color.b},${color.a})`
}

export type Fraction = {
	numerator: number
	denominator: number
}

export function fracToNum(frac: Fraction): number {
	return frac.numerator / frac.denominator
}

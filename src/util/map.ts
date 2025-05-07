export default function map(
	baseStart: number,
	baseEnd: number,
	mappedStart: number,
	mappedEnd: number,
): (x: number) => number

export default function map(
	baseStart: number,
	baseEnd: number,
	mappedStart: number,
	mappedEnd: number,
	errorValue: number,
): (x: number) => number | undefined
export default function map(
	baseStart: number,
	baseEnd: number,
	mappedStart: number,
	mappedEnd: number,
	errorValue?: number,
): (x: number) => number | undefined {
	const slope = (mappedEnd - mappedStart) / (baseEnd - baseStart)
	return (x: number) =>
		x === errorValue ? undefined : mappedStart + slope * (x - baseStart)
}

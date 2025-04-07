export type ArrayOneOrMore<T> = {
	0: T
} & Array<T>

export class CircularBuffer<T> {
	private buffer: (T | undefined)[]
	private capacity: number
	private start: number
	private end: number
	private count: number

	constructor(initialCapacity: number = 16) {
		this.capacity = initialCapacity
		this.buffer = new Array<T | undefined>(this.capacity)
		this.start = 0
		this.end = 0
		this.count = 0
	}

	// Returns the number of elements in the buffer.
	public size(): number {
		return this.count
	}

	// Adds an element at the end of the buffer.
	public push(item: T): void {
		if (this.count === this.capacity) {
			this.resize()
		}
		this.buffer[this.end] = item
		this.end = (this.end + 1) % this.capacity
		this.count++
	}

	// Returns the element at the given logical index (0 is the start).
	public get(index: number): T {
		if (index < 0 || index >= this.count) {
			throw new RangeError('Index out of bounds')
		}
		const pos = (this.start + index) % this.capacity
		const item = this.buffer[pos]
		if (item === undefined) {
			// This check is just for safety; under normal operation item should not be undefined.
			throw new Error('Item is undefined')
		}
		return item
	}

	/**
	 * Removes elements from the start of the buffer up to and including
	 * the element at the specified logical index. For example, removeUpTo(3)
	 * will remove elements at indices 0, 1, 2, and 3, making the old index 4 become the new index 0.
	 */
	public removeUpTo(index: number): void {
		if (index < 0 || index >= this.count) {
			throw new RangeError('Index out of bounds')
		}
		const numToRemove = index + 1
		// Optionally, clear the removed slots (not required for functionality)
		for (let i = 0; i < numToRemove; i++) {
			this.buffer[(this.start + i) % this.capacity] = undefined
		}
		this.start = (this.start + numToRemove) % this.capacity
		this.count -= numToRemove
	}

	// Doubles the capacity of the underlying buffer and reorders the items.
	private resize(): void {
		const newCapacity = this.capacity * 2
		const newBuffer = new Array<T | undefined>(newCapacity)
		// Copy elements in order starting from the current start.
		for (let i = 0; i < this.count; i++) {
			newBuffer[i] = this.get(i)
		}
		this.buffer = newBuffer
		this.capacity = newCapacity
		this.start = 0
		this.end = this.count
	}
}

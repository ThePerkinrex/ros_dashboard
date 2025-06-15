export class KeyManager {
	private pressed: Set<string> = new Set()
	private downHandlers: Map<string, () => void> = new Map()
	private upHandlers: Map<string, () => void> = new Map()

	constructor() {}

	public setOnKeyDownHandler(key: string, handler: () => void) {
		this.downHandlers.set(key, handler)
		if (this.isKeyDown(key)) handler()
	}

	public setOnKeyUpHandler(key: string, handler: () => void) {
		this.upHandlers.set(key, handler)
	}

	public onKeyDown(evt: KeyboardEvent) {
		this.pressed.add(evt.key)
		const h = this.downHandlers.get(evt.key)
		if (h) h()
	}

	public onKeyUp(evt: KeyboardEvent) {
		this.pressed.delete(evt.key)
		const h = this.upHandlers.get(evt.key)
		if (h) h()
	}

	public isKeyDown(key: string): boolean {
		return this.pressed.has(key)
	}
}

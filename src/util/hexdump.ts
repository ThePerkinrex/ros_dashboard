/**
 * Returns a combined hex + ASCII dump of the given bytes.
 * Non-printable bytes are shown as “.” in the ASCII column.
 *
 * @param data         the raw bytes
 * @param bytesPerLine how many bytes per line (default 16)
 */
export function hexdump(data: Uint8Array, bytesPerLine = 16): string {
	const lines: string[] = []
	for (let i = 0; i < data.length; i += bytesPerLine) {
		// Address column
		const addr = i.toString(16).padStart(8, '0')

		// Slice this line’s bytes
		const slice = data.subarray(i, i + bytesPerLine)

		// Hex bytes, space-separated
		const hexBytes = Array.from(slice)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join(' ')

		// ASCII column: printable 0x20–0x7E, else “.”
		const ascii = Array.from(slice)
			.map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'))
			.join('')

		// Pad the hex area so the ASCII lines up
		const padding = ' '.repeat((bytesPerLine - slice.length) * 3)

		lines.push(`${addr}  ${hexBytes}${padding}  |${ascii}|`)
	}
	return lines.join('\n')
}

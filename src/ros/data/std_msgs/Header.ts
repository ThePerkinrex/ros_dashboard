import type Time from '../builtin_interfaces/msg/Time'

export default interface Header {
	// seq: number
	frame_id: string
	stamp: Time
}

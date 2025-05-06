import type Pose from '../geometry_msgs/Pose'

export default interface MapMetaData {
	// TODO time map_load_time,
	resolution: number
	width: number
	height: number
	origin: Pose
}

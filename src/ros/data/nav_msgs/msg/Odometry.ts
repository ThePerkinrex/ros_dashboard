import type PoseWithCovariance from '../../geometry_msgs/msg/PoseWithCovariance'
import type Header from '../../std_msgs/Header'

export default interface Odometry {
	header: Header
	child_frame_id: string
	pose: PoseWithCovariance
	// TODO: twist
}

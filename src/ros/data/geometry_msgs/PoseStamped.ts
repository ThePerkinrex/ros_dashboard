import type Header from '../std_msgs/Header'
import type Pose from './Pose'

export default interface PoseStamped {
	header: Header
	pose: Pose
}

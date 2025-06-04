import type PoseStamped from '../../geometry_msgs/PoseStamped'
import type Header from '../../std_msgs/Header'

export default interface Path {
	header: Header
	poses: PoseStamped[]
}

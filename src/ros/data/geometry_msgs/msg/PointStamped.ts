import type Header from '../../std_msgs/Header'
import type Point from '../Point'

export default interface PointStamped {
	header: Header
	point: Point
}

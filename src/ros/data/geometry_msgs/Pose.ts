import type Point from './Point'
import type Quaternion from './Quaternion'

export default interface Pose {
	position: Point
	orientation: Quaternion
}

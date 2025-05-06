import type Header from '../std_msgs/Header'
import type MapMetaData from './MapMetaData'

export default interface OccupancyGrid {
	header: Header
	info: MapMetaData
	data: number[]
}

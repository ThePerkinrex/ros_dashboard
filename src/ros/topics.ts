import { Topic } from 'roslib'
import { ros_singleton } from './ros'

export interface PlottableMapping {
	[name: string]: (x: any) => number
}

const PLOTTABLE_TYPES: PlottableMapping = {
	'std_msgs/msg/Int32': (x) => x.data,
	'std_msgs/msg/UInt32': (x) => x.data,
	'std_msgs/msg/Int64	': (x) => x.data,
	'std_msgs/msg/UInt64': (x) => x.data,
	'std_msgs/msg/Byte': (x) => x.data,
	'std_msgs/msg/Int8': (x) => x.data,
	'std_msgs/msg/UInt8': (x) => x.data,
	'std_msgs/msg/Int16': (x) => x.data,
	'std_msgs/msg/UInt16': (x) => x.data,
	'std_msgs/msg/Float64': (x) => x.data,
	'std_msgs/msg/Float32': (x) => x.data,
	'std_msgs/msg/Bool': (x) => (x.data ? 1 : 0),
}

export interface PolarPlottableMapping {
	[name: string]:
		| {
				f: (x: any) => {
					ranges: number[]
					minAngle: number
					maxAngle: number
				}
				requiresScan: false
		  }
		| {
				f: (x: any) => { ranges: number[] }
				requiresScan: true
		  }
}

const INSTANT_POLAR_PLOTTABLE: PolarPlottableMapping = {
	'sensor_msgs/msg/LaserScan': {
		f: (x) => ({
			ranges: x.ranges,
			minAngle: x.angle_min,
			maxAngle: x.angle_max,
		}),
		requiresScan: false,
	},
}

export class RosTopic {
	private name: string
	private type: string

	constructor(name: string, type: string) {
		this.name = name
		this.type = type
	}

	public getName() {
		return this.name
	}

	public getType() {
		return this.type
	}

	public isPlottable(mapping: PlottableMapping = PLOTTABLE_TYPES): boolean {
		return mapping[this.getType()] !== undefined
	}

	public isPolarPlottable(
		mapping: PolarPlottableMapping = INSTANT_POLAR_PLOTTABLE,
	): boolean {
		return mapping[this.getType()] !== undefined
	}

	public subscribe(s: (m: any) => void): Topic {
		const t = new Topic({
			ros: ros_singleton,
			name: this.getName(),
			messageType: this.getType(),
		})
		t.subscribe((m) => {
			s(m)
		})
		return t
	}

	public subscribePlot(
		s: (data: number) => void,
		mapping: PlottableMapping = PLOTTABLE_TYPES,
	): Topic {
		const map_fn = mapping[this.getType()]
		if (map_fn === undefined)
			throw new Error(
				'Unable to subscribe to a topic of type ' + this.getType(),
			)
		return this.subscribe((m) => {
			s(map_fn(m))
		})
	}

	public unsubscribe(t: Topic) {
		if (t.name != this.getName())
			throw new Error('This topic does not correspond')
		t.unsubscribe()
	}

	public subscribePolarPlot(
		s: (ranges: number[], minAngle: number, maxAngle: number) => void,
		mapping: PolarPlottableMapping = INSTANT_POLAR_PLOTTABLE,
	): Topic {
		const map = mapping[this.getType()]
		if (map === undefined)
			throw new Error(
				'Unable to subscribe to a topic of type ' + this.getType(),
			)
		if (map.requiresScan) {
			let minAngle = 0
			let maxAngle = Math.PI * 2

			ros_singleton.getTopicsForType(
				'sensor_msgs/msg/LaserScan',
				(topics) => {
					if (topics.length === 0) throw new Error('No scan topics')
					const rosTopic = new RosTopic(
						topics[0],
						'sensor_msgs/msg/LaserScan',
					)
					const t = rosTopic.subscribe((m) => {
						minAngle = m.minAngle
						maxAngle = m.minAngle
						rosTopic.unsubscribe(t)
					})
				},
			)
			return this.subscribe((m) => {
				let v = map.f(m)
				s(v.ranges, minAngle, maxAngle)
			})
		}

		return this.subscribe((m) => {
			let v = map.f(m)
			s(v.ranges, v.minAngle, v.maxAngle)
		})
	}
}

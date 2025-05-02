import { Topic } from 'roslib'
import { ros_singleton } from './ros'

export interface PlottableMapping {
	[name: string]: Record<string, (x: any) => number>
}

const PLOTTABLE_TYPES: PlottableMapping = {
	'std_msgs/msg/Int32': {data: (x) => x.data},
	'std_msgs/msg/UInt32': {data: (x) => x.data},
	'std_msgs/msg/Int64	': {data: (x) => x.data},
	'std_msgs/msg/UInt64': {data: (x) => x.data},
	'std_msgs/msg/Byte': {data: (x) => x.data},
	'std_msgs/msg/Int8': {data: (x) => x.data},
	'std_msgs/msg/UInt8': {data: (x) => x.data},
	'std_msgs/msg/Int16': {data: (x) => x.data},
	'std_msgs/msg/UInt16': {data: (x) => x.data},
	'std_msgs/msg/Float64': {data: (x) => x.data},
	'std_msgs/msg/Float32': {data: (x) => x.data},
	'std_msgs/msg/Bool': {data: (x) => (x.data ? 1 : 0)},
	'nav_msgs/msg/Odometry': {
		'twist/twist/linear/x': (x) => x.twist.twist.linear.x,
		'twist/twist/linear/y': (x) => x.twist.twist.linear.y,
		'twist/twist/linear/z': (x) => x.twist.twist.linear.z,


		'twist/twist/angular/x': (x) => x.twist.twist.angular.x,
		'twist/twist/angular/y': (x) => x.twist.twist.angular.y,
		'twist/twist/angular/z': (x) => x.twist.twist.angular.z,
	}
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

	public isPlottable(mapping: PlottableMapping = PLOTTABLE_TYPES): string[] {
		return Object.keys(mapping[this.getType()] ?? {})
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
		id: string,
		s: (data: number) => void,
		mapping: PlottableMapping = PLOTTABLE_TYPES,
	): Topic {
		const map_fn = (mapping[this.getType()] ?? {})[id]
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

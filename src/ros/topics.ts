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

export interface RosTopicPlotSubscriber {
	consumeData(data: number): void
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

	public subscribePlot(
		s: RosTopicPlotSubscriber,
		mapping: PlottableMapping = PLOTTABLE_TYPES,
	): Topic {
		if (mapping[this.getType()] === undefined)
			throw new Error(
				'Unable to subscribe to a topic of type ' + this.getType(),
			)
		const t = new Topic({
			ros: ros_singleton,
			name: this.getName(),
			messageType: this.getType(),
		})
		t.subscribe((m) => {
			console.log(m)
		})
		return t
	}

	public unsubscribe(t: Topic) {
		if (t.name != this.getName())
			throw new Error('This topic does not correspond')
		t.unsubscribe()
	}
}

import ROSLIB from 'roslib'
import { reactive, ref, type InjectionKey, type Ref } from 'vue'
import { RosParam, ParamType } from './params'
import { RosTopic } from './topics'

export enum ConnectionStatus {
	CONNECTING,
	CONNECTED,
	ERROR,
	CLOSED,
}

export const ros_singleton = new ROSLIB.Ros({})
export const connection_status = ref(ConnectionStatus.CLOSED)

ros_singleton.on('error', () => {
	connection_status.value = ConnectionStatus.ERROR
})
ros_singleton.on('close', () => {
	connection_status.value = ConnectionStatus.CLOSED
})
ros_singleton.on('connection', () => {
	connection_status.value = ConnectionStatus.CONNECTED
})

export class Ros {
	constructor() {}

	public setURL(url: string) {
		connection_status.value = ConnectionStatus.CONNECTING
		ros_singleton.connect(url)
	}

	public getNodes(): Promise<RosNode[]> {
		if (connection_status.value !== ConnectionStatus.CONNECTED)
			throw new Error('ROS not connected')
		return new Promise<RosNode[]>((resolve) => {
			ros_singleton.getNodes((n) => {
				resolve(n.map((v) => new RosNode(v)))
			})
		})
	}

	public async getTopics(): Promise<RosTopic[]> {
		if (connection_status.value !== ConnectionStatus.CONNECTED)
			throw new Error('ROS not connected')

		return await new Promise<RosTopic[]>((resolve) => {
			ros_singleton.getTopics((n: any) => {
				const res = []
				for (let i = 0; i < n.topics.length; i++) {
					res.push(new RosTopic(n.topics[i], n.types[i]))
				}
				resolve(res)
			})
		})
	}
}

export class RosNode {
	private name: string

	constructor(name: string) {
		this.name = name
	}

	public getName(): string {
		return this.name
	}

	public getParams(): Promise<RosParam[]> {
		const listParameters = new ROSLIB.Service({
			ros: ros_singleton,
			name: this.getName() + '/list_parameters',
			serviceType: 'rcl_interfaces/srv/ListParameters',
		})

		const parameterTypes = new ROSLIB.Service({
			ros: ros_singleton,
			name: this.getName() + '/describe_parameters',
			serviceType: 'rcl_interfaces/srv/DescribeParameters',
		})

		return new Promise((resolve, reject) => {
			listParameters.callService({ prefixes: [], depth: 0 }, (r) => {
				const names = r.result.names
				parameterTypes.callService(
					{ names },
					(r) => {
						resolve(
							r.descriptors.map(
								(d: {
									name: string
									type: number
									description?: string
								}) => {
									let t: ParamType =
										d.type >= ParamType.NOT_SET &&
										d.type <= ParamType.STRING_ARRAY
											? d.type
											: ParamType.UNKNOWN
									return new RosParam(
										this,
										d.name,
										d.description,
										t,
									)
								},
							),
						)
					},
					reject,
				)
			})
		})
	}
}

// export interface RosLoader {
// 	ros: null | ROSLIB.Ros
// 	setURL(url: string): void
// }

// export const Ros = reactive<RosLoader>({
// 	ros: null,
// 	setURL(url: string) {
// 		this.ros = new ROSLIB.Ros({ url: url })
// 	},
// })

// export function getParams(node: string) {
// 	const ros = Ros.ros
// 	if (ros === null) return null
// 	const listParameters = new ROSLIB.Service({
// 		ros: ros,
// 		name: node + '/list_parameters',
// 		serviceType: 'rcl_interfaces/srv/ListParameters',
// 	})

// 	const parameterTypes = new ROSLIB.Service({
// 		ros: ros,
// 		name: node + '/describe_parameters',
// 		serviceType: 'rcl_interfaces/srv/DescribeParameters',
// 	})
// 	listParameters.callService({ prefixes: [], depth: 0 }, (r) => {
// 		const names = r.result.names
// 		parameterTypes.callService({ names }, (r) => {
// 			console.log(r)
// 		})
// 	})
// }

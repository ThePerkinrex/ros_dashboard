import { Service } from 'roslib'
import { ros_singleton, type RosNode } from './ros'

export enum ParamType {
	NOT_SET = 0,
	BOOL = 1,
	INTEGER = 2,
	DOUBLE = 3,
	STRING = 4,
	BYTE_ARRAY = 5,
	BOOL_ARRAY = 6,
	INTEGER_ARRAY = 7,
	DOUBLE_ARRAY = 8,
	STRING_ARRAY = 9,
	UNKNOWN = -1,
}

interface ParameterValueMsg {
	type: ParamType
	bool_value?: boolean
	integer_value?: number
	double_value?: number
	string_value?: string
	byte_array_value?: number[]
	bool_array_value?: boolean[]
	integer_array_value?: number[]
	double_array_value?: number[]
	string_array_value?: string[]
}

function getValue<K extends keyof typeof ParamType>(
	type: (typeof ParamType)[K],
	msg: ParameterValueMsg,
): RosParamValueMap[K] {
	if (msg.type === undefined) console.log(msg)
	if (type !== msg.type && msg.type !== undefined) {
		throw new Error(`Unexpected type: ${msg.type}, but expected ${type}`)
	}
	switch (type) {
		case ParamType.BOOL:
			return msg.bool_value as RosParamValueMap[K]
		case ParamType.INTEGER:
			return msg.integer_value as RosParamValueMap[K]
		case ParamType.DOUBLE:
			return msg.double_value as RosParamValueMap[K]
		case ParamType.STRING:
			return msg.string_value as RosParamValueMap[K]
		default:
			throw new Error('Unsupported type')
	}
}

function getValueMsg<K extends keyof typeof ParamType>(
	type: (typeof ParamType)[K],
	v: RosParamValueMap[K],
): ParameterValueMsg {
	let msg: ParameterValueMsg = { type: type }
	switch (type) {
		case ParamType.BOOL:
			msg.bool_value = v
			break
		case ParamType.INTEGER:
			msg.integer_value = v
			break
		case ParamType.DOUBLE:
			msg.double_value = v
			break
		case ParamType.STRING:
			msg.string_value = v
			break
		default:
			throw new Error('Unsupported type: ' + type)
	}
	return msg
}

interface RosParamValueMap {
	BOOL: boolean
	INTEGER: number
	DOUBLE: number
	STRING: string
	NOT_SET: any
	BYTE_ARRAY: number[]
	BOOL_ARRAY: boolean[]
	INTEGER_ARRAY: number[]
	DOUBLE_ARRAY: number[]
	STRING_ARRAY: string[]
	UNKNOWN: any
}

export class RosParam<
	Type extends keyof typeof ParamType = keyof typeof ParamType,
> {
	private node: RosNode
	private name: string
	private description?: string
	private type: (typeof ParamType)[Type]

	constructor(
		node: RosNode,
		name: string,
		description: string | undefined,
		type: (typeof ParamType)[Type],
	) {
		this.node = node
		this.name = name
		this.description = description
		this.type = type
	}

	public getName(): string {
		return this.name
	}

	public getDescription(): string | undefined {
		return this.description
	}

	public getType(): (typeof ParamType)[Type] {
		return this.type
	}

	public isBoolean(): this is RosParam<'BOOL'> {
		return this.type == ParamType.BOOL
	}

	public isInteger(): this is RosParam<'INTEGER'> {
		return this.type == ParamType.INTEGER
	}

	public isDouble(): this is RosParam<'DOUBLE'> {
		return this.type == ParamType.DOUBLE
	}

	public isString(): this is RosParam<'STRING'> {
		return this.type == ParamType.STRING
	}

	private async getValueInternal(
		retries: number,
		timeout: number,
	): Promise<ParameterValueMsg> {
		const getParameters = new Service({
			ros: ros_singleton,
			name: this.node.getName() + '/get_parameters',
			serviceType: 'rcl_interfaces/srv/GetParameters',
		})
		let msg: ParameterValueMsg = await new Promise((resolve, reject) => {
			const t = setTimeout(
				() => {
					if (retries > 0) {
						console.log('Retrying ' + this.getName())
						this.getValueInternal(retries - 1, timeout)
							.then(resolve)
							.catch(reject)
					} else {
						reject(new Error('Timeout for ' + this.getName()))
					}
				},
				timeout + Math.random() * 50,
			)
			getParameters.callService(
				{ names: [this.getName()] },
				(r) => {
					clearTimeout(t)
					console.log('resolved', this.getName(), r.values[0])
					resolve(r.values[0])
				},
				(e) => {
					clearTimeout(t)
					console.log('error', this.getName(), e)
					reject(e)
				},
			)
		})
		return msg
	}

	public async getValue(
		retries = 3,
		timeout = 500,
	): Promise<RosParamValueMap[Type]> {
		return getValue(
			this.getType(),
			await this.getValueInternal(retries, timeout),
		)
	}

	public async setValue(v: RosParamValueMap[Type]): Promise<void> {
		const getParameters = new Service({
			ros: ros_singleton,
			name: this.node.getName() + '/set_parameters',
			serviceType: 'rcl_interfaces/srv/SetParameters',
		})
		await new Promise((resolve, reject) => {
			getParameters.callService(
				{
					parameters: [
						{
							name: this.getName(),
							value: getValueMsg(this.getType(), v),
						},
					],
				},
				(r) => {
					console.log(this.getName(), r)
					resolve(undefined)
				},
				reject,
			)
		})
	}
}

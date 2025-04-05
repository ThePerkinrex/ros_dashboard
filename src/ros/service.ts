import { Service, ServiceRequest, ServiceResponse } from 'roslib'
import { ros_singleton } from './ros'

export class RosService {
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

	public call(request: ServiceRequest): Promise<any> {
		return new Promise((resolve) => {
			new Service({
				ros: ros_singleton,
				name: this.getName(),
				serviceType: this.getType(),
			}).callService(request, (r) => resolve(r))
		})
	}
}

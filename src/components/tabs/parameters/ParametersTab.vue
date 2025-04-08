<script setup lang="ts">
import { connection_status, ConnectionStatus, Ros, RosNode } from '@/ros/ros'
import { reactive, ref, watch } from 'vue'
import ParameterInput from './ParameterInput.vue'
import type { RosParam } from '@/ros/params'

const ros = new Ros()

const nodes = ref<RosNode[]>([])
const parameters = ref<RosParam[]>([])
const selectedNode = ref(0)

watch(
	connection_status,
	(c) => {
		if (c === ConnectionStatus.CONNECTED) {
			getNodes()
		}
	},
	{ immediate: true },
)

async function getNodes() {
	nodes.value = await ros.getNodes()
	if (selectedNode.value === 0) {
		await getParameters(nodes.value[0] as RosNode)
	} else {
		selectedNode.value = 0
	}
}

watch(selectedNode, (s) => {
	getParameters(nodes.value[s] as RosNode)
})

async function getParameters(node: RosNode) {
	console.log('Refreshing params')
	parameters.value = []
	parameters.value = await node.getParams()
}

// function getParameters(node: string) {
// 	getParams(node)
// 	const ros = Ros.ros
// 	if (ros != null) {
// 		ros.getParams((params) => {
// 			let new_params = []
// 			parameterValues.values = {}
// 			for (const p of params) {
// 				if (p.startsWith(node)) {
// 					let simple_name = p.substring(node.length + 1)
// 					let par = new Param({ ros: ros, name: p })
// 					par.get((x) => {
// 						const t = typeof x
// 						if (t == 'string' || t == 'number' || t == 'boolean') {
// 							parameterValues.values[simple_name] = {
// 								value: x,
// 								type: t,
// 							}
// 						}
// 					})
// 					new_params.push({
// 						simple_name,
// 						p: par,
// 					})
// 				}
// 			}
// 			parametersObjs.value = new_params
// 		})
// 	}
// }
</script>

<template>
	<div class="main">
		<div class="header">
			<label for="node">Node: </label>
			<select
				id="node"
				@change="
					selectedNode = ($event.target as HTMLSelectElement)
						.selectedIndex
				"
			>
				<option
					v-for="(node, i) in nodes"
					:value="i"
					:key="node.getName()"
				>
					{{ node.getName() }}
				</option>
			</select>
			<button @click="getNodes">Refresh</button>
			<button
				@click="getParameters(nodes[selectedNode] as RosNode)"
				v-if="nodes.length > 0"
			>
				Refresh Values
			</button>
		</div>
		<div class="params">
			<template
				v-for="p in parameters"
				:key="nodes[selectedNode].getName() + ':' + p.getName()"
			>
				<label class="param-name" for="name">{{ p.getName() }}</label>
				<span class="param-value"
					><ParameterInput :param="p as RosParam" :id="p.getName()"
				/></span>
			</template>
		</div>
	</div>
</template>

<style scoped>
.main {
	padding: 2rem;
}

.params {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 1em;
}

.param-name {
	text-align: right;
}
</style>

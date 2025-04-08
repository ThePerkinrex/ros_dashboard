<script setup lang="ts">
import type { RosParam } from '@/ros/params';
import { reactive, ref, watch } from 'vue';

const props = defineProps<{id: string, param: RosParam}>()

const CLEAR_VALUE = {bool: false, string: '', num: 0.0}
const values = ref(CLEAR_VALUE)

async function loadValue(p: RosParam) {
	console.log(' + Loading value for ', p.getName())
	let new_values = {bool: false, string: '', num: 0.0}
	if (p.isBoolean()) {
		new_values.bool = await p.getValue()
	}else if (p.isDouble()) {
		new_values.num = await p.getValue()
	}else if (p.isInteger()) {
		new_values.num = await p.getValue()
	}else if (p.isString()) {
		new_values.string = await p.getValue()
	}else {
		new_values.string = (await p.getValue()) + ''
	}
	values.value = new_values
	console.log(' > Loading value for ', p.getName(), new_values, props.param)
}

watch(props.param, loadValue, {immediate: true})
</script>

<template>
	<input v-if="props.param.isBoolean()" type="checkbox" :checked="values.bool" @change="props.param.setValue(($event.target as HTMLInputElement).checked)" :id="props.id"></input>
	<input v-else-if="props.param.isString()" type="text" :value="values.string" @change="props.param.setValue(($event.target as HTMLInputElement).value)" :id="props.id"></input>
	<input v-else-if="props.param.isDouble()" type="number" :value="values.num" @change="props.param.setValue(parseFloat(($event.target as HTMLInputElement).value))" step="any" :id="props.id"></input>
	<input v-else-if="props.param.isInteger()" type="number" :value="values.num" @change="props.param.setValue(parseInt(($event.target as HTMLInputElement).value))" :id="props.id"></input>
	<span v-else :id="props.id">{{ values.string }}</span>
</template>

<style scoped></style>

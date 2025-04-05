<script setup lang="ts">
import type { RosParam } from '@/ros/params';
import { reactive, watch } from 'vue';

const props = defineProps<{id: string, param: RosParam}>()

const values = reactive({bool: false, string: '', num: 0.0})

async function loadValue(p: RosParam) {
	console.log('Loading value for ', p)
	if (p.isBoolean()) {
		values.bool = await p.getValue()
	}else if (p.isDouble()) {
		values.num = await p.getValue()
	}else if (p.isInteger()) {
		values.num = await p.getValue()
	}else if (p.isString()) {
		values.string = await p.getValue()
	}else {
		values.string = (await p.getValue()) + ''
	}
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

<script setup lang="ts">
import { ConnectionStatus } from '@/ros/ros'
import { computed } from 'vue'
import BoolTopicLight from './util/BoolTopicLight.vue'
import TriggerButton from './util/TriggerButton.vue'
</script>

<template>
	<div class="content">
		<span>Emergency Brake: </span>
		<BoolTopicLight topic="telemetry/emergency" />
		<TriggerButton service="reset_safety_node">Release</TriggerButton>
	</div>
</template>

<style scoped>
.content {
	display: flex;
	flex-direction: row;
	gap: 0.5em;
	align-items: center;
}
</style>

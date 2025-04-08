<script setup lang="ts">
import { ConnectionStatus } from '@/ros/ros'
import type { ArrayOneOrMore } from '@/util'
import { computed, ref, type Component } from 'vue'

export interface Tab {
	title: Component
	content: Component
}

const selectedTab = ref(0)
const { tabs } = defineProps<{ tabs: ArrayOneOrMore<Tab> }>()
</script>

<template>
	<div class="tabbed">
		<aside>
			<div
				v-for="(tab, i) in tabs"
				:key="i"
				:class="['tab-title', { active: selectedTab === i }]"
				@click="selectedTab = i"
			>
				<component :is="tab.title"></component>
			</div>
		</aside>
		<div
			:class="['content', { active: selectedTab === i }]"
			v-for="(tab, i) in tabs"
		>
			<component :is="tab.content" class="tab"></component>
		</div>
	</div>
</template>

<style scoped>
.tabbed {
	display: flex;
	flex-direction: row;
	height: 100%;
}

.tabbed > * {
	height: 100%;
}

.content.active {
	flex-grow: 1;
	display: block;
}

.content {
	display: none;
}

aside {
	border-right: 2px solid black;
}

.tab-title {
	padding: 0.5rem;
}

.tab-title.active {
	background-color: rgb(18, 47, 128);
}
</style>

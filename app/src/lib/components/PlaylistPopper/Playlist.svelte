<script lang="ts">
	export let item = {};
	export let i;
	import { createEventDispatcher } from "svelte";
	const dispatch = createEventDispatcher();
	let active;
</script>

<li
	on:click={() => {
		dispatch("click", i);
	}}
>
	<div class="image">
		<img
			src={item?.thumbnail}
			width="64"
			height="64"
			alt="thumbnail"
		/>
	</div>
	<div class="list-item-body">
		<p class="title">{item.name}</p>
		<p>{Array.isArray(item.items) ? item?.items.length : "??"} songs</p>
	</div>
</li>

<style lang="scss">
	.image {
		max-width: 5.333333rem;
		max-height: 5.333333rem;

		img {
			max-width: inherit;
			max-height: inherit;
			width: 100%;
			height: 100%;
		}
	}

	.list-item-body {
		display: flex;
		flex-direction: column;
	}

	li {
		display: flex;
		flex-direction: row;
		padding: 0.5rem;
		gap: 0.8rem;
		border-radius: $sm-radius;
		// backdrop-filter: brightness(2);backdrop-filter
		transition: backdrop-filter linear 50ms;
		border: rgb(163 163 163 / 21.2%) solid 1px;
		align-items: center;

		&:hover {
			backdrop-filter: brightness(1.95);
			cursor: pointer;
		}

		&:active:hover {
			backdrop-filter: brightness(2.25);
		}
	}
</style>

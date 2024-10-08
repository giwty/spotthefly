// Credit: https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/loop.ts

import { browser } from "$app/environment";

const raf = browser
	? requestAnimationFrame
	: () => {
			return;
	  };

export interface Task {
	promise: Promise<void>;

	abort(): void;
}

type TaskCallback = (now: number) => boolean | void;
type TaskEntry = { c: TaskCallback; f: () => void };

const tasks = new Set<TaskEntry>();

function run_tasks(now: number) {
	tasks.forEach((task) => {
		if (!task.c(now)) {
			tasks.delete(task);
			task.f();
		}
	});

	if (tasks.size !== 0) raf(run_tasks);
}

/**
 * For testing purposes only!
 */
export function clear_loops() {
	tasks.clear();
}

/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 */
export function loop(callback: TaskCallback): Task {
	let task: TaskEntry;

	if (tasks.size === 0) raf(run_tasks);

	return {
		promise: new Promise((fulfill) => {
			tasks.add((task = { c: callback, f: fulfill }));
		}),
		abort() {
			tasks.delete(task);
		},
	};
}

<script
    context="module"
    lang="ts"
>
    const volumeMenuHandler = (callback: () => void, delay: number) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const toggle = () => {
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            } else {
                timer = setTimeout(callback, delay);
            }
        };

        return {
            toggle,
        };
    };

    export const createPlayerPopperMenu = (
        $currentTrack: Item,
        $queuePosition: number,
        hasActiveSession = false,
        $SITE_ORIGIN_URL: string,
    ) =>
        buildDropdown()
            .add("View Artist", () => {
                window.scrollTo({
                    behavior: "smooth",
                    top: 0,
                    left: 0,
                });
                goto(`/artist/${$currentTrack.artistInfo.artist[0].browseId}`);
            })
            .add("Add to Playlist", async () => {
                showAddToPlaylistPopper.set({ state: true, item: $currentTrack });
            })
            .add(
                hasActiveSession ? "Share Group Session" : "Start Group Session",
                hasActiveSession
                    ? async () => {
                        if (!browser) return;
                        const shareData = {
                            title: `Join ${groupSession.client.displayName}'s Beatbump Session`,

                            url: `${$SITE_ORIGIN_URL}/session?token=${IsoBase64.toBase64(
                                JSON.stringify({
                                    clientId: groupSession.client.clientId,
                                    displayName: groupSession.client.displayName,
                                }),
                            )}`,
                        };
                        try {
                            if (!navigator.canShare) {
                                await navigator.clipboard.writeText(shareData.url);
                                notify("Link copied successfully", "success");
                            } else {
                                const share = await navigator.share(shareData);
                                notify("Shared successfully", "success");
                            }
                        } catch (error) {
                            notify("Error: " + error, "error");
                        }
                    }
                    : async () => {
                        if (!browser) return;
                        showGroupSessionCreator.set(true);
                    },
            )
            .add("Shuffle", () => {
                list.shuffle($queuePosition, true);
            })
            .add("Download", async () => {
               // var mediaStream = AudioPlayer.player?.captureStream();
               // var url = webkitURL.createObjectURL(mediaStream);
                const aelem = document.createElement("a");
                document.body.appendChild(aelem);
                aelem.setAttribute("href", AudioPlayer.player?.currentSrc);
                aelem.setAttribute("target","_blank")
               // aelem.setAttribute("download", "video.mp3");
                aelem.click();
                document.body.removeChild(aelem);
            })
            .build()
            .filter(Boolean);
</script>

<script lang="ts">
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import Icon from "$components/Icon/Icon.svelte";
	import { clickOutside } from "$lib/actions/clickOutside";
	import { IMAGE_NOT_FOUND } from "$lib/constants";
	import { AudioPlayer } from "$lib/player";
	import { groupSession, isMobileMQ } from "$lib/stores";
	import list, { currentTrack, queue, queuePosition } from "$lib/stores/list";
	import { IsoBase64, notify, slide } from "$lib/utils";
	import { messenger } from "$lib/utils/sync";
	import { IDBService } from "$lib/workers/db/service";
	import {
		playerLoading,
		showAddToPlaylistPopper,
		showGroupSessionCreator,
	} from "$stores/stores";
	import { PopperButton } from "../Popper";
	import Controls from "./Controls.svelte";
	import ProgressBar from "./ProgressBar";
	import { fullscreenStore } from "./channel";
	import keyboardHandler from "./keyboardHandler";

	import { buildDropdown } from "$lib/configs/dropdowns.config";
	import type { Item } from "$lib/types";
	import SessionListService from "$stores/list/sessionList";
	import { SITE_ORIGIN_URL } from "$stores/url";
	import PlayerButton from "./PlayerButton.svelte";

	const { paused, volume: AudioPlayerVolume } = AudioPlayer;

	$: volume = $AudioPlayerVolume;
	let volumeHover = false;

	const handleVolumeHover = volumeMenuHandler(() => {
		volumeHover = !volumeHover;
	}, 500);

	$: isPlaying = $paused;

	messenger.listen("player", () => {
		AudioPlayer.play();
	});

	function handleImageError(event: Event) {
		(event.target as HTMLImageElement).src = IMAGE_NOT_FOUND;
	}

	$: DropdownItems = createPlayerPopperMenu(
		$currentTrack,
		$queuePosition,
		$groupSession.hasActiveSession,
		$SITE_ORIGIN_URL,
	);

	const shortcut = {
		Comma: () => {
			SessionListService.previous();
		},
		Period: () => {
			SessionListService.next();
		},
		Space: () => {
			if (!AudioPlayer && !AudioPlayer.src) return;
			if (AudioPlayer.paused) {
				AudioPlayer.play();
			} else {
				AudioPlayer.pause();
			}
		},
	};
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="player"
	aria-haspopup="true"
	on:click={(e) => {
		fullscreenStore.toggle();
	}}
	tabindex="-1"
	use:keyboardHandler={{ shortcut }}
>
	<div
		class="now-playing"
		style="align-items:center;"
	>
		{#if $queue.length !== 0}
			<img
				width="64"
				height="64"
				on:error|capture={handleImageError}
				src={$currentTrack?.thumbnails?.[0]?.url ?? IMAGE_NOT_FOUND}
				alt="{$currentTrack?.title} thumbnail image"
			/>
			<div
				class="container"
				style="
    font-weight: 400;
    font-family: ''Commissioner Variable'';
    letter-spacing: -0.02em;"
			>
				<span class="now-playing-title">{$currentTrack?.title}</span>
				<span class="now-playing-artist"
					>{$currentTrack?.artistInfo?.artist?.[0]?.text}</span
				>
			</div>
		{:else}
			<img
				width="64"
				height="64"
				on:error={(event) => handleImageError(event)}
				style="object-fit:scale-down; background: #000;"
				src={IMAGE_NOT_FOUND}
				alt=""
			/>
			<div
				class="container"
				style="gap:0.20125em;"
			>
				<span>Not Playing</span>
				<div />
			</div>
		{/if}
	</div>
	<div
		class="player-controls"
		style:display={$isMobileMQ ? "none" : "block"}
	>
		{#if !$isMobileMQ}
			<Controls
				bind:isPaused={isPlaying}
				bind:loading={$playerLoading}
				on:play={() => AudioPlayer.play()}
				pause={() => AudioPlayer.pause()}
				nextBtn={() => {
					if ($queue.length === 0) return;
					SessionListService.next(undefined, true);
					// AudioPlayer.updateTime($durationStore);
				}}
				prevBtn={() => {
					if ($queue.length && $SessionListService.position >= 1)
						SessionListService.previous(true);
				}}
			/>
			<ProgressBar />
		{/if}
	</div>

	<div class="player-right">
		<div
			class="container row"
			style="gap:0.5em;"
		>
			<div
				class="volume"
				on:pointerleave={handleVolumeHover.toggle}
				use:clickOutside
				on:click_outside={() => (volumeHover = false)}
			>
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<div
					color="white"
					class="volume-icon player-btn"
					on:pointerover={() => {
						handleVolumeHover.toggle();
					}}
					on:click|capture|stopPropagation={() => (volumeHover = !volumeHover)}
				>
					<Icon
						color="white"
						name="volume"
						size="1.625em"
					/>
				</div>
				{#if volumeHover}
					<div
						class="volume-wrapper"
						transition:slide|global={{ duration: 80, y: 100 }}
					>
						<div class="volume-slider">
							<input
								class="volume"
								type="range"
								on:click|capture|stopPropagation={() => {
									// no empty
								}}
								on:input|capture|stopPropagation={(e) => {
									let linear =
										(e.target instanceof HTMLInputElement
											? e.target.valueAsNumber
											: volume) / 1;
									let sqrt = Math.pow(linear, 1.2);
									AudioPlayer.setVolume(sqrt);
								}}
								bind:value={volume}
								min="0"
								max="1"
								step="any"
							/>
						</div>
					</div>
				{/if}
			</div>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				on:click|capture|stopPropagation={() => {
					if (!$queue) return;
					fullscreenStore.toggle();
				}}
				class="listButton player-btn"
			>
				<Icon
					color="white"
					name="queue"
					size="1.625em"
				/>
			</div>
			{#if !$isMobileMQ}
				<div class="menu-container">
					<PopperButton
						tabindex={-1}
						type="player"
						size="1.625em"
						items={DropdownItems}
					/>
				</div>
			{:else}
				<div class="menu-container">
					<PlayerButton />
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	@import "../../../global/stylesheet/components/player";
	.now-playing {
		display: flex;
		grid-area: n;
		line-height: 1.3;
		font-size: 0.95em;
		gap: 0.95em;

		@media screen and (min-width: 720px) {
			line-height: 1.4;
			font-size: 14px;
			// gap: 0.875em;gap
		}

		> .container {
			visibility: visible;
			display: flex;

			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			line-clamp: 2;
			overflow: hidden;
			// }
		}
	}
	:where(.now-playing) title {
		display: block;
		white-space: nowrap;
		text-overflow: ellipsis;
		max-width: calc(100% - 0.2em);
		overflow: hidden;

		font-size: 12px;

		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		line-clamp: 1;
		overflow: hidden;
	}
	.now-playing-artist {
		display: block;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7) !important;

		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		line-clamp: 2;
		overflow: hidden;
	}
	.now-playing img {
		object-fit: contain;
		background: #000;
		max-height: 4.25rem;
		max-width: 4.25rem;
		width: 100%;
	}
	.player-controls {
		width: 100%;
	}

	row {
		position: relative;
	}

	.hidden {
		display: none !important;
		visibility: hidden !important;
	}

	.volume {
		position: relative;
		will-change: visibility, display;
		@media screen and (max-width: 575.75px) {
			visibility: hidden;
			display: none;
		}
	}

	.listButton {
		visibility: hidden !important;
		order: -1;
		pointer-events: none;
	}

	.player {
		background-color: inherit;
	}

	.volume-wrapper {
		background: var(--dark-bottom);
		display: flex;

		position: absolute;
		bottom: 7em;
		transform: rotate(-90deg);
		padding: 0 0.4rem;
		left: calc(calc(100% * -1) + 2px);
		height: 1.3rem;
		border-radius: 0.6rem;
		isolation: isolate;
		z-index: 100;
		&::before {
			content: "";
			position: absolute;
			width: 100%;
			// bottom: 0;
			// inset: 0;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			height: 2rem;
		}
	}

	.volume-slider {
		height: 100%;
		background: var(--dark-bottom);

		display: flex;
		align-items: center;
	}

	.volume-icon {
		cursor: pointer;
	}

	.menu-container {
		padding: 0;
		position: relative;
		place-self: flex-end;
		align-self: center;
		@media screen and (max-width: 575.5px) {
			position: relative !important;
			place-self: center;
		}
	}

	.player-left,
	.player-right {
		align-self: center;

		align-items: center;
	}

	.player-right {
		grid-area: r;
		display: inline-flex;
		justify-content: end;
		.container {
			width: auto;
		}
	}

	@media screen and (min-width: 720px) {
		.listButton {
			visibility: visible !important;
			order: 0;
			pointer-events: unset;
		}
	}
</style>

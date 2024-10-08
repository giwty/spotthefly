import type { Thumbnail } from "$lib/types";
import type {
	IMusicResponsiveListItemRenderer,
	PurpleRun,
} from "$lib/types/innertube/internals";
import type { IListItemRenderer } from "$lib/types/musicListItemRenderer";
import type { proxyUrls } from "$lib/utils/thumbnailProxyUrl";
import { subtitle, thumbnailTransformer } from "../utils.parsers";

export async function MusicResponsiveListItemRenderer(
	ctx: { musicResponsiveListItemRenderer: IMusicResponsiveListItemRenderer },
	params: {
		playlistSetVideoId?: boolean;
		playlistId?: string;
		rewriteThumbnails?: ReturnType<typeof proxyUrls> | undefined;
		type?: string | undefined;
	} = {},
): Promise<IListItemRenderer> {
	const { playlistSetVideoId, playlistId, type, rewriteThumbnails } = params;
	const item = ctx.musicResponsiveListItemRenderer;
	const thumbnails = (
		item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
	).map((thumbnail) => {
		const parsed = {
			...thumbnail,
			...thumbnailTransformer(thumbnail.url),
		};
		return rewriteThumbnails ? rewriteThumbnails(parsed) : parsed;
	});

	const flexColumns = Array.isArray(item.flexColumns) && item.flexColumns;
	const subtitleRuns =
		flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
	const flexCol0 =
		flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs[0] ||
		({} as PurpleRun);
	const subtitles = Array.isArray(subtitleRuns) && subtitle(subtitleRuns);
	const isNavigationItem = item.navigationEndpoint?.browseEndpoint;
	const Item: IListItemRenderer = Object.create(null);
	Object.assign(Item, {
		subtitle: subtitles,
		artistInfo: {
			artist: [subtitles[0]],
		},
		explicit: "badges" in item,
		title: flexCol0.text,
		aspectRatio: item.flexColumnDisplayStyle,
		musicVideoType:
			flexCol0.navigationEndpoint?.watchEndpoint?.watchEndpointMusicConfig
				?.musicVideoType ??
			flexCol0.navigationEndpoint?.watchEndpoint
				?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig
				?.musicVideoType,
		videoId: flexCol0.navigationEndpoint?.watchEndpoint?.videoId ?? undefined,
		playlistId: flexCol0.navigationEndpoint?.watchEndpoint?.playlistId
			? flexCol0?.navigationEndpoint?.watchEndpoint?.playlistId
			: item.menu?.menuRenderer.items[0].menuNavigationItemRenderer
					?.navigationEndpoint?.watchEndpoint?.playlistId
			? item.menu?.menuRenderer?.items[0]?.menuNavigationItemRenderer
					.navigationEndpoint?.watchEndpoint?.playlistId
			: item?.watchEndpoint?.playlistId,
		thumbnails: thumbnails as (Thumbnail & { placeholder: string })[],
		length:
			"fixedColumns" in item &&
			item.fixedColumns[0]?.musicResponsiveListItemFixedColumnRenderer?.text
				?.runs?.length
				? item.fixedColumns[0]?.musicResponsiveListItemFixedColumnRenderer?.text
						?.runs[0]?.text
				: undefined,
		type: type,
		params:
			item.overlay?.musicItemThumbnailOverlayRenderer?.content
				?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchPlaylistEndpoint
				?.params ?? undefined,
		playerParams:
			flexCol0?.navigationEndpoint?.watchEndpoint?.playerParams ||
			flexCol0?.navigationEndpoint?.watchEndpoint?.params,
		clickTrackingParams:
			flexCol0?.navigationEndpoint?.clickTrackingParams ||
			item.overlay?.musicItemThumbnailOverlayRenderer?.content
				?.musicPlayButtonRenderer?.playNavigationEndpoint?.clickTrackingParams,
		loggingContext:
			item.overlay?.musicItemThumbnailOverlayRenderer?.content
				?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint
				?.loggingContext,
	});
	if (isNavigationItem)
		Item.endpoint = {
			browseId: isNavigationItem.browseId,
			pageType:
				isNavigationItem.browseEndpointContextSupportedConfigs
					.browseEndpointContextMusicConfig.pageType,
		};
	if (Item !== undefined && playlistSetVideoId) {
		Object.assign(Item, {
			playlistSetVideoId:
				item?.playlistSetVideoId ||
				item.overlay?.musicItemThumbnailOverlayRenderer.content
					?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint
					?.playlistSetVideoId,
			playlistId,
		});
	}
	if (Array.isArray(Item.subtitle) && Item.subtitle[0].text === "Artist") {
		Object.assign(Item, {
			artistInfo: {
				artist: [
					{
						pageType:
							item.navigationEndpoint?.browseEndpoint
								?.browseEndpointContextSupportedConfigs
								?.browseEndpointContextMusicConfig?.pageType,
						browseId: item?.navigationEndpoint?.browseEndpoint?.browseId,
					},
				],
			},
		});
	}

	return Item;
}

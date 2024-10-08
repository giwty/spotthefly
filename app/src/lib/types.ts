import type { BrowseEndpoint, WatchEndpoint } from "./types/innertube/internals";
import type { ICarouselTwoRowItem } from "./types/musicCarouselTwoRowItem";
import type { IListItemRenderer } from "./types/musicListItemRenderer";
import type { PlaylistSearch } from "./types/playlist";
import type { IMergedObject } from "./types/utilities";
export interface CarouselHeader {
	browseId?: string;
	title: string;
	params?: string;
	itct?: string;
	subheading?: string;
	type?: string;
}

export interface MoodsAndGenresItem {
	color: string;
	endpoint: { params: string };
	text: string;
}
export interface ICarousel<T extends IListItemRenderer | MoodsAndGenresItem> {
	header: CarouselHeader;
	results: T[];
	isBrowse?: boolean;
}
export type Item = IMergedObject<
	IMergedObject<IListItemRenderer, ICarouselTwoRowItem>,
	Song
>;

export interface Album {
	browseId?: string;
	title?: string;
	pageType?: string;
}
export type SearchContents = {
	results: PlaylistSearch[] | Song[];
	length: number;
};
export interface Song {
	album?: Album;
	index?: number;
	itct?: string;
	title: string;
	artistInfo?: ArtistInfo;
	videoId: string;
	type?: string;
	playlistId?: string;
	params?: string;
	autoMixList?: string;
	thumbnails: Array<Thumbnail>;
	length?: string & { text?: string };
	explicit?: boolean;
	hash?: string;
	playlistSetVideoId?: string;
	playerParams?: string;
	musicVideoType?: string;
}

export interface Continuation {
	nextContinuationData: NextContinuationData;
}

export interface NextContinuationData {
	continuation: string;
	clickTrackingParams: string;
}

export interface TitleEndpoint {
	title: string;
	playlistId: string;
	videoId: string;
}
export interface Artist {
	pageType?: string;
	text?: string;
	browseId?: string;
}
export interface Thumbnail {
	url: string;
	width: number;
	height: number;
	placeholder?: string;
	original_url?: string;
}

export interface ArtistInfo {
	pageType?: string;
	artist?: Array<Artist>;
	browseId?: string;
}

export interface Subtitle {
	text?: string;
	browseId?: string;
	pageType?: string;
	contentRating?: string | undefined;
}

export type NavigationEndpoint = {
	browseEndpoint: {
		browseId: string;
	};
    watchEndpoint: never;
} | {
    watchEndpoint: WatchEndpoint;
    browseEndpoint: never;
};

export interface SearchResult {
	title: string;
	artist?: string;
	endpoint?: string;
	videoId: string;
	playlistId: string;
	params?: string;
	thumbnails: Array<Thumbnail>;
	subtitle?: Subtitle[];
}
export type CarouselItem = {
	artistInfo?: ArtistInfo;
	title: string;
	artist?: string;
	endpoint?: ItemEndpoint;
	aspectRatio?: string;
	videoId?: string;
	playlistId: string;
	explicit?: boolean;
	params?: string;
	thumbnails: Array<Thumbnail>;
	browseEndpoint?: BrowseEndpoint;
	subtitle?: Subtitle[];
	playlistSetVideoId?: string;
	playerParams?: string;
	musicVideoType?: string;
};

export type ItemEndpoint = {
	browseId: string;
	pageType: string;
};
export interface mixList {
	continuation: string;
	autoMixList?: string;
	artistId?: string;
	itct?: string;
	index?: number;
	videoId: string;
	title: string;
	id?: number;
	artist: string;
	thumbnail?: string;
	length: string;
}
export enum RequestType {
	artist = "artist",
	playlist = "playlist",
}
export type JSON =
	| string
	| number
	| boolean
	| JSON[]
	| Record<string, { [key: string]: JSON }>;

export type RequestParams = {
	endpoint?: string;
	browseId?: string;
	continuation?: JSON;
	type?: string;
	videoId?: string;
	path?: string;
	playlistId?: string;
};

export type Nullable<T> = T | null;

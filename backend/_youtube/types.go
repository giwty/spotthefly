package _youtube

type innertubeRequest struct {
	ActivePlayers                    []map[string]string               `json:"activePlayers,omitempty"`
	VideoID                          string                            `json:"videoId,omitempty"`
	PlaylistId                       string                            `json:"playlistId,omitempty"`
	PLayerParams                     string                            `json:"playerParams,omitempty"`
	BrowseID                         string                            `json:"browseId,omitempty"`
	Query                            string                            `json:"query,omitempty"`
	Input                            *string                           `json:"input,omitempty"`
	Continuation                     map[string]string                 `json:"continuation,omitempty"`
	Context                          inntertubeContext                 `json:"context"`
	PlaybackContext                  *playbackContext                  `json:"playbackContext,omitempty"`
	ContentCheckOK                   bool                              `json:"contentCheckOk,omitempty"`
	RacyCheckOk                      bool                              `json:"racyCheckOk,omitempty"`
	Params                           string                            `json:"params,omitempty"`
	EnablePersistentPlaylistPanel    bool                              `json:"enablePersistentPlaylistPanel"`
	IsAudioOnly                      bool                              `json:"isAudioOnly"`
	TunerSettingValue                string                            `json:"tunerSettingValue"`
	PlaylistSetVideoId               string                            `json:"playlistSetVideoId,omitempty"`
	BrowseEndpointContextMusicConfig *BrowseEndpointContextMusicConfig `json:"browseEndpointContextMusicConfig,omitempty"`
	User                             *User                             `json:"user,omitempty"`
	ClickTracking                    *ClickTracking                    `json:"clickTracking,omitempty"`
	ServiceIntegrityDimensions       *ServiceIntegrityDimensions       `json:"serviceIntegrityDimensions,omitempty"`
}

type ServiceIntegrityDimensions struct {
	PoToken string `json:"poToken"`
}

type ClickTracking struct {
	ClickTrackingParams string `json:"clickTrackingParams"`
}

type User struct {
	LockedSafetyMode bool `json:"lockedSafetyMode,omitempty"`
}

type SearchRequest struct {
	Query  string `json:"query,omitempty"`
	Filter string `json:"filter,omitempty"`
	Itct   string `json:"itct,omitempty"`
	Ctoken string `json:"ctoken,omitempty"`
}

type playbackContext struct {
	ContentPlaybackContext contentPlaybackContext `json:"contentPlaybackContext"`
}

type contentPlaybackContext struct {
	// SignatureTimestamp string `json:"signatureTimestamp"`
	HTML5Preference string `json:"html5Preference"`
}

type inntertubeContext struct {
	Client innertubeClient `json:"client"`
	//Request       string          `json:"request"`
	User map[string]string `json:"user"`
	//CaptionParams string          `json:"caption_params"`
}

type innertubeClient struct {
	HL                 string  `json:"hl,omitempty"`
	GL                 string  `json:"gl,omitempty"`
	ClientName         string  `json:"clientName"`
	ClientVersion      string  `json:"clientVersion"`
	AndroidSDKVersion  int     `json:"androidSDKVersion,omitempty"`
	UserAgent          string  `json:"userAgent,omitempty"`
	TimeZone           string  `json:"timeZone,omitempty"`
	UTCOffset          int     `json:"utcOffsetMinutes,omitempty"`
	VisitorData        string  `json:"visitorData,omitempty"`
	OriginalUrl        *string `json:"originalUrl,omitempty"`
	DeviceExperimentId *string `json:"deviceExperimentId,omitempty"`
	DeviceMake         *string `json:"deviceMake,omitempty"`
	BrowserName        *string `json:"BrowserName,omitempty"`
	BrowserVersion     *string `json:"browserVersion,omitempty"`
	Platform           *string `json:"platform,omitempty"`
}

type Params map[string]string

type ClientInfo struct {
	ClientName        string
	ClientKey         string
	ClientVersion     string
	userAgent         string
	AndroidSdkVersion int
	DeviceModel       string
}

var (
	MWebClient = ClientInfo{
		ClientName:    "MWEB",
		ClientVersion: "2.20240726.01.00",
		//ClientKey:     "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
		//userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	}

	// WebClient, better to use Android client but go ahead.
	WebClient = ClientInfo{
		ClientName:    "WEB",
		ClientVersion: "2.20240726.00.00",
		ClientKey:     "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
		userAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	}

	// AndroidClient, download go brrrrrr.
	AndroidClient = ClientInfo{
		ClientName:    "ANDROID",
		ClientVersion: "19.09.37",
		ClientKey:     "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
		userAgent:     "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",

		AndroidSdkVersion: 30,
	}

	IOS = ClientInfo{
		ClientName:    "IOS",
		ClientVersion: "19.29.1",
		//ClientKey:     "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc", // seems like same ClientKey works for both clients
		DeviceModel: "iPhone16,2",
		userAgent:   "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
	}

	IOS_MUSIC = ClientInfo{
		ClientName:    "IOS_MUSIC",
		ClientVersion: "7.27.0",
		//ClientKey:     "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc", // seems like same ClientKey works for both clients
		DeviceModel: "iPhone16,2",
		userAgent:   "com.google.ios.youtubemusic/7.27.0 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
	}

	WEB_CREATOR = ClientInfo{
		ClientName:    "WEB_CREATOR",
		ClientVersion: "1.20240723.03.00",
		//ClientKey:     "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc", // seems like same ClientKey works for both clients
		//DeviceModel: "iPhone16,2",
		//userAgent:   "com.google.ios.youtubemusic/7.27.0 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
	}

	WebMusic = ClientInfo{
		ClientName:    "WEB_REMIX",
		ClientVersion: "1.20240724.00.0",

		//	ClientKey: "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30", // seems like same ClientKey works for both clients
		userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
	}

	// EmbeddedClient, not really tested.
	EmbeddedClient = ClientInfo{
		ClientName:    "WEB_EMBEDDED_PLAYER",
		ClientVersion: "1.20220731.00.00",
		ClientKey:     "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", // seems like same ClientKey works for both clients
		userAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	}
)

type PageType string

var PageType_MusicPageTypeAlbum PageType = "MUSIC_PAGE_TYPE_ALBUM"
var PageType_MusicPageTypeArtist PageType = "MUSIC_PAGE_TYPE_ARTIST"
var PageType_MusicPageTypePlaylist PageType = "MUSIC_PAGE_TYPE_PLAYLIST"
var PageType_MusicPageTypeTrackLyrics PageType = "MUSIC_PAGE_TYPE_TRACK_LYRICS"
var PageType_MusicPageTypeTrackRelated PageType = "MUSIC_PAGE_TYPE_TRACK_RELATED"
var PageType_MusicPageTypeUserChannel PageType = "MUSIC_PAGE_TYPE_USER_CHANNEL"

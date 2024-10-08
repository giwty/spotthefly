import { browser } from "$app/environment";
import type { Item, JSON, Nullable } from "$lib/types";
import { every, filter, iter } from "$lib/utils/collections";
import { Logger } from "$lib/utils/logger";
import { WritableStore } from "$lib/utils/stores";
import { generateId } from "$lib/utils/strings/id";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";
import SessionListService, { type ISessionListProvider } from "./list/";

import { AudioPlayer, getSrc } from "$lib/player";
import { EventEmitter, Mutex } from "$lib/utils/sync";
import { notify } from "$lib/utils/utils";
import { get, type StartStopNotifier, type Unsubscriber } from "svelte/store";

type BaseKind = "action" | "state" | "status";
type Kind =
	| BaseKind
	| "state.set.mix"
	| "state.update.allCanPlay"
	| "state.update.mix"
	| "state.update.continuation"
	| "state.update.position"
	| "action.mix.init";
type Command =
	| "SEND"
	| "GET"
	| "CONNECT"
	| "DISCONNECT"
	| "CONFIG"
	| "PUT"
	| "PATCH";
type Status = "OK" | "ERROR";

/// Client Types
export type ConnectionState = {
	finished?: boolean;
	paused?: boolean;
	playing?: boolean;
	stalled?: boolean;
	pos?: number;
};
export type ConnectionStates = {
	[key: string]: ConnectionState;
};
type ClientID = string;
type Permissions = {
	modifyQueue: boolean;
	skipGlobal: boolean;
	playPauseGlobal: boolean;
};
interface Client {
	// #region Properties (3)

	clientId: ClientID;
	displayName: string;
	role: "host" | "guest";

	// #endregion Properties (3)
}
interface ConnectedClient extends Client {
	// #region Properties (1)

	permissions: Permissions;

	// #endregion Properties (1)
}
export interface Settings {
	// #region Properties (1)

	forceSync: boolean;

	// #endregion Properties (1)
}

interface Message {
	// #region Properties (4)

	command: Command;
	data: JSON;
	metadata: Client;
	type: Kind;

	// #endregion Properties (4)
}

/// Store Types
interface GroupSessionController {
	// #region Public Methods (6)

	/** Connect to a group session as a guest */
	connect(id: string): void;
	/** Disconnects from a group session */
	disconnect(): void;
	/** Initiates a new WebRTC client */
	init(displayName: string): void;
	/** Process data received from connected clients */
	process(data: string): unknown;
	/** Send a command to connected clients */
	send(
		command: Command,
		type: Kind,
		data: Record<string, unknown>,
		metadata?: Client,
	): void;
	/** Send client state to other clients in session */
	sendGroupState(clientState: { client: string; state: ConnectionState }): void;

	// #endregion Public Methods (6)
}

interface GroupSessionModel {
	// #region Properties (5)

	client: Client;
	connection?: DataConnection;
	connections: DataConnection[];
	rtc?: Peer;
	settings: Settings;

	// #endregion Properties (5)
}

export class GroupSession
	extends EventEmitter
	implements GroupSessionController, GroupSessionModel
{
	// #region Properties (15)

	private _allCanPlay = false;
	private _client: Client;
	private _connection: DataConnection;
	private _connectionStates: WritableStore<ConnectionStates> =
		new WritableStore({});
	private _connections: DataConnection[] = [];
	private _hasActiveSession: WritableStore<boolean> =
		new WritableStore<boolean>(false);
	private _history: WritableStore<Message[]> = new WritableStore([]);
	private _initialized = false;
	private _once = false;
	private _peerIds: Set<ClientID> = new Set<ClientID>([]);
	private _peerJs: typeof Peer;
	private _rtc: Peer;
	private _settings: Settings;
	private _type: "host" | "guest";
	private _unsubscriber: () => void;
	private _lock: Mutex;
	private _resolver: { resolve: () => void; cb: () => void }[] = [];
	// #endregion Properties (15)
	public get hasActiveSessionState() {
		return this._hasActiveSession;
	}
	private subscribers = new Set<
		(v: this, startStop?: StartStopNotifier<typeof this>) => void
	>();
	// #region Constructors (1)
	public subscribe = (
		run: (
			value: this,
			startStop?: StartStopNotifier<typeof this>,
		) => Unsubscriber,
	) => {
		this.subscribers.add(run);
		run(this);
		return () => {
			this.subscribers.delete(run);
			if (this.subscribers.size <= 1) {
				this.subscribers.clear();
			}
		};
	};
	constructor() {
		super({});
		this._lock = new Mutex();

		// Import PeerJS here since importing it normally would
		// crash during SSR
		if (browser) {
			import("peerjs").then((module) => {
				this._peerJs = module.default;
			});
		}

		// Listen to the connectionStates store for
		// keeping accurate track of state
		this._unsubscriber = this._connectionStates.subscribe(async (value) => {
			const entries = Object.values(value);

			if (
				!this._once &&
				!this._allCanPlay &&
				entries.length !== 0 &&
				every(entries, (item) => item?.finished === true) === true
			) {
				this._once = true;
				this._allCanPlay = true;
				if (this.client.role === "host") {
					await SessionListService.next(void 0, true);
				}
				setTimeout(() => (this._once = false), 0);
			}
		});
	}

	// #endregion Constructors (1)

	// #region Public Accessors (9)

	public get client(): Client {
		return this._client;
	}

	public get connection(): DataConnection {
		return this._connection;
	}

	public get connections(): DataConnection[] {
		return this._connections;
	}

	public get hasActiveSession(): boolean {
		return this._hasActiveSession.value;
	}

	public get history(): WritableStore<Message[]> {
		return this._history;
	}

	public get initialized(): boolean {
		return this._initialized;
	}

	public get rtc(): Peer {
		return this._rtc;
	}

	public get settings(): Settings {
		return this._settings;
	}

	public get type(): "host" | "guest" {
		return this._type;
	}

	// #endregion Public Accessors (9)

	// #region Public Methods (13)

	public async addToQueue(item: Item, position: number): Promise<void> {
		if (!this.initialized && !this.hasActiveSession) return;

		await this._lock.do(() => {
			SessionListService.setTrackWillPlayNext(item, position).then(() => {
				this.send(
					"PUT",
					"state.update.mix",
					SessionListService.toJSON(),
					this.client,
				);
			});
		});
	}
	public resetAllCanPlay() {
		this._once = false;
		this._allCanPlay = false;
	}
	public allCanPlay(): [boolean, () => void] {
		return [
			this._allCanPlay,
			() => {
				this._once = false;
				this._allCanPlay = false;
			},
		];
	}
	public waitUntilPlayable = (cb: () => void) => {
		return new Promise<void>((resolve) => {
			this._resolver.push({ cb, resolve });
		});
	};
	public connect(id: string): void {
		if (!this._rtc) return;
		if (this._peerIds.has(id)) {
			return notify(`Already connected to peer ${id}!`, "error");
		}

		// Connect to the session host, store this connection
		if (!this._hasActiveSession.value) this._hasActiveSession.set(true);

		const connection = this._rtc.connect(id, {
			metadata: {
				clientId: this.client.clientId,
				displayName: this.client.displayName,
				permissions: {},
				role: "guest",
			} as ConnectedClient,
			reliable: true,
			serialization: "binary",
		});

		this._peerIds.add(id);
		this._connections.push(connection);

		this.listenToConnection(connection);

		connection.on("open", () => {
			Logger.debug(`Established connection to ${id}`);
			notify(`Connected to ${connection.peer}`, "success");
		});
		connection.on("close", () => {
			this.disconnect();
		});
	}

	public disconnect(): void {
		this._peerIds.clear();

		if (this.type === "guest") {
			this._connection.close();
			this._rtc.destroy();
		}

		iter(this._connections, (connection) => {
			connection.close();
		});

		this._rtc.destroy();
		this._unsubscriber();
		this._hasActiveSession.set(false);
		this._initialized = false;
		this._connectionStates.set(null);
	}

	public expAutoMix(items: ISessionListProvider): void {
		this.send("PUT", "state.set.mix", JSON.stringify(items), this.client);
	}

	private callSubs = () => this.subscribers.forEach((c) => c(this));

	public init(
		displayName: string,
		type?: "host" | "guest",
		settings: Settings = { forceSync: true },
	): void {
		if (this.initialized) return;
		this._initialized = true;
		this._settings = settings;
		const clientId = "bbgs_" + generateId(9, "alternative");

		this._client = {
			clientId: clientId,
			displayName: displayName,
			role: type || "guest",
		};
		this._rtc = new this._peerJs(clientId, { debug: 3 });

		if (!this._hasActiveSession.value) this._hasActiveSession.set(true);
		this._connectionStates.update((u) => ({
			...u,
			[this._client.clientId]: {
				finished: false,
				paused: false,
				playing: false,
				pos: 0,
				stalled: false,
			},
		}));

		this._rtc.on("open", (id) => {
			if (type === "host") {
				this.initSession();
			}
			this.dispatch("init");
		});
		this.callSubs();
	}

	public async process(rawData: string): Promise<Message> {
		if (typeof rawData !== "string") return;
		const { command, data, metadata, type } = JSON.parse(rawData) as Message;

		// Logger.debug([`Processing Message`, command, data, metadata, type]);
		/** Get a user-defined track  */
		if (command === "GET" && type === "action.mix.init") {
			await SessionListService.initAutoMixSession({ videoId: data as string });
		}
		/** Handle setting configuration command */
		if (command === "CONFIG") {
			this._settings = data as unknown as Settings;
		}

		if (command === "PUT") {
			/** Initial SessionListService received from host */
			if (type === "state.set.mix") {
				try {
					const list = JSON.parse(data as string) as ISessionListProvider;

					SessionListService.set(list);

					await getSrc(
						list.mix[list.position].videoId,
						list.mix[list.position].playlistId,
					)
						.then((body) => {
							return AudioPlayer.updateSrc(body.body);
						})
						.then(() => {
							return AudioPlayer.play();
						});
				} catch (err) {
					if (err.message) {
						console.log(err);
						const pos = parseInt((err.message as string).match(/\d+$/g)?.at(0));
						err.message.includes("position")
							? console.log(
									(data as string).slice(0, pos),
									(data as string).slice(pos),
							  )
							: console.error(err);
					}
				}
			}
			/** Receive the list with the continuation data */
			if (type === "state.update.continuation") {
				const list = JSON.parse(data as string) as ISessionListProvider;
				if (!list.mix && !list.mix.length)
					throw new Error("Provided SessionList is not valid!", {});
				await new Promise<ISessionListProvider>((resolve) => {
					setTimeout(() => {
						resolve(SessionListService.lockedSet(list));
					});
				})
					.then((list) => {
						return SessionListService.updatePosition(list.position).then(() => {
							return list;
						});
					})
					.then((list) => {
						return getSrc(
							list.mix[list.position]?.videoId,
							list.mix[list.position]?.playlistId,
							undefined,
							true,
						);
					});
			}
			/** Any other mix updates */
			if (command === "PUT" && type === "state.update.mix") {
				try {
					const list = JSON.parse(data as string) as ISessionListProvider;
					if (!list.mix && !list.mix.length)
						throw new Error("Provided SessionList is not valid!", {});
					await SessionListService.set(list);
				} catch (error) {
					console.error();
				}
			}
		}

		/** Modify already existing state */
		if (command === "PATCH") {
			/** Gets the next or previous track */
			if (type === "state.update.position") {
				const {
					dir = undefined,
					position = 0,
				}: { dir: "<-" | "->" | undefined; position: number } = data as {
					dir: "<-" | "->" | undefined;
					position: number;
				};
				console.log();
				await SessionListService.prefetchTrackAtIndex(position);

				if (typeof dir === "undefined") {
					await SessionListService.next();
				} else if (dir === "<-") {
					await SessionListService.previous();
				} else if (dir === "->") {
					await SessionListService.next();
				}
				await SessionListService.updatePosition(position);
			}
			/** Updates the playback state for the connected client */
			if (type === "state") {
				this._connectionStates.update((u) => ({
					...u,
					[data["client"]]: data["state"],
				}));
			}
		}
		this.callSubs();
		return { command, data, metadata, type };
	}

	public send(
		command: Command,
		type: Kind,
		data: string | Record<string, unknown>,
		metadata?: Client,
	): void {
		if (!this._initialized) return;

		iter(this._connections, (conn) => {
			// TODO! figure out if this check is valiid or not
			if (this.client.clientId === conn.peer) return;
			if (metadata.clientId === conn.peer) return;
			conn.send(
				JSON.stringify({
					command,
					type,
					data,
					metadata: this.client,
				} as Message),
				true,
			);
		});
	}

	public sendGroupState(clientState: {
		client: string;
		state: ConnectionState;
	}): void {
		this._connectionStates.update((u) => ({
			...u,
			[this.client.clientId]: clientState["state"],
		}));
		this.callSubs();

		this.send("PATCH", "state", clientState, this.client);
	}

	public setAutoMix(
		type: "automix" | "playlist",
		{
			videoId = "",
			playlistId = "",
		}: { videoId?: string; playlistId?: string },
	): Status {
		this.callSubs();
		return this.initializeHostPlayback("automix", { videoId, playlistId });
	}

	public setPlaylistMix(playlistId = ""): Status {
		this.callSubs();
		return this.initializeHostPlayback("playlist", { playlistId });
	}

	public updateGuestContinuation(_mix: ISessionListProvider): void {
		this.callSubs();
		this.send(
			"PUT",
			"state.update.continuation",
			JSON.stringify(_mix),
			this._client,
		);
	}

	public updateGuestTrackQueue(_mix: ISessionListProvider): void {
		// TODO! finish this
		this.callSubs();
		this.send("PUT", "state.update.mix", JSON.stringify(_mix), this._client);

		// this.send('PATCH', 'state.update.position', JSON.stringify(_mix.position), this._client);
	}

	// #endregion Public Methods (13)

	// #region Private Methods (3)

	private initSession(): void {
		notify("Started Host Session", "success");
		this._connectionStates.update((u) => ({
			...u,
			[this.client.clientId]: {
				finished: false,
				paused: true,
				playing: false,
				pos: 0,
				stalled: false,
			},
		}));

		// Listen for new connections from guest clients
		this._rtc.on("connection", (conn) => {
			// Push the incoming connection into connection pool
			this._connections.push(conn);

			this.listenToConnection(conn);
			Logger.debug(`Received connection`);

			// If the connection is open and ready,
			// send the inbound client the pool of connected clients
			conn.on("open", () => {
				this._peerIds.add(conn.peer);
				conn.send(
					JSON.stringify({
						data: this.settings as unknown,
						command: "CONFIG",
						metadata: this.client,
						type: "state",
					} as Message),
				);

				conn.send(
					JSON.stringify({
						data: [...this._peerIds.values()],
						command: "CONNECT",
						metadata: this.client,
						type: "action",
					} as Message),
				);
				get(SessionListService).mix.length &&
					conn.send(
						JSON.stringify({
							command: "PUT",
							type: "state.set.mix",
							data: SessionListService.toJSON(),
							metadata: this.client,
						} as Message),
						true,
					);
			});
		});
	}

	/// Client State Handling
	private initializeHostPlayback(
		kind: "automix" | "playlist",
		data: { videoId?: Nullable<string>; playlistId?: Nullable<string> } = {
			videoId: "",
			playlistId: "",
		},
	) {
		try {
			if (kind === "automix") {
				SessionListService.initAutoMixSession({
					videoId: data?.videoId as string,
					playlistId: data?.playlistId,
				}).then(() => {
					this.send(
						"PUT",
						"state.set.mix",
						SessionListService.toJSON(),
						this.client,
					);
				});
			} else if (kind === "playlist") {
				SessionListService.initPlaylistSession({
					index: 0,
					playlistId: data?.playlistId,
				}).then(() => {
					this.send(
						"PUT",
						"state.set.mix",
						SessionListService.toJSON(),
						this.client,
					);
				});
			}
			return "OK";
		} catch (err) {
			console.error(err);
			return "ERROR";
		}
	}

	private listenToConnection(connection: DataConnection): void {
		connection.on("data", async (data) => {
			const processed = await this.process(data as string);

			if (processed.metadata.clientId === this.client.clientId)
				return notify(
					processed.metadata.clientId + "  " + this.client.clientId,
					"error",
				);

			if (processed.command === "CONNECT" && Array.isArray(processed.data)) {
				const _ids = filter(
					processed.data as string[],
					(id) => id !== this.client.clientId,
				);
				const ids = Object.keys(this._rtc.connections);

				iter(_ids, (item) => {
					if (!ids.includes(item)) {
						this.connect(item);
					}
				});
				this.callSubs();
				return;
			}

			this.send(
				processed.command,
				processed.type,
				processed.data as Record<string, unknown>,
				processed.metadata,
			);
			this.callSubs();
		});

		connection.on("close", () => {
			this._connectionStates.update((u) => ({ ...u, [connection.peer]: null }));
		});
	}

	// #endregion Private Methods (3)
}

export const groupSession = new GroupSession();

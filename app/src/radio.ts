import { randword } from "./common";
import { setVal } from "./statusSave";
import { state } from "./core";
import { radioNoise } from './radioNoise';

const error = console.error;

let lastTrack;
let showingTrack;
let showingTrackStruct;
let trackHistoryItemHeight = 48; // average
let airTitleHeight = 135;
let trackHistoryAmount = 0;
let radioPlayer = null;
let playerReady = false;
let currentChannel = '';
let activeChannel = '';
let activeStreamUrl = '';
let nowPlaying = false;
let playerRestartTimer: ReturnType<typeof setTimeout> | null = null;
let degradedTimer: ReturnType<typeof setTimeout> | null = null;
let stalledRestartTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let tempShowing = false;
const volumeChangeEventName = 'swr:volume-change';
const degradedNoiseDelay = 200;
const stalledRestartDelay = 8000;
const retryDelays = [1000, 2000, 5000, 10000, 20000, 30000];

type RadioSignalState =
	| 'stopped'
	| 'connecting'
	| 'live'
	| 'degraded'
	| 'retrying';

let signalState: RadioSignalState = 'stopped';

const dispatchVolumeChange = (volume: number) => {
	radioNoise.setVolume(volume);
	window.dispatchEvent(
		new CustomEvent(volumeChangeEventName, {
			detail: { volume }
		})
	);
};

class Volume {
	speakerButton: JQuery;
	speakerLogo: JQuery<HTMLImageElement>;
	slider: JQuery<HTMLInputElement>;
	lastVolumeValue: number = 0;

	constructor() {
		const DEFAULT_VOLUME_VALUE = 0.75;

		this.speakerButton = $("#volume-speaker");
		this.speakerLogo = $("#volume-speaker-logo");
		this.speakerButton.click(() => {
			this.toggleVolume();
		});

		this.slider = $("#volume-range");
		this.slider.on("input", () => {
			const vol = +this.slider.val() / 100;

			if (playerReady && radioPlayer) {
				radioPlayer.volume = vol;
				radioPlayer.muted = vol === 0;
				state.volumeValue = vol;
			}

			this.setVolumeIcon(vol);
			dispatchVolumeChange(vol);
		});
		this.slider.val(DEFAULT_VOLUME_VALUE * 100);

		if (radioPlayer) radioPlayer.volume = DEFAULT_VOLUME_VALUE;
		state.volumeValue = DEFAULT_VOLUME_VALUE;
		dispatchVolumeChange(DEFAULT_VOLUME_VALUE);

		this.lastVolumeValue = DEFAULT_VOLUME_VALUE;
	}

	setVolumeIcon(volume: number) {
		if (volume != 0) {
			this.speakerLogo.attr("src", "/assets/sprites/icons/volume.svg");
		} else {
			this.speakerLogo.attr("src", "/assets/sprites/icons/mute.svg");
		}
	}

	toggleVolume() {
		if (!radioPlayer) return;

		if (state.volumeValue != 0) {
			// mute

			this.lastVolumeValue = +this.slider.val() / 100;
			radioPlayer.volume = 0;
			radioPlayer.muted = true;
			state.volumeValue = 0;
			this.slider.val(0.);
			this.setVolumeIcon(0);
			dispatchVolumeChange(0);
		} else {
			// unmute

			radioPlayer.volume = this.lastVolumeValue;
			radioPlayer.muted = false;
			state.volumeValue = this.lastVolumeValue;
			this.slider.val(radioPlayer.volume * 100);
			this.setVolumeIcon(radioPlayer.volume);
			dispatchVolumeChange(radioPlayer.volume);
		}
	}
}

const signalStatusTitle: Partial<Record<RadioSignalState, string>> = {
	connecting: 'Поиск частоты...',
	degraded: 'Слабый сигнал...',
	retrying: 'Сигнал потерян — ищем снова...',
};

const setSignalState = (nextState: RadioSignalState) => {
	signalState = nextState;
	const statusTitle = signalStatusTitle[nextState];

	if (statusTitle) {
		tempShowing = true;
		setTrackInfo(statusTitle);
		return;
	}

	tempShowing = false;
	setTrackInfo(showingTrackStruct || ' ');
};

const clearRestartTimer = () => {
	if (playerRestartTimer === null) return;
	clearTimeout(playerRestartTimer);
	playerRestartTimer = null;
};

const clearDegradedTimers = () => {
	if (degradedTimer !== null) {
		clearTimeout(degradedTimer);
		degradedTimer = null;
	}

	if (stalledRestartTimer !== null) {
		clearTimeout(stalledRestartTimer);
		stalledRestartTimer = null;
	}
};

const clearRecoveryTimers = () => {
	clearRestartTimer();
	clearDegradedTimers();
};

const isActiveStream = () =>
	nowPlaying &&
	playerReady &&
	radioPlayer &&
	activeStreamUrl !== '' &&
	radioPlayer.src === activeStreamUrl;

const stopStreamTransport = () => {
	if (!radioPlayer) return;

	activeStreamUrl = '';
	radioPlayer.pause();
	radioPlayer.removeAttribute('src');
	radioPlayer.load();
};

const getRetryDelay = () =>
	retryDelays[Math.min(retryAttempt, retryDelays.length - 1)];

const connectStream = (isRetry = false) => {
	if (!playerReady || !radioPlayer || !nowPlaying) return;

	clearRestartTimer();
	clearDegradedTimers();
	setSignalState(isRetry ? 'retrying' : 'connecting');

	const streamUrl = `https://station.waveradio.org/${activeChannel}?${randword()}`;
	activeStreamUrl = streamUrl;
	radioPlayer.src = streamUrl;
	radioPlayer.title = showingTrack;

	void radioPlayer.play().catch((playError) => {
		if (!isActiveStream()) return;

		if (playError instanceof DOMException && playError.name === 'NotAllowedError') {
			console.warn('Radio playback was blocked by the browser', playError);
			radioStop();
			return;
		}

		handleStreamFailure();
	});
};

const scheduleRetry = () => {
	if (!nowPlaying) return;

	clearRestartTimer();
	setSignalState('retrying');
	const delay = getRetryDelay();
	retryAttempt += 1;
	playerRestartTimer = setTimeout(() => connectStream(true), delay);
};

const retryStreamNow = () => {
	if (!nowPlaying) return;

	clearRecoveryTimers();
	stopStreamTransport();
	connectStream(true);
};

const handleStreamFailure = () => {
	if (!isActiveStream()) return;

	clearDegradedTimers();
	radioNoise.fadeIn();
	stopStreamTransport();
	scheduleRetry();
};

const handleStreamPlaying = () => {
	if (!isActiveStream()) return;

	clearRecoveryTimers();
	retryAttempt = 0;
	setSignalState('live');
	radioNoise.fadeOut();
	getCurrentTrack(setTrackInfo);
};

const handlePotentialInterruption = () => {
	if (!isActiveStream() || signalState === 'degraded') return;

	setSignalState('degraded');
	degradedTimer = setTimeout(() => {
		degradedTimer = null;
		if (!isActiveStream()) return;

		if (radioPlayer.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
			handleStreamPlaying();
			return;
		}

		radioNoise.fadeIn();
	}, degradedNoiseDelay);

	stalledRestartTimer = setTimeout(() => {
		stalledRestartTimer = null;
		if (!isActiveStream()) return;

		if (radioPlayer.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
			handleStreamPlaying();
			return;
		}

		radioNoise.fadeIn();
		retryStreamNow();
	}, stalledRestartDelay);
};

const bindStreamEvents = () => {
	if (!radioPlayer) return;

	radioPlayer.onerror = handleStreamFailure;
	radioPlayer.onplaying = handleStreamPlaying;
	radioPlayer.onwaiting = handlePotentialInterruption;
	radioPlayer.onstalled = handlePotentialInterruption;
	radioPlayer.ontimeupdate = () => {
		if (
			signalState === 'degraded' &&
			isActiveStream() &&
			radioPlayer.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
		) {
			handleStreamPlaying();
		}
	};
	radioPlayer.onloadstart = () => {
		if (!isActiveStream()) return;
		setSignalState(retryAttempt > 0 ? 'retrying' : 'connecting');
	};
};

export const radioInit = () => {
	try {
		radioPlayer = document.createElement('audio');
		radioNoise.preload();
		
		// Set audio attributes for background playback
		radioPlayer.setAttribute('preload', 'auto');
		radioPlayer.setAttribute('crossorigin', 'anonymous');
		radioPlayer.setAttribute('playsinline', 'true');
		radioPlayer.setAttribute('webkit-playsinline', 'true');
		radioPlayer.setAttribute('x-webkit-airplay', 'allow');
		bindStreamEvents();
		
		// Add event listeners for background playback
		document.addEventListener('visibilitychange', () => {
			if (document.hidden && radioPlayer && !radioPlayer.paused) {
				// Keep playing when app goes to background
				radioPlayer.play().catch(() => {});
			}
		});
		
		window.addEventListener('blur', () => {
			if (radioPlayer && !radioPlayer.paused) {
				// Keep playing when window loses focus
				radioPlayer.play().catch(() => {});
			}
		});
		
		window.addEventListener('beforeunload', () => {
			if (radioPlayer && !radioPlayer.paused) {
				// Keep playing when page is about to unload
				radioPlayer.play().catch(() => {});
			}
			radioNoise.stopImmediately();
		});

		window.addEventListener('online', () => {
			if (nowPlaying && signalState !== 'live') retryStreamNow();
		});
		
		if (radioPlayer.canPlayType('audio/aac') != 'no' &&

			// Opera has broken AAC decoder
			(navigator.userAgent.indexOf("Opera") == -1 &&
				navigator.userAgent.indexOf("OPR") == -1 &&

				// Some androids can't play AAC too.
				navigator.userAgent.indexOf("Android") == -1)) {
			currentChannel = 'soviet';
		}
		else {
			currentChannel = 'soviet.mp3';
		}

		// Restore volume settings
		//radioSetVolume(radioGetVolume(), false);
		// Initialize track info.
		requestTrackInfo();
		requestListenersCount();

		new Volume();

		playerReady = true;
	} catch (e) {
		alert("Error: " + e.message);
		playerReady = false;
	}
};

export const radioStop = () => {
	if (playerReady && radioPlayer) {
		nowPlaying = false;
		retryAttempt = 0;
		clearRecoveryTimers();
		stopStreamTransport();
		radioNoise.fadeOut(0.25);
		setSignalState('stopped');

		$('#player-switch').attr('class', 'player-switch-stalled');
		setVal('player_on', "0");
	}
};

export const radioStopPlayback = () => {
	radioStop();
};

export const radioIsPlaying = () => nowPlaying;

export const radioGetVolume = () => {
	return state.volumeValue;
};

export const radioToggle = (channel?: string) => {
	channel = channel || currentChannel;
	if (!playerReady) {
		error('Cannot start player, did not initialize yet');
		return false;
	}

	if (nowPlaying == false) {
		try {
			nowPlaying = true;
			activeChannel = channel;
			retryAttempt = 0;
			void radioNoise.unlock();
			$('#player-switch').attr('class', 'player-switch-playing');
			setVal("player_on", "1");
			connectStream();
		} catch (e) {
			error('Error: ' + e.message);
			radioStop();
		}
	} else {
		try {
			radioStop();
		} catch (e) {
			error('Error: ' + e.message);
		}
	}
}


function requestTrackInfo() {
	setTimeout(requestTrackInfo, 5000);
	getCurrentTrack(processBriefResult, true);
}

function getCurrentTrack(onSuccess, isBrief?: boolean) {
	$.ajax({
		url: "https://core.waveradio.org/public/current",
		data: {
			station: 'soviet',
			brief: (isBrief ? '1' : '0')
		},
		dataType: 'json',
		crossDomain: true
	}).done(function (data) {
		onSuccess(data);
	}).fail(function (jq, jx) {
		if (!tempShowing) setTrackInfo(' ');
	});
}

const getTrackHistory = () => {
	// FIXME: unused
	const amount = Math.floor(calculateHistoryViewport() / trackHistoryItemHeight);

	$.ajax({
		url: "https://core.waveradio.org/public/history",
		data: {
			station: 'soviet',
			"amount": 100,
			extend: 1 // to enable artist links
		},
		dataType: 'json',
		crossDomain: true
	}).done(function (data) {
		processTrackHistory(data);
	}).fail(function (jq, jx) {
		console.warn("History error:", jq, jx);
	});
};

const calculateHistoryViewport = (): number => {
	const naviHeight = $('#navi').height();
	const docHeight = $(document).height();

	return docHeight - (naviHeight + airTitleHeight);
};

const processTrackHistory = (data) => {
	if (!data || data['status'] === undefined) {
		return;
	}

	let historyHtml = "";

	switch (+data['status']) {
		case 0:

			data['payload'].forEach(function (track) {
				const trackDate = new Date(+track['start_time'] * 1000);

				// Time
				historyHtml += '<div class="air-playlist-item"><div class="air-time">' + ((trackDate.getHours() < 10) ? '0' : '') + trackDate.getHours() + ':' +
					((trackDate.getMinutes() < 10) ? '0' : '') + trackDate.getMinutes() +
					'</div>';


				// Song
				historyHtml += '<div class="air-song">';

				// artist
				if (track['artist_links'] && track['artist_links'].length > 0) {
					const artistLink = track['artist_links'][0]['link_text'];
					historyHtml += '<a class="air-band" href="' + artistLink + '" target="_blank">' + track['artist'] + '</a>';
				} else {
					historyHtml += '<span class="air-band">' + track['artist'] + '</span>';
				}


				// separator
				historyHtml += '<br>';

				// title
				historyHtml += '<span class="air-song-title">' + track['track_title'] + '</span>';
				historyHtml += '</div></div>';
			});
			break;

		default:
			historyHtml = '<div class="history-error">Не удалось получить историю эфира, ошибка #' + data['status'] + " (" + data['payload'] + ")</div>";
			break;
	}

	$('#air-playlist').html(historyHtml);
};

const processBriefResult = (csRes) => {

	if (tempShowing)
		return;

	if (csRes['payload'] !== lastTrack) {
		lastTrack = csRes['payload'];

		getTrackHistory();
		getCurrentTrack(setTrackInfo);
	}
};

const splitTrackInfo = (track) => {
	return {
		artist: track.substr(0, track.indexOf(' - ')),
		title: track.substr(track.indexOf(' - ') + 3)
	};
};

const setArtistLink = (link) => {
	const artistObj = $('#player-artist-link');

	if (link) {
		artistObj.attr('href', link);

		artistObj.css({
			'text-decoration': 'underline',
			'pointer-events': 'auto'
		});

		artistObj.off();
	} else {
		artistObj.attr('href', '#');

		artistObj.css({
			'text-decoration': 'none',
			'pointer-events': 'none'
		});

		artistObj.click(function () {
			return false;
		});
	}
};

const setTrackInfo = (track) => {
	if (!track)
		return;
	if (tempShowing && typeof track === 'object')
		return;

	let trackToDisplay = "";
	let trackStruct = {};
	let artistLink = "";

	$('#player-city').html('&nbsp;');

	if (typeof track === 'string') {

		const splitAttempt = splitTrackInfo(track);

		if (splitAttempt.artist && splitAttempt.title) {
			setTrackInfo({ // simulate successful server response
				status: 2,
				payload: splitAttempt
			});
		} else {
			trackToDisplay = track;

			$("#player-title").text(track);

			setArtistLink(undefined);
			$("#player-artist-link").html('&nbsp;');
		}

	} else if (typeof track === 'object') {
		switch (track['status']) {
			case 0: // ok
			case 2: // some db problems but still splitted
				trackToDisplay = track['payload']['artist'] + ' – ' + track['payload']['title'];
				trackStruct = track['payload'];

				showingTrackStruct = track;
				showingTrack = trackToDisplay;

				if (track['payload']['links'] && track['payload']['links'].length > 0) {
					artistLink = track['payload']['links'][0]['link_text'];
				}

				break;

			case 1: // server couldn't parse track info and sends us what it had
				trackStruct = splitTrackInfo(track['payload']['raw_title']);

				showingTrackStruct = {
					status: status,
					payload: trackStruct
				};
				trackToDisplay = showingTrackStruct['payload']['artist'] + ' – ' + showingTrackStruct['payload']['title'];

				showingTrack = trackToDisplay;

				break;

			default:
				error('Bad track info');
				return;
		}

		if (artistLink) {
			setArtistLink(artistLink);
		} else {
			setArtistLink(undefined);
		}

		$("#player-artist-link").text(trackStruct['artist']);
		$("#player-artist-link-stream").text(trackStruct['artist']);
		$("#player-title").text(trackStruct['title']);

		if (trackStruct['city'] && trackStruct['city'] !== "Unknown")
			$('#player-city').text(trackStruct['city']);

		// iOS
		if (radioPlayer != null) {
			radioPlayer.title = trackToDisplay;
		}

		// Android/Chrome
		if ('mediaSession' in navigator && radioPlayer != null) {
			navigator.mediaSession.metadata = new MediaMetadata(trackStruct);
		}
	}
};

// Sovietwave-specific code but may be used anywhere
const requestListenersCount = () => {
	setTimeout(requestListenersCount, 10000);

	$.ajax({
		url: "https://station.waveradio.org/status-json.xsl",
		dataType: 'json',
		crossDomain: true
	}).done(calculateListenersCount);
};


const calculateListenersCount = (data) => {
	let listenersCount = 0;
	let currentPos = 1;

	data.icestats.source.forEach(function (mount) {
		currentPos++;

		if (mount.server_name.indexOf('Sovietwave') > -1)
			listenersCount += mount.listeners;

		if (currentPos === data.icestats.source.length){
			$('#listeners').text(listenersCount);
			$('#listeners-alt').text(listenersCount);
		}
	});
};

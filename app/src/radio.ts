import { randword } from "./common";
import { setVal } from "./statusSave";
import { state } from "./core";

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
let nowPlaying = false;
let playerRestartTimer = null;
let tempShowing = false;
let trackTimer = null;

class Volume {
	speakerLogo: JQuery;
	slider: JQuery<HTMLInputElement>;
	lastVolumeValue: number = 0;

	constructor() {
		const DEFAULT_VOLUME_VALUE = 0.75;

		this.speakerLogo = $("#volume-speaker");
		this.speakerLogo.click(() => {
			this.toggleVolume();
		});

		this.slider = $("#volume-range");
		this.slider.on("input", () => {
			if (playerReady) {
				const vol = +this.slider.val() / 100;
				radioPlayer.volume = vol;
				state.volumeValue = vol;
			}

			if (radioPlayer.volume != 0) {
				this.speakerLogo.attr("src", "/assets/sprites/icons/volume.png");
			} else {
				this.speakerLogo.attr("src", "/assets/sprites/icons/mute.png");
			}
		});
		this.slider.val(DEFAULT_VOLUME_VALUE * 100);

		radioPlayer.volume = DEFAULT_VOLUME_VALUE;

		this.lastVolumeValue = DEFAULT_VOLUME_VALUE;
	}

	toggleVolume() {
		if (radioPlayer.volume != 0) {
			// mute

			this.lastVolumeValue = +this.slider.val() / 100;
			radioPlayer.volume = 0;
			state.volumeValue = 0;
			this.slider.val(0.);
			this.speakerLogo.attr("src", "/assets/sprites/icons/mute.png");
		} else {
			// unmute

			radioPlayer.volume = this.lastVolumeValue;
			state.volumeValue = this.lastVolumeValue;
			this.slider.val(radioPlayer.volume * 100);
			this.speakerLogo.attr("src", "/assets/sprites/icons/volume.png");
		}
	}
}

export const radioInit = () => {
	try {
		radioPlayer = document.createElement('audio');
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

const radioPlay = (channel?: string) => {
	channel = channel || currentChannel;

	if (playerReady) {
		// Create a player object
		radioPlayer.src = `https://station.waveradio.org/${channel}?${randword()}`; // fixes buffering
		radioPlayer.title = showingTrack;

		radioPlayer.onerror = function () {
			if (nowPlaying) {
				setTempTitle('Сигнал потерян...');
				radioStop();

				clearTimeout(playerRestartTimer);
				playerRestartTimer = setTimeout(function () {
					radioPlay();
				}, 1000);
			}
		}

		radioPlayer.oncanplay = function () {
			setTrackInfo(showingTrackStruct);
			clearTimeout(playerRestartTimer);
		}

		radioPlayer.onstalled = function () {
			setTempTitle('Слабый сигнал...');
		}

		radioPlayer.onloadstart = function () {
			if (nowPlaying)
				setTempTitle('Поиск частоты...');
		}

		radioPlayer.play();

		$('#player-switch').attr('class', 'player-switch-playing');

		setVal("player_on", "1");
	} else
		error("ERR: Still loading");
};

const radioStop = () => {
	if (playerReady && radioPlayer) {
		radioPlayer.pause();
		radioPlayer.src = '';

		$('#player-switch').attr('class', 'player-switch-stalled');
		setVal('player_on', "0");
	}
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
			radioPlay(channel);
		} catch (e) {
			error('Error: ' + e.message);
		}
	} else {
		try {
			nowPlaying = false;
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
		setTrackInfo(' ');
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

const setTempTitle = (title) => {
	tempShowing = true;

	setTrackInfo(title);
	clearTimeout(trackTimer);
	trackTimer = setTimeout(function () {
		tempShowing = false;
		setTrackInfo(showingTrackStruct);
	}, 5000);
};


// Sovietwave-specific code but may be used anywhere
const requestListenersCount = () => {
	setTimeout(requestListenersCount, 20000);

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

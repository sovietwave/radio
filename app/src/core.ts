import { rnd } from "./common";

//let siteModeOverridden = true;
let currentIndex: number = 0;
let frameIndex: number = 0;
let framesCount: number = 3;
let SITE_MODE: string = "";

const backs = {
	"day": {
		"backs": [
			"/assets/sprites/bg/day1.jpg",
			"/assets/sprites/bg/day2.jpg",
			"/assets/sprites/bg/day3.jpg"
		],

		"backs_mobile": [
			"/assets/sprites/bg/mobile/day1.jpg",
			"/assets/sprites/bg/mobile/day2.jpg",
			"/assets/sprites/bg/mobile/day3.jpg"
		]
	},

	"evening": {
		"backs": [
			"/assets/sprites/bg/evening1.jpg",
			"/assets/sprites/bg/evening2.jpg",
			"/assets/sprites/bg/evening3.jpg"
		],

		"backs_mobile": [
			"/assets/sprites/bg/mobile/evening1.jpg",
			"/assets/sprites/bg/mobile/evening2.jpg",
			"/assets/sprites/bg/mobile/evening3.jpg"
		]
	},

	"night": {
		"backs": [
			"/assets/sprites/bg/night1.jpg",
			"/assets/sprites/bg/night2.jpg",
			"/assets/sprites/bg/night3.jpg"
		],

		"backs_mobile": [
			"/assets/sprites/bg/mobile/night1.jpg",
			"/assets/sprites/bg/mobile/night2.jpg",
			"/assets/sprites/bg/mobile/night3.jpg"
		]
	},

	"midnight": {
		"backs": [
			"/assets/sprites/bg/midnight1.jpg",
			"/assets/sprites/bg/midnight2.jpg",
			"/assets/sprites/bg/midnight3.jpg"
		],

		"backs_mobile": [
			"/assets/sprites/bg/mobile/midnight1.jpg",
			"/assets/sprites/bg/mobile/midnight2.jpg",
			"/assets/sprites/bg/mobile/midnight3.jpg"
		]
	},

	"event": {
		"backs": [
			"/assets/sprites/bg/event_space/1.jpg",
			"/assets/sprites/bg/event_space/2.jpg",
			"/assets/sprites/bg/event_space/3.jpg",
			"/assets/sprites/bg/event_space/4.jpg",
			"/assets/sprites/bg/event_space/5.jpg",
			"/assets/sprites/bg/event_space/6.jpg",
			"/assets/sprites/bg/event_space/7.jpg",
			"/assets/sprites/bg/event_space/8.jpg",
			"/assets/sprites/bg/event_space/9.jpg",
			"/assets/sprites/bg/event_space/10.jpg",
			"/assets/sprites/bg/event_space/11.jpg"
		],

		"backs_mobile": [
			"/assets/sprites/bg/event_space/1.jpg",
			"/assets/sprites/bg/event_space/2.jpg",
			"/assets/sprites/bg/event_space/3.jpg",
			"/assets/sprites/bg/event_space/4.jpg",
			"/assets/sprites/bg/event_space/5.jpg",
			"/assets/sprites/bg/event_space/6.jpg",
			"/assets/sprites/bg/event_space/7.jpg",
			"/assets/sprites/bg/event_space/8.jpg",
			"/assets/sprites/bg/event_space/9.jpg",
			"/assets/sprites/bg/event_space/10.jpg",
			"/assets/sprites/bg/event_space/11.jpg"
		]
	},

	"stream": {
		"backs": [
			"/stream/day.jpg",
			"/stream/evening.jpg",
			"/stream/midnight.jpg",
			"/stream/night.jpg"
		]
	}
};

const modes = {
	"day": {
		"title": "Дневной эфир",
		"subtitle": "#chillwave #dreamwave #sovietwave",
		"start": "7:00",
		"finish": "19:00",
		"times": "7:00 — 19:00 МСК"
	},

	"evening": {
		"title": "Вечерний эфир",
		"subtitle": "#synthpop #postpunk #sovietwave",
		"start": "19:00",
		"finish": "0:00",
		"times": "19:00 — 0:00 МСК"
	},

	"night": {
		"title": "Ночной эфир",
		"subtitle": "#ambient #experimental #sovietwave",
		"start": "0:00",
		"finish": "7:00",
		"times": "1:00 — 7:00 МСК"
	},

	"midnight": {
		"title": "Полуночный эфир",
		"subtitle": "#etherial #ambientpop #sovietwave",
		"start": "0:00",
		"finish": "7:00",
		"times": "0:00 — 1:00 МСК"
	},

	"event": {
		"title": "День Космонавтики",
		"subtitle": "#sovietwave",
		"start": "12 мая",
		"finish": "14 мая",
		"times": "12, 13, 14 мая"
	},

	"event_space": {
		"title": "День Космонавтики",
		"subtitle": "#sovietwave",
		"start": "12 апреля",
		"finish": "14 апреля",
		"times": "12—18 апреля"
	},

	"event2_ssw": {
		"title": "Советская советская волна",
		"subtitle": "#psychedelic #retro",
		"start": "20 ноября",
		"finish": "21 ноября",
		"times": "20—21 ноября"
	},

	"event3_chillwave": {
		"title": "#chillwave",
		"subtitle": "#glofi #hypnagogic #dreamwave",
		"start": "1 декабря",
		"finish": "2 декабря",
		"times": "1—2 декабря"
	}
};

let naviIsEnabled = true;
let airIsEnabled = false;
let linksIsEnabled = false;
let brightIsEnabled = false;
let links;
let air;
let bright;
let navi;
let logo;
let activeLinks;
let activeAir;
let frameOverlay;
let sfxSlide;
let sfxClick;
let coverImage;
let frameMobileMode = false;
let player;
let streamOverride = false;

export let state = {
	volumeValue: 1,
};

const isMobileMode = (): boolean => {
	if ((document.documentElement.scrollWidth <= 800) ||
		(document.documentElement.scrollHeight <= 500))
		return true;
	return false;
};

const getCurrentMode = (): string => {
	const d = new Date();
	const nd = new Date(d.getTime() + (10800000)); // 3600000 * 3 (3 - MSK, UTC+3)
	const t = nd.getUTCHours();

	if (t >= 1 && t < 7) {
		return 'night';
	}

	if (t >= 7 && t < 19) {
		return 'day';
	}

	if (t >= 0 && t < 1) {
		return 'midnight';
	}

	return 'evening';
};

export const init = () => {
	SITE_MODE = new URLSearchParams(location.search).get('mode') || "";

	
	window.addEventListener('resize', () => {
		if (frameMobileMode != isMobileMode()) {
			switchFrame();
		}
	});
	

	links = $('#panel');
	air = $('#air-panel');
	bright = $('#bright-overlay');
	navi = $('#navi');
	logo = $('#navi-logo');
	activeLinks = $('#panel-active-links');
	activeAir = $('#panel-active-air');
	frameOverlay = $('#frame-overlay');
	coverImage = $('#cover-image');
	player = $("#player-wrapper");

	sfxSlide = new Audio('/assets/sfx/slide.ogg');
	sfxClick = new Audio('/assets/sfx/click.ogg');

	if (SITE_MODE == 'stream') {
		streamOverride = true;
		console.log("streamOverride");
	}

	if (SITE_MODE == "") {
		SITE_MODE = getCurrentMode();
	}

	currentIndex = -1;
	console.log("SITE_MODE: " + SITE_MODE);
	currentIndex = rnd(backs[SITE_MODE].backs.length); // Randomize fist pic
	frameIndex = rnd(framesCount) + 1;

	setTheme(SITE_MODE);

	/*
		if (SITE_MODE != 'event' || !siteModeOverridden)
			setInterval(function() {
				var
				d = new Date(),
				nd = new Date(d.getTime() + (10800000)), // 3600000 * 3 (3 - MSK, UTC+3)
	
				t = nd.getUTCHours();
				m = nd.getUTCMinutes();
	
				if (t >= 1        &&        t < 7) // night
				{
					if (SITE_MODE != 'night') {
						SITE_MODE = 'night';
						setTheme('night');
					}
				} else if (t >= 7       &&        t < 19) // day
				{
					if (SITE_MODE != 'day') {
						SITE_MODE = 'day';
						setTheme('day');
					}
				} else if (t >= 0       &&        t < 1) // midnight
				{
					if (SITE_MODE != 'midnight') {
						SITE_MODE = 'midnight';
						setTheme('midnight');
					}
				} else // evening
				{
					if (SITE_MODE != 'evening') {
						SITE_MODE = 'evening';
						setTheme('evening');
					}
				}
			}, 30000); // check every 30s  30000
			*/
};

const setTheme = (mode: string) => {
	if (modes[mode]) {
		const modeContent = modes[mode];

		$('#air-title').text(modeContent['title']);
		$('#air-tags').text(modeContent['subtitle']);
		$('#air-start-time').text(modeContent['start']);
		$('#air-end-time').text(modeContent['finish']);
		$('#air-times').text(modeContent['times']);
	}

	switchBackground(mode);
}

const switchBackground = (mode: string) => {
	if (mode != SITE_MODE) {
		console.log("Backgrounds can be changed only for current (" + SITE_MODE + ") site mode");
		return;
	}


	if (streamOverride) {
		let bg = 0;
		console.log(backs['stream'].backs[0]);
		if (mode == 'evening') bg = 1;
		else if (mode == 'midnight') bg = 2;
		else if (mode == 'night') bg = 3;

		coverImage.css({ 'background-image': 'url(' + backs['stream'].backs[bg] + ')' });
		return;
	}

	const currentModeAssets = backs[SITE_MODE];
	const backsCount = currentModeAssets.backs.length;
	let nextIndex = 0;

	currentIndex++;

	if (currentIndex > backsCount - 1)
		currentIndex = 0;

	nextIndex = currentIndex + 1;
	if (nextIndex > backsCount - 1) {
		nextIndex = 0;
	}


	if (isMobileMode())
		coverImage.css({ 'background-image': `url(${currentModeAssets.backs_mobile[currentIndex]})` });
	else
		coverImage.css({ 'background-image': `url(${currentModeAssets.backs[currentIndex]})` });

	switchFrame();
};

const switchFrame = () => {
	frameIndex++;
	if (frameIndex > framesCount)
		frameIndex = 1;

	frameMobileMode = document.documentElement.scrollWidth < document.documentElement.scrollHeight;

	if (!frameMobileMode)
		frameOverlay.css({ 'background-image': 'url(/assets/sprites/frame' + frameIndex + '.png)' });
	else
		frameOverlay.css({ 'background-image': 'url(/assets/sprites/frame' + frameIndex + 'm.png)' });
};

export const switchCurrentBackground = () => {
	sfxPlaySlide();
	switchBackground(SITE_MODE);

	if (isMobileMode()) {
		hideLeftPanels();
	}
};

const toggleFrame = () => {
	if (linksIsEnabled || airIsEnabled)
		frameOverlay.animate({
			left: '-30px',
			right: '-30px',
			top: '-30px',
			bottom: '69px'
		}, 600);
	else
		frameOverlay.animate({
			left: '0px',
			right: '0px',
			top: '0px',
			bottom: '69px'
		}, 400);
};

export const toggleLinks = () => {
	if (linksIsEnabled) {
		disableLinks();
		sfxPlaySlide();
	}
	else {
		enableLinks();
		sfxPlayClick();
	}

	toggleFrame();
};

const enableLinks = () => {
	if (linksIsEnabled) {
		return;
	}

	linksIsEnabled = true;

	togglePlayer(); //for mobile

	enableBright();
	disableAir();

	links.show();
	links.animate({
		left: '0',
		top: '0',
		opacity: '1'
	}, 300);

	activeLinks.show();
	activeLinks.animate({
		opacity: '1'
	}, 300);
};

const disableLinks = () => {
	if (!linksIsEnabled) return;
	linksIsEnabled = false;

	togglePlayer(); //for mobile

	if (!airIsEnabled)
		disableBright();

	activeLinks.animate({
		opacity: '0'
	}, 300, function () { activeLinks.hide(); });

	if (!isMobileMode()) {
		links.animate({
			left: '-150',
			opacity: '0'
		}, 300, function () { links.hide(); });
	}
	else
	{
		links.animate({
			top: '-100',
			opacity: '0'
		}, 300, function () { links.hide(); });
	}

}

export const toggleAirPanel = () => {
	if (airIsEnabled) {
		disableAir();
		sfxPlaySlide();
	}
	else {
		enableAir();
		sfxPlayClick();
	}

	toggleFrame();
};

const enableAir = () => {
	if (airIsEnabled) return;
	airIsEnabled = true;

	togglePlayer(); //for mobile

	enableBright();
	disableLinks();

	air.show();
	air.animate({
		left: '0',
		top: '0',
		opacity: '1'
	}, 300);

	activeAir.show();
	activeAir.animate({
		opacity: '1'
	}, 300);
};

const disableAir = () => {
	if (!airIsEnabled) return;
	airIsEnabled = false;

	togglePlayer(); //for mobile

	if (!linksIsEnabled)
		disableBright();

	if (!isMobileMode()) {
		air.animate({
			left: '-150',
			opacity: '0'
		}, 300, function () { air.hide(); });
	} else {
		air.animate({
			top: '-100',
			opacity: '0'
		}, 300, function () { air.hide(); });
	}


	activeAir.animate({
		opacity: '0'
	}, 300, function () { activeAir.hide(); });
};

const toggleBright = () => {
	if (brightIsEnabled) {
		disableBright();
	}
	else {
		enableBright();
	}
};

const enableBright = () => {
	if (brightIsEnabled) {
		return;
	}
	brightIsEnabled = true;

	if (isMobileMode())
		return;

	bright.show();
	bright.animate({
		opacity: '0.2',
	}, 300);
};

const disableBright = () => {
	if (!brightIsEnabled) {
		return;
	}
	brightIsEnabled = false;

	bright.animate({
		opacity: '0',
	}, 300, function () { bright.hide(); });
};

export const hideLeftPanels = () => {
	if (!linksIsEnabled && !airIsEnabled) {
		return;
	}

	disableBright();
	disableAir();
	disableLinks();

	sfxPlaySlide();
	toggleFrame();
};

const sfxPlayClick = () => {
	//sfxClick.playbackRate = 0.9 + Math.random(0.2);	
	sfxClick.volume = Math.max(0, state.volumeValue - 0.3);
	sfxClick.play();
};

const sfxPlaySlide = () => {
	//sfxSlide.playbackRate = 0.7 + Math.random(0.3);
	sfxSlide.volume = Math.max(0, state.volumeValue - 0.1);
	sfxSlide.play();
};

export const toggleNavi = () => {
	disableBright();
	disableAir();
	disableLinks();

	togglePlayer(); //for mobile

	naviIsEnabled = !naviIsEnabled;

	const durationShow = 350;
	const durationHide = 450;

	if (!naviIsEnabled) {
		sfxPlaySlide();

		navi.animate({
			opacity: '0',
			bottom: '-170px'
		}, durationHide);


		frameOverlay.animate({
			opacity: '0',
			left: '-100px',
			right: '-100px',
			top: '-100px',
			bottom: '-100px'
		}, durationHide);

		coverImage.animate({
			left: '0px',
			right: '0px',
			top: '0px',
			bottom: '0px'
		}, durationHide);

		logo.animate({
			bottom: '20px'
		}, durationHide * 0.15);

		logo.find('img').animate({
			height: '70px'
		}, durationHide);

		//coverImage.animate({'background-size': 'cover 100%'}, durationHide);

	} else {
		sfxPlayClick();
		switchFrame();

		navi.animate({
			opacity: '1',
			bottom: '0px'
		}, durationShow);

		frameOverlay.animate({
			opacity: '1',
			left: '0px',
			right: '0px',
			top: '0px',
			bottom: '69px'
		}, durationShow);

		coverImage.animate({
			left: '-30px',
			right: '-30px',
			top: '-30px',
			bottom: '-30px'
		}, durationShow);

		logo.animate({
			bottom: '5px'
		}, durationShow * 0.75);

		logo.find('img').animate({
			height: '60px'
		}, durationShow);

		//coverImage.animate({'background-size': 'cover 105%'}, durationShow);
	}
};

const togglePlayer = () => {
	if (isMobileMode()) {
		if (linksIsEnabled || airIsEnabled) {
			player.hide();
		} else {
			player.show();
		}
	} else {
		player.show();
	}
};


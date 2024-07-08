/********************************************************
                 Status Save Functions
********************************************************/

// Check for Local Storage Availability
export const localStorageAvailable = (() => {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
})();

// Get Saved Value
export const getVal = (key: string, def?: string): string | null => {
    const toReturn = localStorageAvailable ? localStorage[key] : getCookie(key);

    if (typeof toReturn === "undefined") {
        return def || null;
    }
    else {
        return toReturn;
    }
};

// Save a Value
export const setVal = (key: string, val: string): void => {
    if (localStorageAvailable) {
        localStorage[key] = val;
    }
    else {
        setCookie(key, 'sasai_lalka', { expires: -1 });
        setCookie(key, val, { expires: 31536000000 });
    }
};

// Cookie fallback if LocalStorage won't be available.
const getCookie = (name: string): string | null => {
    const matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : null;
};

const setCookie = (name: string, value: string, options?: any) => {
    options = options || {};
    let expires = options.expires;
    if (typeof expires == "number" && expires) {
        const d = new Date();
        d.setTime(d.getTime() + expires * 1000);
        expires = options.expires = d;
    }
    if (expires && expires.toUTCString) {
        options.expires = expires.toUTCString();
    }
    value = encodeURIComponent(value);
    let updatedCookie = name + "=" + value;
    for (let propName in options) {
        updatedCookie += "; " + propName;
        const propValue = options[propName];
        if (propValue !== true) {
            updatedCookie += "=" + propValue;
        }
    }

    document.cookie = updatedCookie;
};

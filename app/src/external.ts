import JQuery from "jquery";

declare global {
    interface Window {
        jQuery: typeof JQuery;
        $: typeof JQuery;
    }
}

window.$ = window.jQuery
window.jQuery = window.jQuery

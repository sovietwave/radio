import { init } from "./core";
import { Volume, radioInit } from "./radio";

$(() => {
    init();
    radioInit();
    new Volume();
});

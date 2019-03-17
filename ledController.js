const config = require('./config');
const Blynk = require('blynk-library');
const Worker = require('tiny-worker');
const Table = require('./components/table');
const colors = require('./components/colors');
const ledMessages = require('./components/ledMessages');
const Debug = require('./components/debug');

const debug = new Debug();
debug.isDebug = false;

let blynk = new Blynk.Blynk(config.AUTH);

let vWidgetTable = new blynk.WidgetTable(0);
let vPinHue = new blynk.VirtualPin(1);
let vPinSaturation = new blynk.VirtualPin(2);
let vPinValue = new blynk.VirtualPin(3);
let vPinAddColor = new blynk.VirtualPin(4);
let vPinRemoveColor = new blynk.VirtualPin(5);
let vWidgetColorLed = new blynk.WidgetLED(6);

// let table = null;


// TODO: Add also the on disconnect event listener.
// TODO: Move the Table and pin initializations out of the on connect event
//  handler, because if the connection to the Blynk server is broken and
//  reestablished, the on connect event handler will be called again.
// TODO: Add SIGTERM and SIGINT handlers for handling the workers. (And add also
//  other error handling to the workers in case of crash.)
blynk.on('connect', () => {
    let table = new Table(blynk, vWidgetTable, vPinHue, vPinSaturation, vPinValue);

    table.addUpdateCurrentRowListener((hsv) => {
        let rgb = colors.hsvToRgb(hsv.h, hsv.s, hsv.v);
        blynk.setProperty(vWidgetColorLed.pin, "color", colors.rgbToHexString(rgb.r, rgb.g, rgb.b));
    });
    vWidgetColorLed.turnOn();


    vPinHue.on('write', (param) => {
        table.setCurrentH(parseInt(param, 10));
        // updateColor();
    });
    vPinSaturation.on('write', (param) => {
        table.setCurrentS(parseFloat(param));
        // updateColor();
    });
    vPinValue.on('write', (param) => {
        table.setCurrentV(parseFloat(param));
        // updateColor();
    });

    vPinAddColor.on('write', (param) => {
        let value = parseInt(param, 10);
        if (value === 1) {
            debug.d("Add color pressed");

            table.addRow();
        }
    });
    vPinRemoveColor.on('write', (param) => {
        let value = parseInt(param, 10);
        if (value === 1) {
            debug.d("Remove color pressed");

            table.removeSelectedRows();
        }
    });


    // Start a new process for led control.
    let ledColorWorker = new Worker("./components/ledColorWorker.js");
    ledColorWorker.onmessage = (event) => {
        debug.d("Received message: " + JSON.stringify(event));

        switch (event.data.message) {
            case ledMessages.UPDATE_COLORS:
                passColorsToColorWorker();
                break;
        }
    };

    table.addUpdateCurrentRowListener((hsv) => {
        passColorsToColorWorker();
    });

    function passColorsToColorWorker() {
        debug.d("Getting colors from table...");

        let colorData = table.getTableData();
        ledColorWorker.postMessage({
            message: ledMessages.UPDATE_COLORS,
            colorData: colorData
        });

        debug.d("Colors passed to LedWorker: " + JSON.stringify(colorData));
    }
});


// ------------------------------------
// Helper functions
// ------------------------------------


// function intPWMToPercent(value, highEnd, lowEnd) {
//   if (highEnd === undefined) highEnd = MAX_PWM_VALUE;
//   if (lowEnd === undefined) lowEnd = MIN_PWM_VALUE;
//
//   return Math.max(0, Math.min(1, (value - lowEnd) / (highEnd - lowEnd)));
// }

const raspi = require('raspi');
const pwm = require('raspi-soft-pwm');

// This file is run from ./node_modules/tiny-worker/lib/worker.js
const colors = require('../../../components/colors');
const ledMessages = require('../../../components/ledMessages');
const Debug = require('../../../components/debug');

const debug = new Debug();
debug.isDebug = false;

const GPIO_RED = 'GPIO4';
const GPIO_GREEN = 'GPIO5';
const GPIO_BLUE = 'GPIO6';

// const MAX_PWM_VALUE = 255;
// const MIN_PWM_VALUE = 0;
const PWM_FREQ = 100;

const LED_UPDATE_INTERVAL = 50; // Milliseconds

let state = {
    colorData: [
        {
            id: 0,
            hsv: {h: 0, s: 0, v: 0}
        }
    ],
    currentColor: {h: 0, s: 0, v: 0},
    lastColor: {h: 0, s: 0, v: 0},
    nextId: 0,
    colorChangeTime: 4000,
    colorChangeTimePassed: 0
};

// State functions
/**
 * Changes the nextColor to the next color on the colorData list.
 */
function changeNextColor() {
    let index = state.colorData.findIndex(item => item.id === state.nextId);
    let newNextIndex = index + 1;
    newNextIndex = newNextIndex < state.colorData.length ? newNextIndex : 0;

    debug.d("Index: " + index + ", newNextIndex: " + newNextIndex);

    state.lastColor = state.currentColor;
    state.nextId = state.colorData[newNextIndex].id;
}

function getNextColor() {
    let nextColorData = state.colorData.find(item => item.id === state.nextId);
    let nextColor = getCurrentColor();
    if (nextColorData) {
        nextColor = nextColorData.hsv;
    }

    return nextColor;
}

function getLastColor() {
    return state.lastColor;
}

// function colorsEqual(color1, color2) {
//     if (!color1 || !color2) {
//         return !color1 && !color2;
//     }
//
//     return (color1.h === color2.h && color1.s === color2.s && color1.v === color2.v);
// }

/**
 * Interpolates between the given colors by t. The hue is interpolated along
 * the smaller angle, and saturation and value are interpolated linearly.
 *
 * @param fromColor the color from which to interpolate.
 * @param toColor the color to which to interpolate.
 * @param t a value in range [0, 1], by which to interpolate the colors. If
 *          this is 0, the fromColor is returned, and if 1 the toColor is
 *          returned.
 * @returns {{s: *, v: *, h: *}} a new interpolated color.
 */
function interpolateColors(fromColor, toColor, t) {
    debug.d("Interpolating with values: ", fromColor, toColor, t);

    let tClamped = Math.min(Math.max(t, 0), 1);

    function lerp(from, to, t) {
        return (to - from) * t + from;
    }

    let hueDiff = toColor.h - fromColor.h;
    if (hueDiff > 180) {
        hueDiff -= 360;
    }
    if (hueDiff < -180) {
        hueDiff += 360;
    }
    let hueDiffLerp = fromColor.h + lerp(0, hueDiff, tClamped);
    if (hueDiffLerp < 0) {
        hueDiffLerp += 360;
    }

    return {
        h: hueDiffLerp,
        s: lerp(fromColor.s, toColor.s, tClamped),
        v: lerp(fromColor.v, toColor.v, tClamped)
    };
}

/**
 * Updates the current color. Interpolates between the colors smoothly.
 *
 * @param deltaTime the time from last update.
 */
function updateCurrentColor(deltaTime) {
    state.colorChangeTimePassed += deltaTime;

    if (state.colorChangeTimePassed >= state.colorChangeTime) {
        state.colorChangeTimePassed = 0;
        changeNextColor();
    }

    let nextColor = getNextColor();
    let lastColor = getLastColor();
    let t = state.colorChangeTimePassed / state.colorChangeTime;

    state.currentColor = interpolateColors(lastColor, nextColor, t);
    debug.d("New current color: ", state.currentColor);
}

function setColorData(newColorData) {
    state.colorData = newColorData;

    changeNextColor();
    state.colorChangeTimePassed = 0;
}

function getCurrentColor() {
    return state.currentColor;
}


// GPIO pin initialization.
raspi.init(() => {
    const PIN_R = new pwm.SoftPWM({
        pin: GPIO_RED,
        frequency: PWM_FREQ
    });
    const PIN_G = new pwm.SoftPWM({
        pin: GPIO_GREEN,
        frequency: PWM_FREQ
    });
    const PIN_B = new pwm.SoftPWM({
        pin: GPIO_BLUE,
        frequency: PWM_FREQ
    });

    // v0.on('write', (param) => {
    //   let r = intPWMToPercent(parseInt(param[0], 10));
    //   let g = intPWMToPercent(parseInt(param[1], 10));
    //   let b = intPWMToPercent(parseInt(param[2], 10));
    //   PIN_R.write(r);
    //   PIN_G.write(g);
    //   PIN_B.write(b);
    // });

    this.onmessage = function(event) {
        switch (event.data.message) {
            case ledMessages.UPDATE_COLORS:
                setColorData(event.data.colorData);
                break;
        }

        debug.d("Got: " + JSON.stringify(event.data));
    };
    this.postMessage({message: ledMessages.UPDATE_COLORS});

    /**
     * Updates the states of the GPIO pins to correspond to the current
     * color.
     */
    function updateColorToGPIO() {
        updateCurrentColor(LED_UPDATE_INTERVAL);

        let hsv = getCurrentColor();
        let rgb = colors.hsvToRgb(hsv.h, hsv.s, hsv.v);

        debug.d("Writing color: ", rgb);
        PIN_R.write(rgb.r);
        PIN_G.write(rgb.g);
        PIN_B.write(rgb.b);
    }

    setInterval(updateColorToGPIO, LED_UPDATE_INTERVAL);
});

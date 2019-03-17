/**
 * Converts the given HSV color into RGB format.
 * https://en.wikipedia.org/wiki/HSL_and_HSV#Alternative_HSV_conversion
 *
 * @param hue the hue component of HSV color. Must be in range [0, 360].
 * @param saturation the saturation component of HSV color. Must be in range
 *        [0, 1].
 * @param value the value component of HSV color. Must be in range [0, 1].
 * @returns {{r: *, b: *, g: *}} the RGB color as JS object. Contains the r, g
 *          and b components in fields named r, g and b respectively. The
 *          values are in range [0, 1].
 */
function hsvToRgb(hue, saturation, value) {
    function f(n) {
        let k = (n + hue / 60) % 6;
        return value - value * saturation * Math.max(Math.min(k, 4 - k, 1), 0);
    }

    return {
        r: f(5),
        g: f(3),
        b: f(1)
    };
}

/**
 * Converts the given RGB color into 24 bit hexadecimal string.
 *
 * @param red the red component of the color. In range [0, 1].
 * @param green the green component of the color. In range [0, 1].
 * @param blue the blue component of the color. In range [0, 1].
 * @returns {string} a hexadecimal string representation of the given RGB
 *                   color. (Like #a53f82).
 */
function rgbToHexString(red, green, blue) {
    // Convert [0, 1]: float -> [0, 255]: int
    let r = Math.floor(0xFF * red);
    let g = Math.floor(0xFF * green);
    let b = Math.floor(0xFF * blue);

    let rBits = (r & 0xFF) << 16 ;
    let gBits = (g & 0xFF) << 8;
    let bBits = b & 0xFF;
    let hex = rBits | gBits | bBits;
    return "#" + hex.toString(16).padStart(6, "0").toUpperCase();
}


module.exports.hsvToRgb = hsvToRgb;
module.exports.rgbToHexString = rgbToHexString;

const FORCE_DEBUG = false;

function Debug() {
    this.isDebug = false;

    this.d = (message, ...optionalParams) => {
        if (this.isDebug || FORCE_DEBUG) {
            console.log("DEBUG: " + message, ...optionalParams);
        }
    }
}

module.exports = Debug;

import { NumeralUtils } from "./numeral.js";

class Utils {
    public formatNumbers: NumeralUtils;

    constructor(
    ) {
        this.formatNumbers = new NumeralUtils();
    }
}

const utils = new Utils();

export default utils;
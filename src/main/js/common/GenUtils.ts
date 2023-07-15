import assert from "assert";

/**
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Collection of general purpose utilities.
 */
class GenUtils {
  /**
   * Indicates if the given argument is an integer.
   *
   * @param arg is the argument to test
   * @returns true if the given argument is an integer, false otherwise
   */
  static isInt(arg: any) {
    return (
      arg === parseInt(String(Number(arg))) &&
      !isNaN(arg) &&
      !isNaN(parseInt(arg, 10))
    );
  }

  /**
   * Indicates if the given argument is an array.
   *
   * @param arg is the argument to test as being an array
   * @returns true if the argument is an array, false otherwise
   */
  static isArray(arg: any) {
    return arg instanceof Array && Array.isArray(arg);
  }

  /**
   * Indicates if the given argument is an object and optionally if it has the given constructor name.
   *
   * @param arg is the argument to test
   * @param obj is an object to test arg instanceof obj (optional)
   * @returns true if the given argument is an object and optionally has the given constructor name
   */
  static isObject(arg: any, obj?: any) {
    if (!arg) return false;
    if (typeof arg !== "object") return false;
    if (obj && !(arg instanceof obj)) return false;
    return true;
  }

  /**
   * Indicates if the given argument is a hexidemal string.
   *
   * Credit: https://github.com/roryrjb/is-hex/blob/master/is-hex.js.
   *
   * @param str is the string to test
   * @returns true if the given string is hexidecimal, false otherwise
   */
  static isHex(arg: any) {
    if (typeof arg !== "string") return false;
    if (arg.length === 0) return false;
    return (arg.match(/([0-9]|[a-f])/gim) || []).length === arg.length;
  }

  /**
   * Determines if the given string is base58.
   */
  static isBase58(str: any) {
    if (typeof str !== "string") return false;
    GenUtils.assertTrue(
      str.length > 0,
      "Cannot determine if empty string is base58"
    );
    return /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(
      str
    );
  }

  /**
   * Asserts that the given boolean is true.  Throws an exception if not a boolean or false.
   *
   * @param bool is the boolean to assert true
   * @param msg is the message to throw if bool is false (optional)
   */
  static assertTrue(bool: any, msg?: any) {
    if (typeof bool !== "boolean") throw new Error("Argument is not a boolean");
    if (!bool)
      throw new Error(msg ? msg : "Boolean asserted as true but was false");
  }

  /**
   * Asserts that the given argument is an array.
   *
   * @param arg is the argument to assert as an array
   * @param msg is the message to throw if the argument is not an array
   */
  static assertArray(arg: any, msg?: any) {
    if (!GenUtils.isArray(arg))
      throw new Error(
        msg ? msg : "Argument asserted as an array but is not an array"
      );
  }

  /**
   * Copies the given array.
   *
   * @param arr is the array to copy
   * @returns a copy of the given array
   */
  static copyArray(arr: any) {
    GenUtils.assertArray(arr);
    const copy = [];
    for (let i = 0; i < arr.length; i++) copy.push(arr[i]);
    return copy;
  }

  /**
   * Removes every instance of the given value from the given array.
   *
   * @param arr is the array to remove the value from
   * @param val is the value to remove from the array
   * @returns true if the value is found and removed, false otherwise
   */
  static remove(arr: any, val: any) {
    let found = false;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] === val) {
        arr.splice(i, 1);
        found = true;
        i--;
      }
    }
    return found;
  }

  /**
   * Listifies the given argument.
   *
   * @param arrOrElem is an array or an element in the array
   * @returns an array which is the given arg if it's an array or an array with the given arg as an element
   */
  static listify(arrOrElem: any) {
    return GenUtils.isArray(arrOrElem) ? arrOrElem : [arrOrElem];
  }

  /**
   * Indicates if the given array contains the given object.
   *
   * @param {object[]} arr - array that may or may not contain the object
   * @param {object} obj - object to check for inclusion in the array
   * @param {boolean} compareByReference - compare strictly by reference, forgoing deep equality check
   * @returns true if the array contains the object, false otherwise
   */
  static arrayContains(
    arr: object[] | string[],
    obj: string | object,
    compareByReference?: boolean
  ) {
    GenUtils.assertTrue(GenUtils.isArray(arr));
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === obj) return true;
      if (!compareByReference && GenUtils.equals(arr[i], obj)) return true;
    }
    return false;
  }

  /**
   * Determines if two arrays are equal.
   *
   * @param arr1 is an array to compare
   * @param arr2 is an array to compare
   * @returns true if the arrays are equal, false otherwise
   */
  static arraysEqual(arr1: any, arr2: any) {
    if (arr1 === arr2) return true;
    if (arr1 == null && arr2 == null) return true;
    if (arr1 == null || arr2 == null) return false;
    if (typeof arr1 === "undefined" && typeof arr2 === "undefined") return true;
    if (typeof arr1 === "undefined" || typeof arr2 === "undefined")
      return false;
    if (!GenUtils.isArray(arr1))
      throw new Error("First argument is not an array");
    if (!GenUtils.isArray(arr2))
      throw new Error("Second argument is not an array");
    if (arr1.length != arr2.length) return false;
    for (let i = 0; i < arr1.length; ++i) {
      if (!GenUtils.equals(arr1[i], arr2[i])) return false;
    }
    return true;
  }

  /**
   * Determines if two arguments are deep equal.
   *
   * @param arg1 is an argument to compare
   * @param arg2 is an argument to compare
   * @returns true if the arguments are deep equals, false otherwise
   */
  static equals(arg1: any, arg2: any) {
    if (GenUtils.isArray(arg1) && GenUtils.isArray(arg2))
      return GenUtils.arraysEqual(arg1, arg2);
    if (GenUtils.isObject(arg1) && GenUtils.isObject(arg2))
      return GenUtils.objectsEqual(arg1, arg2);
    return arg1 === arg2;
  }

  /**
   * Determines if two objects are deep equal.
   *
   * Undefined values are considered equal to non-existent keys.
   *
   * @param map1 is a map to compare
   * @param map2 is a map to compare
   * @returns true if the maps have identical keys and values, false otherwise
   */
  static objectsEqual(map1: any, map2: any) {
    const keys1 = Object.keys(map1);
    const keys2 = Object.keys(map2);

    // compare each key1 to keys2
    for (const key1 of keys1) {
      let found = false;
      for (const key2 of keys2) {
        if (key1 === key2) {
          if (!GenUtils.equals(map1[key1], map2[key2])) return false;
          found = true;
          break;
        }
      }
      if (!found && map1[key1] !== undefined) return false; // allows undefined values to equal non-existent keys
    }

    // compare each key2 to keys1
    for (const key2 of keys2) {
      let found = false;
      for (const key1 of keys1) {
        if (key1 === key2) {
          found = true; // no need to re-compare which was done earlier
          break;
        }
      }
      if (!found && map2[key2] !== undefined) return false; // allows undefined values to equal non-existent keys
    }
    return true;

    // TODO: support strict option?
    //    if (strict) {
    //      let keys1 = Object.keys(map1);
    //      if (keys1.length !== Object.keys(map2).length) return false;
    //      for (let i = 0; i < keys1.length; i++) {
    //        let key = Object.keys(map1)[i];
    //        if (!GenUtils.equals(map1[key], map2[key])) return false;
    //      }
    //    }
  }

  /**
   * Deletes properties from the object that are undefined.
   *
   * @param obj is the object to delete undefined keys from
   */
  static deleteUndefinedKeys(obj: any) {
    for (const key of Object.keys(obj)) {
      if (obj[key] === undefined) delete obj[key];
    }
  }


  /**
   * Returns a string indentation of the given length;
   *
   * @param length is the length of the indentation
   * @returns {string} is an indentation string of the given length
   */
  static getIndent(length: number): string {
    let str = "";
    for (let i = 0; i < length; i++) str += "  "; // two spaces
    return str;
  }

  /**
   * Generates a v4 UUID.
   *
   * Source: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
   */
  static getUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * Indicates if the current environment is a browser.
   *
   * @return {boolean} true if the environment is a browser, false otherwise
   */
  static isBrowser(): boolean {
    const isBrowserMain = new Function(
      "try {return this===window;}catch(e){return false;}"
    )();
    const isJsDom = isBrowserMain
      ? new Function(
          "try {return window.navigator.userAgent.includes('jsdom');}catch(e){return false;}"
        )()
      : false;
    return isBrowserMain && !isJsDom;
  }

  /**
   * Indicates if the current environment is a firefox-based browser.
   *
   * @return {boolean} true if the environment is a firefox-based browser, false otherwise
   */
  static isFirefox(): boolean {
    return this.isBrowser() && navigator.userAgent.indexOf("Firefox") > 0;
  }

  /**
   * Randomize array element order in-place using Durstenfeld shuffle algorithm.
   *
   * Credit: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
   */
  static shuffle(array: any) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }

  /**
   * Sorts an array by natural ordering.
   *
   * @param the array to sort
   */
  static sort(array: any) {
    array.sort((a: any, b: any) => (a === b ? 0 : a > b ? 1 : -1));
  }

  /**
   * Sets the given value ensuring a previous value is not overwritten.
   *
   * TODO: remove for portability because function passing not supported in other languages, use reconcile only
   *
   * @param obj is the object to invoke the getter and setter on
   * @param getFn gets the current value
   * @param setFn sets the current value
   * @param val is the value to set iff it does not overwrite a previous value
   * @param config specifies reconciliation configuration
   *        config.resolveDefined uses defined value if true or undefined, undefined if false
   *        config.resolveTrue uses true over false if true, false over true if false, must be equal if undefined
   *        config.resolveMax uses max over min if true, min over max if false, must be equal if undefined
   * @param errMsg is the error message to throw if the values cannot be reconciled (optional)
   */
  static safeSet(
    obj: any,
    getFn: any,
    setFn: any,
    val: any,
    config: any,
    errMsg: any
  ) {
    const curVal = getFn.call(obj);
    const reconciledVal = GenUtils.reconcile(curVal, val, config, errMsg);
    if (curVal !== reconciledVal) setFn.call(obj, reconciledVal);
  }

  /**
   * Reconciles two values.
   *
   * TODO: remove custom error message
   *
   * @param val1 is a value to reconcile
   * @param val2 is a value to reconcile
   * @param config specifies reconciliation configuration
   *        config.resolveDefined uses defined value if true or undefined, undefined if false
   *        config.resolveTrue uses true over false if true, false over true if false, must be equal if undefined
   *        config.resolveMax uses max over min if true, min over max if false, must be equal if undefined
   * @param errMsg is the error message to throw if the values cannot be reconciled (optional)
   * @returns the reconciled value if reconcilable, throws error otherwise
   */
  static reconcile(val1: any, val2: any, config?: any, errMsg?: any) {
    // check for equality
    if (val1 === val2) return val1;

    // check for BigInt equality
    let comparison = 0; // save comparison for later if applicable
    if (val1 instanceof BigInt && val2 instanceof BigInt) {
      comparison = GenUtils.compareBigInt(val1, val2);
      if (comparison === 0) return val1;
    }

    // resolve one value defined
    if (val1 === undefined || val2 === undefined) {
      if (config && config.resolveDefined === false)
        return undefined; // use undefined
      else return val1 === undefined ? val2 : val1; // use defined value
    }

    // resolve different booleans
    if (
      config &&
      config.resolveTrue !== undefined &&
      typeof val1 === "boolean" &&
      typeof val2 === "boolean"
    ) {
      assert.equal(typeof config.resolveTrue, "boolean");
      return config.resolveTrue;
    }

    // resolve different numbers
    if (config && config.resolveMax !== undefined) {
      assert.equal(typeof config.resolveMax, "boolean");

      // resolve js numbers
      if (typeof val1 === "number" && typeof val2 === "number") {
        return config.resolveMax ? Math.max(val1, val2) : Math.min(val1, val2);
      }

      // resolve BigInts
      if (val1 instanceof BigInt && val2 instanceof BigInt) {
        return config.resolveMax
          ? comparison < 0
            ? val2
            : val1
          : comparison < 0
          ? val1
          : val2;
      }
    }

    // assert deep equality
    assert.deepEqual(
      val1,
      val2,
      errMsg
        ? errMsg
        : "Cannot reconcile values " +
            val1 +
            " and " +
            val2 +
            " with config: " +
            JSON.stringify(config)
    );
    return val1;
  }

  /**
   * Returns a human-friendly key value line.
   *
   * @param key is the key
   * @param value is the value
   * @param indent indents the line
   * @param newline specifies if the string should be terminated with a newline or not
   * @param ignoreUndefined specifies if undefined values should return an empty string
   * @returns {string} is the human-friendly key value line
   */
  static kvLine(
    key: any,
    value: any,
    indent = 0,
    newline = true,
    ignoreUndefined = true
  ): string {
    if (value === undefined && ignoreUndefined) return "";
    return (
      GenUtils.getIndent(indent) + key + ": " + value + (newline ? "\n" : "")
    );
  }

  /**
   * Replace big integers (16 or more consecutive digits) with strings in order
   * to preserve numeric precision.
   *
   * @param {string} str is the string to be modified
   * @return {string} the modified string with big numbers converted to strings
   */
  static stringifyBIs(str: string): string {
    return str.replace(/("[^"]*"\s*:\s*)(\d{16,})/g, '$1"$2"');
  }

  /**
   * Wait for the duration.
   *
   * @param {number} durationMs - the duration to wait for in milliseconds
   */
  static async waitFor(durationMs: any) {
    return new Promise(function (resolve) {
      setTimeout(resolve, durationMs);
    });
  }

  /**
   * Kill the given nodejs child process.
   *
   * @param {process} process - the nodejs child process to kill
   * @param {string|undefined} signal - the kill signal, e.g. SIGTERM, SIGKILL, SIGINT (default)
   * @return {Promise<number|undefined>} the exit code from killing the process
   */
  static async killProcess(process: any, signal: string|undefined): Promise<number|undefined> {
    return new Promise((resolve, reject) => {
      process.on("exit", function (code: any) {
        resolve(code);
      });
      process.on("error", function (err: any) {
        reject(err);
      });
      try {
        if (!process.kill(signal ? signal : "SIGINT")) resolve(undefined); // resolve immediately if not running
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Compare two BigInt values (replaces BigInteger.compare()).
   *
   * @param{BigInt} bigint1 - the first BigInt Value in the comparison
   * @parma{BigInt} bigint2 - the second BigInt value in the comparison
   */
  static compareBigInt = function (bigint1: any, bigint2: any) {
    if (bigint1 === bigint2) return 0;
    if (bigint1 > bigint2) return 1;
    return -1;
  };
}

export default GenUtils;

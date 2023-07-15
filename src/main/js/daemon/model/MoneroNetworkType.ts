import MoneroError from "../../common/MoneroError";

/**
 * Defines the Monero network types (mainnet, testnet, and stagenet).
 * 
 * @hideconstructor
 */
class MoneroNetworkType {
  
  /**
   * Validates the given network type.
   * 
   * @param {number} networkType - the network type to validate as a numeric
   */
  static validate(networkType: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (networkType !== 0 && networkType !== 1 && networkType !== 2) throw new MoneroError("Network type is invalid: " + networkType);
  }
  
  /**
   * Indicates if the given network type is valid or not.
   * 
   * @param {number} networkType - the network type to validate as a numeric
   * @return {boolean} true if the network type is valid, false otherwise
   */
  static isValid(networkType: any) {
    return networkType === 0 || networkType === 1 || networkType === 2;
  }
  
  /**
   * Parse the given string as a network type.
   * 
   * @param {string} networkTypeStr - "mainnet", "testnet", or "stagenet" (case insensitive)
   * @return {int} the network type as a numeric
   */
  static parse(networkTypeStr: any) {
    let str = ("" + networkTypeStr).toLowerCase();
    switch (str) {
      // @ts-expect-error TS(2339): Property 'MAINNET' does not exist on type 'typeof ... Remove this comment to see the full error message
      case "mainnet": return MoneroNetworkType.MAINNET;
      // @ts-expect-error TS(2339): Property 'TESTNET' does not exist on type 'typeof ... Remove this comment to see the full error message
      case "testnet": return MoneroNetworkType.TESTNET;
      // @ts-expect-error TS(2339): Property 'STAGENET' does not exist on type 'typeof... Remove this comment to see the full error message
      case "stagenet": return MoneroNetworkType.STAGENET;
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      default: throw new MoneroError("Invalid network type to parse: '" + networkTypeStr + "'");
    }
  }
  
  /**
   * Get the network type in human-readable form.
   *
   * @return {string} the network type in human-readable form
   */
  static toString(networkType: any) {
    if (networkType === 0) return "mainnet";
    if (networkType === 1) return "testnet";
    if (networkType === 2) return "stagenet";
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Invalid network type: " + networkType);
  }
}

/**
 * Mainnet (value=0).
 */
// @ts-expect-error TS(2339): Property 'MAINNET' does not exist on type 'typeof ... Remove this comment to see the full error message
MoneroNetworkType.MAINNET = 0;

/**
 * Testnet (value=1).
 */
// @ts-expect-error TS(2339): Property 'TESTNET' does not exist on type 'typeof ... Remove this comment to see the full error message
MoneroNetworkType.TESTNET = 1;

/**
 * Stagnet (value=2).
 */
// @ts-expect-error TS(2339): Property 'STAGENET' does not exist on type 'typeof... Remove this comment to see the full error message
MoneroNetworkType.STAGENET = 2;

export default MoneroNetworkType;

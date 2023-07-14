import assert from "assert";

/**
 * Enumerates connection types.
 *
 * Based on enums.h in monero-project.
 *
 * @hideconstructor
 */
class ConnectionType {
  static INVALID: number = 0;
  static IPV4: number = 1;
  static IPV6: number = 2;
  static TOR: number = 3;
  static I2P: number = 4;

  /**
   * Asserts that the given connection type is valid.
   */
  static validate(type: number) {
    assert(
      type === ConnectionType.INVALID ||
        type === ConnectionType.IPV4 ||
        type === ConnectionType.IPV6 ||
        type === ConnectionType.TOR,
      "Connection type is invalid: " + type
    );
  }

  /**
   * Indicates if the given connection type is valid or not.
   */
  static isValid(type: number) {
    return (
      type === ConnectionType.INVALID ||
      type === ConnectionType.IPV4 ||
      type === ConnectionType.IPV6 ||
      type === ConnectionType.TOR
    );
  }
}

export default ConnectionType;

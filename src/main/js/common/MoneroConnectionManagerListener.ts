import MoneroRpcConnection from "./MoneroRpcConnection";

/**
 * Default connection manager listener which takes no action on notifications.
 */
abstract class MoneroConnectionManagerListener {
  /**
   * Notified on connection change events.
   *
   * @param {MoneroRpcConnection} connection - the connection manager's current connection
   * @returns {promise<void>}
   */
  abstract onConnectionChanged(connection: MoneroRpcConnection): Promise<void>;
}

export default MoneroConnectionManagerListener;

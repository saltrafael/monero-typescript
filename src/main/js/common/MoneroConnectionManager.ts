import GenUtils from "./GenUtils";
import MoneroConnectionManagerListener from "./MoneroConnectionManagerListener";
import MoneroError from "./MoneroError";
import MoneroRpcConnection from "./MoneroRpcConnection";
import TaskLooper from "./TaskLooper";
import ThreadPool from "./ThreadPool";

/**
 * <p>Manages a collection of prioritized connections to daemon or wallet RPC endpoints.</p>
 *
 * <p>Example usage:</p>
 *
 * <code>
 * // imports<br>
 *  * const MoneroRpcConnection = MoneroRpcConnection;<br>
 * const MoneroConnectionManager = MoneroConnectionManager;<br>
 * const MoneroConnectionManagerListener = MoneroConnectionManagerListener;<br><br>
 *
 * // create connection manager<br>
 * let connectionManager = new MoneroConnectionManager();<br><br>
 *
 * // add managed connections with priorities<br>
 * connectionManager.addConnection(new MoneroRpcConnection("http://localhost:38081").setPriority(1)); // use localhost as first priority<br>
 * connectionManager.addConnection(new MoneroRpcConnection("http://example.com")); // default priority is prioritized last<br><br>
 *
 * // set current connection<br>
 * connectionManager.setConnection(new MoneroRpcConnection("http://foo.bar", "admin", "password")); // connection is added if new<br><br>
 *
 * // check connection status<br>
 * await connectionManager.checkConnection();<br>
 * console.log("Connection manager is connected: " + connectionManager.isConnected());<br>
 * console.log("Connection is online: " + connectionManager.getConnection().isOnline());<br>
 * console.log("Connection is authenticated: " + connectionManager.getConnection().isAuthenticated());<br><br>
 *
 * // receive notifications of any changes to current connection<br>
 * connectionManager.addListener(new class extends MoneroConnectionManagerListener {<br>
 * &nbsp;&nbsp; onConnectionChanged(connection) {<br>
 * &nbsp;&nbsp;&nbsp;&nbsp; console.log("Connection changed to: " + connection);<br>
 * &nbsp;&nbsp; }<br>
 * });<br><br>
 *
 * // check connection status every 10 seconds<br>
 * await connectionManager.startCheckingConnection(10000);<br><br>
 *
 * // automatically switch to best available connection if disconnected<br>
  connectionManager.autoSwitch = true;
 *
 * // get best available connection in order of priority then response time<br>
 * let bestConnection = await connectionManager.getBestAvailableConnection();<br><br>
 *
 * // check status of all connections<br>
 * await connectionManager.checkConnections();<br><br>
 *
 * // get connections in order of current connection, online status from last check, priority, and name<br>
 * let connections = connectionManager.getConnections();<br><br>
 *
 * // clear connection manager<br>
 * connectionManager.clear();
 * <code>
 */
class MoneroConnectionManager {
  static DEFAULT_TIMEOUT = 5000;
  static DEFAULT_CHECK_CONNECTION_PERIOD = 15000;

  autoSwitch: boolean = false;
  private _checkLooper?: TaskLooper;
  private _connections: MoneroRpcConnection[];
  private _currentConnection?: MoneroRpcConnection;
  private _listeners: MoneroConnectionManagerListener[];
  private _proxyToWorker: boolean;
  _timeoutInMs: number;
  _timeoutMs: any;

  /**
   * Construct a connection manager.
   *
   * @param {boolean} [proxyToWorker] - configure all connections to proxy to worker (default true)
   */
  constructor(proxyToWorker: boolean) {
    this._proxyToWorker = proxyToWorker !== false;
    this._timeoutInMs = MoneroConnectionManager.DEFAULT_TIMEOUT;
    this._connections = [];
    this._listeners = [];
  }

  /**
   * Add a listener to receive notifications when the connection changes.
   *
   * @param {MoneroConnectionManagerListener} listener - the listener to add
   * @return {MoneroConnectionManager} this connection manager for chaining
   */
  addListener(
    listener: MoneroConnectionManagerListener,
  ): MoneroConnectionManager {
    this._listeners.push(listener);
    return this;
  }

  /**
   * Remove a listener.
   *
   * @param {MoneroConnectionManagerListener} listener - the listener to remove
   * @return {MoneroConnectionManager} this connection manager for chaining
   */
  removeListener(
    listener: MoneroConnectionManagerListener,
  ): MoneroConnectionManager {
    if (!GenUtils.remove(this._listeners, listener))
      throw new MoneroError(
        "Monero connection manager does not contain listener to remove",
      );
    return this;
  }

  /**
   * Remove all listeners.
   *
   * @return {MoneroConnectionManager} this connection manager for chaining
   */
  removeListeners(): MoneroConnectionManager {
    this._listeners.splice(0, this._listeners.length);
    return this;
  }

  /**
   * Add a connection. The connection may have an elevated priority for this manager to use.
   *
   * @param {MoneroRpcConnection} connection - the connection to add
   * @return {Promise<MoneroConnectionManager>} this connection manager for chaining
   */
  async addConnection(
    connection: MoneroRpcConnection,
  ): Promise<MoneroConnectionManager> {
    for (const aConnection of this._connections) {
      if (aConnection.uri === connection.uri)
        throw new MoneroError("Connection URI already exists");
    }
    if (this._proxyToWorker !== undefined)
      connection.proxyToWorker = this._proxyToWorker;
    this._connections.push(connection);
    return this;
  }

  /**
   * Remove a connection.
   *
   * @param {string} uri - of the the connection to remove
   * @return {Promise<MoneroConnectionManager>} this connection manager for chaining
   */
  async removeConnection(uri: string): Promise<MoneroConnectionManager> {
    const connection = this.getConnectionByUri(uri);
    if (!connection)
      throw new MoneroError("No connection exists with URI: " + uri);
    GenUtils.remove(this._connections, connection);
    if (connection === this._currentConnection) {
      this._currentConnection = undefined;
      this._onConnectionChanged(this._currentConnection);
    }
    return this;
  }

  /**
   * Indicates if the connection manager is connected to a node.
   *
   * @return {boolean|undefined} true if the current connection is set, online, and not unauthenticated, undefined if unknown, false otherwise
   */
  get isConnected(): boolean | undefined {
    if (!this._currentConnection) return false;
    return this._currentConnection.isConnected;
  }

  /**
   * Get the current connection.
   */
  get connection() {
    return this._currentConnection;
  }

  /**
   * Get a connection by URI.
   *
   * @param {string} uri is the URI of the connection to get
   * @return {MoneroRpcConnection} the connection with the URI or undefined if no connection with the URI exists
   */
  getConnectionByUri(uri: string): undefined | MoneroRpcConnection {
    for (const connection of this._connections)
      if (connection.uri === uri) return connection;
    return undefined;
  }

  /**
   * Get all connections in order of current connection (if applicable), online status, priority, and name.
   *
   * @return {MoneroRpcConnection[]} the list of sorted connections
   */
  getConnections(): MoneroRpcConnection[] {
    const sortedConnections = GenUtils.copyArray(this._connections);
    sortedConnections.sort(this._compareConnections.bind(this));
    return sortedConnections;
  }

  /**
   * Get the best available connection in order of priority then response time.
   *
   * @param {MoneroRpcConnection[]} [excludedConnections] - connections to be excluded from consideration (optional)
   * @return {Promise<MoneroRpcConnection>} the best available connection in order of priority then response time, undefined if no connections available
   */
  async getBestAvailableConnection(
    excludedConnections: MoneroRpcConnection[],
  ): Promise<MoneroRpcConnection | undefined> {
    // try connections within each ascending priority
    for (const prioritizedConnections of this._getConnectionsInAscendingPriority()) {
      try {
        // create promises to check connections
        const that = this;
        const checkPromises = [];
        for (const connection of prioritizedConnections) {
          if (
            excludedConnections &&
            GenUtils.arrayContains(excludedConnections, connection)
          )
            continue;
          checkPromises.push(
            new Promise(async function (resolve, reject) {
              await connection.checkConnection(that._timeoutInMs);
              if (connection.isConnected) resolve(connection);
              else reject();
            }),
          );
        }

        // use first available connection
        const firstAvailable = await Promise.any(checkPromises);
        if (firstAvailable) return firstAvailable;
      } catch (err: any) {
        throw new MoneroError(err);
      }
    }
    return undefined;
  }

  /**
   * Set the current connection.
   * Provide a URI to select an existing connection without updating its credentials.
   * Provide a MoneroRpcConnection to add new connection or replace existing connection with the same URI.
   * Notify if current connection changes.
   * Does not check the connection.
   *
   * @param {string|MoneroRpcConnection} [uriOrConnection] - is the uri of the connection or the connection to make current (default undefined for no current connection)
   * @return {MoneroConnectionManager} this connection manager for chaining
   */
  setConnection(
    uriOrConnection: undefined | string | MoneroRpcConnection,
  ): MoneroConnectionManager {
    // handle uri
    if (uriOrConnection && typeof uriOrConnection === "string") {
      const connection = this.getConnectionByUri(uriOrConnection);
      return this.setConnection(
        connection === undefined
          ? new MoneroRpcConnection(uriOrConnection)
          : connection,
      );
    }

    // handle connection
    const connection = uriOrConnection;
    if (this._currentConnection === connection) return this;

    // check if setting undefined connection
    if (!connection) {
      this._currentConnection = undefined;
      this._onConnectionChanged(undefined);
      return this;
    }

    // validate connection
    if (!(connection instanceof MoneroRpcConnection))
      throw new MoneroError(
        "Must provide string or MoneroRpcConnection to set connection",
      );
    if (!connection.uri()) throw new MoneroError("Connection is missing URI");

    // add or replace connection
    const prevConnection = this.getConnectionByUri(connection.uri());
    if (prevConnection) GenUtils.remove(this._connections, prevConnection);
    this.addConnection(connection);
    this._currentConnection = connection;
    this._onConnectionChanged(this._currentConnection);

    return this;
  }

  /**
   * Check the current connection. If disconnected and auto switch enabled, switches to best available connection.
   *
   * @return {Promise<MoneroConnectionManager>} this connection manager for chaining
   */
  async checkConnection(): Promise<MoneroConnectionManager> {
    let connectionChanged = false;
    const connection = this.connection();
    if (connection && (await connection.checkConnection(this._timeoutInMs)))
      connectionChanged = true;
    if (this.autoSwitch && !this.isConnected) {
      const bestConnection = await this.getBestAvailableConnection([
        connection,
      ]);
      if (bestConnection) {
        this.setConnection(bestConnection);
        return this;
      }
    }
    if (connectionChanged) await this._onConnectionChanged(connection);
    return this;
  }

  /**
   * Check all managed connections.
   *
   * @return {Promise<MoneroConnectionManager>} this connection manager for chaining
   */
  async checkConnections(): Promise<MoneroConnectionManager> {
    // check all connections
    await Promise.all(this.checkConnectionPromises());

    // auto switch to best connection
    if (this.autoSwitch && !this.isConnected) {
      for (const prioritizedConnections of this._getConnectionsInAscendingPriority()) {
        let bestConnection;
        for (const prioritizedConnection of prioritizedConnections) {
          if (
            prioritizedConnection.isConnected &&
            (!bestConnection ||
              prioritizedConnection.getResponseTime() <
                bestConnection.getResponseTime())
          ) {
            bestConnection = prioritizedConnection;
          }
        }
        if (bestConnection) {
          this.setConnection(bestConnection);
          break;
        }
      }
    }
    return this;
  }

  /**
   * Check all managed connections, returning a promise for each connection check.
   * Does not auto switch if disconnected.
   *
   * @return {Promise[]} a promise for each connection in the order of getConnections().
   */
  checkConnectionPromises(): Promise<any>[] {
    const that = this;
    const checkPromises = [];
    const pool = new ThreadPool(this._connections.length);
    for (const connection of this.getConnections()) {
      checkPromises.push(
        pool.submit(async function (this: any) {
          try {
            if (
              (await connection.checkConnection(that._timeoutInMs)) &&
              connection === this._currentConnection
            )
              await that._onConnectionChanged(connection);
          } catch (err) {
            // ignore error
          }
        }),
      );
    }
    Promise.all(checkPromises);
    return checkPromises;
  }

  /**
   * Check the connection and start checking the connection periodically.
   *
   * @param {number} periodMs is the time between checks in milliseconds (default 10000 or 10 seconds)
   * @return {Promise<MoneroConnectionManager>} this connection manager for chaining (after first checking the connection)
   */
  async startCheckingConnection(
    periodMs: number,
  ): Promise<MoneroConnectionManager> {
    await this.checkConnection();
    if (!periodMs)
      periodMs = MoneroConnectionManager.DEFAULT_CHECK_CONNECTION_PERIOD;
    if (this._checkLooper) return this;
    const that = this;
    let firstCheck = true;
    this._checkLooper = new TaskLooper(async function () {
      if (firstCheck) {
        firstCheck = false; // skip first check
        return;
      }
      try {
        await that.checkConnection();
      } catch (err) {
        console.error("Error checking connection: " + err);
      }
    });
    this._checkLooper.start(periodMs);
    return this;
  }

  /**
   * Stop checking the connection status periodically.
   *
   * @return {MoneroConnectionManager} this connection manager for chaining
   */
  stopCheckingConnection(): MoneroConnectionManager {
    if (this._checkLooper) this._checkLooper.stop();
    delete this._checkLooper;
    return this;
  }

  /**
   * Set the maximum request time before its connection is considered offline.
   *
   * @param {number} timeoutInMs - the timeout before the connection is considered offline
   * @return {MoneroConnectionManager} this connection manager for chaining
   */
  setTimeout(timeoutInMs: number): MoneroConnectionManager {
    this._timeoutInMs = timeoutInMs;
    return this;
  }

  /**
   * Get the request timeout.
   *
   * @return {int} the request timeout before a connection is considered offline
   */
  getTimeout(): number {
    return this._timeoutInMs;
  }

  /**
   * Collect connectable peers of the managed connections.
   *
   * @return {MoneroRpcConnection[]} connectable peers
   */
  async getPeerConnections(): Promise<MoneroRpcConnection[]> {
    throw new MoneroError("Not implemented");
  }

  /**
   * Disconnect from the current connection.
   *
   * @return {MoneroConnectionManager} this connection manager for chaining
   */
  disconnect(): MoneroConnectionManager {
    this.setConnection(undefined);
    return this;
  }

  /**
   * Remove all connections.
   *
   * @return {MoneroConnectonManager} this connection manager for chaining
   */
  clear(): MoneroConnectionManager {
    this._connections.splice(0, this._connections.length);
    if (this._currentConnection) {
      this._currentConnection = undefined;
      this._onConnectionChanged(undefined);
    }
    return this;
  }

  /**
   * Reset to default state.
   *
   * @return {MoneroConnectonManager} this connection manager for chaining
   */
  reset(): MoneroConnectionManager {
    this.removeListeners();
    this.stopCheckingConnection();
    this.clear();
    this._timeoutMs = MoneroConnectionManager.DEFAULT_TIMEOUT;
    this.autoSwitch = false;
    return this;
  }

  /**
   * Get all listeners.
   */
  get listeners() {
    return this._listeners;
  }

  // ------------------------------ PRIVATE HELPERS ---------------------------

  async _onConnectionChanged(connection: any) {
    const promises = [];
    for (const listener of this._listeners)
      promises.push(listener.onConnectionChanged(connection));
    return Promise.all(promises);
  }

  _getConnectionsInAscendingPriority() {
    const connectionPriorities = new Map();
    for (const connection of this._connections) {
      if (!connectionPriorities.has(connection.priority))
        connectionPriorities.set(connection.priority, []);
      connectionPriorities.get(connection.priority).push(connection);
    }
    const ascendingPriorities = new Map(
      [...connectionPriorities].sort((a, b) => parseInt(a[0]) - parseInt(b[0])),
    ); // create map in ascending order
    const ascendingPrioritiesList = [];
    for (const priorityConnections of ascendingPriorities.values())
      ascendingPrioritiesList.push(priorityConnections);
    if (connectionPriorities.has(0))
      ascendingPrioritiesList.push(ascendingPrioritiesList.splice(0, 1)[0]); // move priority 0 to end
    return ascendingPrioritiesList;
  }

  _compareConnections(c1: any, c2: any) {
    // current connection is first
    if (c1 === this._currentConnection) return -1;
    if (c2 === this._currentConnection) return 1;

    // order by availability then priority then by name
    if (c1.isOnline() === c2.isOnline()) {
      if (c1.getPriority() === c2.getPriority())
        return c1.getUri().localeCompare(c2.getUri());
      else
        return c1.getPriority() == 0
          ? 1
          : c2.getPriority() == 0
          ? -1
          : c1.getPriority() - c2.getPriority();
    } else {
      if (c1.isOnline()) return -1;
      else if (c2.isOnline()) return 1;
      else if (c1.isOnline() === undefined) return -1;
      else return 1; // c1 is offline
    }
  }
}

export default MoneroConnectionManager;

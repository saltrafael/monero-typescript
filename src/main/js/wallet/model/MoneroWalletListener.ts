import MoneroOutputWallet from "./MoneroOutputWallet";

/**
 * Default wallet listener which takes no action on notifications.
 */
abstract class MoneroWalletListener {
  /**
   * Invoked as the wallet is synchronized.
   *
   * @param {number} height - height of the synced block
   * @param {number} startHeight - starting height of the sync request
   * @param {number} endHeight - ending height of the sync request
   * @param {number} percentDone - sync progress as a percentage
   * @param {string} message - human-readable description of the current progress
   * @returns {Promise<void>}
   */
  abstract onSyncProgress(
    height: number,
    startHeight: number,
    endHeight: number,
    percentDone: number,
    message: number
  ): Promise<void>;

  /**
   * Invoked when a new block is added to the chain.
   *
   * @param {number} height - the height of the new block (i.e. the number of blocks before it).
   * @returns {promise<void>}
   */
  abstract onNewBlock(height: number): Promise<void>;

  /**
   * Invoked when the wallet's balances change.
   *
   * @param {BigInt} newBalance - new wallet balance
   * @param {BigInt} newUnlockedBalance - new unlocked wallet balance
   * @returns {promise<void>}
   */
  abstract onBalancesChanged(
    newBalance: bigint,
    newUnlockedBalance: bigint
  ): Promise<void>;

  /**
   * Invoked 3 times per received output: once when unconfirmed, once when confirmed, and
   * once when unlocked.
   *
   * The notified output includes basic fields only, so the output or its transaction should be fetched to get all available fields.
   *
   * @param {MoneroOutputWallet} output - the received output
   * @returns {promise<void>}
   */
  abstract onOutputReceived(output: MoneroOutputWallet): Promise<void>;

  /**
   * Invoked twice per spent output: once when confirmed and once when unlocked.
   *
   * The notified output includes basic fields only, so the output or its transaction should be fetched to get all available fields.
   *
   * @param {MoneroOutputWallet} output - the spent output
   * @param {promise<void>}
   */
  abstract onOutputSpent(output: MoneroOutputWallet): Promise<void>;
}

export default MoneroWalletListener;

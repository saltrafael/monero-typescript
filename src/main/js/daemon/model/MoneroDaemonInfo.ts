
/**
 * Monero daemon info.
 */
class MoneroDaemonInfo {
  state: any;

  constructor(state: any) {
    state = Object.assign({}, state);
    this.state = state;
    
    // deserialize BigInts
    if (state.difficulty !== undefined && !(state.difficulty instanceof BigInt)) state.difficulty = BigInt(state.difficulty);
    if (state.cumulativeDifficulty !== undefined && !(state.cumulativeDifficulty instanceof BigInt)) state.cumulativeDifficulty = BigInt(state.cumulativeDifficulty);
    if (state.credits !== undefined && !(state.credits instanceof BigInt)) state.credits = BigInt(state.credits);
  }

  toJson() {
    let json = Object.assign([], this.state);
    if (json.difficulty !== undefined) json.difficulty = json.difficulty.toString();
    if (json.cumulativeDifficulty !== undefined) json.cumulativeDifficulty = json.cumulativeDifficulty.toString();
    if (json.credits !== undefined) json.credits = json.credits.toString();
    return json;
  }

  getVersion() {
    return this.state.version;
  }

  setVersion(version: any) {
    this.state.version = version;
    return this;
  }

  getNumAltBlocks() {
    return this.state.numAltBlocks;
  }

  setNumAltBlocks(numAltBlocks: any) {
    this.state.numAltBlocks = numAltBlocks;
    return this;
  }

  getBlockSizeLimit() {
    return this.state.blockSizeLimit;
  }

  setBlockSizeLimit(blockSizeLimit: any) {
    this.state.blockSizeLimit = blockSizeLimit;
    return this;
  }

  getBlockSizeMedian() {
    return this.state.blockSizeMedian;
  }

  setBlockSizeMedian(blockSizeMedian: any) {
    this.state.blockSizeMedian = blockSizeMedian;
    return this;
  }

  getBlockWeightLimit() {
    return this.state.blockWeightLimit;
  }

  setBlockWeightLimit(blockWeightLimit: any) {
    this.state.blockWeightLimit = blockWeightLimit;
    return this;
  }

  getBlockWeightMedian() {
    return this.state.blockWeightMedian;
  }

  setBlockWeightMedian(blockWeightMedian: any) {
    this.state.blockWeightMedian = blockWeightMedian;
    return this;
  }

  getBootstrapDaemonAddress() {
    return this.state.bootstrapDaemonAddress;
  }

  setBootstrapDaemonAddress(bootstrapDaemonAddress: any) {
    this.state.bootstrapDaemonAddress = bootstrapDaemonAddress;
    return this;
  }

  getDifficulty() {
    return this.state.difficulty;
  }

  setDifficulty(difficulty: any) {
    this.state.difficulty = difficulty;
    return this;
  }

  getCumulativeDifficulty() {
    return this.state.cumulativeDifficulty;
  }

  setCumulativeDifficulty(cumulativeDifficulty: any) {
    this.state.cumulativeDifficulty = cumulativeDifficulty;
    return this;
  }

  getFreeSpace() {
    return this.state.freeSpace;
  }

  setFreeSpace(freeSpace: any) {
    this.state.freeSpace = freeSpace;
    return this;
  }

  getNumOfflinePeers() {
    return this.state.numOfflinePeers;
  }

  setNumOfflinePeers(numOfflinePeers: any) {
    this.state.numOfflinePeers = numOfflinePeers;
    return this;
  }

  getNumOnlinePeers() {
    return this.state.numOnlinePeers;
  }

  setNumOnlinePeers(numOnlinePeers: any) {
    this.state.numOnlinePeers = numOnlinePeers;
    return this;
  }

  getHeight() {
    return this.state.height;
  }

  setHeight(height: any) {
    this.state.height = height;
    return this;
  }

  getHeightWithoutBootstrap() {
    return this.state.heightWithoutBootstrap;
  }

  setHeightWithoutBootstrap(heightWithoutBootstrap: any) {
    this.state.heightWithoutBootstrap = heightWithoutBootstrap;
    return this;
  }

  getNetworkType() {
    return this.state.networkType;
  }

  setNetworkType(networkType: any) {
    this.state.networkType = networkType;
    return this;
  }

  isOffline() {
    return this.state.isOffline;
  }

  setIsOffline(isOffline: any) {
    this.state.isOffline = isOffline;
    return this;
  }

  getNumIncomingConnections() {
    return this.state.numIncomingConnections;
  }

  setNumIncomingConnections(numIncomingConnections: any) {
    this.state.numIncomingConnections = numIncomingConnections;
    return this;
  }

  getNumOutgoingConnections() {
    return this.state.numOutgoingConnections;
  }

  setNumOutgoingConnections(numOutgoingConnections: any) {
    this.state.numOutgoingConnections = numOutgoingConnections;
    return this;
  }

  getNumRpcConnections() {
    return this.state.numRpcConnections;
  }

  setNumRpcConnections(numRpcConnections: any) {
    this.state.numRpcConnections = numRpcConnections;
    return this;
  }

  getStartTimestamp() {
    return this.state.startTimestamp;
  }

  setStartTimestamp(startTimestamp: any) {
    this.state.startTimestamp = startTimestamp;
    return this;
  }

  getAdjustedTimestamp() {
    return this.state.adjustedTimestamp;
  }

  setAdjustedTimestamp(adjustedTimestamp: any) {
    this.state.adjustedTimestamp = adjustedTimestamp;
    return this;
  }

  getTarget() {
    return this.state.target;
  }

  setTarget(target: any) {
    this.state.target = target;
    return this;
  }

  getTargetHeight() {
    return this.state.targetHeight;
  }

  setTargetHeight(targetHeight: any) {
    this.state.targetHeight = targetHeight;
    return this;
  }

  getTopBlockHash() {
    return this.state.topBlockHash;
  }

  setTopBlockHash(topBlockHash: any) {
    this.state.topBlockHash = topBlockHash;
    return this;
  }

  getNumTxs() {
    return this.state.numTxs;
  }

  setNumTxs(numTxs: any) {
    this.state.numTxs = numTxs;
    return this;
  }

  getNumTxsPool() {
    return this.state.numTxsPool;
  }

  setNumTxsPool(numTxsPool: any) {
    this.state.numTxsPool = numTxsPool;
    return this;
  }

  getWasBootstrapEverUsed() {
    return this.state.wasBootstrapEverUsed;
  }

  setWasBootstrapEverUsed(wasBootstrapEverUsed: any) {
    this.state.wasBootstrapEverUsed = wasBootstrapEverUsed;
    return this;
  }

  getDatabaseSize() {
    return this.state.databaseSize;
  }

  setDatabaseSize(databaseSize: any) {
    this.state.databaseSize = databaseSize;
    return this;
  }

  getUpdateAvailable() {
    return this.state.updateAvailable;
  }

  setUpdateAvailable(updateAvailable: any) {
    this.state.updateAvailable = updateAvailable;
    return this;
  }

  getCredits() {
    return this.state.credits;
  }

  setCredits(credits: any) {
    this.state.credits = credits;
    return this;
  }

  isBusySyncing() {
    return this.state.isBusySyncing;
  }

  setIsBusySyncing(isBusySyncing: any) {
    this.state.isBusySyncing = isBusySyncing;
    return this;
  }

  isSynchronized() {
    return this.state.isSynchronized;
  }

  setIsSynchronized(isSynchronized: any) {
    this.state.isSynchronized = isSynchronized;
    return this;
  }

  isRestricted() {
    return this.state.isRestricted;
  }

  setIsRestricted(isRestricted: any) {
    this.state.isRestricted = isRestricted;
    return this;
  }
}

export default MoneroDaemonInfo;

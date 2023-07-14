
/**
 * Models a peer to the daemon.
 */
class MoneroPeer {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
    if (this.state.rpcCreditsPerHash !== undefined && !(this.state.rpcCreditsPerHash instanceof BigInt)) this.state.rpcCreditsPerHash = BigInt(this.state.rpcCreditsPerHash);
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (json.rpcCreditsPerHash !== undefined) json.rpcCreditsPerHash = json.rpcCreditsPerHash.toString();
    return json;
  }

  // @ts-expect-error TS(2393): Duplicate function implementation.
  getId() {
    return this.state.id;
  }

  // @ts-expect-error TS(2393): Duplicate function implementation.
  setId(id: any) {
    this.state.id = id;
    return this;
  }

  getAddress() {
    return this.state.address;
  }

  setAddress(address: any) {
    this.state.address = address;
    return this;
  }

  getHost() {
    return this.state.host;
  }

  setHost(host: any) {
    this.state.host = host;
    return this;
  }

  getPort() {
    return this.state.port;
  }

  setPort(port: any) {
    this.state.port = port;
    return this;
  }

  /**
   * Indicates if the peer was online when last checked (aka "white listed" as
   * opposed to "gray listed").
   * 
   * @return {boolean} true if peer was online when last checked, false otherwise
   */
  isOnline() {
    return this.state.isOnline;
  }

  setIsOnline(isOnline: any) {
    this.state.isOnline = isOnline;
    return this;
  }

  getLastSeenTimestamp() {
    return this.state.lastSeenTimestamp;
  }

  setLastSeenTimestamp(lastSeenTimestamp: any) {
    this.state.lastSeenTimestamp = lastSeenTimestamp;
    return this;
  }

  getPruningSeed() {
    return this.state.pruningSeed;
  }

  setPruningSeed(pruningSeed: any) {
    this.state.pruningSeed = pruningSeed;
    return this;
  }

  getRpcPort() {
    return this.state.rpcPort;
  }

  setRpcPort(rpcPort: any) {
    this.state.rpcPort = rpcPort;
    return this;
  }

  getRpcCreditsPerHash() {
    return this.state.rpcCreditsPerHash;
  }

  setRpcCreditsPerHash(rpcCreditsPerHash: any) {
    this.state.rpcCreditsPerHash = rpcCreditsPerHash;
    return this;
  }

  // @ts-expect-error TS(2393): Duplicate function implementation.
  getId() {
  return this.state.id;
}

  // @ts-expect-error TS(2393): Duplicate function implementation.
  setId(id: any) {
    this.state.id = id;
    return this;
  }

  getAvgDownload() {
    return this.state.avgDownload;
  }

  setAvgDownload(avgDownload: any) {
    this.state.avgDownload = avgDownload;
    return this;
  }

  getAvgUpload() {
    return this.state.avgUpload;
  }

  setAvgUpload(avgUpload: any) {
    this.state.avgUpload = avgUpload;
    return this;
  }

  getCurrentDownload() {
    return this.state.currentDownload;
  }

  setCurrentDownload(currentDownload: any) {
    this.state.currentDownload = currentDownload;
    return this;
  }

  getCurrentUpload() {
    return this.state.currentUpload;
  }

  setCurrentUpload(currentUpload: any) {
    this.state.currentUpload = currentUpload;
    return this;
  }

  getHeight() {
    return this.state.height;
  }

  setHeight(height: any) {
    this.state.height = height;
    return this;
  }

  isIncoming() {
    return this.state.isIncoming;
  }

  setIsIncoming(isIncoming: any) {
    this.state.isIncoming = isIncoming;
    return this;
  }

  getLiveTime() {
    return this.state.liveTime;
  }

  setLiveTime(liveTime: any) {
    this.state.liveTime = liveTime;
    return this;
  }

  isLocalIp() {
    return this.state.isLocalIp;
  }

  setIsLocalIp(isLocalIp: any) {
    this.state.isLocalIp = isLocalIp;
    return this;
  }

  isLocalHost() {
    return this.state.isLocalHost;
  }

  setIsLocalHost(isLocalHost: any) {
    this.state.isLocalHost = isLocalHost;
    return this;
  }

  getNumReceives() {
    return this.state.numReceives;
  }

  setNumReceives(numReceives: any) {
    this.state.numReceives = numReceives;
    return this;
  }

  getNumSends() {
    return this.state.numSends;
  }

  setNumSends(numSends: any) {
    this.state.numSends = numSends;
    return this;
  }

  getReceiveIdleTime() {
    return this.state.receiveIdleTime;
  }

  setReceiveIdleTime(receiveIdleTime: any) {
    this.state.receiveIdleTime = receiveIdleTime;
    return this;
  }

  getSendIdleTime() {
    return this.state.sendIdleTime;
  }

  setSendIdleTime(sendIdleTime: any) {
    this.state.sendIdleTime = sendIdleTime;
    return this;
  }

  getState() {
    return this.state.state;
  }

  setState(state: any) {
    this.state.state = state;
    return this;
  }

  getNumSupportFlags() {
    return this.state.numSupportFlags;
  }

  setNumSupportFlags(numSupportFlags: any) {
    this.state.numSupportFlags = numSupportFlags;
    return this;
  }

  getType() {
    return this.state.type;
  }

  setType(type: any) {
    this.state.type = type;
    return this;
  }
}

export default MoneroPeer;

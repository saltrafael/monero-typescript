import assert from "assert";
import GenUtils from "../../common/GenUtils";

/**
 * Models a Monero block header which contains information about the block.
 * 
 * @class
 */
class MoneroBlockHeader {
  state: any;

  /**
   * Construct the model.
   * 
   * @param {MoneroBlockHeader|object} state is existing state to initialize from (optional)
   */
  constructor(state: any) {
    
    // initialize internal state
    if (!state) state = {};
    else if (state instanceof MoneroBlockHeader) state = state.toJson();
    else if (typeof state === "object") state = Object.assign({}, state);
    // @ts-expect-error TS(2304): Cannot find name 'MoneroError'.
    else throw new MoneroError("state must be a MoneroBlockHeader or JavaScript object");
    this.state = state;
    
    // deserialize BigInts
    if (state.difficulty !== undefined && !(state.difficulty instanceof BigInt)) state.difficulty = BigInt(state.difficulty);
    if (state.cumulativeDifficulty !== undefined && !(state.cumulativeDifficulty instanceof BigInt)) state.cumulativeDifficulty = BigInt(state.cumulativeDifficulty);
    if (state.reward !== undefined && !(state.reward instanceof BigInt)) state.reward = BigInt(state.reward);
  }

  copy() {
    return new MoneroBlockHeader(this);
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getDifficulty() !== undefined) json.difficulty = this.getDifficulty().toString();
    if (this.getCumulativeDifficulty() !== undefined) json.cumulativeDifficulty = this.getCumulativeDifficulty().toString();
    if (this.getReward() !== undefined) json.reward = this.getReward().toString();
    return json;
  }

  getHash() {
    return this.state.hash;
  }

  setHash(hash: any) {
    this.state.hash = hash;
    return this;
  }

  /**
   * Return the block's height which is the total number of blocks that have occurred before.
   * 
   * @return {number} the block's height
   */
  getHeight() {
    return this.state.height;
  }

  /**
   * Set the block's height which is the total number of blocks that have occurred before.
   * 
   * @param {number} height is the block's height to set
   * @return {MoneroBlockHeader} a reference to this header for chaining
   */
  setHeight(height: any) {
    this.state.height = height;
    return this;
  }

  getTimestamp() {
    return this.state.timestamp;
  }

  setTimestamp(timestamp: any) {
    this.state.timestamp = timestamp;
    return this;
  }

  getSize() {
    return this.state.size;
  }

  setSize(size: any) {
    this.state.size = size;
    return this;
  }

  getWeight() {
    return this.state.weight;
  }

  setWeight(weight: any) {
    this.state.weight = weight;
    return this;
  }

  getLongTermWeight() {
    return this.state.longTermWeight;
  }

  setLongTermWeight(longTermWeight: any) {
    this.state.longTermWeight = longTermWeight;
    return this;
  }

  getDepth() {
    return this.state.depth;
  }

  setDepth(depth: any) {
    this.state.depth = depth;
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

  getMajorVersion() {
    return this.state.majorVersion;
  }

  setMajorVersion(majorVersion: any) {
    this.state.majorVersion = majorVersion;
    return this;
  }

  getMinorVersion() {
    return this.state.minorVersion;
  }

  setMinorVersion(minorVersion: any) {
    this.state.minorVersion = minorVersion;
    return this;
  }

  getNonce() {
    return this.state.nonce;
  }

  setNonce(nonce: any) {
    this.state.nonce = nonce;
    return this;
  }

  getMinerTxHash() {
    return this.state.minerTxHash;
  }

  setMinerTxHash(minerTxHash: any) {
    this.state.minerTxHash = minerTxHash;
    return this;
  }

  getNumTxs() {
    return this.state.numTxs;
  }

  setNumTxs(numTxs: any) {
    this.state.numTxs = numTxs;
    return this;
  }

  getOrphanStatus() {
    return this.state.orphanStatus;
  }

  setOrphanStatus(orphanStatus: any) {
    this.state.orphanStatus = orphanStatus;
    return this;
  }

  getPrevHash() {
    return this.state.prevHash;
  }

  setPrevHash(prevHash: any) {
    this.state.prevHash = prevHash;
    return this;
  }

  getReward() {
    return this.state.reward;
  }

  setReward(reward: any) {
    this.state.reward = reward;
    return this;
  }

  getPowHash() {
    return this.state.powHash;
  }

  setPowHash(powHash: any) {
    this.state.powHash = powHash;
    return this;
  }

  merge(header: any) {
    assert(header instanceof MoneroBlockHeader);
    if (this === header) return this;
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setHash(GenUtils.reconcile(this.getHash(), header.getHash()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 3.
    this.setHeight(GenUtils.reconcile(this.getHeight(), header.getHeight(), {resolveMax: true}));  // height can increase
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 3.
    this.setTimestamp(GenUtils.reconcile(this.getTimestamp(), header.getTimestamp(), {resolveMax: true}));  // block timestamp can increase
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setSize(GenUtils.reconcile(this.getSize(), header.getSize()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setWeight(GenUtils.reconcile(this.getWeight(), header.getWeight()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setDepth(GenUtils.reconcile(this.getDepth(), header.getDepth()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setDifficulty(GenUtils.reconcile(this.getDifficulty(), header.getDifficulty()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setCumulativeDifficulty(GenUtils.reconcile(this.getCumulativeDifficulty(), header.getCumulativeDifficulty()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setMajorVersion(GenUtils.reconcile(this.getMajorVersion(), header.getMajorVersion()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setMinorVersion(GenUtils.reconcile(this.getMinorVersion(), header.getMinorVersion()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setNonce(GenUtils.reconcile(this.getNonce(), header.getNonce()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setMinerTxHash(GenUtils.reconcile(this.getMinerTxHash(), header.getMinerTxHash()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setNumTxs(GenUtils.reconcile(this.getNumTxs(), header.getNumTxs()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setOrphanStatus(GenUtils.reconcile(this.getOrphanStatus(), header.getOrphanStatus()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setPrevHash(GenUtils.reconcile(this.getPrevHash(), header.getPrevHash()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setReward(GenUtils.reconcile(this.getReward(), header.getReward()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setPowHash(GenUtils.reconcile(this.getPowHash(), header.getPowHash()));
    return this;
  }

  toString(indent = 0) {
    let str = "";
    str += GenUtils.kvLine("Hash", this.getHash(), indent);
    str += GenUtils.kvLine("Height", this.getHeight(), indent);
    str += GenUtils.kvLine("Timestamp", this.getTimestamp(), indent);
    str += GenUtils.kvLine("Size", this.getSize(), indent);
    str += GenUtils.kvLine("Weight", this.getWeight(), indent);
    str += GenUtils.kvLine("Depth", this.getDepth(), indent);
    str += GenUtils.kvLine("Difficulty", this.getDifficulty(), indent);
    str += GenUtils.kvLine("Cumulative difficulty", this.getCumulativeDifficulty(), indent);
    str += GenUtils.kvLine("Major version", this.getMajorVersion(), indent);
    str += GenUtils.kvLine("Minor version", this.getMinorVersion(), indent);
    str += GenUtils.kvLine("Nonce", this.getNonce(), indent);
    str += GenUtils.kvLine("Miner tx hash", this.getMinerTxHash(), indent);
    str += GenUtils.kvLine("Num txs", this.getNumTxs(), indent);
    str += GenUtils.kvLine("Orphan status", this.getOrphanStatus(), indent);
    str += GenUtils.kvLine("Prev hash", this.getPrevHash(), indent);
    str += GenUtils.kvLine("Reward", this.getReward(), indent);
    str += GenUtils.kvLine("Pow hash", this.getPowHash(), indent);
    return str[str.length - 1] === "\n" ? str.slice(0, str.length - 1) : str  // strip last newline
  }
}

export default MoneroBlockHeader;

interface StateOpts {
  blockHashes: any;
  difficulty?: bigint | number | string;
  height: any;
  length: any;
  mainChainParentBlockHash: any;
}

/**
 * Models an alternative chain seen by the node.
 */
class MoneroAltChain {
  state: MoneroAltChain;

  constructor(state: StateOpts) {
    if (
      state.difficulty !== undefined &&
      !(typeof state.difficulty === "bigint")
    )
      state.difficulty = BigInt(state.difficulty);
    this.state = state;
  }

  toJson() {
    const json = Object.assign({}, this.state);
    if (this.difficulty !== undefined)
      json.difficulty = this.difficulty.toString();
    return json;
  }

  get blockHashes() {
    return this.state.blockHashes;
  }

  set blockHashes(blockHashes: any) {
    this.state.blockHashes = blockHashes;
  }

  get difficulty() {
    return this.state.difficulty;
  }

  set difficulty(difficulty: bigint) {
    this.state.difficulty = difficulty;
  }

  get height() {
    return this.state.height;
  }

  set height(height: any) {
    this.state.height = height;
  }

  get length() {
    return this.state.length;
  }

  set length(length: any) {
    this.state.length = length;
  }

  get mainChainParentBlockHash() {
    return this.state.mainChainParentBlockHash;
  }

  set mainChainParentBlockHash(mainChainParentBlockHash: any) {
    this.state.mainChainParentBlockHash = mainChainParentBlockHash;
  }
}

export default MoneroAltChain;

import GenUtils from "../../common/GenUtils";
import assert from "assert";

/**
 * Monero subaddress model.
 */
class MoneroSubaddress {
  state: any;

  constructor(stateOrAddress: any, accountIndex: any, index: any) {
    if (stateOrAddress === undefined || typeof stateOrAddress === "string") {
      this.state = {};
      this.setAddress(stateOrAddress);
      this.setAccountIndex(accountIndex);
      this.setIndex(index);
    } else {
      this.state = stateOrAddress;
      assert(accountIndex === undefined && index === undefined, "Can construct MoneroSubaddress with object or params but not both");
      if (this.state.balance !== undefined && !(this.state.balance instanceof BigInt)) this.state.balance = BigInt(this.state.balance);
      if (this.state.unlockedBalance !== undefined && !(this.state.unlockedBalance instanceof BigInt)) this.state.unlockedBalance = BigInt(this.state.unlockedBalance);
    }
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (json.balance !== undefined) json.balance = json.balance.toString();
    if (json.unlockedBalance !== undefined) json.unlockedBalance = json.unlockedBalance.toString();
    return json;
  }

  getAccountIndex() {
    return this.state.accountIndex;
  }

  setAccountIndex(accountIndex: any) {
    this.state.accountIndex = accountIndex;
    return this;
  }

  getIndex() {
    return this.state.index;
  }

  setIndex(index: any) {
    this.state.index = index;
    return this;
  }

  getAddress() {
    return this.state.address;
  }

  setAddress(address: any) {
    this.state.address = address;
    return this;
  }

  getLabel() {
    return this.state.label;
  }

  setLabel(label: any) {
    this.state.label = label;
    return this;
  }

  getBalance() {
    return this.state.balance;
  }

  setBalance(balance: any) {
    this.state.balance = balance;
    return this;
  }

  getUnlockedBalance() {
    return this.state.unlockedBalance;
  }

  setUnlockedBalance(unlockedBalance: any) {
    this.state.unlockedBalance = unlockedBalance;
    return this;
  }

  getNumUnspentOutputs() {
    return this.state.numUnspentOutputs;
  }

  setNumUnspentOutputs(numUnspentOutputs: any) {
    this.state.numUnspentOutputs = numUnspentOutputs;
    return this;
  }

  isUsed() {
    return this.state.isUsed;
  }

  setIsUsed(isUsed: any) {
    this.state.isUsed = isUsed;
    return this;
  }

  getNumBlocksToUnlock() {
    return this.state.numBlocksToUnlock;
  }

  setNumBlocksToUnlock(numBlocksToUnlock: any) {
    this.state.numBlocksToUnlock = numBlocksToUnlock;
    return this;
  }

  toString(indent: any) {
    let str = "";
    str += GenUtils.kvLine("Account index", this.getAccountIndex(), indent);
    str += GenUtils.kvLine("Subaddress index", this.getIndex(), indent);
    str += GenUtils.kvLine("Address", this.getAddress(), indent);
    str += GenUtils.kvLine("Label", this.getLabel(), indent);
    str += GenUtils.kvLine("Balance", this.getBalance(), indent);
    str += GenUtils.kvLine("Unlocked balance", this.getUnlockedBalance(), indent);
    str += GenUtils.kvLine("Num unspent outputs", this.getNumUnspentOutputs(), indent);
    str += GenUtils.kvLine("Is used", this.isUsed(), indent);
    str += GenUtils.kvLine("Num blocks to unlock", this.isUsed(), indent);
    return str.slice(0, str.length - 1);  // strip last newline
  }
}

export default MoneroSubaddress;

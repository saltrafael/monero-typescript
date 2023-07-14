/**
 * Models daemon mining status.
 */
class MoneroMiningStatus {
  state: any;

  constructor(state: any) {
    if (!state) state = {};
    else if (state instanceof MoneroMiningStatus) state = state.toJson();
    else if (typeof state === "object") state = Object.assign({}, state);
    // @ts-expect-error TS(2304): Cannot find name 'MoneroError'.
    else throw new MoneroError("state must be a MoneroMiningStatus or JavaScript object");
    this.state = state;
  }

  toJson() {
    return Object.assign({}, this.state);
  }

  isActive() {
    return this.state.isActive;
  }

  setIsActive(isActive: any) {
    this.state.isActive = isActive;
    return this;
  }

  getAddress() {
    return this.state.address;
  }

  setAddress(address: any) {
    this.state.address = address;
    return this;
  }

  getSpeed() {
    return this.state.speed;
  }

  setSpeed(speed: any) {
    this.state.speed = speed;
    return this;
  }

  getNumThreads() {
    return this.state.numThreads;
  }

  setNumThreads(numThreads: any) {
    this.state.numThreads = numThreads;
    return this;
  }

  isBackground() {
    return this.state.isBackground;
  }

  setIsBackground(isBackground: any) {
    this.state.isBackground = isBackground;
    return this;
  }
}

export default MoneroMiningStatus;

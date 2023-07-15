/**
 * Models a Monero version.
 */
class MoneroVersion {
  state: any;

  /**
   * Construct the model.
   * 
   * @param number is the version number
   * @param isRelease indicates if this version is a release
   */
  constructor(number: any, isRelease: any) {
    this.state = {};
    this.state.number = number;
    this.state.isRelease = isRelease;
  }

  getNumber() {
    return this.state.number;
  }

  setNumber(number: any) {
    this.state.number = number;
    return this;
  }

  isRelease() {
    return this.state.isRelease;
  }

  setIsRelease(isRelease: any) {
    this.state.isRelease = isRelease;
    return this;
  }

  copy() {
    // @ts-expect-error TS(2304): Cannot find name 'MoneroKeyImage'.
    return new MoneroKeyImage(this);
  }

  toJson() {
    return Object.assign({}, this.state);
  }
}

export default MoneroVersion;

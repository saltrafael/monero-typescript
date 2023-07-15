/**
 * Monero integrated address model.
 */
class MoneroIntegratedAddress {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
  }

  toJson() {
    return Object.assign({}, this.state);
  }

  getStandardAddress() {
    return this.state.standardAddress;
  }

  setStandardAddress(standardAddress: any) {
    this.state.standardAddress = standardAddress;
    return this;
  }

  getPaymentId() {
    return this.state.paymentId;
  }

  setPaymentId(paymentId: any) {
    this.state.paymentId = paymentId;
    return this;
  }

  getIntegratedAddress() {
    return this.state.integratedAddress;
  }

  setIntegratedAddress(integratedAddress: any) {
    this.state.integratedAddress = integratedAddress;
    return this;
  }

  toString() {
    return this.state.integratedAddress;
  }
}

export default MoneroIntegratedAddress;

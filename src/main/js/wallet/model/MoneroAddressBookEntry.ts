/**
 * Monero address book entry model
 */
class MoneroAddressBookEntry {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
  }

  toJson() {
    return Object.assign({}, this.state);
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

  getDescription() {
    return this.state.description;
  }

  setDescription(description: any) {
    this.state.description = description;
    return this;
  }

  getPaymentId() {
    return this.state.paymentId;
  }

  setPaymentId(paymentId: any) {
    this.state.paymentId = paymentId;
    return this;
  }
}

export default MoneroAddressBookEntry;

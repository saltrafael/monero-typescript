/**
 * Represents an account tag.
 */
class MoneroAccountTag {
  accountIndices: any;
  accoutIndices: any;
  label: any;
  tag: any;

  constructor(tag: any, label: any, accountIndices: any) {
    this.tag = tag;
    this.label = label;
    this.accountIndices = accountIndices;
  }

  getTag() {
    return this.tag;
  }

  setTag(tag: any) {
    this.tag = tag;
    return this;
  }

  getLabel() {
    return this.label;
  }

  setLabel(label: any) {
    this.label = label;
    return this;
  }

  getAccountIndices() {
    return this.accountIndices;
  }

  setAccountIndices(accountIndices: any) {
    this.accoutIndices = accountIndices;
    return this;
  }
}

export default MoneroAccountTag;

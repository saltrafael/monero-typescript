/**
 * SSL options for remote endpoints.
 */
class SslOptions {
  state: Partial<SslOptions>;

  constructor(state: Partial<SslOptions> = {}) {
    this.state = Object.assign({}, state);
  }

  get privateKeyPath() {
    return this.state.privateKeyPath;
  }

  set privateKeyPath(privateKeyPath: any) {
    this.state.privateKeyPath = privateKeyPath;
  }

  get certificatePath() {
    return this.state.certificatePath;
  }

  set certificatePath(certificatePath: any) {
    this.state.certificatePath = certificatePath;
  }

  get certificateAuthorityFile() {
    return this.state.certificateAuthorityFile;
  }

  set certificateAuthorityFile(certificateAuthorityFile: any) {
    this.state.certificateAuthorityFile = certificateAuthorityFile;
  }

  get allowedFingerprints() {
    return this.state.allowedFingerprints;
  }

  set allowedFingerprints(allowedFingerprints: any) {
    this.state.allowedFingerprints = allowedFingerprints;
  }

  get allowAnyCert() {
    return this.state.allowAnyCert;
  }

  set allowAnyCert(allowAnyCert: any) {
    this.state.allowAnyCert = allowAnyCert;
  }
}

export default SslOptions;

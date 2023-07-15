/**
 * Receives notifications as a daemon is updated.
 */
class MoneroDaemonListener {
 lastHeader: any;

 /**
  * Called when a new block is added to the chain.
  * 
  * @param {MoneroBlockHeader} header - the header of the block added to the chain
  */
 async onBlockHeader(header: any) {
   this.lastHeader = header;
 }

 /**
  * Get the last notified block header.
  * 
  * @return {MoneroBlockHeader} the last notified block header
  */
 getLastBlockHeader() {
   return this.lastHeader;
 }
}

export default MoneroDaemonListener;

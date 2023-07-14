/**
 * Enumerate message signature types.
 * 
 * @hideconstructor
 */
class MoneroMessageSignatureType {}

/**
 * Sign with spend key (value=0).
 */
// @ts-expect-error TS(2339): Property 'SIGN_WITH_SPEND_KEY' does not exist on t... Remove this comment to see the full error message
MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY = 0;

/**
 * Sign with the view key (value=1).
 */
// @ts-expect-error TS(2339): Property 'SIGN_WITH_VIEW_KEY' does not exist on ty... Remove this comment to see the full error message
MoneroMessageSignatureType.SIGN_WITH_VIEW_KEY = 1;

export default MoneroMessageSignatureType;

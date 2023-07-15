/**
 * Enumerate key image spent statuses.
 * 
 * @hideconstructor
 */
class MoneroKeyImageSpentStatus {}

/**
 * Key image is not spent (value=0).
 */
// @ts-expect-error TS(2339): Property 'NOT_SPENT' does not exist on type 'typeo... Remove this comment to see the full error message
MoneroKeyImageSpentStatus.NOT_SPENT = 0;

/**
 * Key image is confirmed (value=1).
 */
// @ts-expect-error TS(2339): Property 'CONFIRMED' does not exist on type 'typeo... Remove this comment to see the full error message
MoneroKeyImageSpentStatus.CONFIRMED = 1;

/**
 * Key image is in the pool (value=2).
 */
// @ts-expect-error TS(2339): Property 'TX_POOL' does not exist on type 'typeof ... Remove this comment to see the full error message
MoneroKeyImageSpentStatus.TX_POOL = 2;

export default MoneroKeyImageSpentStatus;

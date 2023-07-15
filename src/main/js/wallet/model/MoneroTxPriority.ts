/**
 * Enumerates send priorities.
 * 
 * @hideconstructor
 */
class MoneroTxPriority {}

/**
 * Default priority (i.e. normal) (value=0).
 */
// @ts-expect-error TS(2339): Property 'DEFAULT' does not exist on type 'typeof ... Remove this comment to see the full error message
MoneroTxPriority.DEFAULT = 0;

/**
 * Unimportant priority (value=1).
 */
// @ts-expect-error TS(2339): Property 'UNIMPORTANT' does not exist on type 'typ... Remove this comment to see the full error message
MoneroTxPriority.UNIMPORTANT = 1;

/**
 * Normal priority (value=2).
 */
// @ts-expect-error TS(2339): Property 'NORMAL' does not exist on type 'typeof M... Remove this comment to see the full error message
MoneroTxPriority.NORMAL = 2;

/**
 * Elevated priority (value=3).
 */
// @ts-expect-error TS(2339): Property 'ELEVATED' does not exist on type 'typeof... Remove this comment to see the full error message
MoneroTxPriority.ELEVATED = 3;

export default MoneroTxPriority;

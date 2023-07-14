import GenUtils from "./GenUtils";
import async from "async";

/**
 * Simple thread pool using the async library.
 */
class ThreadPool {
  drainListeners: any;
  taskQueue: any;

  /**
   * Construct the thread pool.
   *
   * @param {number} [maxConcurrency] - maximum number of threads in the pool (default 1)
   */
  constructor(maxConcurrency: number) {
    if (maxConcurrency === undefined) maxConcurrency = 1;
    if (maxConcurrency < 1)
      throw new Error("Max concurrency must be greater than or equal to 1");

    // manager concurrency with async queue
    //import async from "async";
    this.taskQueue = async.queue(function (asyncFn: any, callback: any) {
      if (asyncFn.then)
        asyncFn
          .then((resp: any) => {
            callback(resp);
          })
          .catch((err: any) => {
            callback(undefined, err);
          });
      else
        asyncFn()
          .then((resp: any) => {
            callback(resp);
          })
          .catch((err: any) => {
            callback(undefined, err);
          });
    }, maxConcurrency);

    // use drain listeners to support await all
    const that = this;
    this.drainListeners = [];
    this.taskQueue.drain = function () {
      for (const listener of that.drainListeners) listener();
    };
  }

  /**
   * Submit an asynchronous function to run using the thread pool.
   *
   * @param {function} asyncFn - asynchronous function to run with the thread pool
   * @return {Promise} resolves when the function completes execution
   */
  async submit(asyncFn: any): Promise<any> {
    const that = this;
    return new Promise(function (resolve, reject) {
      that.taskQueue.push(asyncFn, function (resp: any, err: any) {
        if (err !== undefined) reject(err);
        else resolve(resp);
      });
    });
  }

  /**
   * Await all functions to complete.
   *
   * @return {Promise} resolves when all functions complete
   */
  async awaitAll(): Promise<any> {
    if (this.taskQueue.length === 0) return;
    const that = this;
    return new Promise(function (resolve) {
      that.drainListeners.push(function (this: any) {
        GenUtils.remove(that.drainListeners, this);
        // @ts-expect-error TS(2794): Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
        resolve();
      });
    });
  }
}

export default ThreadPool;

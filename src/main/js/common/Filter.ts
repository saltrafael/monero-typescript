/**
 * Base filter.
 *
 * @private
 */
abstract class Filter {
  /**
   * Indicates if the given value meets the criteria of this filter.
   *
   * @param val is the value to test
   * @return true if the value meets the criteria of this filter, false otherwise
   */
  abstract meetsCriteria(val: any): void;

  /**
   * Returns a new array comprised of elements from the given array that meet
   * the filter's criteria.
   *
   * @param array is the array to apply the filter to
   * @return the new array of filtered elements
   */
  apply(array: any[]) {
    return array.filter((elem) => this.meetsCriteria(elem));
  }
}

export default Filter;

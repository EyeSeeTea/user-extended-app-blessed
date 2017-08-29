/**
 * Class used to parse date to the required format
 */

function DateFormatter() {
}

/**
 * Parse the date to a period format "yyyymm"
 * @param date The date to format.
 * @return a formated date as int object
 */
DateFormatter.prototype.parseDateToPeriodFormat = function (date) {
    var dateMonth = ("0" + (date.getMonth() + 1)).slice(-2);
    return (date.getFullYear() + dateMonth);
}

/**
 * Parse the server date value to javascript date value.
 * @param dateAsString is a date as string. Example of server date format: 1900-01-01T00:00:00.000
 * @return formated date as Date object
 */
DateFormatter.prototype.parseDateFromDhis = function (dateAsString) {
    if (dateAsString == undefined) {
        return undefined;
    }
    var parseDate = new Date();
    parseDate.setFullYear(dateAsString.substring(0, 4));
    parseDate.setMonth(dateAsString.substring(5, 7) - 1);
    parseDate.setDate(dateAsString.substring(8, 10));
    parseDate.setHours(dateAsString.substring(11, 13));
    parseDate.setMinutes(dateAsString.substring(14, 16));
    parseDate.setSeconds(dateAsString.substring(18, 20)); 
    return parseDate;
}

/**
 * Compare two date Periods
 * @param firstDate date as Date objet to compare
 * @param SecondDate date as Date objet to compare
 * @return true if the dates formated as periods(year and month) are equals.
 */
DateFormatter.prototype.areDatePeriodsEquals = function (firstDate, secondDate) {
    return this.parseDateToPeriodFormat(firstDate) == this.parseDateToPeriodFormat(secondDate);
}

module.exports = new DateFormatter();
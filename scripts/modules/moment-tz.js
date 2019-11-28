/**
 * This is a convenience script which combines Moment and Moment TimeZone
 */

define(["moment", "vendor/moment/moment-tz"], function (moment) {
    moment().tz("America/New_York").format();
});
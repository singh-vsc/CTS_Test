define([
  'modules/backbone-mozu',
  'underscore',
  'modules/jquery-mozu',
  'modules/backbone-overhang',
  'hyprlive',
  'hyprlivecontext'
], function(Backbone, _, $, OverhangModel, Hypr, HyprLiveContext){
  /*
    Displays a notice at the bottom of the screen with two buttons
    informing the user that the website uses cookies.
    If the user accepts, a cookie is dropped in their browser labeled with the
    tenant and site ID, which will last a year, preventing the notice from
    appearing again.
  */
  console.log("Cookie called");
  var apiContext = require.mozuData('apicontext');
  var tenantId = apiContext.headers['x-vol-tenant'];
  var siteId = apiContext.headers['x-vol-site'];
  var acceptedCookiesNotice = $.cookie('kibo-'+tenantId+'-'+siteId+'-'+'accept-cookies');
  console.log("Enabled : "+acceptedCookiesNotice);
  if (typeof acceptedCookiesNotice === "undefined" || !acceptedCookiesNotice) {
    console.log("Inside Condition");
    var cookieNoticeModel = new OverhangModel({
      title: HyprLiveContext.locals.themeSettings.cookieNoticeTitle,
      text: HyprLiveContext.locals.themeSettings.cookieNoticeText,
      type: 'confirm',
      yesMessage: HyprLiveContext.locals.themeSettings.acceptCookies,
      noMessage: HyprLiveContext.locals.themeSettings.moreInformation, 
      yesColor: '#222',
      noColor: '#222',
      callback: function(accepted){
        if (!accepted){
          window.open(HyprLiveContext.locals.themeSettings.moreInformationLink);
        } else {
          $.cookie('kibo-'+tenantId+'-'+siteId+'-'+'accept-cookies', true, { expires: 365 });
        }
      }
    });
    // $(document).ready(function(){
         console.log("Console Open modal");
         cookieNoticeModel.open();
    // });

    }
});

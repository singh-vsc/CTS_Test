define(['modules/jquery-mozu',
        "modules/api",
        'modules/models-cart',
        'hyprlivecontext',
        'underscore'],
function($, Api, CartModels, hyprlivecontext, _) {
    var siteContext = hyprlivecontext.locals.siteContext,
        externalPayment = _.findWhere(siteContext.checkoutSettings.externalPaymentWorkflowSettings, {"name" : "PayPalExpress2"});

    window.paypalCheckoutReady = function() {

      var siteContext = hyprlivecontext.locals.siteContext,
          externalPayment = _.findWhere(siteContext.checkoutSettings.externalPaymentWorkflowSettings, {"name" : "PayPalExpress2"});
    
       if (!externalPayment || !externalPayment.isEnabled) return;

       var merchantAccountId = _.findWhere(externalPayment.credentials, {"apiName" : "merchantAccountId"}) || {value:''},
          environment = _.findWhere(externalPayment.credentials, {"apiName" : "environment"}),
          id = CartModels.Cart.fromCurrent().id || window.order.id,
          isCart = window.location.href.indexOf("cart") > 0;
      if(externalPayment.isEnabled) {
        window.paypal.checkout.setup(merchantAccountId.value, {
            environment: environment.value,
            click: function(event) {
                event.preventDefault();
                var url = "../paypal/token?id=" + id + (!document.URL.split('?')[1] ? "": "&" + document.URL.split('?')[1].replace("id="+id,"").replace("&&", "&"));
                if (isCart)
                  url += "&isCart="+ isCart;
                window.paypal.checkout.initXO();
                $.ajax({
                    url: url,
                    type: "GET",
                    async: true,

                    //Load the minibrowser with the redirection url in the success handler
                    success: function (token) {
                        var url = window.paypal.checkout.urlPrefix + token.token;
                        var requestId = token.Header.RequestID;
                        var cartId;
                        if (hyprlivecontext.locals.pageContext.pageType === 'cart') {
                          cartId = window.cartView.cartView.model.get('id');
                        }
                        else if (hyprlivecontext.locals.pageContext.pageType === 'checkout' || hyprlivecontext.locals.pageContext.pageType === 'checkoutv2') {
                          cartId = window.checkoutViews.parentView.model.get('originalCartId');
                        }
                        if (cartId) {
                          Api.request('GET', '/api/platform/entitylists/paypalrequest@cts/entities?pageSize=1&filter=id eq '+cartId).then(function(resp){
                            if (resp.totalCount === 0) {
                              Api.request('POST', '/api/platform/entitylists/paypalrequest@cts/entities/', {
                                'id': cartId,
                                'requestID': requestId
                              }).then(function() {
                                window.paypal.checkout.startFlow(url);
                              }, function() {
                                window.paypal.checkout.startFlow(url);
                              });
                            }
                            else {
                              Api.request('PUT', '/api/platform/entitylists/paypalrequest@cts/entities/' + cartId, {
                                'id': cartId,
                                'requestID': requestId
                              }).then(function() {
                                window.paypal.checkout.startFlow(url);
                              }, function() {
                                window.paypal.checkout.startFlow(url);
                              });
                            }
                          }, function(err) {
                            //Loading Mini browser with redirect url, true for async AJAX calls
                            window.paypal.checkout.startFlow(url);
                          });
                        }
                        else {
                          //Loading Mini browser with redirect url, true for async AJAX calls
                          window.paypal.checkout.startFlow(url);
                        }
                    },
                    error: function (responseData, textStatus, errorThrown) {
                        //console.log("Error in ajax post " + responseData.statusText);
                        //Gracefully Close the minibrowser in case of AJAX errors
                        window.paypal.checkout.closeFlow();
                    }
                });
            },
            button: ['btn_xpressPaypal']
        });
      }
    };
    var paypal = {
      scriptLoaded: false,
     loadScript: function() {
      if(externalPayment && externalPayment.isEnabled){
        var self = this;
         if (this.scriptLoaded) return;
          this.scriptLoaded = true;
        $.getScript("//www.paypalobjects.com/api/checkout.js").done(function(scrit, textStatus){
          //console.log(textStatus);
        }).fail(function(jqxhr, settings, exception) {
          //console.log(jqxhr);
        });
      }
     }
   };
   return paypal;
});

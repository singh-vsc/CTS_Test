require([
    'modules/jquery-mozu',
    "hyprlivecontext",
    'underscore',
    'modules/api',
    'modules/backbone-mozu',
    'modules/models-product',
    'modules/models-cart',
    'modules/cart-monitor'
],
function($, HyprLiveContext, _, api,Backbone, ProductModels, CartModels, CartMonitor) {
    var context = HyprLiveContext.locals.pageContext;
    //Set other variables needed by script

    //User ID:
    bnExtUserId = HyprLiveContext.locals.user.userId; // jshint ignore:line

    if (context.pageType == "product") {
      bnProductId = context.productCode; // jshint ignore:line
    }    

    //Search term on search pages:
    if(context.pageType == "searchresult" || context.pageType == "search"){
      bn_SearchTerm = context.search.query; // jshint ignore:line
    }

    //On order confirmation pages:
    if (context.pageType == "confirmation") {
       var order = require.mozuData('order');
      bnOrderId = order.orderNumber; // jshint ignore:line
      bnOrderTotal = order.total;// jshint ignore:line
      bnOrderDetails = [];// jshint ignore:line

      for (var i = 0; i<order.items.length; i++){
        var item = order.items[i];
        var quantity = item.quantity;
        var price = item.product.price.price;
        var detailString = item.product.productCode + ":" + quantity + ":" + price;
        bnOrderDetails.push(detailString); // jshint ignore:line
      }
    }
    //On order confirmation pages:
    if (context.pageType == "confirmationv2") {
      var orderV2 = require.mozuData('checkout');
      bnOrderId = orderV2.number; // jshint ignore:line
      bnOrderTotal = orderV2.total;// jshint ignore:line
      bnOrderDetails = [];// jshint ignore:line

     for (var j = 0; j<orderV2.items.length; j++){
       var itemV2 = orderV2.items[j];
       var quantityV2 = itemV2.quantity;
       var priceV2 = (itemV2.product.price && itemV2.product.price.salePrice) ? itemV2.product.price.salePrice: itemV2.product.price.price;
       var detailStringV2 = itemV2.product.productCode + ":" + quantityV2 + ":" + priceV2;
       bnOrderDetails.push(detailStringV2); // jshint ignore:line
     }
   }

});
﻿define(['underscore', 'modules/backbone-mozu', 'hyprlive', "modules/api", "modules/models-product",
    "hyprlivecontext", 'modules/models-location'
  ], function (_, Backbone, Hypr, api, ProductModels,
        HyprLiveContext, LocationModels) {

    var CartItemProduct = ProductModels.Product.extend({
        helpers: ['mainImage','directShipSupported', 'inStorePickupSupported'],
        mainImage: function() {
            var imgs = this.get("productImages"),
                img = imgs && imgs[0],
                imgurl = 'http://placehold.it/160&text=' + Hypr.getLabel('noImages');
            return img || { ImageUrl: imgurl, imageUrl: imgurl }; // to support case insensitivity
        },
        initialize: function() {
            var url = "/product/" + this.get("productCode");
            this.set({ Url: url, url: url });
        },
        directShipSupported: function(){
            return (_.indexOf(this.get('fulfillmentTypesSupported'), "DirectShip") !== -1) ? true : false;
        },
        inStorePickupSupported: function(){
            return (_.indexOf(this.get('fulfillmentTypesSupported'), "InStorePickup") !== -1) ? true : false;
        }
    }),

    CartItem = Backbone.MozuModel.extend({
        relations: {
            product: CartItemProduct
        },
        validation: {
            quantity: {
                min: 1
            }
        },
        dataTypes: {
            quantity: Backbone.MozuModel.DataTypes.Int
        },
        mozuType: 'cartitem',
        handlesMessages: true,
        helpers: ['priceIsModified', 'storeLocation'],
        priceIsModified: function() {
            var price = this.get('unitPrice');
            return price.baseAmount != price.discountedAmount;
        },
        saveQuantity: function() {
            var self = this;
            var oldQuantity = this.previous("quantity");
            if (this.hasChanged("quantity")) {
                this.apiModel.updateQuantity(this.get("quantity"))
                    .then(
                        function() {
                            self.collection.parent.checkBOGA();
                        },
                        function() {
                            // Quantity update failed, e.g. due to limited quantity or min. quantity not met. Roll back.
                            self.set("quantity", oldQuantity);
                            self.trigger("quantityupdatefailed", self, oldQuantity);
                        }
                    );
            }
        },
        storeLocation : function(){
            var self = this;
            if(self.get('fulfillmentLocationCode')) {
                return self.collection.parent.get('storeLocationsCache').getLocationByCode(self.get('fulfillmentLocationCode'));
            }
            return;
        }

    }),
    StoreLocationsCache = Backbone.Collection.extend({
        addLocation : function(location){
            this.add(new LocationModels.Location(location), {merge: true});
        },
        getLocations : function(){
            return this.toJSON();
        },
        getLocationByCode : function(code){
            if(this.get(code)){
                return this.get(code).toJSON();
            }
        }
    }),

    Cart = Backbone.MozuModel.extend({
        mozuType: 'cart',
        handlesMessages: true,
        helpers: ['isEmpty','count'],
        relations: {
            items: Backbone.Collection.extend({
                model: CartItem
            }),
            storeLocationsCache : StoreLocationsCache
        },

        initialize: function() {
            var self = this;
            this.get("items").on('sync remove', this.fetch, this)
                             .on('loadingchange', this.isLoading, this);

            this.get("items").each(function(item, el) {
                if(item.get('fulfillmentLocationCode') && item.get('fulfillmentLocationName')) {
                    self.get('storeLocationsCache').addLocation({
                        code: item.get('fulfillmentLocationCode'),
                        name: item.get('fulfillmentLocationName')
                    });
                }
            });
        },
        checkBOGA: function(){
          //Called whenever we would need to add an additional item to the cart
          //due to a BOGA discount (cart initialization and after application
          // of a coupon code)
          var me = this;
          var suggestedDiscounts = this.get("suggestedDiscounts") || [];

          // First we filter our list down to
          // just the products we know we want added.
          var productsToAdd = [];
          suggestedDiscounts.forEach(function(discountItem){
            var cartHasDiscountItem = me.get('items').some(function(cartItem){
              return discountItem.productCode === cartItem.productCode;
            });

            if (discountItem.autoAdd && !cartHasDiscountItem){
              productsToAdd.push(discountItem);
            }
          });

          // We now have a list of productsToAdd.
          // We'll define a function to fetch and re render the cart after
          // each of the product fetches have been completed.

          var renderCartWhenFinished = _.after(productsToAdd.length, function(){
            me.fetch().then(function(){
              me.trigger('render');
            });
          });
          // We define a recursive function to assure that each product code
          // gets added to the cart sequentially.
          var addProductsToCart = function(productIndex){
            var totalLength = productsToAdd.length;
            var currentIndex = productIndex || 0;

            if (productsToAdd[currentIndex]){
              var productToAdd = productsToAdd[currentIndex];
              var bogaProduct = new CartItemProduct({productCode: productToAdd.productCode});
              bogaProduct.fetch().then(function(){
                bogaProduct.apiAddToCart({autoAddDiscountId: productToAdd.discountId}).then(function(cartItem){
                  var nextProductIndex = currentIndex + 1;
                  renderCartWhenFinished();
                  addProductsToCart(nextProductIndex);
                });
              }, function(error){
                // Something went wrong with fetching one of the products.
                // We don't want this to halt the whole process.
                var nextProductIndex = currentIndex + 1;
                renderCartWhenFinished();
                addProductsToCart(nextProductIndex);
              });
            }
          };

          addProductsToCart();
        },
        isEmpty: function() {
            return this.get("items").length < 1;
        },
        count: function() {
            return this.apiModel.count();
            //return this.get("Items").reduce(function(total, item) { return item.get('Quantity') + total; },0);
        },
        toOrder: function() {
            var me = this;
            me.apiCheckout().then(function(order) {
                me.trigger('ordercreated', order);
            });
        },
        toCheckout: function() {
            var me = this;
            me.apiCheckout2().then(function(checkout) {
                me.trigger('checkoutcreated', checkout);
            });
        },
        removeItem: function (id) {
            return this.get('items').get(id).apiModel.del();
        },
        addCoupon: function () {
            var me = this;
            var code = this.get('couponCode');
            var orderDiscounts = me.get('orderDiscounts');
            if (orderDiscounts && _.findWhere(orderDiscounts, { couponCode: code })) {
                // to maintain promise api
                var deferred = api.defer();
                deferred.reject();
                deferred.promise.otherwise(function () {
                    me.trigger('error', {
                        message: Hypr.getLabel('promoCodeAlreadyUsed', code)
                    });
                });
                return deferred.promise;
            }
            this.isLoading(true);
            return this.apiAddCoupon(this.get('couponCode')).then(function () {
                me.set('couponCode', '');
                var productDiscounts = _.flatten(_.pluck(_.pluck(me.get('items').models, 'attributes'), 'productDiscounts'));
                var shippingDiscounts = _.flatten(_.pluck(_.pluck(me.get('items').models, 'attributes'), 'shippingDiscounts'));

                var allDiscounts = me.get('orderDiscounts').concat(productDiscounts).concat(shippingDiscounts);
                var allCodes = me.get('couponCodes') || [];
                var lowerCode = code.toLowerCase();

                var couponExists = _.find(allCodes, function(couponCode) {
                    return couponCode.toLowerCase() === lowerCode;
                });
                if (!couponExists) {
                    me.trigger('error', {
                        message: Hypr.getLabel('invalidCouponCode', code)
                    });
                }

                var couponIsNotApplied = (!allDiscounts || !_.find(allDiscounts, function(d) {
                    return d.couponCode && d.couponCode.toLowerCase() === lowerCode;
                }));
                me.set('tentativeCoupon', couponExists && couponIsNotApplied ? code : undefined);
                me.checkBOGA();
                me.isLoading(false);
            });
        },
        toJSON: function(options) {
            var j = Backbone.MozuModel.prototype.toJSON.apply(this, arguments);
            return j;
        }
    });

    return {
        CartItem: CartItem,
        Cart: Cart
    };
});
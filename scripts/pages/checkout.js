require(["modules/jquery-mozu", "underscore", "hyprlive", "modules/backbone-mozu", "modules/models-checkout", "modules/views-messages", "modules/cart-monitor", 'hyprlivecontext', 'modules/editable-view', 'modules/preserve-element-through-render', 'modules/block-ui', 'modules/on-image-load-error',
    'modules/xpress-paypal',
    'modules/amazonpay'], function($, _, Hypr, Backbone, CheckoutModels, messageViewFactory, CartMonitor, HyprLiveContext, EditableView, preserveElements, blockUiLoader, onImageLoadError,PayPal,AmazonPay) {
    
    var ThresholdMessageView = Backbone.MozuView.extend({
      templateName: 'modules/checkout/checkout-discount-threshold-messages'
    });
    $.removeCookie('lastCategory');
    var CheckoutStepView = EditableView.extend({
        edit: function() {
            this.model.edit();
        },
        cancel: function(){
            this.model.cancelStep();
        },
        amazonShippingAndBilling: function() {
            //isLoading(true);
            window.location = "/checkout/"+window.order.id+"?isAwsCheckout=true&access_token="+window.order.get("fulfillmentInfo").get("data").addressAuthorizationToken+"&view="+AmazonPay.viewName;
        },
        next: function () {
            // wait for blur validation to complete
            var me = this;
            me.editing.savedCard = false;
            _.defer(function() {
                me.model.next();
                if (me.model.isLoading()) {
                    blockUiLoader.globalLoader();
                }
            });
        },
        choose: function() {
            var me = this;
            me.model.choose.apply(me.model, arguments);
        },
        constructor: function() {
            var me = this;
            EditableView.apply(this, arguments);
            me.resize();
            setTimeout(function() {
                me.$('.mz-panel-wrap').css({ 'overflow-y': 'hidden' });
            }, 250);
            me.listenTo(me.model, 'stepstatuschange', me.render, me);
            me.$el.on('keypress', 'input', function(e) {
                if (e.which === 13) {
                    me.handleEnterKey(e);
                    return false;
                }
            });

            me.messageView = new ThresholdMessageView({
              el: $('#mz-discount-threshold-messages'),
              model: window.order
            });
        },
        initStepView: function() {
            this.model.initStep();
        },
        handleEnterKey: function(e) {
            this.next();
        },
        render: function() {
            this.$el.removeClass('is-new is-incomplete is-complete is-invalid').addClass('is-' + this.model.stepStatus());
            EditableView.prototype.render.apply(this, arguments);
            this.resize();
            blockUiLoader.unblockUi();
        },
        resize: _.debounce(function() {
            this.$('.mz-panel-wrap').animate({ 'height': this.$('.mz-inner-panel').outerHeight() });
        }, 200)
    });

    var OrderSummaryView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/checkout-order-summary',

        initialize: function() {
            this.listenTo(this.model.get('billingInfo'), 'orderPayment', this.onOrderCreditChanged, this);
        },

        editCart: function() {
            window.location = "/cart";
        },

        onOrderCreditChanged: function(order, scope) {
            this.render();
        },
        render: function() {
            Backbone.MozuView.prototype.render.call(this);
            $(".mz-order-summary-image img, img[data-mz-check-image]").each(function() {
                onImageLoadError.checkImage(this);
            });
        },

        // override loading button changing at inappropriate times
        handleLoadingChange: function() {}
    });

    var ShippingAddressView = CheckoutStepView.extend({
        templateName: 'modules/checkout/step-shipping-address',
        autoUpdate: [
            'firstName',
            'lastNameOrSurname',
            'address.address1',
            'address.address2',
            'address.address3',
            'address.cityOrTown',
            'address.countryCode',
            'address.stateOrProvince',
            'address.postalOrZipCode',
            'address.addressType',
            'phoneNumbers.home',
            'contactId',
            'email',
            'updateMode'
        ],
        renderOnChange: [
            'address.countryCode',
            'contactId'
        ],
        beginAddContact: function() {
            this.model.set('contactId', 'new');
        },
        additionalEvents: {
            "input [name='shippingphone']": "allowDigit"
        },
        allowDigit: function(e) {
            e.target.value = e.target.value.replace(/[^\d]/g, '');
        }
    });

    var ShippingInfoView = CheckoutStepView.extend({
        templateName: 'modules/checkout/step-shipping-method',
        renderOnChange: [
            'availableShippingMethods'
        ],
        additionalEvents: {
            "change [data-mz-shipping-method]": "updateShippingMethod"
        },
        updateShippingMethod: function(e) {
            this.model.updateShippingMethod(this.$('[data-mz-shipping-method]:checked').val());
        }
    });

    var poCustomFields = function() {

        var fieldDefs = [];

        var isEnabled = HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder &&
            HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder.isEnabled;

        if (isEnabled) {
            var siteSettingsCustomFields = HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder.customFields;
            siteSettingsCustomFields.forEach(function(field) {
                if (field.isEnabled) {
                    fieldDefs.push('purchaseOrder.pOCustomField-' + field.code);
                }
            }, this);
        }

        return fieldDefs;
    };

    var visaCheckoutSettings = HyprLiveContext.locals.siteContext.checkoutSettings.visaCheckout;
    var pageContext = HyprLiveContext.locals.pageContext;
    var BillingInfoView = CheckoutStepView.extend({
        templateName: 'modules/checkout/step-payment-info',
        autoUpdate: [
            'savedPaymentMethodId',
            'paymentType',
            'card.paymentOrCardType',
            'card.cardNumberPartOrMask',
            'card.nameOnCard',
            'card.expireMonth',
            'card.expireYear',
            'card.cvv',
            'card.isCardInfoSaved',
            'check.nameOnCheck',
            'check.routingNumber',
            'check.checkNumber',
            'isSameBillingShippingAddress',
            'billingContact.firstName',
            'billingContact.lastNameOrSurname',
            'billingContact.address.address1',
            'billingContact.address.address2',
            'billingContact.address.address3',
            'billingContact.address.cityOrTown',
            'billingContact.address.countryCode',
            'billingContact.address.stateOrProvince',
            'billingContact.address.postalOrZipCode',
            'billingContact.address.addressType',
            'billingContact.phoneNumbers.home',
            'billingContact.email',
            'creditAmountToApply',
            'digitalCreditCode',
            'purchaseOrder.purchaseOrderNumber',
            'purchaseOrder.paymentTerm'
        ].concat(poCustomFields()),
        renderOnChange: [
            'billingContact.address.countryCode',
            'billingContact.address.addressType',
            'paymentType',
            'isSameBillingShippingAddress',
            'usingSavedCard',
            'savedPaymentMethodId'
        ],
        additionalEvents: {
            "blur #mz-payment-credit-card-number": "changeCardType",
            "change [data-mz-digital-credit-enable]": "enableDigitalCredit",
            "change [data-mz-digital-credit-amount]": "applyDigitalCredit",
            "change [data-mz-digital-add-remainder-to-customer]": "addRemainderToCustomer",
            "change [name='paymentType']": "resetPaymentData",
            "input  [name='security-code'],[name='credit-card-number'],[name='shippingphone']": "allowDigit",
            "change [data-mz-purchase-order-payment-term]": "updatePurchaseOrderPaymentTerm"
        },
        changeCardType: function(e) {
            window.checkoutModel = this.model;
            var number = e.target.value;
            var cardType = '';
            // visa
            var re = new RegExp("^4");
            if (number.match(re) !== null) {
                cardType = "VISA";
            }

            // Mastercard 
            // Updated for Mastercard 2017 BINs expansion
            if (/^(5[1-5][0-9]{14}|2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12}))$/.test(number))
                cardType = "MC";

            // AMEX
            re = new RegExp("^3[47]");
            if (number.match(re) !== null)
                cardType = "AMEX";

            // Discover
            re = new RegExp("^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]|64[4-9])|65)");
            if (number.match(re) !== null)
                cardType = "DISCOVER";

            $('.mz-card-type-images').find('span').removeClass('active');
            if (cardType) {
                this.model.set('card.paymentOrCardType', cardType);
                $("#mz-payment-credit-card-type").val(cardType);
                $('.mz-card-type-images').find('span[data-mz-card-type-image="' + cardType + '"]').addClass('active');
            } else {
                this.model.set('card.paymentOrCardType', null);
            }
        },
        initialize: function() {
            this.listenTo(this.model, 'change:digitalCreditCode', this.onEnterDigitalCreditCode, this);
            this.listenTo(this.model, 'orderPayment', function(order, scope) {
                this.render();
            }, this);
            this.listenTo(this.model, 'billingContactUpdate', function(order, scope) {
                this.render();
            }, this);
            this.listenTo(this.model, 'change:savedPaymentMethodId', function(order, scope) {
                $('[data-mz-saved-cvv]').val('').change();
                this.render();
            }, this);
            this.codeEntered = !!this.model.get('digitalCreditCode');
        },
        allowDigit: function(e) {
            e.target.value = e.target.value.replace(/[^\d]/g, '');
        },
        resetPaymentData: function(e) {
            if (e.target !== $('[data-mz-saved-credit-card]')[0]) {
                $("[name='savedPaymentMethods']").val('0');
            }
            this.model.clear();
            this.model.resetAddressDefaults();
            if (HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder.isEnabled) {
                this.model.resetPOInfo();
            }
        },
        updatePurchaseOrderPaymentTerm: function(e) {
            this.model.setPurchaseOrderPaymentTerm(e.target.value);
        },
        render: function() {
            preserveElements(this, ['.v-button', '.p-button','#amazonButtonPaymentSection'], function() {
                CheckoutStepView.prototype.render.apply(this, arguments);
            });
            var status = this.model.stepStatus();
            if ($("#AmazonPayButton").length > 0 && $("#amazonButtonPaymentSection").length > 0)
                $("#AmazonPayButton").removeAttr("style").appendTo("#amazonButtonPaymentSection");

            if (visaCheckoutSettings.isEnabled && !this.visaCheckoutInitialized && this.$('.v-button').length > 0) {
                window.onVisaCheckoutReady = _.bind(this.initVisaCheckout, this);
                require([pageContext.visaCheckoutJavaScriptSdkUrl]);
                this.visaCheckoutInitialized = true;
            }

            if (this.$(".p-button").length > 0)
                PayPal.loadScript();
        },
        updateAcceptsMarketing: function(e) {
            this.model.getOrder().set('acceptsMarketing', $(e.currentTarget).prop('checked'));
        },
        updatePaymentType: function(e) {
            var newType = $(e.currentTarget).val();
            this.model.set('usingSavedCard', e.currentTarget.hasAttribute('data-mz-saved-credit-card'));
            this.model.set('paymentType', newType);
        },
        edit: function() {
            this.model.edit();
            this.beginEditingCard();
        },
        beginEditingCard: function() {
            var me = this;
            if (!this.model.isExternalCheckoutFlowComplete()) {
                this.editing.savedCard = true;
                this.render();
            } else {
                this.cancelExternalCheckout();
            }
        },
        beginEditingExternalPayment: function() {
            var me = this;
            if (this.model.isExternalCheckoutFlowComplete()) {
                this.doModelAction('cancelExternalCheckout').then(function() {
                    me.editing.savedCard = true;
                    me.render();
                });
            }
        },
        beginEditingBillingAddress: function() {
            this.editing.savedBillingAddress = true;
            this.render();
        },
        beginApplyCredit: function() {
            this.model.beginApplyCredit();
            this.render();
        },
        cancelApplyCredit: function() {
            this.model.closeApplyCredit();
            this.render();
        },
        cancelExternalCheckout: function() {
            var me = this;
            this.doModelAction('cancelExternalCheckout').then(function() {
                me.editing.savedCard = false;
                me.render();
            });
        },
        finishApplyCredit: function() {
            var self = this;
            this.model.finishApplyCredit().then(function() {
                self.render();
            });
        },
        removeCredit: function(e) {
            var self = this,
                id = $(e.currentTarget).data('mzCreditId');
            this.model.removeCredit(id).then(function() {
                self.render();
            });
        },
        getDigitalCredit: function(e) {
            var self = this;
            this.$el.addClass('is-loading');
            this.model.getDigitalCredit().ensure(function() {
                self.$el.removeClass('is-loading');
            });
        },
        stripNonNumericAndParseFloat: function(val) {
            if (!val) return 0;
            var result = parseFloat(val.replace(/[^\d\.]/g, ''));
            return isNaN(result) ? 0 : result;
        },
        applyDigitalCredit: function(e) {
            var val = $(e.currentTarget).prop('value'),
                creditCode = $(e.currentTarget).attr('data-mz-credit-code-target'); //target
            if (!creditCode) {
                //console.log('checkout.applyDigitalCredit could not find target.');
                return;
            }
            var amtToApply = this.stripNonNumericAndParseFloat(val);

            this.model.applyDigitalCredit(creditCode, amtToApply, true);
            this.render();
        },
        onEnterDigitalCreditCode: function(model, code) {
            if (code && !this.codeEntered) {
                this.codeEntered = true;
                this.$el.find('input#digital-credit-code').siblings('button').prop('disabled', false);
            }
            if (!code && this.codeEntered) {
                this.codeEntered = false;
                this.$el.find('input#digital-credit-code').siblings('button').prop('disabled', true);
            }
        },
        enableDigitalCredit: function(e) {
            var creditCode = $(e.currentTarget).attr('data-mz-credit-code-source'),
                isEnabled = $(e.currentTarget).prop('checked') === true,
                targetCreditAmtEl = this.$el.find("input[data-mz-credit-code-target='" + creditCode + "']"),
                me = this;

            if (isEnabled) {
                targetCreditAmtEl.prop('disabled', false);
                me.model.applyDigitalCredit(creditCode, null, true);
            } else {
                targetCreditAmtEl.prop('disabled', true);
                me.model.applyDigitalCredit(creditCode, 0, false);
                me.render();
            }
        },
        addRemainderToCustomer: function(e) {
            var creditCode = $(e.currentTarget).attr('data-mz-credit-code-to-tie-to-customer'),
                isEnabled = $(e.currentTarget).prop('checked') === true;
            this.model.addRemainingCreditToCustomerAccount(creditCode, isEnabled);
        },
        handleEnterKey: function(e) {
            var source = $(e.currentTarget).attr('data-mz-value');
            if (!source) return;
            switch (source) {
                case "creditAmountApplied":
                    return this.applyDigitalCredit(e);
                case "digitalCreditCode":
                    return this.getDigitalCredit(e);
            }
        },
        /* begin visa checkout */
        initVisaCheckout: function() {
                var me = this;
                var visaCheckoutSettings = HyprLiveContext.locals.siteContext.checkoutSettings.visaCheckout;
                var apiKey = visaCheckoutSettings.apiKey || '0H1JJQFW9MUVTXPU5EFD13fucnCWg42uLzRQMIPHHNEuQLyYk';
                var clientId = visaCheckoutSettings.clientId || 'mozu_test1';
                var orderModel = this.model.getOrder();


                if (!window.V) {
                    //console.warn( 'visa checkout has not been initilized properly');
                    return false;
                }
                // on success, attach the encoded payment data to the window
                // then call the sdk's api method for digital wallets, via models-checkout's helper
                window.V.on("payment.success", function(payment) {
                    //console.log({ success: payment });
                    me.editing.savedCard = false;
                    me.model.parent.processDigitalWallet('VisaCheckout', payment);
                });



                window.V.init({
                    apikey: apiKey,
                    clientId: clientId,
                    paymentRequest: {
                        currencyCode: orderModel.get('currencyCode'),
                        subtotal: "" + orderModel.get('subtotal')
                    }
                });
            }
            /* end visa checkout */
    });

    var CouponView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/coupon-code-field',
        handleLoadingChange: function(isLoading) {
            // override adding the isLoading class so the apply button 
            // doesn't go loading whenever other parts of the order change
        },
        initialize: function() {
            var me = this;
            this.listenTo(this.model, 'change:couponCode', this.onEnterCouponCode, this);
            this.codeEntered = !!this.model.get('couponCode');
            this.$el.on('keypress', 'input', function(e) {
                if (e.which === 13) {
                    if (me.codeEntered) {
                        me.handleEnterKey();
                    }
                    return false;
                }
            });

            me.messageView = new ThresholdMessageView({
              el: $('#mz-discount-threshold-messages'),
              model: window.order
            });
        },
        onEnterCouponCode: function(model, code) {
            if (code && !this.codeEntered) {
                this.codeEntered = true;
                this.$el.find('button').prop('disabled', false);
            }
            if (!code && this.codeEntered) {
                this.codeEntered = false;
                this.$el.find('button').prop('disabled', true);
            }
        },
        autoUpdate: [
            'couponCode',
            'errorMessage'
        ],
        addCoupon: function(e) {
            // add the default behavior for loadingchanges
            // but scoped to this button alone
            var self = this;
            this.$el.addClass('is-loading');
            if (self.model.get('errorMessage')) {
                self.model.unset('errorMessage');
                self.render();
            }
            this.model.addCoupon().ensure(function(response) {
                self.$el.removeClass('is-loading');
                self.model.unset('couponCode');
                self.render();
                OrderSummaryView.render();
            });
        },
        handleEnterKey: function() {
            this.addCoupon();
        }
    });

    var CommentsView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/comments-field',
        autoUpdate: ['shopperNotes.comments']
    });

    var attributeFields = function() {
        var me = this;

        var fields = [];

        var storefrontOrderAttributes = HyprLiveContext.locals.pageContext.storefrontOrderAttributes;
        if (storefrontOrderAttributes && storefrontOrderAttributes.length > 0) {

            storefrontOrderAttributes.forEach(function(attributeDef) {
                fields.push('orderAttribute-' + attributeDef.attributeFQN);
            }, this);

        }

        return fields;
    };

    var ReviewOrderView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/step-review',
        autoUpdate: [
            'createAccount',
            'agreeToTerms',
            'emailAddress',
            'password',
            'confirmPassword'
        ].concat(attributeFields()),
        renderOnChange: [
            'createAccount',
            'isReady'
        ],
        initialize: function() {
            var me = this;
            this.$el.on('keypress', 'input', function(e) {
                if (e.which === 13) {
                    me.handleEnterKey();
                    return false;
                }
            });
            this.model.on('passwordinvalid', function(message) {
                me.$('[data-mz-validationmessage-for="password"]').text(message);
            });
            this.model.on('userexists', function(user) {
                me.$('[data-mz-validationmessage-for="emailAddress"]').html(Hypr.getLabel("customerAlreadyExists", user, encodeURIComponent(window.location.pathname)));
            });
        },
        submit: function() {
            var self = this;
            _.defer(function() {
                self.model.submit();
            });
        },
        handleEnterKey: function() {
            this.submit();
        }
    });

    var ParentView = function(conf) {
        var gutter = parseInt(Hypr.getThemeSetting('gutterWidth'), 10);
        if (isNaN(gutter)) gutter = 15;
        var mask;
        conf.model.on('beforerefresh', function() {
            killMask();
            conf.el.css('opacity', 0.5);
            var pos = conf.el.position();
            mask = $('<div></div>', {
                'class': 'mz-checkout-mask'
            }).css({
                width: conf.el.outerWidth() + (gutter * 2),
                height: conf.el.outerHeight() + (gutter * 2),
                top: pos.top - gutter,
                left: pos.left - gutter
            }).insertAfter(conf.el);
        });

        function killMask() {
            conf.el.css('opacity', 1);
            if (mask) mask.remove();
        }
        conf.model.on('refresh', killMask);
        conf.model.on('error', killMask);
        return conf;
    };

    $(document).ready(function() {

        var $checkoutView = $('#checkout-form'),
            checkoutData = require.mozuData('checkout');

        AmazonPay.init(true); 
        checkoutData.isAmazonPayEnable = AmazonPay.isEnabled;

        var checkoutModel = window.order = new CheckoutModels.CheckoutPage(checkoutData),
            checkoutViews = {
                parentView: new ParentView({
                    el: $checkoutView,
                    model: checkoutModel
                }),
                steps: {
                    shippingAddress: new ShippingAddressView({
                        el: $('#step-shipping-address'),
                        model: checkoutModel.get('fulfillmentInfo').get('fulfillmentContact')
                    }),
                    shippingInfo: new ShippingInfoView({
                        el: $('#step-shipping-method'),
                        model: checkoutModel.get('fulfillmentInfo')
                    }),
                    paymentInfo: new BillingInfoView({
                        el: $('#step-payment-info'),
                        model: checkoutModel.get('billingInfo')
                    })
                },
                orderSummary: new OrderSummaryView({
                    el: $('#order-summary'),
                    model: checkoutModel
                }),
                couponCode: new CouponView({
                    el: $('#coupon-code-field'),
                    model: checkoutModel
                }),
                comments: Hypr.getThemeSetting('showCheckoutCommentsField') && new CommentsView({
                    el: $('#comments-field'),
                    model: checkoutModel
                }),

                reviewPanel: new ReviewOrderView({
                    el: $('#step-review'),
                    model: checkoutModel
                }),
                messageView: messageViewFactory({
                    el: $checkoutView.find('[data-mz-message-bar]'),
                    model: checkoutModel.messages
                })
            };

        window.checkoutViews = checkoutViews;

        checkoutModel.on('complete', function() {
            CartMonitor.setCount(0);
            if (window.amazon) 
                window.amazon.Login.logout();
            window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory||'') + "/checkout/" + checkoutModel.get('id') + "/confirmation";
        });

        var $reviewPanel = $('#step-review');
        checkoutModel.on('change:isReady', function(model, isReady) {
            if (isReady) {
                setTimeout(function() { window.scrollTo(0, $reviewPanel.offset().top); }, 750);
            }
        });
        checkoutModel.on('error', function() {
            blockUiLoader.unblockUi();
        });
        _.invoke(checkoutViews.steps, 'initStepView');

        $checkoutView.noFlickerFadeIn();

        if (AmazonPay.isEnabled)
            AmazonPay.addCheckoutButton(window.order.id, false);
    });
});
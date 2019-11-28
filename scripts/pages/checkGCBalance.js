define([
    'modules/backbone-mozu',
    'hyprlive', 'hyprlivecontext',
    'modules/jquery-mozu', 'underscore',
    'modules/editable-view',
    'modules/api'
], function(
    Backbone, Hypr, HyprLiveContext, $, _, EditableView, API) {
        var gcServiceUrl = '/status/gift-card/?code=';

    var GCBalanceForm = EditableView.extend({
        templateName: "modules/giftcard/check-gc-balance-form",
        autoUpdate: [
            'gcNumber'
        ],
        renderOnChange: [
            'balance',
            'balanceSuccess',
            'balanceError'
        ],        
        checkGCBalance: function() {
            var self = this;
            var errors = self.model.validate(); // hack in advance of doing real validation in the myaccount page, tells the model to add isValidated: true
            if (!errors) {
                self.model.isLoading(true);
                var code = self.model.get('gcNumber');
                var creditsURL = API.context.getServiceUrls().creditService + code;
                $.ajax({
                    url: gcServiceUrl + code,
                    method: 'GET'
                })
                .success(function() {
                    API.request('GET', creditsURL).then(function(result){
                        self.model.set('balance',result.currentBalance);
                        self.model.set('balanceSuccess',true);
                        self.model.set('balanceError',false);
                        self.model.isLoading(false);
                    },function(error){
                        self.model.set('balanceError',true);                    
                        self.model.set('balanceSuccess',false);
                        self.model.isLoading(false);
                    });
                })
                .error(function(response){
                    window.console.log('Response', response);
                    API.request('GET', creditsURL).then(function(result){
                        self.model.set('balance',result.currentBalance);
                        self.model.set('balanceSuccess',true);
                        self.model.set('balanceError',false);
                        self.model.isLoading(false);
                    },function(error){
                        self.model.set('balanceError',true);                    
                        self.model.set('balanceSuccess',false);
                        self.model.isLoading(false);
                    });
                });
            }
        },
        render: function() {
            //console.log("rendering");
            Backbone.MozuView.prototype.render.apply(this);
        }
    });
    var Model = Backbone.MozuModel.extend({
        defaults:{
            balanceError:false,
            balanceSuccess:false
        },
        validation: {
            "gcNumber": [{
                required: true,
                msg: Hypr.getLabel("gcMissing")
            }, {
                pattern: "digits",
                msg: Hypr.getLabel("gcInvalid")
            }]
        }
    });

    var gcBalanceModel = window.gcBalanceModel = new Model();
    var $el = $('#gc-balance-form-container'),
        $messagesEl = $('#gc-balance-form-messages');

    var gcBalanceForm = new GCBalanceForm({
        el: $el,
        model: gcBalanceModel,
        messagesEl: $messagesEl
    });
    window.gcBalanceForm = gcBalanceForm;

    gcBalanceForm.render();
});

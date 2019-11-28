define(["modules/jquery-mozu", 
    "underscore", 
    "hyprlive", 
    "modules/backbone-mozu", 
    'hyprlivecontext', 
    'modules/editable-view'], 
    function ($, _, Hypr, Backbone, HyprLiveContext, EditableView) {

var CheckoutStepView = EditableView.extend({
        edit: function () {
            this.model.parent.get('billingInfo').get('card').unset('cvv');
            this.model.edit();
        },
        next: function () {
            // wait for blur validation to complete
            var me = this;
            me.editing.savedCard = false;
            _.defer(function () {
                me.model.next();
            });
            // if(HyprLiveContext.locals.themeSettings.tealiumEnabled){
            //     if(this.template.path ){
            //         var utag = window.utag || {};                   
            //         if(this.template.path.indexOf('step-shipping-destinations') !== -1 ){  
            //             var utagView1 = {
            //                 'event_name' : 'checkout shipping address'
            //             };    
            //             window.console.log(JSON.stringify(utagView1));             
            //             utag.view(utagView1);                     
            //         }else if(this.template.path.indexOf('step-shipping-methods') !== -1 ){
            //             var utagView2 = {
            //                     'event_name' : 'checkout shipping method'
            //             };  
            //             window.console.log(JSON.stringify(utagView2));               
            //             utag.view(utagView2);                   
            //         }else if(this.template.path.indexOf('step-payment-info') !== -1 ){
            //             var utagView3 = {
            //                     'event_name' : 'checkout payment'
            //                 };                 
            //             window.console.log(JSON.stringify(utagView3));
            //             utag.view(utagView3);                     
            //         }
                     
            //     }
            // }
        },
        choose: function () {
            var me = this;
            me.model.choose.apply(me.model, arguments);
        },
        constructor: function () {
            var me = this;
            EditableView.apply(this, arguments);
            me.resize();
            setTimeout(function () {
                me.$('.mz-panel-wrap').css({ 'overflow-y': 'hidden'});
            }, 250);
            me.listenTo(me.model,'stepstatuschange', me.render, me);
            me.$el.on('keypress', 'input', function (e) {
                if (e.which === 13) {
                    me.handleEnterKey(e);
                    return false;
                }
            });
        },
        initStepView: function() {
            this.model.initStep();
        },
        handleEnterKey: function (e) {
            this.model.next();
        },
        render: function () {
            this.$el.removeClass('is-new is-incomplete is-complete is-invalid').addClass('is-' + this.model.stepStatus());
            EditableView.prototype.render.apply(this, arguments);
            this.resize();
        },
        toggleMultiShipMode : function() {
            this.model.toggleMultiShipMode();
            this.render();
        },
        resize: _.debounce(function () {
            this.$('.mz-panel-wrap').animate({'height': this.$('.mz-inner-panel').outerHeight() });
        },200)
    });
    return CheckoutStepView; 
});
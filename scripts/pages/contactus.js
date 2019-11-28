define(['modules/api',
        'modules/backbone-mozu',
        'underscore',
        'modules/jquery-mozu',
        'hyprlivecontext',
        'hyprlive',
        "modules/block-ui",
        'modules/editable-view'
    ],
    function(api, Backbone, _, $, HyprLiveContext, Hypr, blockUiLoader, EditableView) {
        var ContactUsView = EditableView.extend({
            templateName: 'modules/contact-us/contact-us',
            autoUpdate: [
                'name',
                'phone',
                'email',
                'description',
                'subject'
            ],
            setError: function(msg) {
                this.model.set('isLoading', false);
                this.trigger('error', { message: msg || 'Something went wrong!! Please try after sometime!' });
            },
            contactUsSubmit: function() {
                var self = this;
                var name = self.model.get('name');
                var phone = self.model.get('phone');
                var email = self.model.get('email');
                var subject = self.model.get('subject');
                var description = self.model.get('description');
                if (!self.model.validate()) {
                    $.ajax({
                        type: 'POST',
                        url: HyprLiveContext.locals.themeSettings.contactFormAction,
                        data: $("#mainForm").serialize(),
                        crossDomain: true,
                        dataType: 'jsonp',
                        complete: function(response) {
                            if(response.statusText==="success"){
                                self.model.set("showThanks",true);
                                contactUsView.render();
                                $('html,body').animate({
                                    scrollTop: $('header').offset().top}, 1000);   
                            }                        
                        }
                    });
                    return false;
                } else {
                    self.setError("Invalid form submission");
                    return false;
                }
                self.model.set('isLoading', true);
            },
            render: function() {
                Backbone.MozuView.prototype.render.apply(this);
            }
        });

        var validationfields = {
            'phone': [{
                required: true,
                msg: Hypr.getLabel('phoneMissing')
            }, {
                pattern: "digits",
                msg: Hypr.getLabel("invalidPhone")
            }, {
                minLength: 10,
                maxLength: 40,
                msg: Hypr.getLabel("invalidPhoneLength")
            }, {
                pattern: /^((\+)?[1-9]{1,2})?([-\s\.])?((\(\d{1,4}\))|\d{1,4})(([-\s\.])?[0-9]{1,12}){1,2}$/,
                msg: Hypr.getLabel("invalidPhone")
            }],
            'email': {
                required: true,
                pattern: 'email',
                msg: Hypr.getLabel('emailMissing')
            },
            'subject': {
                required: true,
                msg: Hypr.getLabel('selectedMissing')
            },
            'description': {
                required: true,
                msg: Hypr.getLabel('contactUsMessageMissing')
            }
        };
        if (HyprLiveContext.locals.themeSettings.enableCaptcha) {
            _.extend(validationfields, {
                'recaptcha_widget_div': {
                    required: function(val, attr, computed) {
                        return window.recaptchaResponse === undefined;
                    },
                    msg: Hypr.getLabel('captchaStatusMessage')
                }
            });
        }
        var Model = Backbone.MozuModel.extend({
            validation: validationfields
        });
        var selectTopicDropDown = HyprLiveContext.locals.themeSettings.selectTopicDropDown;
            var contactUsModel = new Model({selectTopic:JSON.parse(selectTopicDropDown)});
            var $contactUsEl = $('#contactus-container');
            var contactUsView = window.view = new ContactUsView({
                el: $contactUsEl,
                model: contactUsModel
            });
        contactUsView.render();
    });
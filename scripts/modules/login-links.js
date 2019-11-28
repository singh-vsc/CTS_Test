/**
 * Adds a login popover to all login links on a page.
 */
define(['modules/backbone-mozu', 'shim!vendor/bootstrap/js/popover[shim!vendor/bootstrap/js/tooltip[modules/jquery-mozu=jQuery]>jQuery=jQuery]>jQuery', 'modules/api', 'hyprlive', 'underscore', 'vendor/jquery-placeholder/jquery.placeholder', 'hyprlivecontext'], function(backbone, $, api, Hypr, _, jqPlaceHolder, HyprLiveContext) {
    var current = "";
    var usePopovers = function() {
            return !Modernizr.mq('(max-width: 480px)');
        },
        isTemplate = function(path) {
            return HyprLiveContext.locals.pageContext.cmsContext.template.path === path;
        },
        returnFalse = function() {
            return false;
        },
        $docBody,

        polyfillPlaceholders = !('placeholder' in $('<input>')[0]);

    var DismissablePopover = function() {};

    $.extend(DismissablePopover.prototype, {
        boundMethods: [],
        setMethodContext: function() {
            for (var i = this.boundMethods.length - 1; i >= 0; i--) {
                this[this.boundMethods[i]] = $.proxy(this[this.boundMethods[i]], this);
            }
        },
        dismisser: function(e) {
            if (!$.contains(this.popoverInstance.$tip[0], e.target) && !this.loading) {
                // clicking away from a popped popover should dismiss it
                this.$el.popover('destroy');
                this.$el.on('click', this.createPopover);
                this.$el.off('click', returnFalse);
                this.bindListeners(false);
                $docBody.off('click', this.dismisser);
            }
        },
        setLoading: function(yes) {
            this.loading = yes;
            this.$parent[yes ? 'addClass' : 'removeClass']('is-loading');
        },
        newsetLoading: function(yes) {
            this.loading = yes;
            $(current)[yes ? 'addClass' : 'removeClass']('is-loading');
        },
        newdisplayMessage: function(el, msg) {
            this.newsetLoading(false);
            if (msg === "Missing or invalid parameter: EmailAddress EmailAddress already associated with a login")
                msg = Hypr.getLabel("emailExist");
            $(el).parents('.tab-pane').find('[data-mz-role="popover-message"]').html('<span class="mz-validationmessage">' + msg + '</span>');
        },
        newdisplayApiMessage: function(xhr) {
            var msg = xhr.message || (xhr && xhr.responseJSON && xhr.responseJSON.message) || Hypr.getLabel('unexpectedError');
            if (msg === "Missing or invalid parameter: EmailAddress EmailAddress already associated with a login")
                msg = Hypr.getLabel("emailExist");
            $(current).parents('.tab-pane').find('[data-mz-role="popover-message"]').html('<span class="mz-validationmessage">' + msg + '</span>');
        },
        onPopoverShow: function() {
            var self = this;
            _.defer(function() {
                $docBody.on('click', self.dismisser);
                self.$el.on('click', returnFalse);
            });
            this.popoverInstance = this.$el.data('bs.popover');
            this.$parent = this.popoverInstance.tip();
            this.bindListeners(true);
            this.$el.off('click', this.createPopover);
            if (polyfillPlaceholders) {
                this.$parent.find('[placeholder]').placeholder({ customClass: 'mz-placeholder' });
            }
        },
        createPopover: function(e) {
            // in the absence of JS or in a small viewport, these links go to the login page.
            // Prevent them from going there!
            var self = this;
            if (usePopovers()) {
                e.preventDefault();
                // If the parent element's not positioned at least relative,
                // the popover won't move with a window resize
                //var pos = $parent.css('position');
                //if (!pos || pos === "static") $parent.css('position', 'relative');
                this.$el.popover({
                        //placement: "auto right",
                        animation: true,
                        html: true,
                        trigger: 'manual',
                        content: this.template,
                        container: 'body'
                    }).on('shown.bs.popover', this.onPopoverShow)
                    .popover('show');

            }
        },
        retrieveErrorLabel: function(xhr) {
            var message = "";
            if (xhr.message) {
                message = Hypr.getLabel(xhr.message);
            } else if ((xhr && xhr.responseJSON && xhr.responseJSON.message)) {
                message = Hypr.getLabel(xhr.responseJSON.message);
            }

            if (!message || message.length === 0) {
                this.displayApiMessage(xhr);
            } else {
                var msgCont = {};
                msgCont.message = message;
                this.displayApiMessage(msgCont);
            }
        },
        displayApiMessage: function(xhr) {
            var msg = xhr.message || (xhr && xhr.responseJSON && xhr.responseJSON.message) || Hypr.getLabel('unexpectedError');
            if (msg === "Missing or invalid parameter: EmailAddress EmailAddress already associated with a login")
                msg = Hypr.getLabel("emailExist");
            this.displayMessage(msg);
        },
        displayMessage: function(msg) {
            this.setLoading(false);
            if (msg === "Missing or invalid parameter: EmailAddress EmailAddress already associated with a login")
                msg = Hypr.getLabel("emailExist");
            this.$parent.find('[data-mz-role="popover-message"]').html('<span class="mz-validationmessage">' + msg + '</span>');
        },
        init: function(el) {
            this.$el = $(el);
            this.loading = false;
            this.setMethodContext();
            if (!this.pageType) {
                this.$el.on('click', this.createPopover);
            } else {
                this.$el.on('click', _.bind(this.doFormSubmit, this));
            }
        },
        doFormSubmit: function(e) {
            e.preventDefault();
            this.$parent = this.$el.closest(this.formSelector);
            this[this.pageType]();
        }
    });

    var LoginPopover = function() {
        DismissablePopover.apply(this, arguments);
        this.login = _.debounce(this.login, 150);
        this.retrievePassword = _.debounce(this.retrievePassword, 150);
    };
    LoginPopover.prototype = new DismissablePopover();
    $.extend(LoginPopover.prototype, {
        boundMethods: ['handleEnterKey', 'handleLoginComplete', 'displayResetPasswordMessage', 'dismisser', 'displayMessage', 'displayApiMessage', 'createPopover', 'slideRight', 'slideLeft', 'login', 'retrievePassword', 'onPopoverShow'],
        template: Hypr.getTemplate('modules/common/login-popover').render(),
        bindListeners: function(on) {
            var onOrOff = on ? "on" : "off";
            this.$parent[onOrOff]('click', '[data-mz-action="forgotpasswordform"]', this.slideRight);
            this.$parent[onOrOff]('click', '[data-mz-action="loginform"]', this.slideLeft);
            this.$parent[onOrOff]('click', '[data-mz-action="submitlogin"]', this.login);
            this.$parent[onOrOff]('click', '[data-mz-action="submitforgotpassword"]', this.retrievePassword);
            this.$parent[onOrOff]('keypress', 'input', this.handleEnterKey);
        },
        onPopoverShow: function() {
            DismissablePopover.prototype.onPopoverShow.apply(this, arguments);
            this.panelWidth = this.$parent.find('.mz-l-slidebox-panel').first().outerWidth();
            this.$slideboxOuter = this.$parent.find('.mz-l-slidebox-outer');

            if (this.$el.hasClass('mz-forgot')) {
                this.slideRight();
            }
        },
        handleEnterKey: function(e) {
            if (e.which === 13) {
                var $parentForm = $(e.currentTarget).parents('[data-mz-role]');
                switch ($parentForm.data('mz-role')) {
                    case "login-form":
                        this.login();
                        break;
                    case "forgotpassword-form":
                        this.retrievePassword();
                        break;
                }
                return false;
            }
        },
        slideRight: function(e) {
            if (e) e.preventDefault();
            this.$slideboxOuter.css('left', -this.panelWidth);
        },
        slideLeft: function(e) {
            if (e) e.preventDefault();
            this.$slideboxOuter.css('left', 0);
        },
        login: function() {
            var self = this;
            if (self.validateLoginData(this, this.$parent.find('[data-mz-login-email]').val(), this.$parent.find('[data-mz-login-password]').val())) {
                this.setLoading(true);
                api.action('customer', 'loginStorefront', {
                    email: this.$parent.find('[data-mz-login-email]').val(),
                    password: this.$parent.find('[data-mz-login-password]').val()
                }).then(this.handleLoginComplete.bind(this, this.$parent.find('input[name=returnUrl]').val()), this.displayApiMessage);
            }
        },
        validateLoginData: function(el, email, password) {
            if (!email) {
                this.displayMessage(Hypr.getLabel('emailMissing'));
                return false;
            }
            if (email) {
                if (backbone.Validation.patterns.email.test(email)) {
                    if (!password) {
                        this.displayMessage(Hypr.getLabel('passwordMissing'));
                        return false;
                    }
                    return true;
                } else {
                    this.displayMessage(Hypr.getLabel('emailMissing'));
                    return false;
                }
            }
            return true;
        },
        anonymousorder: function() {
            var self = this;
            var email = "";
            var billingZipCode = "";
            var billingPhoneNumber = "";

            switch (this.$parent.find('[data-mz-verify-with]').val()) {
                case "zipCode":
                    {
                        billingZipCode = this.$parent.find('[data-mz-verification]').val();
                        email = null;
                        billingPhoneNumber = null;
                        break;
                    }
                case "phoneNumber":
                    {
                        billingZipCode = null;
                        email = null;
                        billingPhoneNumber = this.$parent.find('[data-mz-verification]').val();
                        break;
                    }
                case "email":
                    {
                        billingZipCode = null;
                        email = this.$parent.find('[data-mz-verification]').val();
                        billingPhoneNumber = null;
                        break;
                    }
                default:
                    {
                        billingZipCode = null;
                        email = null;
                        billingPhoneNumber = null;
                        break;
                    }

            }

            if (self.validateAnonymousOrder(this, this.$parent.find('[data-mz-order-number]').val(), email, billingZipCode, billingPhoneNumber)) {
                //this.setLoading(true);
                // the new handle message needs to take the redirect.
                var orderNumber = this.$parent.find('[data-mz-order-number]').val();
                $.ajax({
                    'url': '/status/order?orderNumber=' + orderNumber
                })
                .success(function(orderResp){
                    orderNumber = (orderResp && orderResp.orderNumber) ? orderResp.orderNumber : orderNumber;
                    var orderParentNumber = (orderResp && orderResp.orderParentNumber) ? orderResp.orderParentNumber : orderNumber;
                    api.action('customer', 'orderStatusLogin', {
                        ordernumber: orderParentNumber,
                        email: email,
                        billingZipCode: billingZipCode,
                        billingPhoneNumber: billingPhoneNumber
                    }).then(function() { window.location.href = "/my-anonymous-account"; }, _.bind(self.retrieveErrorLabel, this));
                })
                .error(function(err){
                    api.action('customer', 'orderStatusLogin', {
                        ordernumber: orderNumber,
                        email: email,
                        billingZipCode: billingZipCode,
                        billingPhoneNumber: billingPhoneNumber
                    }).then(function() { window.location.href = "/my-anonymous-account"; }, _.bind(self.retrieveErrorLabel, this));
                });
            }
        },
        validateAnonymousOrder: function(el, ordernumber, email, billingZipCode, billingPhoneNumber) {
            if (!ordernumber) {
                this.displayMessage(Hypr.getLabel('invalidOrderNumber'));
                return false;
            }
            if (!email && !billingZipCode && !billingPhoneNumber) {
                this.displayMessage(Hypr.getLabel('invalidVerificationField'));
                return false;
            }
            if (billingZipCode) {
                var zipCodePattern = /(^\d{5}$)|(^\d{5}-\d{4}$)/;
                if (zipCodePattern.test(billingZipCode)) {
                    return true;
                } else {
                    this.displayMessage(Hypr.getLabel('invalidZipcode'));
                    return false;
                }
            }
            if (email) {
                if (backbone.Validation.patterns.email.test(email)) {
                    return true;
                } else {
                    this.displayMessage(Hypr.getLabel('emailMissing'));
                    return false;
                }
            }
            if (billingPhoneNumber) {
                if (/(^\d*$)/.test(billingPhoneNumber) && (billingPhoneNumber.length > 9 && billingPhoneNumber.length < 21)) {
                    return true;
                } else {
                    this.displayMessage(Hypr.getLabel('invalidPhone'));
                    return false;
                }
            }
            return true;
        },
        retrievePassword: function() {
            var self = this;
            if (self.validateRetrievePasswordData(this, this.$parent.find('[data-mz-forgotpassword-email]').val())) {
                this.setLoading(true);
                api.action('customer', 'resetPasswordStorefront', {
                    EmailAddress: this.$parent.find('[data-mz-forgotpassword-email]').val()
                }).then(_.bind(this.displayResetPasswordMessage, this), this.displayApiMessage);
            }
        },
        validateRetrievePasswordData: function(el, email) {
            if (!email) {
                this.displayMessage(Hypr.getLabel('emailMissing'));
                return false;
            }
            if (email) {
                if (backbone.Validation.patterns.email.test(email)) {
                    return true;
                } else {
                    this.displayMessage(Hypr.getLabel('emailMissing'));
                    return false;
                }
            }
            return true;
        },
        handleLoginComplete: function(returnUrl) {
            if (returnUrl) {
                window.location.href = returnUrl;
            } else {
                window.location.reload();
            }
        },
        displayResetPasswordMessage: function() {
            this.displayMessage(Hypr.getLabel('resetEmailSent'));
        }
    });

    var SignupPopover = function() {
        DismissablePopover.apply(this, arguments);
        this.signup = _.debounce(this.signup, 150);
    };
    SignupPopover.prototype = new DismissablePopover();
    $.extend(SignupPopover.prototype, LoginPopover.prototype, {
        boundMethods: ['handleEnterKey', 'dismisser', 'displayMessage', 'displayApiMessage', 'createPopover', 'signup', 'onPopoverShow'],
        template: Hypr.getTemplate('modules/common/signup-popover').render(),
        bindListeners: function(on) {
            var onOrOff = on ? "on" : "off";
            this.$parent[onOrOff]('click', '[data-mz-action="signup"]', this.signup);
            this.$parent[onOrOff]('keypress', 'input', this.handleEnterKey);
        },
        handleEnterKey: function(e) {
            if (e.which === 13) { this.signup(); }
        },
        validate: function(payload) {
            if (!payload.account.emailAddress) return this.displayMessage(Hypr.getLabel('emailMissing')), false;
            if (!backbone.Validation.patterns.email.test(payload.account.emailAddress)) return this.displayMessage(Hypr.getLabel('emailMissing')), false;
            if (!payload.password) return this.displayMessage(Hypr.getLabel('passwordMissing')), false;
            if (payload.password !== this.$parent.find('[data-mz-signup-confirmpassword]').val()) return this.displayMessage(Hypr.getLabel('passwordsDoNotMatch')), false;
            return true;
        },
        signup: function() {
            var self = this,
                email = this.$parent.find('[data-mz-signup-emailaddress]').val(),
                payload = {
                    account: {
                        emailAddress: email,
                        userName: email,
                        contacts: [{
                            email: email
                        }]
                    },
                    password: this.$parent.find('[data-mz-signup-password]').val()
                };
            if (this.validate(payload)) {
                //var user = api.createSync('user', payload);
                this.setLoading(true);
                return api.action('customer', 'createStorefront', payload).then(function() {
                    if (self.redirectTemplate) {
                        window.location.pathname = self.redirectTemplate;
                    } else {
                        window.location.reload();
                    }
                }, function(xhr) {
                    //return self.displayApiMessage;
                    self.setLoading(false);
                    var msg = xhr.message || (xhr && xhr.responseJSON && xhr.responseJSON.message) || Hypr.getLabel('unexpectedError');
                    if (msg === "Missing or invalid parameter: EmailAddress EmailAddress already associated with a login")
                        msg = Hypr.getLabel("emailExist");
                    msg = msg.replace("Missing or invalid parameter: password ", "").replace("Missing or invalid parameter: username ", "");
                    $('[data-mz-role="popover-message"]').html('<span class="mz-validationmessage">' + msg + '</span>');
                });
            }
        }
    });
    var MyAccountPopover = function(e) {
        var self = this;
        this.init = function(el) {
            self.popoverEl = $('#my-account-content');
            self.bindListeners.call(el, true);
            $('#my-account').attr('href', '#');
        };
        this.bindListeners = function(on) {
            var onOrOff = on ? "on" : "off";
            var selfObj = $(this);
            selfObj.parent()[onOrOff]('click', '[data-mz-action="my-account"]', self.openPopover);

            selfObj.parent()[onOrOff]('touchend', function(e) {
                if ($(e.target).data('toggle') !== 'popover' && ($('div.popover.in').length > 0)) {
                    $(this).mouseleave();
                    e.stopPropagation();
                } else {
                    $(e.target).mouseenter();
                }
            });
        };
    };

    var LoginRegistrationModal = function() {
        var self = this;
        this.init = function(el) {
            self.modalEl = $('#liteRegistrationModal');
            self.bindListeners.call(el, true);
            self.doLogin = _.debounce(self.doLogin, 150);
            self.doSignup = _.debounce(self.doSignup, 150);
        };

        this.bindListeners = function(on) {
            var onOrOff = on ? "on" : "off";
            $(this).parent()[onOrOff]('click', '[data-mz-action="lite-registration"]', self.openLiteModal);
            $('#login-submit').on('click', self.doLogin);
            $('#signup-submit').on('click', self.doSignup);           
        };

        this.openLiteModal = function() {
            if (self.modalEl[0] == $("#liteRegistrationModal")[0]) {
                $(".second-tab").show();
                $(".third-tab").hide();
            }
            self.modalEl.modal('show');
            if(HyprLiveContext.locals.themeSettings.tealiumEnabled){
                var utag = window.utag || {};
                var utagView = {
                 'event_name': 'login overlay view',
                 'page_type' : window.utag_data.page_type
                };
                window.console.log(JSON.stringify(utagView));
                utag.view(utagView); 
            }
        };

        this.doLogin = function() {
            //console.log("Write business logic for Login form submition");
            var returnUrl = $('#returnUrl').val();

            var payload = {
                email: $(this).parents('#login').find('[data-mz-login-email]').val(),
                password: $(this).parents('#login').find('[data-mz-login-password]').val()
            };
            current = this;
            if (self.validateLogin(this, payload) && self.validatePassword(this, payload)) {
                //var user = api.createSync('user', payload);
                (LoginPopover.prototype).newsetLoading(true);
                return api.action('customer', 'loginStorefront', {
                    email: $(this).parents('#login').find('[data-mz-login-email]').val(),
                    password: $(this).parents('#login').find('[data-mz-login-password]').val()
                }).then(function() {
                    if (window.isCheckoutGuest) {
                        window.location = "/cart/checkout";
                    } else {
                        if (returnUrl) {
                            window.location.href = returnUrl;
                        } else {
                            window.location.reload();
                        }
                    }
                }, (LoginPopover.prototype).newdisplayApiMessage);
            }
        };
        this.validateLogin = function(el, payload) {
            if (!payload.email) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('emailMissing')), false;
            if (!(backbone.Validation.patterns.email.test(payload.email))) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('emailwrongpattern')), false;
            return true;
        };
        this.doSignup = function(e) {
            e.stopImmediatePropagation();
            var returnUrl = $('#returnUrl').val();
            var redirectTemplate = 'myaccount';
            var accMarketing = ($(this).parents('#newshopper').find('[data-mz-signup-emailupdates]').is(":checked"))? ($(this).parents('#newshopper').find('[data-mz-signup-emailupdates]').is(":checked")): false;
            var email = $(this).parents('#newshopper').find('[data-mz-signup-emailaddress]').val().trim();
            var payload = {
                account: {
                    emailAddress: email,
                    userName: email,
                    acceptsMarketing: accMarketing,
                    contacts: [{
                        email: email
                    }],
                    attributes: []
                },
                password: $(this).parents('#newshopper').find('[data-mz-signup-password]').val()
            };
            current = this;
            if (self.validateSignup(this, payload) && self.validatePassword(this, payload)) {
                //var user = api.createSync('user', payload);
                (LoginPopover.prototype).newsetLoading(true);
                if (payload.account.acceptsMarketing) {
                    $.ajax({
                        url: '/register/user/?email=' + payload.account.emailAddress,
                        method: 'GET',
                        contentType: 'application/json',
                        success: function (data) {}
                    });
                }
                return api.action('customer', 'createStorefront', payload).then(function() {
                    //Tealium Code starts here
                    if(HyprLiveContext.locals.themeSettings.tealiumEnabled){
                        var utag = window.utag || {};
                        var utagView = {
                            'customer_id' : window.utag_data.customer_id,
                            'event_name' : 'account created'
                        };
                        window.console.log(JSON.stringify(utagView));
                        utag.link(utagView); 
                    }
                    //Tealium Code ends here
                    if (returnUrl) {
                        window.location.href = returnUrl;
                    } else if (redirectTemplate) {
                        window.location.pathname = redirectTemplate;
                    } else {
                        window.location.reload();
                    }
                }, (LoginPopover.prototype).newdisplayApiMessage);
            }
        };
        this.validatePassword = function(el, payload) {
            if (!payload.password)
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordMissing')), false;
            if (payload.password.length < 8) {
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordlength')), false;
            } else if (payload.password.length > 50) {
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordlength')), false;
            } else if (payload.password.search(/\d/) == -1) {
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordlength')), false;
            } else if (payload.password.search(/[a-zA-Z]/) == -1) {
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordlength')), false;
            } else if (payload.password.search(/[^a-zA-Z0-9\!\@\#\$\%\^\&\*\(\)\_\+\.\,\;\:]/) != -1) {
                return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordlength')), false;
            }
            return true;
        };
        this.validateSignup = function(el, payload) {
            if (!payload.account.emailAddress) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('emailMissing')), false;
            if (!(backbone.Validation.patterns.email.test(payload.account.emailAddress))) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('emailwrongpattern')), false;
            if (self.validatePassword(el, payload) === false)
                return false;
            else
            if (payload.password !== $(el).parents('#newshopper').find('[data-mz-signup-confirmpassword]').val()) return (LoginPopover.prototype).newdisplayMessage(el, Hypr.getLabel('passwordsDoNotMatch')), false;
            return true;
        };
    };
    $(document).ready(function() {
        $('#global-header-wrapper').each(function (index, globalHeader) {
            globalHeader = $(globalHeader);
            if ( globalHeader && ( globalHeader.find('.mz-drop-zone').text().trim() !== '' || globalHeader.find('.mz-cms-image').html() !== undefined || globalHeader.find('.mz-drop-zone').find('img').length !== 0 )) {
                var globalHeaderIncludeClosed = window.sessionStorage.getItem('globalHeaderIncludeClosed');
                if (!globalHeaderIncludeClosed) {
                    globalHeader.slideDown();
                }

                globalHeader.on('click', '#globalHeaderIncludeCloseBtn', function () {
                    globalHeader.slideUp();
                    window.sessionStorage.setItem('globalHeaderIncludeClosed', true);
                });
            }
        });

        $('#home-promo-wrapper').each(function (index, promo) {
            promo = $(promo);
            if ( promo && ( promo.find('.mz-drop-zone').text().trim() !== '' || promo.find('.mz-cms-image').html() !== undefined || promo.find('.mz-drop-zone').find('img').length !== 0 )) {
                var homePromoClosed = window.sessionStorage.getItem('homePromoClosed');
                if (!homePromoClosed) {
                    promo.slideDown();
                }
                promo.on('click', '#homePromoCloseBtn', function () {
                    promo.slideUp();
                    window.sessionStorage.setItem('homePromoClosed', true);
                });
            }
        });
        $(".ml-navbar-secondary .panel-body").each(function() {
            var headingElemnt = $(this).parent().parent().find("a[aria-controls]");
            if ($(this).text().trim() === "" && headingElemnt.data("target")) {
                headingElemnt.find("span").hide();
                headingElemnt.attr("href", "/c/" + headingElemnt.data("target").replace("#sub-nav-", "").replace("#main-nav-", ""));
                headingElemnt.removeAttr("aria-expanded aria-controls data-toggle role");
            }
        });
        $docBody = $(document.body);
        $('[data-mz-action="lite-registration"]').each(function() {
            var modal = new LoginRegistrationModal();
            modal.init(this); 
        });
        $('#my-account').attr('href', '#');
        $('[data-mz-action="my-account"]').click(function() {
            var popover = new MyAccountPopover();
            popover.init(this);
            $(this).data('mz.popover', popover);
        });
        $('[data-mz-action="signuppage-submit"]').attr('disabled', false);
        $('[data-mz-action="loginpage-submit"]').attr('disabled', false);
        $('[data-mz-action="forgotpasswordpage-submit"]').attr('disabled', false);
        $("#my-account").popover({
            html: true,
            placement: 'bottom',
            content: function() {
                return $('#my-account-content').html();
            },
            container: 'body',
            template: '<div class="popover myaccountpop"><div class="arrow"></div><div class="popover-content"></div></div>'
        });
        $(window).resize(function() {
            var account = $(".myaccountpop.in");
            var accountLink = $(".user-link");
            if (accountLink.length && account.length) {
                var accountWidth = account.width();
                var accountLinkWidth = accountLink.outerWidth();
                var accountLinkOffset = accountLink.offset().left;
                account.css("left", (accountLinkOffset - (accountWidth / 2 - accountLinkWidth / 2)));
            }
        });
        $('body').on('touchend click', function(e) {
            //only buttons
            if ($(e.target).data('toggle') !== 'modal' && !$(e.target).parents().is('.modal.in')) {
                $('[data-toggle="modal"]').modal('hide');
            }
        });
        $('[data-mz-action="login"]').each(function() {
            var popover = new LoginPopover();
            popover.init(this);
            $(this).data('mz.popover', popover);
        });
        /*$('[data-mz-action="signup"]').each(function() {
            var popover = new SignupPopover();
            popover.init(this);
            $(this).data('mz.popover', popover);
        });
        $('[data-mz-action="launchforgotpassword"]').each(function() {
            var popover = new LoginPopover();
            popover.init(this);
            $(this).data('mz.popover', popover);
        });*/
        $('[data-mz-action="signuppage-submit"]').each(function() {
            var signupPage = new SignupPopover();
            signupPage.formSelector = 'form[name="mz-signupform"]';
            signupPage.pageType = 'signup';
            signupPage.redirectTemplate = 'myaccount';
            signupPage.init(this);
        });
        $('[data-mz-action="loginpage-submit"]').each(function() {
            var loginPage = new SignupPopover();
            loginPage.formSelector = 'form[name="mz-loginform"]';
            loginPage.pageType = 'login';
            loginPage.init(this);
        });
        $('[data-mz-action="anonymousorder-submit"]').each(function() {
            var loginPage = new SignupPopover();
            loginPage.formSelector = 'form[name="mz-anonymousorder"]';
            loginPage.pageType = 'anonymousorder';
            loginPage.init(this);
        });
        $('[data-mz-action="forgotpasswordpage-submit"]').each(function() {
            var loginPage = new SignupPopover();
            loginPage.formSelector = 'form[name="mz-forgotpasswordform"]';
            loginPage.pageType = 'retrievePassword';
            loginPage.init(this);
        });

        //print the content of confirmation page
        $("#mz-print-content-confirmation").on("click", function() {
            window.print();
        });

        $('[data-mz-action="logout"]').each(function() {
            var el = $(this);

            //if were in edit mode, we override the /logout GET, to preserve the correct referrer/page location | #64822
            if (HyprLiveContext.locals.pageContext.isEditMode) {

                el.on('click', function(e) {
                    e.preventDefault();
                    $.ajax({
                        method: 'GET',
                        url: '../../logout',
                        complete: function() { location.reload(); }
                    });
                });
            }

        });
    });
});
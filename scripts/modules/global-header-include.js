define(
    ['modules/jquery-mozu', 'modules/backbone-mozu', 'hyprlive'],
    function ($, Backbone, Hypr) {
        $(function () {
            $("#btnFindStore").click(function (e) {
                e.preventDefault();
                var zipcode = $.trim($("#footerZipCodeInput").val());
                zipcode = (zipcode.length === 0 ? "Enter+Zip" : zipcode);
                window.location.href = window.location.origin + "/store-locator?zipcode=" + zipcode;
            });
            $("#footerZipCodeInput").keydown(function (e) {
                if (e.which === 13) {
                    $("#btnFindStore").trigger("click");
                }
            });
            $("#footerSignUpInput").keydown(function (e) {
                if (e.which === 13) {
                    $("#emailSignUp").trigger("click");
                }
            });
            $("#emailSignUp").click(function (e) {
                e.preventDefault();
                if (Hypr.getThemeSetting('enableEmailSubscription')) {
                    var email = $("#footerSignUpInput").val();
                    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    if (re.test(email.toLowerCase())) {
                        $("#emailHelpBlock").text("");
                        window.open(Hypr.getThemeSetting('emailSubscriptionUrl') + email, 'mywindow2', 'height=640,width=960,scrollbars=yes');
                    } else {
                        $("#emailHelpBlock").text('Please enter a valid email');
                    }
                }
            });

            // $("#textSignUp").click(function (e) {
            //     e.preventDefault();
                
            //     var mobile = $("#footerTextSignupInput").val();
            //     if( mobile ){
            //         $.ajax({
            //             url: '//codebroker.net/cb/gateway/custom/bbb/scoptin.jsp?cbid=1833-0EA7E1&key=%23Ir3Tw29d_EB0XcGsC1pA42_JB5lNCo2Z&msc=47283&spn=' + mobile + '&program=CBWEBOPTINCTS032819&upref=yes&uprefhod=5&uprefhodx=PM&uprefustz=EST',
            //             method: 'POST',
            //             contentType: 'application/x-www-form-urlencoded',
            //             success: function (data) {
            //                 console.log(data);
            //             },
            //             error: function(error){
            //                 console.log(error);
            //             }
            //         });

            //         // $.get("//codebroker.net/cb/gateway/custom/bbb/scoptin.jspjsp?cbid=1833-0EA7E1&key=%23Ir3Tw29d_EB0XcGsC1pA42_JB5lNCo2Z&msc=47283&spn=" + mobile + "&program=CBWEBOPTINCTS032819&upref=yes&uprefhod=5&uprefhodx=PM&uprefustz=EST").done(function (response) {
            //         //     console.log(response);
            //         // });
            //     }
            // });

            /*Associate Login*/
            var aoscookie = $.cookie("aos");
            if (aoscookie) {
                var aoscookieVal = JSON.parse(aoscookie);
                var aosBar = Backbone.MozuView.extend({
                    templateName: "modules/aos/aos-bar",
                    additionalEvents: {
                        "click #log-out": "logout"
                    },
                    render: function () {
                        var me = this;
                        Backbone.MozuView.prototype.render.apply(this);
                        $("#associate-login-container").css('display', 'block');
                    },
                    logout: function (e) {
                        e.preventDefault();
                        $.removeCookie('aos', { path: "/" });
                        window.location = '/aos';
                    }
                });
                var Model = Backbone.MozuModel.extend();
                var aos = new aosBar({
                    el: $('#associate-login-container'),
                    model: new Model(aoscookieVal)
                });
                aos.render();
            }
            /* CA Warning Message */
            var caEnabled = Hypr.getThemeSetting('caEnabled'),
                caGuestEnabled = Hypr.getThemeSetting('caGuestEnabled');

            if (caEnabled) {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(showPosition, showError);
                }
                $("#ca-warning-close").click(function () {
                    $.cookie("ca", true, { path: '/' });
                    $("#ca_location").modal('hide');
                });
            }

            function showPosition(position) {
                var state;
                $.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + position.coords.latitude + "," + position.coords.longitude + "&sensor=true&key=" + Hypr.getThemeSetting('googleMapAPIKey')).done(function (response) {
                    if (response.status === "OK") {
                        for (var i = 0; i < response.results[0].address_components.length; i++) {
                            var addressType = response.results[0].address_components[i].types[0];
                            if (addressType === 'administrative_area_level_1') {
                                state = response.results[0].address_components[i].short_name;
                                break;
                            }
                        }
                        if (state === "CA") {
                            if (!$.cookie("ca"))
                                $("#ca_location").modal('show');
                        }
                    }
                });
            }
            function showError(error) {
                if (caGuestEnabled && error.code && (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) && !$.cookie("ca")) {
                    $("#ca_location").modal('show');
                }
            }
        });
    }
);
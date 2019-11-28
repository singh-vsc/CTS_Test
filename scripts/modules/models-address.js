define(
    ["modules/backbone-mozu", 'hyprlive'],
    function (Backbone, Hypr) {


        var countriesRequiringStateAndZip = {
            US: true,
            CA: true,
            JP: true,
            TW: true
        },
            defaultStateProv = "n/a";

        function isPOAddress(address) {
            var addressLowercase = address.toLowerCase();
            var fields = addressLowercase.split(" ");
            var regexPOBox0 = /^[\.\s\-]*[pP][\.\s\-]*[oO][\.\s\-]*/gm;
            var regexPOBox1 = /^[\.\s\-]*[pP][\.\s\-]*[oO][\.\s\-]*[bB][\.oO]*[xX]*/gm;
            var regexPOBox2 = /^[\.\s\-]*[pP][oO][sS][tT][\.\s\-]*[oO][fF]/gm;
            var regexPOBox3 = /[bB][oO][xX][\s\-]*[0-9]/gm;
            if (regexPOBox0.test(address) || regexPOBox1.test(address) || regexPOBox2.test(address) || regexPOBox3.test(address)) {
                return true;
            }
            for (var i = 0; i < fields.length; i++) {
                if (fields[i] === "po" || fields[i] === "p.o." || fields[i] === "p.o" || fields[i]==="box" || fields[i]==="pobox") {
                    return true;
                }
            }
            if (addressLowercase.indexOf("post office") >= 0) {
                return true;
            }
            return false;
        }

        var PhoneNumbers = Backbone.MozuModel.extend({
            validation: {
                home: [
                    {
                        required: true,
                        msg: Hypr.getLabel("phoneMissing")
                    }, {
                        pattern: "digits",
                        msg: Hypr.getLabel("invalidPhone")
                    }, {
                        minLength: 10,
                        maxLength: 20,
                        msg: Hypr.getLabel("invalidPhone")
                    }, {
                        pattern: /^((\+)?[1-9]{1,2})?([-\s\.])?((\(\d{1,4}\))|\d{1,4})(([-\s\.])?[0-9]{1,12}){1,2}$/,
                        msg: Hypr.getLabel("invalidPhone")
                    }]
            }
        }),

            StreetAddress = Backbone.MozuModel.extend({
                mozuType: 'address',
                initialize: function () {
                    this.on('change:countryCode', this.clearStateAndZipWhenCountryChanges, this);
                },
                clearStateAndZipWhenCountryChanges: function () {
                    this.unset('postalOrZipCode');
                    this.unset('stateOrProvince');
                },
                validation: {
                    address1: {
                        fn: "address1Validation"
                    },
                    address2: {
                        fn: "address2Validation"
                    },
                    cityOrTown: {
                        required: true,
                        msg: Hypr.getLabel("cityMissing")
                    },
                    countryCode: {
                        required: true,
                        msg: Hypr.getLabel("countryMissing")
                    },
                    addressType: {
                        required: true,
                        msg: Hypr.getLabel("addressTypeMissing")
                    },
                    stateOrProvince: {
                        fn: "requiresStateAndZip",
                        msg: Hypr.getLabel("stateProvMissing")
                    },
                    postalOrZipCode: [{
                        required: true,
                        msg: Hypr.getLabel("postalCodeMissing")
                    }, {
                        pattern: /(^\d{5}$)|(^\d{5}-\d{4}$)/,
                        msg: Hypr.getLabel("invalidZipcode")
                    }]
                },
                address1Validation: function () {
                    if (this.get('address1')) {
                        //Check for Po box Error
                        if (!this.get('isBilling')) {
                            if (isPOAddress(this.get('address1'))) {
                                return Hypr.getLabel("poBoxError");
                            }
                        }
                    } else {
                        return Hypr.getLabel("streetMissing");
                    }
                },
                address2Validation: function () {
                    if (this.get('address1') === this.get('address2')) {
                        this.set('address2', null);
                    }
                    if (this.get('address2') && !this.get('isBilling')) {
                        //Check for Po box Error
                        if (isPOAddress(this.get('address2'))) {
                            return Hypr.getLabel("poBoxError");
                        }
                    }
                },
                requiresStateAndZip: function (value, attr) {
                    if ((this.get('countryCode') in countriesRequiringStateAndZip) && !value) return this.validation[attr.split('.').pop()].msg;
                },
                defaults: {
                    candidateValidatedAddresses: null,
                    countryCode: Hypr.getThemeSetting('preselectCountryCode') || '',
                    addressType: 'Residential'
                },
                toJSON: function (options) {
                    // workaround for SA
                    var j = Backbone.MozuModel.prototype.toJSON.apply(this, arguments);
                    if ((!options || !options.helpers) && !j.stateOrProvince) {
                        j.stateOrProvince = defaultStateProv;
                    }
                    if (options && options.helpers && j.stateOrProvince === defaultStateProv) {
                        delete j.stateOrProvince;
                    }
                    return j;
                },
                is: function (another) {
                    var s1 = '', s2 = '';
                    for (var k in another) {
                        if (k === 'isValidated')
                            continue;
                        s1 = (another[k] || '').toLowerCase();
                        s2 = (this.get(k) || '').toLowerCase();
                        if (s1 != s2) {
                            return false;
                        }
                    }
                    return true;
                }
            });

        return {
            PhoneNumbers: PhoneNumbers,
            StreetAddress: StreetAddress
        };
    });

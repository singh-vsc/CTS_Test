require([
    'modules/jquery-mozu',
    'hyprlive',
    "hyprlivecontext",
    'underscore',
    'modules/api',
    'modules/backbone-mozu',
    'modules/models-product',
    'widgets/rti/recommended-products',
    'widgets/rti/gc-recommended-products',
    'slick'
],
    function ($, Hypr, HyprLiveContext, _, api, Backbone, ProductModels, RecommendedProducts, GCRecommendedProducts, slickSlider) {

        // rtiOptions will contain variables used by the
        //whole page. They can be set in every widget editor, but only the first
        //one on the page is the one that we'll listen to for these variables.

        var firstDisplay = $('.recommended-product-container').not('#global-cart .recommended-product-container').first();
        var firstConfig;
        var rtiOptions = {};
        if ($('.recommended-product-container').not('#global-cart .recommended-product-container').length) {
            firstConfig = firstDisplay.data('mzRtiRecommendedProducts');
            rtiOptions = {
                customerId: firstConfig.customerId || "",
                customerCode: firstConfig.customerCode || "",
                pageType: firstConfig.pageType || "",
                jsInject: firstConfig.javascriptInjection || "",
                includeSiteId: firstConfig.includeSiteId || false,
                includeTenantId: firstConfig.includeTenantId || false
            };
        }


        var pageContext = HyprLiveContext.locals.pageContext;
        var siteContext = HyprLiveContext.locals.siteContext;

        /*
        containerList holds data about all of the widgets we're going to make.
        */
        var containerList = [];

        /*
        The following loop acts as cleanup; it populates containerList with the needed data,
        ignoring and delegitimizing any divs on the page with duplicate placeholder names.
        */
        $('.recommended-product-container').not('#global-cart .recommended-product-container').each(function () {
            if (!$(this).hasClass('ignore')) {
                var configData = $(this).data('mzRtiRecommendedProducts');
                //displayOptions are individual to each container.
                var displayOptions = {
                    title: configData.title || "",
                    quantity: configData.numberOfItems || "",
                    format: configData.displayType || "",
                    placeholder: configData.placeholder || ""
                };
                var container = { config: displayOptions };
                var selector = '.recommended-product-container.' + configData.placeholder;

                if ($(selector).not('#global-cart .recommended-product-container').length > 1) {
                    $(selector).not('#global-cart .recommended-product-container').each(function (index, element) {
                        if (index > 0) {
                            /*
                            We don't want to add the data from accidental duplicates to
                            our nice, clean containerList. We also don't want those duplicates to
                            accidentally render. So for all but the first element with this
                            class name, we strip all classes, add 'ignore' so the .each we're in
                            right now ignores the duplicates, hides the div, and adds a message
                            in edit mode so the user knows what happened.
                            */
                            $(element).removeClass();
                            $(element).addClass('ignore');
                            if (pageContext.isEditMode) {
                                $("<p>Error: duplicate placeholder name.</p>").insertBefore($(element));
                            }
                            $(element).hide();
                        }
                    });
                }
                containerList.push(container);
            }
        });

        /*Recommended Product Code Starts*/
        var eFlag = 0;
        var ProductModelColor = Backbone.MozuModel.extend({
            mozuType: 'products'
        });
        //***********************
        //---VIEW DEFINITIONS---//
        //************************

        //***Start Grid view defition:
        var GridView = Backbone.MozuView.extend({
            templateName: 'Widgets/RTI/rti-product-tiles',
            initialize: function () {
                var self = this;

            },
            render: function (placeholder) {
                var elSelector = ".rti-recommended-products." + placeholder;
                var self = this;
                Backbone.MozuView.prototype.render.apply(this, arguments);
            }
        });
        //End Grid view definition***
        //***Start Carousel view def:
        var ProductListView = Backbone.MozuView.extend({
            templateName: 'modules/product/rti-product-list'
        });
        //End Carousel view def***
        function convertRangeFormat(val) {
            var listPrice = val[0];
            var salePrice = (val.length > 1)? val[1] : null;

            return {
                lower: {
                    onSale: (val.length > 1),
                    price: parseFloat(val[0].split('-')[0]),
                    salePrice: (val.length > 1) ? parseFloat(val[1].split('-')[0]) : null
                },
                upper: {
                    onSale: (val.length > 1),
                    price: parseFloat(val[0].split('-')[1]),
                    salePrice: (val.length > 1) ? parseFloat(val[1].split('-')[1]) : null
                }
            };
        }

        var getMozuProducts = function (rtiProductList) {

            var deferred = api.defer();
            var numReqs = rtiProductList.length;
            var productList = [];
            var filter = "";
            _.each(rtiProductList, function (attrs) {
                if (filter !== "") filter += " or ";
                filter += "productCode eq " + attrs.ProductId;
            });
            var op = api.get('products', filter);
            op.then(function (data) {
                _.each(data.data.items, function (product) {

                    var rtiProduct = _.findWhere(rtiProductList, { ProductId: product.productCode });
                    if (_.find(product.properties, {'attributeFQN':"tenant~Price_Range"}) && _.find(product.properties, {'attributeFQN':"tenant~Price_Range"}).values[0].value) {
                        var priceValue = _.find(product.properties, {'attributeFQN':"tenant~Price_Range"}).values[0].stringValue || _.find(product.properties, {'attributeFQN':"tenant~Price_Range"}).values[0].value;
                        priceValue = priceValue.split(',');
                        product.priceRange = convertRangeFormat(priceValue);
                    }
                    product.rtiRank = rtiProduct.rank || '';
                    product.slot = rtiProduct.slot || '';
                    product.widgetId = rtiProduct.widgetId || '';
                    product.href = rtiProduct.url || '';
                    
                    var addFlag = true;
                    var themeSettings = HyprLiveContext.locals.themeSettings;
                    var hideProductPropertyEnabled = themeSettings.hideProductPropertyEnabled;
                    var hideProductProperty = themeSettings.hideProductProperty;
                    if (hideProductProperty && hideProductPropertyEnabled) {
                        var property = _.findWhere(product.properties, {'attributeFQN': HyprLiveContext.locals.themeSettings.hideProductProperty});
                        if (property && property.values && property.values.length && property.values[0].value === false) {
                            addFlag = false;
                        }
                    }
                    if (addFlag) {
                        productList.push(product);
                    }
                    _.defer(function () {
                        deferred.resolve(productList);
                    });
                });

            }, function (reason) {
                _.defer(function () {
                    deferred.resolve(productList);
                });
            });
            return deferred.promise;
        };

        var renderData = function (data) {

            _.each(containerList, function (container) {
                var placeholder = container.config.placeholder;
                var numberOfItems = container.config.quantity || container.config.numberOfItems;
                var configTitle = container.config.title;
                var format = container.config.format;
                if (pageContext.isEditMode) {
                    $('.recommended-product-container.' + placeholder).text('<b>Here Goes your RTI Recommended items</b>');
                    return;
                }
                /*
                Our data will contain information about lots of different possible widgets.
                First we want to reduce that data to only the placeholderName we're dealing with.
                */
                var currentProducts = $.grep(data, function (e) {
                    return e.placeholderName == placeholder;
                });
                /*
                We should at this point have a list of results with the correct placeholderName,
                and that last should only be 1 item long.
                If that first item doesn't exist, there was a problem.
                */
                if (!currentProducts[0]) {
                    if (pageContext.isEditMode) {
                        /*
                        If we reach this point, it means there wasn't a placeholderName in the
                        data that was returned that matches the one we selected.
                        */
                        $('.recommended-product-container.' + placeholder).text("Placeholder not found.");
                    }
                } else {
                    //We have the data for our widget now. Time to fill it up.
                    var displayName;
                    //if configTitle has a value, the user entered a title to
                    //override the title set in RTI.
                    if (configTitle) {
                        displayName = configTitle;
                    } else {
                        //if configTitle has no value, we get the title from the
                        //product results call
                        displayName = currentProducts[0].displayName;
                    }

                    //We slice the productList we received according to the limit set
                    //in the editor
                    var productList;
                    if (currentProducts[0].productList.length > numberOfItems) {
                        productList = currentProducts[0].productList.slice(0, numberOfItems);
                    } else {
                        productList = currentProducts[0].productList;
                    }
                    //Turns list of product IDs into a product collection
                    getMozuProducts(productList).then(function (products) {
                        if (products.length !== 0) {
                            var productsByRank = _.sortBy(products, 'rtiRank');
                            productList = productsByRank;
                            var prodColl = new ProductModels.ProductCollection();
                            prodColl.set('items', productList);
                            if(data.bnData) {
                                prodColl.set('bnData', data.bnData);
                            }
                            prodColl.set('config', container.config);
                            //BNData for multiple widgets
                            if (productList.length) {
                                var firstItem = productList[0];
                                window.BNData = window.BNData || '';
                                window.BNWidgetId = window.BNWidgetId || '';
                                if (window.BNData) {
                                    if (window.BNData.widgetCount) {
                                        window.BNData.widgetCount += 1;
                                        window.BNData.widget[firstItem.widgetId] = data.bnData;
                                    }
                                    else {
                                        var oldBNData = window.BNData;
                                        window.BNData = {
                                            widgetCount: 2,
                                            widget: {}
                                        };
                                        window.BNData.widget[firstItem.widgetId] = data.bnData;
                                        window.BNData.widget[window.BNWidgetId] = oldBNData;
                                    }
                                }
                                else {
                                    window.BNData = data.bnData;
                                    window.BNWidgetId = firstItem.widgetId;
                                }
                            }
                            else {
                                window.BNData = data.bnData;
                            }
                            //Time to actually render
                            if (currentProducts[0].editModeMessage) {
                                if (pageContext.isEditMode) {
                                    $('.recommended-product-container.' + placeholder).text(currentProducts[0].editModeMessage);
                                }
                            } else {
                                $('.recommended-product-container.' + placeholder + ' .mz-related-products.hidden-print').html('<h3 class="' + placeholder + ' slider-title"><span>' + displayName + '</span></h3>');
                                if (!format) {
                                    format = "carousel";
                                }
                                if (format == "carousel") {
                                    var productListView = new ProductListView({
                                        el: $("." + placeholder + '.rti-recommended-products'),
                                        model: prodColl
                                    });
                                    productListView.render();
                                    var slideCount = 4;
                                    if (placeholder == 'pdpRelated') {
                                        slideCount = 8;
                                    }
                                    if (productList.length > 1) {
                                        $("." + placeholder + '.rti-recommended-products .bxslider').slick({
                                            slidesToShow: slideCount,
                                            slidesToScroll: 1,
                                            infinite: false,
                                            prevArrow: '<i class="fa fa-angle-left" aria-hidden="true"></i>',
                                            nextArrow: '<i class="fa fa-angle-right" aria-hidden="true"></i>',
                                            responsive: [{
                                                breakpoint: 992,
                                                settings: {
                                                    arrows: true,
                                                    slidesToShow: 3
                                                }
                                            },
                                            {
                                                breakpoint: 768,
                                                settings: {
                                                    arrows: true,
                                                    slidesToShow: 1
                                                }
                                            }
                                            ]
                                        });
                                    } else if (productList.length === 1) {
                                        $("[data-mz-product]").find('img').addClass('single-img-width');
                                    }
                                    if (productList.length === 0) {
                                        $("." + placeholder + '.recommended-product-container').hide();
                                    }
                                    return;

                                }
                                else if (format == "grid") {
                                    var gridListView = new GridView({
                                        el: $('[data-rti-recommended-products=' + placeholder + ']'),
                                        model: prodColl
                                    });
                                    gridListView.render(placeholder);
                                    return;
                                }
                            }
                        } else {
                            if (pageContext.isEditMode) {
                                $('.recommended-product-container.' + placeholder).text("There was a problem retrieving products from your catalog that match the products received from RTI.");
                            }
                        }
                    });
                }
            });
        };

        var globalRenderData = function (data) {
            $('#global-cart .recommended-product-container').each(function () {
                var container = $(this);
                var placeholder = globalConfig.placeholder;
                var numberOfItems = globalConfig.quantity || globalConfig.numberOfItems;
                var configTitle = globalConfig.title;
                var format = globalConfig.format;
                if (pageContext.isEditMode) {
                    container.text('<b>Here Goes your RTI Recommended items</b>');
                    return;
                }
                /*
                Our data will contain information about lots of different possible widgets.
                First we want to reduce that data to only the placeholderName we're dealing with.
                */
                var currentProducts = $.grep(data, function (e) {
                    return e.placeholderName == placeholder;
                });
                /*
                We should at this point have a list of results with the correct placeholderName,
                and that last should only be 1 item long.
                If that first item doesn't exist, there was a problem.
                */
                if (!currentProducts[0]) {
                    if (pageContext.isEditMode) {
                        /*
                        If we reach this point, it means there wasn't a placeholderName in the
                        data that was returned that matches the one we selected.
                        */
                        container.text("Placeholder not found.");
                    }
                } else {
                    //We have the data for our widget now. Time to fill it up.
                    var displayName;
                    //if configTitle has a value, the user entered a title to
                    //override the title set in RTI.
                    if (configTitle) {
                        displayName = configTitle;
                    } else {
                        //if configTitle has no value, we get the title from the
                        //product results call
                        displayName = currentProducts[0].displayName;
                    }

                    //We slice the productList we received according to the limit set
                    //in the editor
                    var productList;
                    if (currentProducts[0].productList.length > numberOfItems) {
                        productList = currentProducts[0].productList.slice(0, numberOfItems);
                    } else {
                        productList = currentProducts[0].productList;
                    }

                    //Turns list of product IDs into a product collection
                    getMozuProducts(productList).then(function (products) {
                        if (products.length !== 0) {
                            var productsByRank = _.sortBy(products, 'rtiRank');
                            productList = productsByRank;
                            var prodColl = new ProductModels.ProductCollection();
                            prodColl.set('items', productList);
                            if(data.bnData) {
                                prodColl.set('bnData', data.bnData);
                            }
                            //Time to actually render

                            if (currentProducts[0].editModeMessage) {
                                if (pageContext.isEditMode) {
                                    container.text(currentProducts[0].editModeMessage);
                                }
                            } else {
                                container.find('.mz-related-products.hidden-print').html('<h3 class="' + placeholder + ' slider-title"><span>' + displayName + '</span></h3>');
                                if (!format) {
                                    format = "carousel";
                                }
                                if (format == "carousel") {
                                    var productListView = new ProductListView({
                                        el: container.find('.rti-recommended-products'),
                                        model: prodColl
                                    });
                                    try {
                                        container.find('.rti-recommended-products .bxslider').unslick();
                                    } catch (e) { }
                                    productListView.render();
                                    if (productList.length > 1) {
                                        $("." + placeholder + '.rti-recommended-products .bxslider').slick({
                                            slidesToShow: 3,
                                            slidesToScroll: 1,
                                            infinite: false,
                                            prevArrow: '<i class="fa fa-angle-left" aria-hidden="true"></i>',
                                            nextArrow: '<i class="fa fa-angle-right" aria-hidden="true"></i>'
                                        });
                                    }
                                    if (productList.length === 0) {
                                        container.find('.recommended-product-container').hide();
                                    }
                                    return;
                                }
                            }
                        } else {
                            if (pageContext.isEditMode) {
                                container.text("There was a problem retrieving products from your catalog that match the products received from RTI.");
                            }
                        }
                    });
                }
            });
        };
        try {
            if ($('.recommended-product-container').not('#global-cart .recommended-product-container').length) {
                var productInstance = RecommendedProducts.getInstance(rtiOptions);
                productInstance.getProductData(function (data) {
                    renderData(data);
                });
            }
        } catch (err) {
            //console.log(err);
        }
        /*Recommended Product Code Ends*/
        /* Code for Global Cart*/
        var globalDisplay;
        var globalConfig;
        var globalRtiOptions;
        if ($('#global-cart .recommended-product-container').length) {
            globalDisplay = $('#global-cart .recommended-product-container').first();
            globalConfig = globalDisplay.data('mzRtiRecommendedProducts');
            globalRtiOptions = {
                customerId: globalConfig.customerId || "",
                customerCode: globalConfig.customerCode || "",
                pageType: globalConfig.pageType || "",
                jsInject: globalConfig.javascriptInjection || "",
                includeSiteId: globalConfig.includeSiteId || false,
                includeTenantId: globalConfig.includeTenantId || false
            };
        }

        function updateGCRTI() {
            if ($('#global-cart .recommended-product-container').length) {
                try {
                    var cart = require.mozuData('globalcart');
                    if (cart && cart.items && cart.items.length) {
                        var GCProductInstance = GCRecommendedProducts.getInstance(globalRtiOptions);
                        GCProductInstance.getProductData(function (data) {
                            globalRenderData(data);
                        });
                    }
                } catch (err) {
                    //
                }
            }
        }
        window.updateGCRTI = updateGCRTI;
        var globalCartElement = document.getElementsByClassName("ml-header-global-cart-wrapper");
        if (globalCartElement && globalCartElement.length && $('#global-cart-rti .bxslider')[0]) {
            globalCartElement[0].addEventListener("mouseenter", function (event) {
                $('#global-cart-rti .bxslider')[0].slick.refresh();
            }, false);
        }
    });
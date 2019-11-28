define([
    'modules/backbone-mozu',
    'modules/jquery-mozu',
    'underscore',
    "hyprlivecontext",
    "modules/get-partial-view",
    "bxslider"
], function(Backbone, $, _, HyprLiveContext, getPartialView, bxslider) {
    var items = [];
    var isLoadMore = true;
    var startIndex = 0;
    var pageSize = HyprLiveContext.locals.themeSettings.productCarouselSize;
    var totalSize;
    var currentSlide = 0;
     if($('body').width()>=768 && $('body').width()<992){
        pageSize =6;
    }
    var slider = $('#product-carousel-list').bxSlider({
        minSlides: pageSize,
        maxSlides: pageSize,
        moveSlides: 1,
        slideWidth: 96,
        pager: false,
        nextText: '<i class="fa fa-angle-right" aria-hidden="true"></i>',
        prevText: '<i class="fa fa-angle-left" aria-hidden="true"></i>',
        slideMargin: 20,
        infiniteLoop: false,
        speed: 0,
        hideControlOnEnd: true,
        onSlideNext: function($slideElement, oldIndex, newIndex) {
            currentSlide = newIndex;
            CarouselListView.loadMoreProducts();
        }
    });

    var CarouselListItemView = Backbone.MozuView.extend({
        tagName: 'div',
        className: 'mz-productlist-item',
        templateName: 'modules/product/carousel-scroll',
        initialize: function() {
            var self = this;
            self.listenTo(self.model, 'change', self.render);
        },
        render: function() {
            Backbone.MozuView.prototype.render.apply(this);
            return this;
        }
    });

    var Model = Backbone.MozuModel.extend();

    var CarouselListView = {
        addProduct: function(prod) {
            var view = new CarouselListItemView({ model: new Model(prod) });
            var renderedView = view.render().el;
            $('#product-carousel-list').append(renderedView);
        },
        findActiveProduct: function() {
            var productCode = "/p/" + $("#carousel-container").data("product-id");
            for (var i = 0; i < $("#carousel-container #product-carousel-list div a").length; i++) {
                var currentElmnt = $("#carousel-container #product-carousel-list div a:eq(" + i + ")");
                if (currentElmnt.attr("href") === productCode) {
                    currentElmnt.parent("div").addClass("active");
                    break;
                }
            }
        },
        loadMoreProducts: function() {
            var me = this;
            if (isLoadMore) {
                isLoadMore = false;
                $("#product-loading").show();
                var url = $("#carousel-container").data("category-url");
                if ($('.mz-breadcrumbs.fromcookie').length) {
                    url = $('.mz-breadcrumbs a.mz-breadcrumb-link').last().attr('href');
                }
                getPartialView(url + '?pageSize=' + 5 * pageSize + '&startIndex=' + startIndex, 'category-interior-json').then(function(response) {
                    var products = JSON.parse(response.body);
                    totalSize = products.totalCount;
                    if (totalSize > pageSize) {
                        $("#carousel-container").data("list-count", totalSize).removeClass("disable-icons");
                    } else {
                        $("#carousel-container").data("list-count", totalSize).addClass("disable-icons");
                    }
                    items = items.concat(products.items);
                    if (items.length >= totalSize) {
                        isLoadMore = false;
                    } else {
                        isLoadMore = true;
                        startIndex += 5 * pageSize;
                    }
                    try {
                        slider.destroySlider();
                    } catch (e) {}
                    _.each(products.items, function(product) {
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
                        product.addFlag = addFlag;
                    });
                    products.items = _.filter(products.items, function(obj){
                        return obj.addFlag===true;
                    });
                    _.each(products.items, me.addProduct.bind(me));
                    me.findActiveProduct();
                    $("#product-loading").hide();
                    slider.reloadSlider();
                    slider.goToSlide(currentSlide);
                }, function(error) {
                    $("#product-loading").hide();
                    isLoadMore = true;
                });
            }
        }
    };
    if ($("#carousel-container:visible").length) {
        CarouselListView.loadMoreProducts();
    }
    var isIE = /*@cc_on!@*/false || !!document.documentMode;
    if (isIE) {
        $("#email-notification1").show();
    }
});
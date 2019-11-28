define([
        'modules/jquery-mozu',
        "modules/backbone-mozu",
        "modules/api",
        "slick",
        "underscore",
        "hyprlivecontext"
    ],
    function($, Backbone, Api, slickSlider, _, HyprLiveContext) {

        var Model = Backbone.MozuModel.extend();

        var ccListView = Backbone.MozuView.extend({
            templateName: 'Widgets/misc/category-carousel-listing',
            initialize: function() {
                var self = this;
                self.listenTo(self.model, 'change', self.render);
            },
            render: function(parentEl) {
                Backbone.MozuView.prototype.render.apply(this);
                parentEl.find('.cc-loading').hide();
                var isInfinite = parentEl.data('infinite')==='True' ? true : false;
                var isAutoplay = parentEl.data('autoplay')==='True' ? true : false;
                enableSlider(parentEl.find('.slick-cont'), isInfinite, isAutoplay);
            }
        });

        $('.category-container').each(function() {
            var self = $(this);
            var pageSize = 10;
            if (self.data('category') && self.data('category') !== '') {
                self.find('.cc-loading').show();
                var currentCategoryId = self.data('category');
                if (self.data('totalcount') && self.data('totalcount') !== '' && self.data('totalcount') !== '0') {
                    pageSize = self.data('totalcount');
                }
                var filter = 'CategoryId ';
                filter += (self.data('child') && self.data('child') !== '') ? 'req ' : 'eq ';
                filter += currentCategoryId;
                (function(parentEl) {
                    Api.get("search", {
                        'filter': filter,
                        'pageSize': pageSize,
                        'includeFacets': false,
                        'pageWithUrl': false,
                        'sortWithUrl': false,
                        'startIndex': 0,
                        'query': ''
                    }).then(function(response) {
                        if (response.data.items.length) {
                            for (var i=0;i<response.data.items.length;i++) {
                                if (response.data.items[i].productType === 'Family Product') {
                                    response.data.items[i].hasPriceRange = true;
                                }
                                var addFlag = true;
                                var product = response.data.items[i];
                                var themeSettings = HyprLiveContext.locals.themeSettings;
                                var hideProductPropertyEnabled = themeSettings.hideProductPropertyEnabled;
                                var hideProductProperty = themeSettings.hideProductProperty;
                                if (hideProductProperty && hideProductPropertyEnabled) {
                                    var property = _.findWhere(product.properties, {'attributeFQN': HyprLiveContext.locals.themeSettings.hideProductProperty});
                                    if (property && property.values && property.values.length && property.values[0].value === false) {
                                        addFlag = false;
                                    }
                                }
                                response.data.items[i].addFlag = addFlag;
                            }
                            response.data.items = _.filter(response.data.items, function(obj){
                                return obj.addFlag===true;
                            });
                            var ccView = new ccListView({
                                el: parentEl.find('.slick-cont'),
                                model: new Model({ items: response.data.items })
                            });
                            ccView.render(parentEl);
                        } else {
                            parentEl.hide();
                        }
                    });
                })(self);
            }
        });
        function enableSlider(parentEl, isInfinite, isAutoplay) {
            parentEl.slick({
                infinite: isInfinite,
                slidesToShow: 4,
                prevArrow: '<i class="fa fa-angle-left" aria-hidden="true"></i>',
                nextArrow: '<i class="fa fa-angle-right" aria-hidden="true"></i>',
                autoplay: isAutoplay,
                autoplaySpeed: 5000,
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
        }
    });
({
    paths: {
        jquery: "empty:",
        sdk: "empty:",
        hyprlive: "empty:",
        hyprlivecontext: "empty:",
        underscore: "vendor/underscore/underscore",
        backbone: "vendor/backbone/backbone",
        bootstrap: "vendor/bootstrap/js/bootstrap.min",
        bxslider: "vendor/jquery-bxslider/jquery.bxslider.min",
        blockui: "vendor/jquery.blockUI/jquery.blockUI.min",
        elevatezoom: "vendor/jquery-elevatezoom/jquery.elevatezoom.min",
        async: "vendor/async",
        doubletaptogoipad: "vendor/jquery-doubleTapToGo/jquery.doubleTapToGoIpad.min",
        "session-management": "vendor/sessionManagement/sessionManagement",
        slick: "vendor/slick/slick.min",
        moment: "vendor/moment/moment-min",
        validate: "vendor/livechat/jquery.validate.min",
        owl: "vendor/jquery/owl.carousel.min"
    },
    dir: "compiled/scripts/",
    locale: "en-us",
    optimize: "uglify2",
    keepBuildDir: false,
    optimizeCss: "none",
    removeCombined: true,
    skipPragmas: true,
    modules: [{
        name: "modules/common",
        include: [
            'modules/api',
            'modules/backbone-mozu',
            'modules/cart-monitor',
            'modules/contextify',
            'modules/jquery-mozu', 
            'modules/login-links',
            'modules/livechat',
            'modules/models-address', 
            'modules/models-customer',
            'modules/models-documents',
            'modules/models-faceting',
            'modules/models-messages',
            'modules/models-product',
            'modules/moment-tz',
            'modules/scroll-nav',
            'modules/search-autocomplete',
            'modules/views-messages',
            'modules/views-paging',
            'modules/views-productlists',
            'modules/color-swatches',
            'modules/common-functions',
            'modules/on-image-load-error',
            'vendor/jquery/owl.carousel.min'
        ],
        exclude: ['jquery'],
    },
    {
        name: "pages/cart",
        exclude: ["modules/common"]
    },
    {
        name: "pages/category",
        include: [
            'modules/views-collections',
            'modules/quickview'
        ],
        exclude: ["modules/common"]
    },
    {
        name: "pages/checkout",
        exclude: ["modules/common"]
    },
    {
        name: "pages/associate-login",
        exclude: ["modules/common"]
    },
    {
        name: "pages/multi-ship-checkout",
        exclude: ["modules/common"]
    },
    {
        name: "pages/error",
        exclude: ["modules/common"]
    },
    {
        name: "pages/location",
        exclude: ["modules/common"]
    },
    {
        name: "pages/myaccount",
        exclude: ["modules/common"]
    },
    {
        name: "pages/product",
        include: [
            'modules/product/product-carousel',
            'modules/product/recently-viewed-products'
        ],
        exclude: ["modules/common"]
    },
    {
        name: "pages/family",
        exclude: ["modules/common"]
    },
    {
        name: 'pages/search',
        include: [
            'modules/views-collections',
            'modules/quickview'
        ],
        exclude: ["modules/common"]
    }
    ]
});
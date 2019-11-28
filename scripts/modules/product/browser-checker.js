define([
    'modules/jquery-mozu'
], function($) {
        var messageChecker = setInterval(function() {
            var isIE = /*@cc_on!@*/false || !!document.documentMode;
            if (!isIE && $("#product-detail div.col-xs-12.email-popup").css('display') === 'none') {
                $("#product-detail div.col-xs-12.email-popup").show();
                console.log("aaaa");
            }
        }, 50);

        setTimeout(function() {
            clearInterval(messageChecker);
        }, 10000);
});
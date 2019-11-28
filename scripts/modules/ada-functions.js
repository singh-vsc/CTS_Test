define([
    'modules/jquery-mozu'
], function ($) {
    var _o = {};
    _o.swatchFocus = function () {
        $("li.color-options input").focusin(function(e) {
            $(this).parent().css({"outline":"thin dotted", "outline-offset":"2px"});
        }).focusout(function(){
             $(this).parent().css("outline","none");
        });        
    };
    if( $('body').width() > 991) {
        $("li.mz-sitenav-item").focusin(function(){
            $(this).find(".mz-sitenav-sub-container").css('display','block');
            $('.mz-utilitynav-link-cart').next().css('display','none');
        });
        $("li.mz-sitenav-item").find('[data-mz-role="sitemenu-item"]:last').focusout(function(){
            $("li.mz-sitenav-item").find(".mz-sitenav-sub-container").css('display','none');
        });

        $('.mz-utilitynav-link-cart').focusin(function(){
            $(this).next().css('display','block');
        });
    }

    return _o;
});
define(['modules/jquery-mozu', "modules/views-collections"], function($, CollectionViewFactory) {
    $(document).ready(function() {
        //check product has variation
        $(".mz-product-has-variation").each(function(){ 
            $(this).find(".cat-page-ul").removeClass("hide");
        });
        window.facetingViews = CollectionViewFactory.createFacetedCollectionViews({
            $body: $('[data-mz-search]'),
            template: "search-interior"
        });
    });
});
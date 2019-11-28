define([
    'shim!vendor/typeahead.js/typeahead.bundle[modules/jquery-mozu=jQuery]>jQuery',
    'hyprlive',
    'modules/api',
    'hyprlivecontext',
    'underscore'
], function($, Hypr, api, HyprLiveContext, _) {

    // bundled typeahead saves a lot of space but exports bloodhound to the root object, let's lose it
    var Bloodhound = window.Bloodhound.noConflict();

    // bloodhound wants to make its own AJAX requests, and since it's got such good caching and tokenizing algorithms, i'm happy to help it
    // so instead of using the SDK to place the request, we just use it to get the URL configs and the required API headers
    var qs = '%QUERY',
        eqs = encodeURIComponent(qs),
        useSearchAutocomplete = Hypr.getThemeSetting('useSearchAutocomplete'),
        suggestPriorSearchTerms = Hypr.getThemeSetting('suggestPriorSearchTerms'),
        getApiUrl = function(groups) {
            return api.getActionConfig('suggest', 'get', { query: qs, groups: groups }).url;
        },
        termsUrl = getApiUrl('terms'),
        productsUrl = getApiUrl('pages'),
        ajaxConfig = {
            headers: api.getRequestHeaders()
        },
        i,
        nonWordRe = /\W+/,
        makeSuggestionGroupFilter = function(name) {
            return function(res) {
                if ($(".tt-dropdown-menu > p").length === 0) {
                    $(".tt-dropdown-menu").prepend("<p>Products</p>");
                }
                var suggestionGroups = res.suggestionGroups,
                    thisGroup;
                for (i = suggestionGroups.length - 1; i >= 0; i--) {
                    if (suggestionGroups[i].name === name) {
                        thisGroup = suggestionGroups[i];
                        break;
                    }
                }
                for (var p=0;p<thisGroup.suggestions.length;p++) {
                    if (thisGroup.suggestions[p].suggestionType === 'Product') {
                        thisGroup.suggestions[p].suggestion.url = "/p/" + thisGroup.suggestions[p].suggestion.productCode + '?tq=' + $('#search-field').val().trim();
                        var addFlag = true;
                        var product = thisGroup.suggestions[p].suggestion;
                        var themeSettings = HyprLiveContext.locals.themeSettings;
                        var hideProductPropertyEnabled = themeSettings.hideProductPropertyEnabled;
                        var hideProductProperty = themeSettings.hideProductProperty;
                        if (hideProductProperty && hideProductPropertyEnabled) {
                            var property = _.findWhere(product.properties, {'attributeFQN': HyprLiveContext.locals.themeSettings.hideProductProperty});
                            if (property && property.values && property.values.length && property.values[0].value === false) {
                                addFlag = false;
                            }
                        }
                        thisGroup.suggestions[p].suggestion.addFlag = addFlag;
                    }
                }
                thisGroup.suggestions = _.filter(thisGroup.suggestions, function(obj){
                    return obj.suggestion.addFlag===true;
                });
                return thisGroup.suggestions;
            };
        },

        makeTemplateFn = function(name) {
            var tpt = Hypr.getTemplate(name);
            return function(obj) {
                return tpt.render(obj);
            };
        },

        // create bloodhound instances for each type of suggestion

        AutocompleteManager = {
            datasets: {
                pages: new Bloodhound({
                    datumTokenizer: function(datum) {
                        return datum.suggestion.term.split(nonWordRe);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    remote: {
                        url: productsUrl,
                        wildcard: eqs,
                        filter: makeSuggestionGroupFilter("Pages"),
                        rateLimitWait: 400,
                        ajax: ajaxConfig
                    }
                })
            }
        };

    $.each(AutocompleteManager.datasets, function(name, set) {
        set.initialize();
    });

    var dataSetConfigs = [{
        name: 'pages',
        displayKey: function(datum) {
            return datum.suggestion.productCode;
        },
        templates: {
            suggestion: makeTemplateFn('modules/search/autocomplete-page-result')
        },
        source: AutocompleteManager.datasets.pages.ttAdapter()
    }];

    if (useSearchAutocomplete && suggestPriorSearchTerms) {
        AutocompleteManager.datasets.terms = new Bloodhound({
            datumTokenizer: function(datum) {
                return datum.suggestion.term.split(nonWordRe);
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: {
                url: termsUrl,
                wildcard: eqs,
                filter: makeSuggestionGroupFilter("Terms"),
                rateLimitWait: 100,
                ajax: ajaxConfig
            }
        });
        AutocompleteManager.datasets.terms.initialize();
        dataSetConfigs.push({
            name: 'terms',
            displayKey: function(datum) {
                return datum.suggestion.term;
            },
            source: AutocompleteManager.datasets.terms.ttAdapter()
        });
    }

    $(document).ready(function() {
        var $field = AutocompleteManager.$typeaheadField = $('[data-mz-role="searchquery"]');
        AutocompleteManager.typeaheadInstance = $field.typeahead({
            minLength: 1
        }, dataSetConfigs).data('ttTypeahead');
        // user hits enter key while menu item is selected;
        $field.on('typeahead:selected', function(e, data, set) {
            $.cookie('lastCategory', null, { expires: -1, path: '/' });
            if (data.suggestion.productCode) window.location = "/p/" + data.suggestion.productCode + '?tq=' + $('#search-field').val().trim();
        });
        
        $('#searchbox').on('submit', function(e) {
            var searchVal = $('#search-field').val().trim();
            if (searchVal === "") {
                window.alert(Hypr.getLabel('blankSearchResult'));
                e.preventDefault();
            } else if (searchVal.length < 3) {
                window.alert("Your keyword or item number must be at least 3 characters long");
                e.preventDefault();
            }
            else {
                $.cookie('lastCategory', null, { expires: -1, path: '/' });
            }
        });
    });

    return AutocompleteManager;
});
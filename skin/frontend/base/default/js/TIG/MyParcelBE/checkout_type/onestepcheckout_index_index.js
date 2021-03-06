if (typeof window.mypa == 'undefined') {
    window.mypa = {};
    window.mypa.observer = {};
    window.mypa.fn = {};
}
var timeout, xhr, latestData;
var fnCheckout = {
    'saveShippingMethod': function () {

        var frm = mypajQuery('form');
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            window.stop();
            if (xhr) {
                xhr.abort();
            }
            xhr = mypajQuery.ajax({
                type: 'post',
                url: BASE_URL + 'myparcelbe/checkout/save_shipping_method/',
                data: frm.serialize()
            });
            window.setTimeout(checkPendingRequest, 200);
        }, 500);
    },
    'hideLoader': function () {},
    'paymentRefresh': function () {
        setTimeout(function () {
            paymentrefresh(BASE_URL + 'onestepcheckout/ajax/set_methods_separate');
        }, 500);
    }
};
window.mypa.fn.fnCheckout = fnCheckout;

function checkPendingRequest() {
    if (mypajQuery.active > 0) {
        window.setTimeout(checkPendingRequest, 200);
    } else {
        if (mypajQuery("input[name='shipping_method']:checked").length) {
            mypajQuery("input[name='shipping_method']:checked")[0].click();
        }
    }
};

function myparcelSaveBilling() {
    setTimeout(function() {
            var currentData = getMyParcelLatestData();

            if (latestData == currentData) {
                myparcelSaveBilling();
            } else {
                get_save_billing_function(BASE_URL + 'onestepcheckout/ajax/save_billing', BASE_URL + 'onestepcheckout/ajax/set_methods_separate', true, true)();
                latestData = currentData;
            }
    }, 300);
}

function getMyParcelLatestData() {
    var data = mypajQuery("input[id='billing:street1']").val();
    if(mypajQuery("input[id='billing:street2']").length && mypajQuery("input[id='billing:street2']").val().length){
        data += mypajQuery("input[id='billing:street2']").val();
    }
    if(mypajQuery("input[id='shipping:street1']").length && mypajQuery("input[id='shipping:street1']").val().length){
        data += mypajQuery("input[id='shipping:street1']").val();
    }
    if(mypajQuery("input[id='shipping:street2']").length && mypajQuery("input[id='shipping:street2']").val().length){
        data += mypajQuery("input[id='shipping:street2']").val();
    }
    if(mypajQuery("input[id='billing:housenumber']").length && mypajQuery("input[id='billing:housenumber']").val().length){
        data += mypajQuery("input[id='billing:housenumber']").val();
    }
    if(mypajQuery("input[id='shipping:housenumber']").length && mypajQuery("input[id='shipping:housenumber']").val().length){
        data += mypajQuery("input[id='shipping:housenumber']").val();
    }
    if(mypajQuery("input[id='billing:city']").length && mypajQuery("input[id='billing:city']").val().length){
        data += mypajQuery("input[id='billing:housenumber']").val();
    }
    if(mypajQuery("input[id='shipping:city']").length && mypajQuery("input[id='shipping:city']").val().length) {
        data += mypajQuery("input[id='shipping:city']").val();
    }
    if(mypajQuery('billing:country_id').length && mypajQuery('billing:country_id').getValue()){
        data += mypajQuery('billing:country_id').getValue();
    }
    if(mypajQuery('billing:country_id').length && mypajQuery('billing:country_id').getValue()){
        data += mypajQuery('billing:country_id').getValue();
    }
    if(mypajQuery('shipping:country_id').length && mypajQuery('shipping:country_id').getValue()){
        data += mypajQuery$('shipping:country_id').getValue();
    }

    return data;
}

setTimeout(function () {

    mypajQuery(".onestepcheckout-summary").mouseup(function(event) {
        if(event.target.classList.contains( 'subsqty' ) || event.target.classList.contains( 'addsqty' )) {
            setTimeout(function () {
                get_save_billing_function(BASE_URL + 'onestepcheckout/ajax/save_billing', BASE_URL + 'onestepcheckout/ajax/set_methods_separate', true, true)();
            }, 500);
        }
    });

    latestData = getMyParcelLatestData();

    mypajQuery([
        "input[id='billing:street1']",
        "input[id='billing:street2']",
        "input[id='billing:postcode_housenumber']",
        "input[id='billing:postcode']",
        "input[id='billing:city']",
        "input[id='shipping:street1']",
        "input[id='shipping:street2']",
        "input[id='shipping:postcode_housenumber']",
        "input[id='shipping:postcode']",
        "input[id='shipping:city']",
        ".validate-select"
    ].join()).on('change', function () {
        myparcelSaveBilling();
    });
}, 1000);
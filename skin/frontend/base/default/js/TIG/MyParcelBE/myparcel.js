MyParcel = {
    /*
     * Init
     *
     * Initialize the MyParcel checkout.
     *
     */
    data: {},
    currentLocation: {},
    magentoRequest: null,

    DELIVERY_NORMAL: 'standard',
    DELIVERY_SIGNED: 0,

    setMagentoDataAndInit: function () {
        var ajaxOptions = {
            url: BASE_URL + 'myparcelbe/checkout/info/?ran=' + Math.random(),
            success: function (response) {

                data = response.data;

                price = [];

                price['default'] = '&#8364; ' + data.general['base_price'].toFixed(2).replace(".", ",");

                if (data.pickup['fee'] != 0) {
                    price['pickup'] = '&#8364; ' + data.pickup['fee'].toFixed(2).replace(".", ",");
                }

                if (data.delivery['signature_active'] == false) {
                    price['signed'] = 'disabled';
                } else if (data.delivery['signature_fee'] !== 0) {
                    price['signed'] = '+ &#8364; ' + data.delivery['signature_fee'].toFixed(2).replace(".", ",");
                }

                /**
                 * Exclude delivery types
                 */
                excludeDeliveryTypes = [];

                if (data.pickup['active'] == false) {
                    excludeDeliveryTypes.push('4');
                }

                var address = data['address'];

                if (null === address['full_street'] || address['postal_code'] === '' || address['number'] === ''){
                    MyParcel.showMessage(
                        '<h3>Adres is nog niet volledig</h3>'
                    );
                    return;
                }

                if (address['country'] === 'BE') {

                    if (address['street']) {
                        myParcelConfig = {
                            address: {
                                cc: address['country'],
                                street: address['street'],
                                number: address['number'],
                                postalCode: address['postal_code'].replace(/ /g, ""),
                                city: address['city']
                            },
                            txtWeekDays: [
                                'Zondag',
                                'Maandag',
                                'Dinsdag',
                                'Woensdag',
                                'Donderdag',
                                'Vrijdag',
                                'Zaterdag'
                            ],
                            translateENtoNL: {
                                'monday': 'maandag',
                                'tuesday': 'dindsag',
                                'wednesday': 'woensdag',
                                'thursday': 'donderdag',
                                'friday': 'vrijdag',
                                'saturday': 'zaterdag',
                                'sunday': 'zondag'
                            },
                            config: {
                                "apiBaseUrl": "https://api.myparcel.nl/",
                                "carrier": "2",

                                "priceNormalDelivery": data.general['base_price'],
                                "priceSignature": data.delivery['signature_fee'],
                                "pricePickup": data.pickup['fee'],

                                "allowMondayDelivery": data.general['monday_delivery_active'],
                                "allowSignature": data.delivery['signature_active'],
                                "allowPickupPoints": data.pickup['active'],

                                "dropOffDays": data.general['dropoff_days'],
                                "saturdayCutoffTime": data.general['saturday_cutoff_time'],
                                "cutoffTime": data.general['cutoff_time'],
                                "deliverydaysWindow": data.general['deliverydays_window'],
                                "dropoffDelay":data.general['dropoff_delay']
                            },
                            textToTranslate: {
                                "deliveryTitel": data.checkoutText['delivery_title'],
                                "deliveryStandardTitel": data.checkoutText['standard_delivery_titel'],
                                "signatureTitel": data.checkoutText['signature_title'],
                                "saturdayDeliveryTitle": data.checkoutText['saturday_delivery_title'],
                                "pickupTitel": data.checkoutText['pickup_title'],

                                "allDataNotFound": data.checkoutText['all_data_not_found'],
                                "pickUpFrom": data.checkoutText['pick_up_from'],
                                "openingHours": data.checkoutText['opening_hours'],
                                "closed": data.checkoutText['closed'],
                                "postcode": data.checkoutText['postcode'],
                                "houseNumber": data.checkoutText['houseNumber'],
                                "city": data.checkoutText['city'],
                                "again": data.checkoutText['again'],
                                "wrongHouseNumberCity": data.checkoutText['wrong_house_number_city']
                            }
                        };

                        MyParcel.init(myParcelConfig);

                    }

                    /* check if address and address numver exist*/
                    var address = data['address'];
                    if (!address || !address['number']) {

                        MyParcel.showMessage(
                            '<h4>' + MyParcel.data.textToTranslate.allDataNotFound + '</h4>'
                        );
                        return;
                    }
                }
            }
        };

        if (null !== MyParcel.magentoRequest) {
            MyParcel.magentoRequest.abort();
        }
        MyParcel.magentoRequest = jQuery.ajax(ajaxOptions);
    },

    init: function(externalData)
    {
        this.data = externalData;
        if (mypajQuery('#s_method_myparcel_mailbox').length > 0) {
            return;
        }

        isMobile     = true;
        if(mypajQuery( window ).width() > 980 ) {
            isMobile = false;
        }

        /* Titels of the options*/
        if (MyParcel.data.textToTranslate.deliveryTitel){
            mypajQuery('#mypa-delivery-titel').html(MyParcel.data.textToTranslate.deliveryTitel);
        }
        if (MyParcel.data.textToTranslate.onlyRecipientTitel){
            mypajQuery('#mypa-only-recipient-titel').html(MyParcel.data.textToTranslate.onlyRecipientTitel);
        }
        if (MyParcel.data.textToTranslate.signatureTitel){
            mypajQuery('#mypa-signature-titel').html(MyParcel.data.textToTranslate.signatureTitel);
        }
        if (MyParcel.data.textToTranslate.pickupTitel){
            mypajQuery('#mypa-pickup-titel').html(MyParcel.data.textToTranslate.pickupTitel);
        }
        if (MyParcel.data.textToTranslate.pickupTitel){
            mypajQuery('.mypa-pickup-delivery-titel').html(MyParcel.data.textToTranslate.pickUpFrom +': 15:00');
        }

        /* Prices */
        mypajQuery('#mypa-normal-delivery').html(MyParcel.getPriceHtml(this.data.config.priceNormalDelivery));
        mypajQuery('#mypa-signature-price').html(MyParcel.getPriceHtml(this.data.config.priceSignature));
        mypajQuery('#mypa-pickup-price').html(MyParcel.getPriceHtml(this.data.config.pricePickup));

        /* Call delivery options */
        MyParcel.callDeliveryOptions();

        /* Engage defaults */
        MyParcel.hideDelivery();

        MyParcel.bind();
    },

    getPriceHtml: function(priceOfDeliveryOption){

        if (!priceOfDeliveryOption) {
            var price = "";
        }

        if (parseFloat(priceOfDeliveryOption) >= 0){
            var price = '+ &euro; ' + Number(priceOfDeliveryOption).toFixed(2).replace(".", ",");
        }

        if (parseFloat(priceOfDeliveryOption) < 0) {
            price = "<p class='colorGreen'>"+'- &euro; ' + Number(priceOfDeliveryOption).toFixed(2).replace(/-|\./g,function(match) {return (match==".")?",":""})+"</p>";
        }

        if (priceOfDeliveryOption && isNaN(parseFloat(priceOfDeliveryOption))){
            var price = priceOfDeliveryOption ;
        }

        return price;
    },

    setCurrentDeliveryOptions: function () {
        if (typeof MyParcel.storeDeliveryOptions === 'undefined') {
            console.error('setCurrentDeliveryOptions() MyParcel.storeDeliveryOptions === undefined');
            return;
        }

        var selectedDate 	= mypajQuery('#mypa-select-date').val();
        var selectDateKey 	= MyParcel.storeDeliveryOptions.data.delivery[selectedDate]['time'];

        mypajQuery.each(selectDateKey, function(key, value){

            if(value['price_comment'] == 'standard'){
                var standardTitel = MyParcel.data.textToTranslate.deliveryStandardTitel;
                MyParcel.getDeliveryTime(standardTitel,'standard', MyParcel.data.textToTranslate.deliveryStandardTitel, value['start'], value['end']);
            }

        });
    },
    getDeliveryTime: function (configDeliveryTitel, deliveryMoment, deliveryTitel, startTime, endTime) {
        // startTime = startTime.replace(/(.*)\D\d+/, '$1');
        // endTime = endTime.replace(/(.*)\D\d+/, '$1');

        mypajQuery('#mypa-'+deliveryMoment+'-titel').html(deliveryTitel);

        if (!configDeliveryTitel){
            mypajQuery('#mypa-'+deliveryMoment+'-titel').html(startTime + ' - ' + endTime);
        }

    },

    setCurrentLocation: function () {
        var locationId 			= mypajQuery('#mypa-pickup-location').val();
        this.currentLocation 	= this.getPickupByLocationId(MyParcel.storeDeliveryOptions.data.pickup, locationId);

    },
    /*
     * Bind
     *
     * Bind actions to selectors.
     *
     */

    bind: function ()
    {
        mypajQuery('#mypa-submit').on('click', function(e)
        {
            e.preventDefault();
            MyParcel.exportDeliveryOptionToWebshop();
        });

        /* show default delivery options and hide PostNL options */
        mypajQuery('#mypa-select-delivery').on('click', function(){
            MyParcel.setCurrentDeliveryOptions();
            MyParcel.showDelivery();
            MyParcel.hidePickUpLocations();
        });

        /* hide default delivery options and show PostNL options */
        mypajQuery('#mypa-pickup-delivery').on('click', function(){
            MyParcel.hideDelivery();
            MyParcel.showPickUpLocations();
        });

        /* Mobile specific triggers */
        if(isMobile){
            mypajQuery('#mypa-show-location-details').on('click', function(){
                MyParcel.setCurrentLocation();
                MyParcel.showLocationDetails();
                MyParcel.hideDelivery();
            });
        }

        /* Desktop specific triggers */
        else {
            mypajQuery('#mypa-show-location-details').on('click', function(){
                MyParcel.setCurrentLocation();
                MyParcel.showLocationDetails();
            });
        }

        mypajQuery('#mypa-location-details').on('click', function(){
            MyParcel.hideLocationDetails();
        });

        mypajQuery('#method-myparcel-normal').on('click', function(){
            MyParcel.defaultCheckCheckbox('method-myparcel-normal');
        });

        mypajQuery('#mypa-pickup-express').hide();  /* todo: move */


        mypajQuery('#mypa-pickup-delivery, #mypa-pickup-location').on('change', function(e){
            MyParcel.setCurrentLocation();
            MyParcel.toggleDeliveryOptions();
            MyParcel.mapExternalWebshopTriggers();
        });

        mypajQuery('#mypa-select-date').on('change', function(e){
            MyParcel.setCurrentDeliveryOptions();
            MyParcel.mapExternalWebshopTriggers();
        });

        /* External webshop triggers */
        mypajQuery('#mypa-load').on('click', function () {

            MyParcel.mapExternalWebshopTriggers()
        });
    },

    mapExternalWebshopTriggers: function () {
        MyParcel.DELIVERY_SIGNED = 0;
        MyParcel.removeStyleFromPrice();

        if (typeof MyParcel.data.deliveryOptions === 'undefined') {
            console.info('MyParcel.data.deliveryOptions not found');
            return;
        }

        /**
         * Normal delivery
         *
         */
        if (mypajQuery('#mypa-pickup-delivery').prop('checked') === false && mypajQuery('#method-myparcel-normal').prop('checked'))
        {
            MyParcel.addStyleToPrice('#mypa-normal-delivery');

            /**
             * Signature
             */
            if (mypajQuery('#mypa-signature-selector').prop('checked'))
            {
                mypajQuery('#s_method_myparcel_delivery_signature').click();
                MyParcel.DELIVERY_SIGNED = 1;
                MyParcel.addStyleToPrice('#mypa-signature-price');

            } else {
                mypajQuery('#s_method_myparcel_flatrate, #s_method_myparcel_tablerate').click();
            }

            MyParcel.addDeliveryToMagentoInput(MyParcel.DELIVERY_NORMAL);
            return;
        }

        /**
         * Pickup
         *
         */
        if (mypajQuery('#mypa-pickup-delivery').prop('checked') || mypajQuery('#mypa-pickup-selector').prop('checked'))
        {
            MyParcel.addStyleToPrice('#mypa-pickup-price');

            mypajQuery('#s_method_myparcel_pickup').click();
            MyParcel.addPickupToMagentoInput('retail');
        }
    },

    addPickupToMagentoInput: function (selectedPriceComment) {
        var locationId = mypajQuery('#mypa-pickup-location').val();
        var currentLocation = MyParcel.getPickupByLocationId(MyParcel.storeDeliveryOptions.data.pickup, locationId);

        var result = jQuery.extend({}, currentLocation);

        /* If retail; convert retailexpress to retail */
        if (selectedPriceComment === "retail") {
            result.price_comment = "retail";
        }

        mypajQuery('#mypa-input').val(JSON.stringify(result));
        if (typeof window.mypa != 'undefined') {
            window.mypa.fn.fnCheckout.saveShippingMethod();
        }
    },

    addStyleToPrice: function (chosenDelivery) {
        mypajQuery(chosenDelivery).addClass('mypa-bold-price');
    },

    removeStyleFromPrice: function (){
        mypajQuery('.mypa-delivery-option-table').find( "span" ).removeClass('mypa-bold-price');
    },

    addDeliveryToMagentoInput: function (deliveryMomentOfDay) {

        var deliveryDateId = mypajQuery('#mypa-select-date').val();

        var currentDeliveryData = MyParcel.triggerDefaultOptionDelivery(deliveryDateId, deliveryMomentOfDay);

        if (currentDeliveryData !== null) {
            currentDeliveryData.signed = MyParcel.DELIVERY_SIGNED;
            mypajQuery('#mypa-input').val(JSON.stringify(currentDeliveryData));
        }
        if (typeof window.mypa != 'undefined') {
            window.mypa.fn.fnCheckout.saveShippingMethod();
        }
    },

    triggerDefaultOptionDelivery: function (deliveryDateId, deliveryMomentOfDay) {
        var dateArray = MyParcel.data.deliveryOptions.data.delivery[deliveryDateId];
        var currentDeliveryData = null;

        mypajQuery.each(dateArray['time'], function(key, value) {
            if (value.price_comment === deliveryMomentOfDay) {
                currentDeliveryData = jQuery.extend({}, dateArray);
                currentDeliveryData['time'] = [value];
            }
        });

        if (currentDeliveryData === null) {
            mypajQuery('#mypa-only-recipient-selector').prop('disabled', false).prop('checked', false);
            mypajQuery('#method-myparcel-normal').prop('checked', true);
            MyParcel.mapExternalWebshopTriggers();
        }

        return currentDeliveryData;
    },

    /*
     * defaultCheckCheckbox
     *
     * Check the additional options that are required for certain delivery options
     *
     */
    defaultCheckCheckbox: function(selectedOption){
        if(selectedOption === 'mypa-only-recipient'){
            mypajQuery('#mypa-only-recipient-selector').prop('checked', true).prop({disabled: true});
            mypajQuery('#mypa-only-recipient-price').html('Inclusief');
        } else {
            mypajQuery('#mypa-only-recipient-selector').prop('checked', false).removeAttr("disabled");
            mypajQuery('#mypa-only-recipient-price').html(MyParcel.getPriceHtml(this.data.config.priceOnlyRecipient));
        }
    },

    /*
     * toggleDeliveryOptions
     *
     * Shows and hides the display options that are valid for the recipient only and signature required pre-selectors
     *
     */

    toggleDeliveryOptions: function()
    {
        var isPickup	= mypajQuery('#mypa-pickup-delivery').is(':checked');
        mypajQuery('#mypa-pickup-selector').prop('checked', true);

        if(isPickup && this.currentLocation.price_comment === "retailexpress"){
            mypajQuery('#mypa-pickup-express-price').html(MyParcel.getPriceHtml(this.data.config.pricePickupExpress));
            mypajQuery('#mypa-pickup-express').show();

        } else{
            mypajQuery('#mypa-pickup-express-selector').attr("checked", false);
            mypajQuery('#mypa-pickup-express').hide();

        }
    },


    /*
     * exportDeliverOptionToWebshop
     *
     * Exports the selected deliveryoption to the webshop.
     *
     */

    exportDeliveryOptionToWebshop: function()
    {
        var deliveryOption = "";
        var selected       = mypajQuery("#mypa-delivery-option-form").find("input[type='radio']:checked");
        if (selected.length > 0) {
            deliveryOption = selected.val();
        }
    },


    /*
     * hideMessage
     *
     * Hides pop-up message.
     *
     */

    hideMessage: function()
    {
        mypajQuery('.mypa-message-model').hide();
        mypajQuery('#mypa-delivery-option-form').show();
    },

    /*
     * hideMessage
     *
     * Hides pop-up essage.
     *
     */

    showMessage: function(message)
    {
        MyParcel.hideSpinner();
        mypajQuery('.mypa-message-model').show();
        mypajQuery('#mypa-message').html(message).show();
        mypajQuery('#mypa-delivery-option-form').hide();
        MyParcel.hideSpinner();

    },

    /*
     * hideDelivery
     *
     * Hides interface part for delivery.
     *
     */

    hideDelivery: function()
    {
        mypajQuery('#mypa-delivery-date-select, #mypa-delivery-date-text').hide();
        MyParcel.hideNormalDelivery();
        MyParcel.hideSignature();
        MyParcel.hideOnlyRecipient();

    },

    /*
     * showDelivery
     *
     * Shows interface part for delivery.
     *
     */

    showDelivery: function()
    {
        MyParcel.showNormalDelivery();
        MyParcel.showDeliveryDates();

        MyParcel.hideSignature();
        if(this.data.config.allowSignature){
            MyParcel.showSignature();
        }

        MyParcel.hideOnlyRecipient();
        if(this.data.config.allowOnlyRecipient){
            MyParcel.showOnlyRecipient();
        }
    },

    /*
     * showSpinner
     *
     * Shows the MyParcel spinner.
     *
     */

    showSpinner: function()
    {
        mypajQuery('.mypa-message-model').hide();
        mypajQuery('#mypa-spinner-model').show();
    },


    /*
     * hideSpinner
     *
     * Hides the MyParcel spinner.
     *
     */

    hideSpinner: function()
    {
        mypajQuery('#mypa-spinner-model').hide();
    },

    showNormalDelivery: function()
    {
        mypajQuery('#mypa-pre-selectors-' +      this.data.address.cc.toLowerCase()).show();
        mypajQuery('#mypa-delivery-selectors-' + this.data.address.cc.toLowerCase()).show();
        mypajQuery('#mypa-delivery, #mypa-normal-delivery, #mypa-delivery-date-select').show();
        mypajQuery('#mypa-delivery').parent().parent().show();
    },

    hideNormalDelivery: function()
    {
        mypajQuery('#mypa-delivery-date-select, #mypa-pre-selectors-nl, #mypa-delivery, #mypa-normal-delivery').hide();
        mypajQuery('#mypa-delivery').parent().parent().hide();


    },

    showSignature: function()
    {
        mypajQuery('.mypa-extra-delivery-option-signature, #mypa-signature-price').show();
    },

    hideSignature: function()
    {
        mypajQuery('.mypa-extra-delivery-option-signature, #mypa-signature-price').hide();
    },

    showOnlyRecipient: function()
    {
        mypajQuery('#mypa-only-recipient, #mypa-only-recipient-price').parent().show();
    },

    hideOnlyRecipient: function()
    {
        mypajQuery('#mypa-only-recipient, #mypa-only-recipient-price').parent().hide();
    },

    /*
     * dateToString
     *
     * Convert api date string format to human readable string format
     *
     */

    dateToString: function(apiDate)
    {
        var deliveryDate 	= apiDate;
        var dateArr      	= deliveryDate.split('-');
        var dateObj      	= new Date(dateArr[0],dateArr[1]-1,dateArr[2]);
        var day				= ("0" + (dateObj.getDate())).slice(-2);
        var month        	= ("0" + (dateObj.getMonth() + 1)).slice(-2);

        return this.data.txtWeekDays[dateObj.getDay()] + " " + day + "-" + month + "-" + dateObj.getFullYear();
    },

    /*
     * showDeliveryDates
     *
     * Show possible delivery dates.
     *
     */

    showDeliveryDates: function()
    {
        var html = "";
        var deliveryWindow = parseInt(MyParcel.data.config.deliverydaysWindow);

        mypajQuery.each(MyParcel.data.deliveryOptions.data.delivery, function(key, value){
            html += '<option value="' + key + '">' + MyParcel.dateToString(value.date) + ' </option>\n';
        });

        /* Hide the day selector when the value of the deliverydaysWindow is 0*/
        if (deliveryWindow === 0){
            mypajQuery('#mypa-delivery-date-select, #mypa-select-date, #mypa-delivery-date-text').hide();
        }

        /* When deliverydaysWindow is 1, hide the day selector and show a div to show the date */
        if (deliveryWindow === 1){
            mypajQuery('#mypa-select-date').hide();
            mypajQuery('#mypa-delivery-date-text').show();
        }

        /* When deliverydaysWindow > 1, show the day selector */
        if (deliveryWindow > 1){
            mypajQuery('#mypa-select-date').show();
        }

        mypajQuery('#mypa-select-date, #mypa-date').html(html);
    },

    hideDeliveryDates: function()
    {
        mypajQuery('#mypa-delivery-date-text').hide();
    },

    /*
     * clearPickupLocations
     *
     * Clear pickup locations and show a non-value option.
     *
     */

    clearPickUpLocations: function()
    {
        var html = '<option value="">---</option>';
        mypajQuery('#mypa-pickup-location').html(html);
    },


    /*
     * hidePickupLocations
     *
     * Hide the pickup location option.
     *
     */

    hidePickUpLocations: function()
    {
        if(!MyParcel.data.config.allowPickupPoints) {
            mypajQuery('#mypa-pickup-location-selector').hide();
        }

        mypajQuery('#mypa-pickup-options, #mypa-pickup, #mypa-pickup-express').hide();

    },


    /*
     * showPickupLocations
     *
     * Shows possible pickup locations, from closest to furdest.
     *
     */

    showPickUpLocations: function()
    {
        if (MyParcel.data.config.allowPickupPoints && typeof MyParcel.data.deliveryOptions !== 'undefined') {

            var html = "";
            mypajQuery.each(MyParcel.data.deliveryOptions.data.pickup, function (key, value) {
                var distance = parseFloat(Math.round(value.distance) / 1000).toFixed(1);
                html += '<option value="' + value.location_code + '">' + value.location + ', ' + value.street + ' ' + value.number + ", " + value.city + " (" + distance + " km) </option>\n";
            });
            mypajQuery('#mypa-pickup-location').html(html).prop("checked", true);
            mypajQuery('#mypa-pickup-location-selector, #mypa-pickup-options, #mypa-pickup').show();
        }
    },

    /*
     * hideLocationDetails
     *
     * Hide the detailed information pop-up for selected location.
     *
     */

    hideLocationDetails: function()
    {
        mypajQuery('#mypa-delivery-option-form').show();
        mypajQuery('#mypa-location-details').hide();
    },

    /*
     * showLocationDetails
     *
     * Shows the detailed information pop-up for the selected pick-up location.
     */

    showLocationDetails: function()
    {
        var html       		= "";
        var locationId 		= mypajQuery('#mypa-pickup-location').val();

        var currentLocation = MyParcel.getPickupByLocationId(MyParcel.storeDeliveryOptions.data.pickup, locationId);
        var startTime = currentLocation.start_time;

        /* Strip seconds if present */
        if(startTime.length > 5){
            startTime = startTime.slice(0,-3);
        }

        html += '<svg  class="svg-inline--fa mypa-fa-times fa-w-12" aria-hidden="true" data-prefix="fas" data-icon="times" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" data-fa-i2svg=""><path fill="currentColor" d="M323.1 441l53.9-53.9c9.4-9.4 9.4-24.5 0-33.9L279.8 256l97.2-97.2c9.4-9.4 9.4-24.5 0-33.9L323.1 71c-9.4-9.4-24.5-9.4-33.9 0L192 168.2 94.8 71c-9.4-9.4-24.5-9.4-33.9 0L7 124.9c-9.4 9.4-9.4 24.5 0 33.9l97.2 97.2L7 353.2c-9.4 9.4-9.4 24.5 0 33.9L60.9 441c9.4 9.4 24.5 9.4 33.9 0l97.2-97.2 97.2 97.2c9.3 9.3 24.5 9.3 33.9 0z"></path></svg>'
        html += '<span class="mypa-pickup-location-details-location"><h3>' + currentLocation.location  + '</h3></span>';
        html += '<svg  class="mypa-postnl-logo "version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"> <image id="image0" xlink:href="data:image/png;base64,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" /></svg>';
        html += '<span class="mypa-pickup-location-details-street">' + currentLocation.street + '&nbsp;' + this.currentLocation.number + '</span>';
        html += '<span class="mypa-pickup-location-details-city">' + currentLocation.postal_code + '&nbsp;' + currentLocation.city + '</span>';

        if(currentLocation.phone_number){
            html += '<span class="mypa-pickup-location-details-phone">' + currentLocation.phone_number  + '</span>'
        }
        html += '<span class="mypa-pickup-location-details-time">' + MyParcel.data.textToTranslate.pickUpFrom + ':&nbsp;' + startTime + '</span>'
        html += '<h3>' + MyParcel.data.textToTranslate.openingHours + '</h3>';

        mypajQuery.each(
            currentLocation.opening_hours, function(weekday, value){
                console.log(MyParcel.data.translateENtoNL[weekday]);
                html += '<span class="mypa-pickup-location-details-day">' + MyParcel.data.translateENtoNL[weekday] + "</span> ";

                if(value[0] === undefined ){
                    html +=  '<span class="mypa-time">' + MyParcel.data.textToTranslate.closed + '</span>';
                }

                mypajQuery.each(value, function(key2, times){
                    html +=  '<span class="mypa-time">' + times + "</span>";
                });
                html += "<br>";
            });
        mypajQuery('#mypa-delivery-option-form').hide();
        mypajQuery('#mypa-location-details').html(html).show();
    },

    /*
     * getPickupByLocationId
     *
     * Find the location by id and return the object.
     *
     */
    getPickupByLocationId: function (obj, locationId) {
        var object;

        mypajQuery.each(obj, function (key, info) {
            if (info.location_code === locationId) {
                object = info;
                return false;
            };
        });

        return object;
    },

    /*
     * retryPostalcodeHouseNumber
     *
     * After detecting an unrecognised postcal code / house number combination the user can try again.
     * This function copies the newly entered data back into the webshop forms.
     *
     */

    retryPostalcodeHouseNumber: function()
    {
        this.data.address.postalCode = mypajQuery('#mypa-error-postcode').val();
        this.data.address.number = mypajQuery('#mypa-error-number').val();
        MyParcel.callDeliveryOptions();
        mypajQuery('#mypa-select-delivery').click();
    },

    /*
     * showFallBackDelivery
     *
     * If the API call fails and we have no data about delivery or pick up options
     * show the customer an "As soon as possible" option.
     */

    showFallBackDelivery: function()
    {
        MyParcel.hideSpinner();
        MyParcel.hideDelivery();
        mypajQuery('#mypa-select-date, #method-myparcel-normal').hide();
        mypajQuery('.mypa-is-pickup-element').hide();
        mypajQuery('#mypa-select-delivery-titel').html('Zo snel mogelijk bezorgen');
    },


    /*
     * showRetru
     *
     * If a customer enters an unrecognised postal code housenumber combination show a
     * pop-up so they can try again.
     */

    showRetry: function()
    {
        MyParcel.showMessage(
            '<h4>' + MyParcel.data.textToTranslate.wrongHouseNumberCity + '</h4>' +
            '<div class="mypa-full-width mypa-error">'+
            '<label for="mypa-error-postcode">' + MyParcel.data.textToTranslate.postcode + '</label>' +
            '<input type="text" name="mypa-error-postcode" id="mypa-error-postcode" value="'+ MyParcel.data.address.postalCode +'">' +
            '</div><div class="mypa-full-width mypa-error">' +
            '<label for="mypa-error-number">' + MyParcel.data.textToTranslate.houseNumber + '</label>' +
            '<input type="text" name="mypa-error-number" id="mypa-error-number" value="'+ MyParcel.data.address.number +'">' +
            '<br><div id="mypa-error-try-again" class="button btn"><span>' + MyParcel.data.textToTranslate.again + '</span></div>' +
            '</div>'
        );

        /* remove trigger that closes message */
        mypajQuery('#mypa-message').off('click');

        /* bind trigger to new button */
        mypajQuery('#mypa-error-try-again').on('click', function(){
            MyParcel.retryPostalcodeHouseNumber();
        });
    },


    /*
     * callDeliveryOptions
     *
     * Calls the MyParcel API to retrieve the pickup and delivery options for given house number and
     * Postal Code.
     *
     */

    callDeliveryOptions: function()
    {
        MyParcel.showSpinner();
        MyParcel.clearPickUpLocations();

        var cc 				= this.data.address.cc;
        var postalCode 		= this.data.address.postalCode;
        var number 			= this.data.address.number;
        var city 			= this.data.address.city;

        if (!number || !postalCode){
            MyParcel.showMessage(
                '<h3>Adres gegevens zijn niet ingevuld</h3>'
            );
            return;
        }
        if (cc === "BE") {
            var numberExtra 	= this.data.address.numberExtra;
            var street 			= this.data.address.street;
        }

        if(numberExtra){
            number = number + numberExtra;
        }

        /* Check if the deliverydaysWindow == 0 and hide the select input*/
        this.deliveryDaysWindow = this.data.config.deliverydaysWindow;

        if(this.deliveryDaysWindow <= 0){
            this.deliveryDaysWindow = 1;
        }

        /* Make the api request */
        mypajQuery.get(this.data.config.apiBaseUrl + "delivery_options",
            {
                cc           			:this.data.address.cc,
                postal_code  			:postalCode,
                number       			:number,
                city					:city,
                carrier      			:this.data.config.carrier,
                dropoff_days			:this.data.config.dropOffDays,
                monday_delivery			:this.data.config.allowMondayDelivery,
                deliverydays_window		:this.deliveryDaysWindow,
                cutoff_time 			:this.data.config.cutoffTime,
                dropoff_delay			:this.data.config.dropoffDelay
            })
            .done(function(response){

                MyParcel.data.deliveryOptions = response;
                if(response.errors){
                    mypajQuery.each(response.errors, function(key, value){
                        /* Postalcode housenumber combination not found or not recognised. */
                        if(value.code == '3212' || value.code == '3505'){
                            MyParcel.showRetry();
                        }

                        /* Any other error */
                        else {
                            MyParcel.showFallBackDelivery();
                        }
                    });
                }

                /* No errors */
                else {
                    MyParcel.hideMessage();
                    MyParcel.showPickUpLocations();
                    MyParcel.showDeliveryDates();
                    if(MyParcel.data.deliveryOptions.data.delivery.length <= 0 ){
                        MyParcel.hideDeliveryDates();
                    }
                    MyParcel.storeDeliveryOptions = response;
                }
                MyParcel.hideSpinner();
            })
            .fail(function(){
                MyParcel.showFallBackDelivery();
            })
            .always(function(){
                mypajQuery('#mypa-select-delivery, #method-myparcel-normal').click();
                MyParcel.mapExternalWebshopTriggers();

                if (typeof window.mypa != 'undefined') {
                    window.mypa.fn.fnCheckout.paymentRefresh();
                }
            });
    }
}

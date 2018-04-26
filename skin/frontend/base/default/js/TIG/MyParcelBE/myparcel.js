MyParcel = {
    /*
     * Get Settings from Magento
     */

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
                if (address && address['country'] === 'BE') {

                    if (address['street']) {
                        myParcelConfig = {
                            apiBaseUrl: "https://api.staging.myparcel.nl/",
                            carrierCode: "2",
                            postalCode: address['postal_code'].replace(/ /g, ""),
                            countryCode: address['country'],
                            street: address['street'],
                            number: address['number'],
                            cutoffTime: data.general['cutoff_time'],
                            dropOffDays: data.general['dropoff_days'],
                            allowBpostSaturdayDelivery: data.delivery['saturday_delivery_active'] ? 1 : 0,
                            priceBpostSaturdayDelivery: data.delivery['saturday_delivery_fee'],
                            priceBpostAutograph: data.delivery['signature_fee'],
                            pricePickup: data.pickup['fee'],
                            dropOffDelay: data.general['dropoff_delay'],
                            excludeDeliveryType: excludeDeliveryTypes.length > 0 ? excludeDeliveryTypes.join(';') : null,
                            allowBpostAutograph:  data.delivery['signature_active'],
                            allowPickup: data.pickup['active'],
                            price: price
                        };

                        MyParcel.init();
                        MyParcel.bind();

                    } else {
                    }
                }
            }
        };
        jQuery.ajax(ajaxOptions);
    },

    /*
     * Init
     *
     * Initialize the MyParcel checkout.
     *
     * From commit 59767dd26fb 22/03/2018
     */

    init: function () {
        /* Simple mobilesque detector */
        isMobile = true;
        if (mypajQuery(window).width() > 980) {
            isMobile = false;
        }

        /* Prices BPost */
        if (myParcelConfig.carrierCode == 2) {

            if (parseFloat(myParcelConfig.priceBpostAutograph) > 0) {
                mypajQuery('#mypa-price-bpost-signature').html(' (+ €' + myParcelConfig.priceBpostAutograph + ')');
            }
            if (parseFloat(myParcelConfig.priceBpostSaturdayDelivery) > 0) {
                mypajQuery('#mypa-delivery-bpost-saturday-price').html(' (+ €' + myParcelConfig.priceBpostSaturdayDelivery + ')');
            }
            if (parseFloat(myParcelConfig.pricePickup) > 0) {
                mypajQuery('#mypa-price-pickup').html(' (+ €' + myParcelConfig.pricePickup + ')');
            }
        }

        /* Prices bpost */
        else if (myParcelConfig.carrierCode == 1) {
            MyParcel.showbpostPrices();
        }

        /* Call delivery options */
        MyParcel.callDeliveryOptions();

        /* Engage defaults */
        MyParcel.hideBpostSaturday();
        MyParcel.hideDelivery();
        MyParcel.hideBpostSignature();
        MyParcel.hidePickUpLocations();
        mypajQuery('#method-myparcel-flatrate').click();

        // BPost Delivery Options
        if (myParcelConfig.allowBpostAutograph && myParcelConfig.carrierCode == 2) {
            MyParcel.showBpostSignature();
        }

        // bpost delivery Options
        if (myParcelConfig.carrierCode == 1) {
            mypajQuery('#mypa-delivery-selectors-be').css('display', 'none');

            mypajQuery('#mypa-delivery-selectors-be').hide();
            mypajQuery('#mypa-delivery-selectors-be').css('background-color', 'green');

            mypajQuery('#mypa-bpost-flat-fee-delivery').hide();
            MyParcel.showDelivery();
            MyParcel.showbpostDeliveryDates();
        }

    },

    /*
     * Bind
     *
     * Bind actions to selectors.
     * 
     */

    bind: function () {
        mypajQuery('#mypa-signature-selector').on('change', function (e) {
            MyParcel.toggleDeliveryOptions();
        });

        mypajQuery('#mypa-recipient-only-selector').on('change', function () {
            MyParcel.toggleDeliveryOptions();
        });

        mypajQuery('#mypa-deliver-pickup-deliver, #mypa-deliver-pickup-deliver-bpost, #mypa-deliver-pickup-deliver-bpost-saturday').on('click', function () {
            MyParcel.showDelivery();
        });

        mypajQuery('#mypa-deliver-pickup-pickup').on('click', function () {
            mypajQuery('#s_method_myparcel_pickup').click();
            MyParcel.hideDelivery();
        });

        mypajQuery('#mypa-delivery-date-bpost').on('change', function () {
            MyParcel.showbpostDeliveryTimes()
        });

        /* Mobile specific triggers */
        if (isMobile) {
            mypajQuery('#mypa-show-location-details').on('click', function () {
                MyParcel.showLocationDetails();
            });

            mypajQuery('.mypa-help').on('click', function (e) {
                e.preventDefault();
                MyParcel.showHelp(e);
            });
        }

        /* Desktop specific triggers */
        else {
            mypajQuery('#mypa-show-location-details').on('mouseenter', function () {
                MyParcel.showLocationDetails();
            });

            mypajQuery('.mypa-help').on('click', function (e) {
                e.preventDefault();
            });

            mypajQuery('.mypa-help').on('mouseenter', function (e) {
                MyParcel.showHelp(e);
            });
        }

        mypajQuery('#mypa-location-details').on('click', function () {
            MyParcel.hideLocationDetails();
        });

        mypajQuery('#mypa-pickup-location').on('change', function () {
            mypajQuery('#mypa-deliver-pickup-pickup').click();
        });

        /* External webshop triggers */
        mypajQuery('#mypa-load').on('click', function () {

            mypajQuery('#mypa-signed').prop('checked', false);

            /**
             * Signature
             */
            if (
                mypajQuery('#mypa-deliver-pickup-deliver-bpost').prop('checked') &&
                mypajQuery('#mypa-method-signature-selector-be').prop('checked')
            ) {
                mypajQuery('#s_method_myparcel_delivery_signature').click();

                mypajQuery('#mypa-signed').prop('checked', true);
                MyParcel.addDeliveryToMagentoInput();
                return;
            }

            /**
             * Saturday signature
             */
            if (
                mypajQuery('#mypa-deliver-pickup-deliver-bpost-saturday').prop('checked') &&
                mypajQuery('#mypa-method-signature-selector-be').prop('checked')
            ) {
                mypajQuery('#s_method_myparcel_saturday_delivery_signature').click();

                mypajQuery('#mypa-signed').prop('checked', true);
                MyParcel.addDeliveryToMagentoInput();
                return;
            }

            /**
             * Saturday
             */
            if (
                mypajQuery('#mypa-deliver-pickup-deliver-bpost-saturday').prop('checked') &&
                mypajQuery('#mypa-method-signature-selector-be').prop('checked') === false
            ) {
                mypajQuery('#s_method_myparcel_saturday_delivery').click();
                MyParcel.addDeliveryToMagentoInput();
                return;
            }

            /**
             * Pickup
             */
            if (mypajQuery('#mypa-deliver-pickup-pickup').prop('checked')) {
                mypajQuery('#s_method_myparcel_pickup').click();

                MyParcel.addPickupToMagentoInput();
                return;
            }

            /**
             * Normal
             */
            mypajQuery('#s_method_myparcel_flatrate, #s_method_myparcel_flatrate').click();
            MyParcel.addDeliveryToMagentoInput();
        });
    },

    addPickupToMagentoInput: function () {
        var locationId = mypajQuery('#mypa-pickup-location').val();
        var currentLocation = MyParcel.getPickupByLocationId(MyParcel.storeDeliveryOptions.data.pickup, locationId);
        mypajQuery('#mypa-data').val(JSON.stringify(currentLocation));
    },

    addDeliveryToMagentoInput: function () {
        var currentLocation = MyParcel.storeDeliveryOptions.data.delivery[0];
        mypajQuery('#mypa-data').val(JSON.stringify(currentLocation));
    },

    /*
     * toggleDeliveryOptions
     *
     * Shows and hides the display options that are valid for the recipient only and signature required pre-selectors
     *
     */

    toggleDeliveryOptions: function () {
        var recipientOnly = mypajQuery('#mypa-recipient-only-selector').is(':checked');
        var signatureRequired = mypajQuery('#mypa-signature-selector').is(':checked');

        MyParcel.hideAllDeliveryOptions();
        if (recipientOnly && signatureRequired) {
            mypajQuery('.method-myparcel-delivery-signature-and-only-recipient-fee-div').show();
            mypajQuery('#method-myparcel-delivery-signature-and-only-recipient-fee').click();
        }

        else if (recipientOnly && !signatureRequired) {
            mypajQuery('.method-myparcel-delivery-only-recipient-div').show();
            mypajQuery('#method-myparcel-delivery-only-recipient').click();
        }

        else if (!recipientOnly && signatureRequired) {
            mypajQuery('.method-myparcel-delivery-signature-div').show();
            mypajQuery('.method-myparcel-delivery-evening-signature-div').show();
            mypajQuery('.method-myparcel-morning-signature-div').show();
            mypajQuery('#method-myparcel-delivery-signature').click();
        }

        /* No pre selection, show everything. */
        else {
            MyParcel.showAllDeliveryOptions();
            mypajQuery('#method-myparcel-flatrate').click();
        }
    },

    showbpostPrices: function () {
        var priceMap = {
            "pricebpostFlatrate": "mypa-bpost-flatrate-price",
            "pricebpostSignature": "mypa-bpost-signature-price",
            "pricebpostRecipientOnly": "mypa-bpost-recipient-only-price",
            "pricebpostRecipientOnlySignature": "mypa-bpost-recipient-only-signature-price",
            "pricebpostEvening": "mypa-bpost-evening-price",
            "pricebpostPickupExpresse": "mypa-bpost-pickup-express-price",
            "pricebpostMorning": "mypa-bpost-morning-price",
            "pricebpostMorningSignature": "mypa-bpost-morning-signature-price",

            "pricebpostEveningSignature": "mypa-bpost-evening-signature-price",

            "pricebpostMorning": "mypa-bpost-morning-price",
            "pricebpostFlatrate": "mypa-bpost-standard-price",
            "pricebpostEvening": "mypa-bpost-avond-price", /* yes, this one is dutch :( */
        };

        mypajQuery.each(priceMap, function (config, cssId) {

            var price = 0;

            if (myParcelConfig[config]) {
                price = parseFloat(myParcelConfig[config]);
            }

            if (price > 0) {
                mypajQuery('.' + cssId).html("+€ " + price);
            }
        });
    },


    showbpostDeliveryDates: function () {
        if (typeof(MyParcel.storeDeliveryOptions) === 'undefined') {
            return;
        }
        var deliveryDates = MyParcel.storeDeliveryOptions.data.delivery;
        var html = "";
        mypajQuery.each(deliveryDates, function (key, value) {
            var date = MyParcel.dateToObject(value.date);

            html += '<option value="' + value.date + '">' + MyParcel.dateToString(value.date) + '</option>';
        });
        mypajQuery('#mypa-delivery-date-bpost').html(html);


    },

    showbpostDeliveryTimes: function () {
        if (typeof(MyParcel.storeDeliveryOptions) === 'undefined') {
            return;
        }
        var selectedDate = mypajQuery('#mypa-delivery-date-bpost').val();
        var deliveryDates = MyParcel.storeDeliveryOptions.data.delivery;

        var timesForSelectedDates = [];
        mypajQuery.each(deliveryDates, function (key, value) {
            if (value.date === selectedDate) {
                timesForSelectedDates = value.time;
            }
        });

        var html = '';
        mypajQuery.each(timesForSelectedDates, function (key, value) {
            html += '<div class="mypa-delivery-time-div">';
            html += '<input type="radio" id="mypa-delivery-time-bpost-select-' + value.price_comment + '" name="mypa-delivery-time-bpost" value="';
            html += value.price_comment + '">';
            html += '<label class="mypa-delivery-time-bpost-label" for="mypa-delivery-time-bpost-select-' + value.price_comment + '">';
            html += '<span class="mypa-delivery-time-bpost-comment">' + translateENtoNL[value.price_comment] + '</span>';
            html += '<span class="mypa-delivery-time-bpost-time">(' + value.start.slice(0, -3) + '-' + value.end.slice(0, -3) + ')</span>';
            html += '<span class="mypa-method-price mypa-delivery-time-bpost-price mypa-bpost-' + value.price_comment + '-price"></span>';
            html += '</label>';
            html += '</div>';
        });
        mypajQuery('#mypa-delivery-time-bpost').html(html);
        mypajQuery('#mypa-delivery-selector').css('height', '190px');
    },

    /*
     * hideMessage
     *
     * Hides pop-up message.
     * 
     */

    hideMessage: function () {
        mypajQuery('#mypa-message').hide();
        mypajQuery('#mypa-message').html(' ');
        mypajQuery('#mypa-load').show();
    },

    /*
     * hideMessage
     *
     * Hides pop-up essage.
     * 
     */

    showMessage: function (message) {
        mypajQuery('#mypa-message').html(message);
        mypajQuery('#mypa-message').show();
        mypajQuery('#mypa-load').hide();
    },

    /*
     * hideDelivery
     *
     * Hides interface part for delivery.
     * 
     */

    hideDelivery: function () {
        mypajQuery('#mypa-pre-selectors-nl').hide();
        mypajQuery('#mypa-delivery-selectors-nl').hide();
        mypajQuery('#mypa-delivery-selectors-be').hide();
    },

    /*
     * showDelivery
     *
     * Shows interface part for delivery.
     * 
     */

    showDelivery: function () {
        mypajQuery('#mypa-pre-selectors-' + myParcelConfig.countryCode.toLowerCase()).show();
        mypajQuery('#mypa-delivery-selectors-' + myParcelConfig.countryCode.toLowerCase()).show();

        MyParcel.hideBpostSignature();
        if (myParcelConfig.allowBpostAutograph && myParcelConfig.carrierCode == 2) {
            MyParcel.showBpostSignature();
        }
    },

    /*
     * showAllDeliveryOptions
     *
     * Shows all available MyParcel delivery options.
     *
     */

    showAllDeliveryOptions: function () {
        mypajQuery('.mypa-delivery-option').show();
    },

    /*
     * hideAllDeliveryOptions
     *
     * Hides all available MyParcel delivery options.
     *
     */

    hideAllDeliveryOptions: function () {
        mypajQuery('.mypa-delivery-option').hide();
        mypajQuery('#mypa-delivery-selectors-be').hide();
    },


    /*
     * showSpinner
     *
     * Shows the MyParcel spinner.
     *
     */

    showSpinner: function () {
        mypajQuery('#mypa-spinner').show();
    },


    /*
     * hideSpinner
     *
     * Hides the MyParcel spinner.
     *
     */

    hideSpinner: function () {
        mypajQuery('#mypa-spinner').hide();
    },

    /*
         * shopwbpostSignatureAndRecipientOnly
     *
         * Shows the bpost signature and recipient only delivery option.
         *
         */

    showbpostSignatureAndRecipientOnly: function () {
        mypajQuery('#mypa-bpost-signature-recipient-only').show();
    },

    /*
         * hidebpostSignatureAndRecipientOnly
     *
         * Shows the bpost signature and recipient only delivery option.
         *
         */

    hidebpostSignatureAndRecipientOnly: function () {
        mypajQuery('#mypa-bpost-signature-recipient-only').hide();
    },

    /*
         * showbpostRecipientOnly
     *
         * Shows the bpost recipient only delivery option.
         *
         */

    showbpostRecipientOnly: function () {
        mypajQuery('#mypa-bpost-recipient-only').show();
    },

    /*
         * hidebpostRecipientOnly
     *
         * Hide the bpost recipient only delivery option
         *
         */

    hidebpostRecipientOnly: function () {
        mypajQuery('#mypa-bpost-recipient-only').hide();
    },

    /*
         * showbpostSignature
     *
         * Shows the bpost signature delivery option
         *
         */

    showbpostSignature: function () {
        mypajQuery('#mypa-bpost-signature').show();
    },

    /*
         * hidebpostSignature
     *
         * Shows the bpost signature delivery option
         *
         */

    hidebpostSignature: function () {
        mypajQuery('#mypa-bpost-signature').hide();
    },

    /* 
         * showBpostSignature
         *
         * Shows the Bpost signature delivery option
         *
         */

    showBpostSignature: function () {
        mypajQuery('#mypa-delivery-selectors-be').show();
    },

    /* 
         * hideBpostSignature
         *
         * Hides the Bpost signature delivery option
         *
         */

    hideBpostSignature: function () {
        mypajQuery('#mypa-delivery-selectors-be').hide();
    },

    /*
     * showBpostSaturday
     *
     * Show Bpost saturday delivery for extra fee. 
     *
     */

    showBpostSaturday: function (date) {
        if (myParcelConfig.allowBpostSaturdayDelivery) {
            mypajQuery('#mypa-delivery-date-only-bpost-saturday').val(date);
            mypajQuery('#mypa-delivery-date-bpost-saturday').val(date);
            mypajQuery('#mypa-delivery-bpost-saturday-price').html(' (+ €' + myParcelConfig.priceBpostSaturdayDelivery + ')');
            mypajQuery('#mypa-bpost-saturday-delivery').show();
        }
    },

    /*
     * hideBpostSaturday
     *
     * Hide Bpost saturday delivery. 
     *
     */

    hideBpostSaturday: function () {
        mypajQuery('#mypa-bpost-saturday-delivery').hide();
        mypajQuery('#mypa-delivery-date-bpost-saturday').val(' ');
        mypajQuery('#mypa-delivery-bpost-saturday-price').html(myParcelConfig.priceBpostSaturdayDelivery);
    },

    /*
     * dateToObject
     * 
     * Convert api date string format YYYY-MM-DD to object
     *
     */

    dateToObject: function (apiDate) {
        var deliveryDate = apiDate;
        var dateArr = deliveryDate.split('-');
        return new Date(dateArr[0], dateArr[1] - 1, dateArr[2]);
    },

    /*
     * dateToString
     * 
     * Convert api date string format to human readable string format
     *
     */

    dateToString: function (apiDate) {
        var deliveryDate = apiDate;
        var dateArr = deliveryDate.split('-');
        var dateObj = new Date(dateArr[0], dateArr[1] - 1, dateArr[2]);
        var month = dateObj.getMonth();
        month++;
        return txtWeekDays[dateObj.getDay()] + " " + dateObj.getDate() + "-" + month + "-" + dateObj.getFullYear();
    },

    /*
     * showDeliveryDates
     *
     * Show possible delivery dates.
     * 
     */

    showDeliveryDates: function (deliveryOptions) {
        var dateString = MyParcel.dateToString(deliveryOptions.data.delivery[0].date);
        var dateObj = MyParcel.dateToObject(deliveryOptions.data.delivery[0].date);

        /* If there is a bPost saturday delivery also present the next option
           that has the standard fee */
        if (dateObj.getDay() == 6 && myParcelConfig.carrierCode == 2) {

            MyParcel.showBpostSaturday(dateString);
            if (typeof deliveryOptions.data.delivery[1] !== 'undefined') {
                dateString = MyParcel.dateToString(deliveryOptions.data.delivery[1].date);
            }
        }

        /* All other deliveries */
        mypajQuery('#mypa-delivery-date-bpost').val(dateString);
        mypajQuery('#mypa-delivery-date-only-bpost').val(deliveryOptions.data.delivery[0].date);
    },

    /*
     * clearPickupLocations
     *
     * Clear pickup locations and show a non-value option.
     *
     */

    clearPickUpLocations: function () {
        var html = '<option value="">---</option>';
        mypajQuery('#mypa-pickup-location').html(html);
    },


    /*
     * hidePickupLocations
     *
     * Hide the pickup location option.
     *
     */

    hidePickUpLocations: function () {
        mypajQuery('#mypa-pickup-location-selector').hide();
        mypajQuery('.mel-style').css('border-bottom', '0');
    },


    /*
     * showPickupLocations
     *
     * Shows possible pickup locations, from closest to most distance.
     *
     */

    showPickUpLocations: function (deliveryOptions) {
        var html = "";
        mypajQuery.each(deliveryOptions.data.pickup, function (key, value) {
            var distance = parseFloat(Math.round(value.distance)/1000).toFixed(2) + ' KM';
            
            html += '<option value="' + value.location_code + '">' + value.location + ', ' + value.street +
                ' ' + value.number + ", " + value.city + " (" + distance + ") </option>\n";
        });
        mypajQuery('#mypa-pickup-location').html(html);
        mypajQuery('#mypa-pickup-location-selector').show();
    },

    /*
     * hideLocationDetails
     *
     * Hide the detailed information pop-up for selected location.
     *
     */

    hideLocationDetails: function () {
        mypajQuery('#mypa-location-details').hide();
    },

    /*
     * showLocationDetails
     *
     * Shows the detailed information pop-up for the selected pick-up location.
     */

    showLocationDetails: function () {
        var locationId 		= mypajQuery('#mypa-pickup-location').val();

        var currentLocation = MyParcel.getPickupByLocationId(MyParcel.storeDeliveryOptions.data.pickup, locationId);
        var startTime = currentLocation.start_time;

        /* Strip seconds if present */
        if (startTime.length > 5) {
            startTime = startTime.slice(0, -3);
        }


        var html = '<div class="mypa-close-message"><span class="fas fa-times-circle"></span></div>';
        html +=' <svg class="svg-inline--fa fa-times fa-w-12" aria-hidden="true" data-prefix="fas" data-icon="times" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" data-fa-i2svg=""><path fill="currentColor" d="M323.1 441l53.9-53.9c9.4-9.4 9.4-24.5 0-33.9L279.8 256l97.2-97.2c9.4-9.4 9.4-24.5 0-33.9L323.1 71c-9.4-9.4-24.5-9.4-33.9 0L192 168.2 94.8 71c-9.4-9.4-24.5-9.4-33.9 0L7 124.9c-9.4 9.4-9.4 24.5 0 33.9l97.2 97.2L7 353.2c-9.4 9.4-9.4 24.5 0 33.9L60.9 441c9.4 9.4 24.5 9.4 33.9 0l97.2-97.2 97.2 97.2c9.3 9.3 24.5 9.3 33.9 0z"></path></svg>';
        html += '<span class="mypa-pickup-location-details-location"><h3>' + currentLocation.location + '</h3></span>';
        html += '<span class="mypa-pickup-location-details-street">' + currentLocation.street + '&nbsp;' + currentLocation.number + '</span>';
        html += '<span class="mypa-pickup-location-details-city">' + currentLocation.postal_code + '&nbsp;' + currentLocation.city + '</span>';
        if (currentLocation.phone_number) {
            html += '<span class="mypa-pickup-location-details-phone">&nbsp;' + currentLocation.phone_number + '</span>';
        }
        html += '<span class="mypa-pickup-location-details-time">Ophalen vanaf:&nbsp;' + startTime + ' uur</span>';
        html += '<h3>Openingstijden</h3>';
        mypajQuery.each(
            currentLocation.opening_hours, function (weekday, value) {
                html += '<span class="mypa-pickup-location-details-day">' + translateENtoNL[weekday] + "</span> ";
                if(value[0] === undefined ){
                    html +=  '<span class="mypa-time">Gesloten</span>';
                }

                mypajQuery.each(value, function (key2, times) {
                    html += '<span class="mypa-time">' + times + "</span>";
                });
                html += "<br>";
            });
        mypajQuery('#mypa-location-details').html(html);
        mypajQuery('#mypa-location-details').show();
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
            }
            ;
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

    retryPostalcodeHouseNumber: function () {
        myParcelConfig.postalCode = mypajQuery('#mypa-error-postcode').val();
        myParcelConfig.number = mypajQuery('#mypa-error-number').val();
        MyParcel.hideMessage();
        MyParcel.callDeliveryOptions();
        mypajQuery('#mypa-deliver-pickup-deliver').click();
    },

    /*
     * showFallBackDelivery
     *
     * If the API call fails and we have no data about delivery or pick up options 
     * show the customer an "As soon as possible" option.
     *
     */

    showFallBackDelivery: function () {
        MyParcel.hidePickUpLocations();
        mypajQuery('#mypa-delivery-date-bpost').val('Zo snel mogelijk.');
        mypajQuery('#mypa-deliver-pickup-deliver').click();
    },


    /*
     * showRetry
     *
     * If a customer enters an unrecognised postal code housenumber combination show a 
     * pop-up so they can try again.
     *
     */

    showRetry: function () {
        var html =
            '<h4>Huisnummer en/of postcode onbekend</h4>' +
            '<div class="full-width mypa-error">' +
            '<label for="mypa-error-postcode">Postcode</label>' +
            '<input type="text" name="mypa-error-postcode" id="mypa-error-postcode" value="' + myParcelConfig.postalCode + '">' +
            '</div><div class="full-width mypa-error">' +
            '<label for="mypa-error-number">Huisnummer</label>' +
            '<input type="text" name="mypa-error-number" id="mypa-error-number" value="' + myParcelConfig.number + '">' +
            '<br><button id="mypa-error-try-again">Opnieuw</button>' +
            '</div>';
        MyParcel.showMessage(html);


        /* remove trigger that closes message */
        mypajQuery('#mypa-message').off('click');

        /* bind trigger to new button */
        mypajQuery('#mypa-error-try-again').on('click', function () {
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

    callDeliveryOptions: function () {
        MyParcel.showSpinner();
        MyParcel.clearPickUpLocations();

        /* Don't call API unless both PC and House Number are set */
        if (!myParcelConfig.number || !myParcelConfig.postalCode) {
            MyParcel.hideSpinner();
            MyParcel.showFallBackDelivery();
            return;
        }


        /* add streetName for Belgium */
        mypajQuery.get(myParcelConfig.apiBaseUrl + "delivery_options",
            {
                carrier: myParcelConfig.carrierCode,
                postal_code: myParcelConfig.postalCode,
                cc: myParcelConfig.countryCode,
                street: myParcelConfig.street,
                number: myParcelConfig.number,
                cutoff_time: myParcelConfig.cutoffTime,
                dropoff_days: myParcelConfig.dropOffDays,
                dropoff_delay: myParcelConfig.dropOffDelay,
                exclude_delivery_type: myParcelConfig.excludeDeliveryType,
                saturday_delivery: myParcelConfig.allowBpostSaturdayDelivery
            })
            .done(function (data) {
                if (data.errors) {
                    mypajQuery.each(data.errors, function (key, value) {
                        /* Postalcode housenumber combination not found or not
                   recognised. */
                        if (value.code == '3212' || value.code == '3505') {
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
                    //Show or hide the pickup option
                    MyParcel.hidePickUpLocations();
                    if (myParcelConfig.allowPickup && myParcelConfig.carrierCode == 2) {
                        MyParcel.showPickUpLocations(data);
                    }
                    MyParcel.showDeliveryDates(data);
                    MyParcel.storeDeliveryOptions = data;

                    if (myParcelConfig.carrierCode == '1') {
                        MyParcel.showbpostDeliveryDates();
                        MyParcel.showbpostDeliveryTimes();
                        mypajQuery('#mypa-deliver-pickup-deliver').click();
                        mypajQuery('#mypa-delivery-time-bpost-select-standard').click();
                        MyParcel.showbpostPrices();
                    }

                    if (myParcelConfig.carrierCode == '2') {
                        mypajQuery('#mypa-deliver-pickup-deliver-bpost').click();
                    }

                }
            })
            .fail(function () {
                MyParcel.showFallBackDelivery();
            })
            .always(function () {
                MyParcel.hideSpinner();
            });
    }
};
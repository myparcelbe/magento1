<?php
/**
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Creative Commons License.
 * It is available through the world-wide-web at this URL:
 * http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US
 * If you are unable to obtain it through the world-wide-web, please send an email
 * to info@sendmyparcel.be so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade this module to newer
 * versions in the future. If you wish to customize this module for your
 * needs please contact info@sendmyparcel.be for more information.
 *
 * @copyright   Copyright (c) 2014 Total Internet Group B.V. (http://www.tig.nl)
 * @license     http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US
 *
 *
 */

class TIG_MyParcelBE_Model_Carrier_MyParcel extends Mage_Shipping_Model_Carrier_Abstract
    implements Mage_Shipping_Model_Carrier_Interface
{
    /**
     * Rate type (tablerate or flatrate).
     */
    const XML_PATH_RATE_TYPE = 'carriers/myparcel/rate_type';

    const LOCAL_CC = 'BE';

    /**
     * MyParcel Carrier code
     *
     * @var string
     */
    protected $_code = TIG_MyParcelBE_Model_Shipment::MYPARCEL_CARRIER_CODE_TITLE;

    /**
     * Fixed price flag
     *
     * @var boolean
     */
    protected $_isFixed = true;

    /**
     * @var string
     */
    protected $_default_condition_name = 'package_weight';

    /**
     * @var TIG_MyParcelBE_Helper_Data
     */
    protected $helper;

    protected $allowed_methods = array();

    /**
     * Class constructor.
     */
    public function __construct()
    {
        parent::__construct();

        $this->helper = Mage::helper('tig_myparcel');
        $this->allowed_methods = $this->getAllowedMethods();
    }

    /**
     * Check if carrier has shipping tracking option available
     *
     * @return boolean
     */
    public function isTrackingAvailable()
    {
        return true;
    }

    /**
     * Get tracking information.
     *
     * @param string $tracking
     *
     * @return Mage_Shipping_Model_Tracking_Result_Status
     */
    public function getTrackingInfo($tracking)
    {
        $statusModel = Mage::getModel('shipping/tracking_result_status');
        $track = $this->_getTrackByNumber($tracking);
        $shipment = $track->getShipment();

        $shippingAddress = $shipment->getShippingAddress();
        $barcodeUrl = $this->helper->getBarcodeUrl(
            $track->getTrackNumber(),
            $shippingAddress
        );

        $statusModel->setCarrier($track->getCarrierCode())
            ->setCarrierTitle($this->getConfigData('name'))
            ->setTracking($track->getTrackNumber())
            ->setPopup(1)
            ->setUrl($barcodeUrl);

        return $statusModel;
    }

    /**
     * Load track object by tracking number
     *
     * @param string $number
     *
     * @return Mage_Sales_Model_Order_Shipment_Track
     */
    protected function _getTrackByNumber($number)
    {
        $coreResource = Mage::getSingleton('core/resource');
        $readConn = $coreResource->getConnection('core_read');

        $trackSelect = $readConn->select();
        $trackSelect->from($coreResource->getTableName('sales/shipment_track'), array('entity_id'));
        $trackSelect->where('track_number = ?', $number);

        $trackId = $readConn->fetchOne($trackSelect);

        $track = Mage::getModel('sales/order_shipment_track')->load($trackId);

        return $track;
    }

    /**
     * Get allowed shipping methods
     *
     * @return array
     */
    public function getAllowedMethods()
    {
        $helper = $this->helper;

        $deliveryTitle = $helper->getConfig('delivery_title', 'delivery');
        $signatureTitle = strtolower($helper->getConfig('signature_title', 'delivery'));
        $saturdayTitle = $helper->getConfig('saturday_delivery_title', 'delivery');

        $methods = array(
            'delivery_signature' => $deliveryTitle . ' (' . $signatureTitle . ')',
            'saturday_delivery' => $saturdayTitle,
            'saturday_delivery_signature' => $saturdayTitle . ' (' . $signatureTitle . ')',
            'pickup' => $helper->getConfig('pickup_title', 'pickup'),
            'flatrate' => $this->getConfigData('name') . ' flat',
            'tablerate' => $this->getConfigData('name') . ' table',
        );

        return $methods;
    }

    /**
     * Collect and get rates
     *
     * @param Mage_Shipping_Model_Rate_Request $request
     *
     * @return bool|Mage_Shipping_Model_Rate_Result|mixed|null
     * @throws TIG_MyParcelBE_Exception
     * @throws Mage_Core_Model_Store_Exception
     */
    public function collectRates(Mage_Shipping_Model_Rate_Request $request)
    {
        /** @var Mage_Shipping_Model_Rate_Result $result */
        if (!$this->getConfigFlag('active')) {
            return false;
        }

        $rateType = Mage::getStoreConfig(self::XML_PATH_RATE_TYPE, Mage::app()->getStore()->getId());

        $result = false;

        if ($rateType == 'flat') {
            $result = $this->_getFlatRate($request);
        }

        if ($rateType == 'table') {
            $result = $this->_getTableRate($request);
        }

        if (!$result) {
            throw new TIG_MyParcelBE_Exception(
                $this->helper->__('Unknown rate type specified: %s.', $rateType),
                'MYPA-0014'
            );
        }

        /*
         * Add pickup
         */
        if ($request->getDestCountryId() == TIG_MyParcelBE_Model_Carrier_MyParcel::LOCAL_CC) {
            $this->addShippingRate($result, 'pickup', 'pickup', 'pickup');
        }

        /*
         * Add signature
         */
        if ($request->getDestCountryId() == TIG_MyParcelBE_Model_Carrier_MyParcel::LOCAL_CC) {
            $this->addShippingRate($result, 'delivery', 'signature', 'delivery_signature');
        }

        /*
         * Add saturday
         */
        if ($request->getDestCountryId() == TIG_MyParcelBE_Model_Carrier_MyParcel::LOCAL_CC) {
            $this->addShippingRate($result, 'delivery', 'saturday_delivery', 'saturday_delivery');
        }

        /*
         * Add saturday signature
         */
        if ($request->getDestCountryId() == TIG_MyParcelBE_Model_Carrier_MyParcel::LOCAL_CC) {
            $this->addShippingRate($result, 'delivery', 'saturday_delivery', 'saturday_delivery_signature');
        }

        return $result;
    }

    /**
     * @param $result
     * @param $settingGroup
     * @param $settingAlias
     * @param $method
     *
     * @return mixed
     */
    private function addShippingRate(&$result, $settingGroup, $settingAlias, $method)
    {
        $helper = $this->helper;
        $shippingRates = $this->allowed_methods;

        if (
            $helper->getConfig($settingAlias . '_active', $settingGroup) == "1" ||
            $helper->getConfig('signature_active', 'delivery') == "1"
        ) {

            $currentRate = current($result->getRatesByCarrier($this->_code));

            if ($currentRate) {
                $currentPrice = $currentRate->getPrice();
                $extraPrice = $helper->getExtraPrice($method, $currentPrice);

                /**
                 * Use a modified clone of the configured shipping rate
                 * @var Mage_Sales_Model_Quote_Address_Rate $newRate
                 */
                $newRate = clone $currentRate;
                $newRate->setMethod($method);
                $newRate->setMethodTitle($shippingRates[$method]);
                $newRate->setPrice($extraPrice);

                $result->append($newRate);
            }
        }

        return $result;
    }

    /**
     * @param Mage_Shipping_Model_Rate_Request $request
     *
     * @return Mage_Shipping_Model_Rate_Result
     */
    protected function _getFlatRate(Mage_Shipping_Model_Rate_Request $request)
    {
        $freeBoxes = 0;
        if ($request->getAllItems()) {
            foreach ($request->getAllItems() as $item) {

                if ($item->getProduct()->isVirtual() || $item->getParentItem()) {
                    continue;
                }

                if ($item->getHasChildren() && $item->isShipSeparately()) {
                    foreach ($item->getChildren() as $child) {
                        if ($child->getFreeShipping() && !$child->getProduct()->isVirtual()) {
                            $freeBoxes += $item->getQty() * $child->getQty();
                        }
                    }
                } elseif ($item->getFreeShipping()) {
                    $freeBoxes += $item->getQty();
                }
            }
        }
        $this->setFreeBoxes($freeBoxes);

        $result = Mage::getModel('shipping/rate_result');
        if ($this->getConfigData('type') == 'O') { // per order
            $shippingPrice = $this->getConfigData('price');
        } elseif ($this->getConfigData('type') == 'I') { // per item
            $shippingPrice = ($request->getPackageQty() * $this->getConfigData('price')) - ($this->getFreeBoxes() * $this->getConfigData('price'));
        } else {
            $shippingPrice = false;
        }


        $shippingPrice = $this->getFinalPriceWithHandlingFee($shippingPrice);

        if ($shippingPrice !== false) {
            $method = Mage::getModel('shipping/rate_result_method');

            $method->setCarrier($this->_code);
            $method->setCarrierTitle($this->getConfigData('title'));

            $method->setMethod('flatrate');
            $method->setMethodTitle($this->getConfigData('name'));

            if (count($request->getAllItems()) > 0 && ($request->getFreeShipping() === true || $request->getPackageQty() !== null && $request->getPackageQty() == $this->getFreeBoxes())) {
                $shippingPrice = '0.00';
            }

            $method->setPrice($shippingPrice);
            $method->setCost($shippingPrice);

            $result->append($method);
        }

        return $result;
    }

    /**
     * @param Mage_Shipping_Model_Rate_Request $request
     *
     * @return mixed
     */
    protected function _getTableRate(Mage_Shipping_Model_Rate_Request $request)
    {
        // exclude Virtual products price from Package value if pre-configured
        if (!$this->getConfigFlag('include_virtual_price') && $request->getAllItems()) {
            foreach ($request->getAllItems() as $item) {
                if ($item->getParentItem()) {
                    continue;
                }
                if ($item->getHasChildren() && $item->isShipSeparately()) {
                    foreach ($item->getChildren() as $child) {
                        if ($child->getProduct()->isVirtual()) {
                            $request->setPackageValue($request->getPackageValue() - $child->getBaseRowTotal());
                        }
                    }
                } elseif ($item->getProduct()->isVirtual()) {
                    $request->setPackageValue($request->getPackageValue() - $item->getBaseRowTotal());
                }
            }
        }

        // Free shipping by qty
        $freeQty = 0;
        $freePackageValue = false;
        if ($request->getAllItems()) {
            $freePackageValue = 0;
            foreach ($request->getAllItems() as $item) {
                if ($item->getProduct()->isVirtual() || $item->getParentItem()) {
                    continue;
                }

                if ($item->getHasChildren() && $item->isShipSeparately()) {
                    foreach ($item->getChildren() as $child) {
                        if ($child->getFreeShipping() && !$child->getProduct()->isVirtual()) {
                            $freeShipping = is_numeric($child->getFreeShipping()) ? $child->getFreeShipping() : 0;
                            $freeQty += $item->getQty() * ($child->getQty() - $freeShipping);
                        }
                    }
                } elseif ($item->getFreeShipping()) {
                    $freeShipping = is_numeric($item->getFreeShipping()) ? $item->getFreeShipping() : 0;
                    $freeQty += $item->getQty() - $freeShipping;
                    $freePackageValue += $item->getBaseRowTotal();
                }
            }
            $oldValue = $request->getPackageValue();
            $request->setPackageValue($oldValue - $freePackageValue);
        }

        if ($freePackageValue) {
            $request->setPackageValue($request->getPackageValue() - $freePackageValue);
        }

        $conditionName = $this->getConfigData('condition_name');
        $request->setConditionName($conditionName ? $conditionName : $this->_default_condition_name);

        // Package weight and qty free shipping
        $oldWeight = $request->getPackageWeight();
        $oldQty = $request->getPackageQty();

        $request->setPackageWeight($request->getFreeMethodWeight());
        $request->setPackageQty($oldQty - $freeQty);

        $result = Mage::getModel('shipping/rate_result');
        $rate = $this->getRate($request);

        $request->setPackageWeight($oldWeight);
        $request->setPackageQty($oldQty);

        $method = Mage::getModel('shipping/rate_result_method');

        if (!empty($rate) && $rate['price'] >= 0) {
            if ($request->getFreeShipping() === true || ($request->getPackageQty() == $freeQty)) {
                $shippingPrice = 0;
            } else {
                $shippingPrice = $this->getFinalPriceWithHandlingFee($rate['price']);
            }

            $price = $shippingPrice;
            $cost = $rate['cost'];
        } elseif (empty($rate) && $request->getFreeShipping() === true) {
            /**
             * was applied promotion rule for whole cart
             * other shipping methods could be switched off at all
             * we must show table rate method with 0$ price, if grand_total more, than min table condition_value
             * free setPackageWeight() has already was taken into account
             */
            $request->setPackageValue($freePackageValue);
            $request->setPackageQty($freeQty);
            $rate = $this->getRate($request);
            if (!empty($rate) && $rate['price'] >= 0) {
                $method = Mage::getModel('shipping/rate_result_method');
            }

            $price = 0;
            $cost = 0;
        } else {
            $error = Mage::getModel('shipping/rate_result_error');
            $error->setCarrier('tablerate');
            $error->setCarrierTitle($this->getConfigData('title'));
            $error->setErrorMessage($this->getConfigData('specificerrmsg'));
            $result->append($error);
            return $result;
        }

        $method->setCarrier($this->_code);
        $method->setCarrierTitle($this->getConfigData('title'));

        $method->setMethod('tablerate');
        $method->setMethodTitle($this->getConfigData('name'));

        $method->setPrice($price);
        $method->setCost($cost);

        $result->append($method);

        return $result;
    }

    /**
     * @param Mage_Shipping_Model_Rate_Request $request
     *
     * @return array|bool
     */
    public function getRate(Mage_Shipping_Model_Rate_Request $request)
    {
        //$websiteId = $request->getWebsiteId();
        //$website = Mage::getModel('core/website')->load($websiteId);

        return Mage::getResourceModel('shipping/carrier_tablerate')->getRate($request);
    }
}

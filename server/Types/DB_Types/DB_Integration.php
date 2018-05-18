<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:09
 */

class DB_Integration extends BaseType{

    public static function getDBTypeCreation($enumInstance, $connType,$typeProperties, $enum)
    {
        return 'varchar';
    }

    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType){

        $integr = ServerPlugin::requirePlugin('Integracion');

        $integrId = $field->getIntegrationProperty();

        $extraParams = $field->getProperties();

        $res = $integr->obtenerNomencladorDetalles(
            $integrId,
            isset($extraParams) ? $extraParams['id'] : null,
            $value,
            $extraParams
        );

        $recordRes = $res->resp;

        return $recordRes;
    }

    public static function getValueToDB($record, $value, $field, $connType){

        $id = is_array($value) ? $value['id'] : $value;
        return "'".$id."'";
    }

    public static function getDefaultValue($connType, $typeProperties)
    {
        return "";
    }

}
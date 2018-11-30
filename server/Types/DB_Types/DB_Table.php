<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:09
 */

class DB_Table extends BaseType{

    public static function getDBTypeCreation($enumInstance, $connType,$typeProperties, $enum)
    {
        return "text";
    }

    public static function getValueToDB($record, $value,Field $field, $connType, $enumInstance)
    {

        $props = $field->getProperties();
        $enum = new EnumStore(null,$props['_enum'],null);
        $data = json_decode($value,true);
        $enum->getValueArrayToDb($data);
        return "'".$value."'";
    }

}
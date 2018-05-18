<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 18/02/2018
 * Time: 13:09
 */

class DB_Date extends BaseType{

    public static function getDBTypeCreation($enumInstance, $connType,$typeProperties, $enum)
    {
        return 'timestamp';
    }

    public static function getValueToDB($record, $value, $field, $connType){
//        return "to_timestamp($value/1000)";
        return "'$value'";
    }

    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType){

        return $value;
    }
    public static function getDefaultValue($connType, $typeProperties)
    {
        return 'now';
    }

}
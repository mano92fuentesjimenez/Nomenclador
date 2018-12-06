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
        return 'timestamptz';
    }

    public static function getValueToDB($record, $value, $field, $connType){

        //la validacion no tiene q hacerse porque el propio servidor ya la hace
        return "'$value'";
    }

    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType){
        $value = str_replace(' ','T',$value);
        $value = substr($value,0,-3);
        $value .='Z';
        return $value;
    }
    public static function getDefaultValue($connType, $typeProperties)
    {
        return 'now';
    }

}
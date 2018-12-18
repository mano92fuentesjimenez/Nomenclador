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

    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType){
        if(is_null($value))
            return $value;
        $value = str_replace(' ','T',$value);
        $value = substr($value,0,-3);
        $value .='Z';
        return $value;
    }
}
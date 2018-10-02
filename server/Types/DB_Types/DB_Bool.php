<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:09
 */

class DB_Bool extends BaseType{

    public static function getDBTypeCreation($enumInstance, $connType,$typeProperties, $enum)
    {
        return 'boolean';
    }

    public static function getValueToDB($record, $value, $field, $connType){
        if($value) return "'true'";
        return "'false'";
    }

    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType){

        if($connType == DBConnectionTypes::POSTGREE_9_1){
            if (is_bool($value)) {
                return $value;
            }
            if($value == 't') return true;
            else return false;
        }
        return $value;
    }
    public static function getDefaultValue($connType, $typeProperties)
    {
        return "false";
    }

}
<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:09
 */

class DB_Images extends BaseType{

    public static function getDBTypeCreation($enumInstance, $connType,$typeProperties, $enum)
    {
        return 'text';
    }
    public static function getValueToDB($record, $value,Field $field, $connType, $enumInstance)
    {
        $server = ServerPlugin::requirePlugin('manageImages');
        if(!$server->imageExist($value))
            throw new EnumInvalidModifyingData($enumInstance, $field->getEnumId(), $field->getId(),$value);

        return '\''.json_encode($value).'\'';
    }
    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType)
    {
        return json_decode($value);
    }
}
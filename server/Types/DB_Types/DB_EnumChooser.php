<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 19 2 2018
 * Time: 13:09
 */

class DB_EnumChooser extends BaseType{

    public static function getDBTypeCreation($enumInstance, $connType,$typeProperties, $enum)
    {
        return 'text';
    }

    public static function getValueToDB($record, $value, Field $field, $connType, $enumInstance)
    {
        if ($value) {
            $enums = Enums::getInstance($enumInstance);
            $v = $value['valueField'];
            $enum = $enums->getEnum($v);

            if(!is_array($value) || !($enum instanceof Enum))
                throw new EnumInvalidModifyingData($enumInstance, $field->getEnumId(), $field->getId(), $value);
            return "'" .$v. "'";
        }
    }

    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType){

        if( is_string($value) && $value !== 'null'){
            $enums = Enums::getInstance($enumInstance);
            $enum = $enums->getEnum($value);
            return array('displayField'=>$enum->getName(), 'valueField'=>$enum->getId());
        }
        return $value;
    }
    public static function getDefaultValue($connType, $typeProperties)
    {
        return 'null';
    }
}
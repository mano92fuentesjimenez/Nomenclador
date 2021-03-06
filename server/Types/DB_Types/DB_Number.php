<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:08
 */

class DB_Number extends BaseType{

    public static function getDBTypeCreation($enumInstance, $connType,$typeProperties, $enum)
    {
        switch ($typeProperties['type']) {
            case'integer':{
                if ($connType == DBConnectionTypes::POSTGREE_9_1) {
                    return 'integer';
                }
            }
                break;
            case 'bigint':{
                if ($connType == DBConnectionTypes::POSTGREE_9_1) {
                    return 'bigint';
                }
            }
                break;
            case 'decimal':{
                if ($connType == DBConnectionTypes::POSTGREE_9_1) {
                    return 'decimal('.$typeProperties['precision'].','.$typeProperties['scale'].')';
                }
            }
            case 'float':{
                if ($connType == DBConnectionTypes::POSTGREE_9_1) {
                    return 'float('.$typeProperties['precision'].')';
                }
            }
        }
        return 'integer';
    }
    public static function getValueToDB($record, $value, $connType, $typeProperties)
    {
        if (!$value) {
            $value = 0;
        }
        return parent::getValueToDB($record, $value, $connType, $typeProperties); // TODO: Change the autogenerated stub
    }
    public static function getDefaultValue($connType,$typeProperties)
    {
        return 0;
    }
    public static function getPrecision($val){
        return isset($val['precision']) ? $val['precision'] : null;
    }
    public static function getScale($val){
        return isset($val['scale']) ? $val['scale'] : null;
    }
    public static  function compareProperties($val1, $val2)
    {
        return $val1['type'] == $val2['type'] &&
               self::getPrecision($val1) == self::getPrecision($val2) &&
               self::getScale($val1) == self::getScale($val2);
    }

}
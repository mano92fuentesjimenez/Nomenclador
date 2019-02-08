<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:09
 */

class DB_GeomDrawer extends BaseType{

    public static function getDBTypeCreation($enumInstance, $connType,$typeProperties, $enum)
    {
        return 'geometry';
//        switch ($typeProperties) {
//            case 'Line':
//                return 'geometry';
//            case 'Point':
//                return 'geometry(point,4326)';
//            case 'Polygon':
//                return 'geometry';
//        }
    }
    public static  function transformSelect($fieldPath){
        return "ST_AsGeoJSON($fieldPath, 15, 2)";
    }
    public static function getValueToDB($record, $value, $field, $connType){
        if(is_null($value) or $value === '')
            return 'null';
        return "ST_GeomFromGeoJSON('$value')";
    }

}
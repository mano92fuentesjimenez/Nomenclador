<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:09
 */

class DB_Enum extends BaseType
{

    /**Devuelve una cadena conteniendo el tipo con el que $connType debe crear la tabla para guardar
     * el tipo implementado.
     * @param $enumInstance  {string}
     * @param $connType {string}
     * @param $typeProperties {obj}      Propiedades que especifican la configuracion del tipo.
     * @param $enum {Enum}
     * @return string
     * @throws
     */
    public static function getDBTypeCreation($enumInstance, $connType, $typeProperties, $enum){
        $enums = Enums::getInstance($enumInstance);
        $refEnum = $enums->getEnum($typeProperties['_enum']);
        $tableName = $refEnum->getTableName();
        $ds = $enum->getDataSource();

        if($ds->distinctDs($refEnum->getDataSource()))
            throw new Exception('El nomenclador referenciado esta en una fuente de datos diferente');

        return "integer references $tableName on delete cascade";
    }

    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType){
        if(is_null($value))
            return null;

        $enums = Enums::getInstance($enumInstance);
        $prop = $field->getProperties();
        $enum = $enums->getEnum($prop['_enum']);
        $refField =$enum->getField($prop['field']);
        $type = $refField->getType();
        $obj = array();
        if($prop['multiSelection']){
            $i =0;
            foreach ($value as $v){
                $realValue = $type::getValueFromDB($enumInstance, $record, $record[$field->getId() . BaseType::REF_TYPE_VALUE_HEADER][$i], $refField,
                    $enum->getDataSource()->getDataSourceType());
                $obj[] = array(BaseType::VALUE_TYPE_VALUE_HEADER =>  parent::getValueFromDB($enumInstance, $record, $value[$i], $field, $connType),
                               BaseType::REF_TYPE_VALUE_HEADER => $realValue);
                $i++;
            }
        }
        else {
            $realValue = $type::getValueFromDB($enumInstance, $record, $record[$field->getId() . BaseType::REF_TYPE_VALUE_HEADER], $refField,
                $enum->getDataSource()->getDataSourceType());

            $obj[BaseType::VALUE_TYPE_VALUE_HEADER ] = parent::getValueFromDB($enumInstance, $record, $value, $field, $connType);
            $obj[BaseType::REF_TYPE_VALUE_HEADER ] = $realValue;
        }
        return $obj;
    }

    public static function getValueToDB($record, $value, $field, $connType){
        if(is_null($value))
            return null;

        $value = $value[BaseType::VALUE_TYPE_VALUE_HEADER];
        return parent::getValueToDB($record, $value, $field, $connType);
    }
    public static function getValueType()
    {
        return BaseType::REF;
    }
    public static function getDefaultValue($connType,$typeProperties )
    {
        return 'null';
    }
    public static function compareProperties($val1, $val2)
    {
        return $val1['_enum'] == $val2['_enum'] && $val1['field'] == $val2['field'];
    }

    public static  function getFieldData($params)
    {
        $enums = Enums::getInstance($params['enumInstance']);
        $enum = $enums->getEnum($params['_enum']);
        $field = $enum->getField($params['field']);
        $prop = $field->getProperties();
        $fieldsToGet = array($prop['field']=>$prop['field']);

        $enumToGetData = $field->getProperties();
        $enumToGetData = $enums->getEnumQuerier($enumToGetData['_enum']);
        if(isset($params['filter'])){
            $filter = $params['filter'];
            $values = $enumToGetData->queryEnum(null,null,false,null,false,$filter['fieldFilter'],$filter['fieldValue']
                ,null,$fieldsToGet);
        }
        else{
            $values = $enumToGetData->queryEnum(null,null,false,null,false,null,null,null,$fieldsToGet);
        }

//        if (isset($_POST['filter'])) {
//            $filter = json_decode($_POST['filter'], true);
//            $values = $enum->getColumnData($_POST['field'], $filter['fieldFilter'], $filter['fieldValue']);
//        } else {
//            $values = $enum->getColumnData($_POST['field'], null, null);
//        }

        return $values;
    }
    public static  function getRowFromEnumField($params){
        $enums = Enums::getInstance($params['enumInstance']);
        $enum = $enums->getEnum($params['enumId']);
        $field = $enum->getField($params['enumField']);
        $row = $params['enumRow'];

        $conn = EnumsUtils::getDBConnection($enum);
        $conn->getFieldSingleValue($enum->getId(), $enum->getDataSource()->getSchema(),$field->getId(),$row);

        $enumId = $field->getProperties();
        $enumId = $enumId['_enum'];
        $nextEnum = $enums->getEnumQuerier($enumId);
        $nextRow = $conn->fetchData();
        $nextRow = $nextRow[0][$field->getId()];

        $data = $nextEnum->queryEnum(null,null,false,$nextRow,false);
        $resp = array(
            'row'=>$nextRow,
            'values'=>$data[0]
        );
        return $resp;
    }

    public static function getMultiTableName($enum1,$enum2){
        return "{$enum1->getId()}-{$enum2->getId()}";
    }
    public static function createMultiTable($enum, $enum2, $conn){

        $schema = $enum->getDataSource()->getSchema();
        $enumTableName = $enum->getTableName();
        $enum2TableName = $enum2->getTableName();
        $fields = array(
            array(
                'id'=>$enum->getId(),
                'type'=>"integer references $enumTableName on delete cascade"
            ),
            array(
                'id'=>$enum2->getId(),
                'type'=>"integer references $enum2TableName on delete cascade"
            )
        );
        $id = self::getMultiTableName($enum, $enum2);
        $conn->createTable($id,$schema,$fields);
        $conn->createIndex($schema, $id, $enum->getId());
    }
    public static function removeMultiTable($enum1, $enum2, $conn){
        $id = self::getMultiTableName($enum1, $enum2);
        $conn->removeTable($id, $enum1->getDataSource()->getSchema());
    }
//    //Funciones de Formula
//    //Son necesarias porque si un nomenclador apunta a un campo de tipo formula, este nomenclador se va a comportar
//    //como una formula
//    public static function dependsOnOtherFields($enum, $field){
//        $prop =$field->getProperties();
//        $enums = Enums::getInstance();
//
//        $nextEnum = $enums->getEnum($prop['_enum']);
//        $nextField =$nextEnum->getField($prop['field']);
//        $type = $nextField->getType();
//
//        return $type::dependsOnOtherFields($nextEnum, $nextField);
//    }
//
//    public static function validateDependencies($enum, $field){
//        $prop =$field->getProperties();
//        $enums = Enums::getInstance();
//
//        $nextEnum = $enums->getEnum($prop['_enum']);
//        $nextField =$nextEnum->getField($prop['field']);
//        $type = $nextField->getType();
//
//        return $type::validateDependencies($nextEnum,$nextField);
//    }
//
//    public static function dependsOn($enum, $field, $onField){
//        $prop =$field->getProperties();
//        $enums = Enums::getInstance();
//
//        $nextEnum = $enums->getEnum($prop['_enum']);
//        $nextField =$nextEnum->getField($prop['field']);
//        $type = $nextField->getType();
//
//        return $type::dependsOn($nextEnum,$nextField, $onField);
//    }
//
//    public static function getDependencies($enum, $field)
//    {
//        $prop =$field->getProperties();
//        $enums = Enums::getInstance();
//
//        $nextEnum = $enums->getEnum($prop['_enum']);
//        $nextField =$nextEnum->getField($prop['field']);
//        $type = $nextField->getType();
//
//        return $type::getDependencies($nextEnum,$nextField);
//    }
//
//    public static function canChangeTo($enum, $field, $fromType, $toType){
//        $prop =$field->getProperties();
//        $enums = Enums::getInstance();
//
//        $nextEnum = $enums->getEnum($prop['_enum']);
//        $nextField =$nextEnum->getField($prop['field']);
//        $type = $nextField->getType();
//
//        return $type::canChangeTo($nextEnum,$nextField, $fromType, $toType);
//    }
//
//    public static function getAcceptedTypes($enum, $field){
//        $prop =$field->getProperties();
//        $enums = Enums::getInstance();
//
//        $nextEnum = $enums->getEnum($prop['_enum']);
//        $nextField =$nextEnum->getField($prop['field']);
//        $type = $nextField->getType();
//
//        return $type::getAcceptedTypes($nextEnum, $nextField);
//    }
//
//    public static function lazyInit($enum, $field){
//        $prop =$field->getProperties();
//        $enums = Enums::getInstance();
//
//        $nextEnum = $enums->getEnum($prop['_enum']);
//        $nextField =$nextEnum->getField($prop['field']);
//        $type = $nextField->getType();
//
//        return $type::lazyInit($nextEnum, $nextField);
//    }
//
    //funcion que solo se llama bajo demanda, o sea cuando se requiere el dato especifico de un campo formula
    //es costosa porque debe calcular todos los campos de la fila a la cual referencia para poder tener el campo que pide
    public static function evalFormula($enumInstance, $enum, $field, $record,$value, $connType){
        $value = $record[$field->getId()][BaseType::VALUE_TYPE_VALUE_HEADER];
        if ($value == -1) {
            return -1;
        }

        $prop =$field->getProperties();
        $enums = Enums::getInstance($enumInstance);

        $nextEnum = $enums->getEnumQuerier($prop['_enum']);
        $nextField =$nextEnum->getField($prop['field']);

        $data = $nextEnum->queryEnum(null, null, null, $value, $nextField->getId(), null, null, $nextField->getId(),
            null, null);
        $data = reset($data);

        $obj = array(
            BaseType::VALUE_TYPE_VALUE_HEADER => parent::getValueFromDB($enumInstance,$record, $value, $field, $connType),
            BaseType::REF_TYPE_VALUE_HEADER => $data[$nextField->getId()]
        );
        return $obj;
    }



}
<?php

/**
 * Created by PhpStorm.
 * User: mano
 * Date: 4/01/17
 * Time: 15:32
 */
require_once 'DB_Types/DB_String.php';
require_once 'DB_Types/DB_Bool.php';
require_once 'DB_Types/DB_Number.php';
require_once 'DB_Types/DB_Enum.php';
require_once 'DB_Types/DB_MapServer.php';
require_once 'DB_Types/DB_MathFormla.php';
require_once 'DB_Types/DB_GeoFormula.php';
require_once 'DB_Types/DB_EnumChooser.php';
require_once 'DB_Types/DB_Integration.php';
require_once 'DB_Types/DB_Date.php';
require_once 'DB_Types/DB_Integration.php';
require_once 'DB_Types/DB_Images.php';
require_once 'DB_Types/DB_Description.php';
require_once 'DB_Types/DB_RichText.php';
require_once 'DB_Types/DB_Table.php';

abstract class BaseType
{
    /**
     * Especifica que el tipo de valor es por valor y por tanto, se coge el valor de la base de datos
     * llamando a getValueFromDB.
     */
    const VALUE ="value";
    /**
     * Especifica que el tipo de valor es por referencia y por tanto, el valor obtenido con getValue, es
     * en realidad la referencia, ya que es el valor real que se guarda en bd. Para obtener el valor refe-
     * renciado, se debe llamar a getRefFromDB.
     */
    const REF   ='ref';
    const REF_VALUE_ID ="_32enum_REF_ID4792";
    
    const REF_TYPE_VALUE_HEADER = "displayField";
    const VALUE_TYPE_VALUE_HEADER = "valueField";
     
    private $connType;

    /**Devuelve una cadena conteniendo el tipo con el que $connType debe crear la tabla para guardar
     * el tipo implementado.
     * @param $enumInstance {string}
     * @param $connType {string}
     * @param $typeProperties   {obj}      Propiedades que especifican la configuracion del tipo.
     * @param $enum        {Enum}
     * @return string
     */
    public static function getDBTypeCreation($enumInstance,$connType,$typeProperties, $enum){}

    /**Devuelve el valor del tipo implementado con el formato del tipo de coneccion de base de datos.
     * @param $value       {string}     Valor a formatear.
     * @param $connType    {string}     Tipo de coneccion.Es uno de los tipos definidos en DBConnectionTypes. 
     * @return string
     */
    public static function getValueToDB($record, $value, $field, $connType){
        if(is_null($value) or $value === '')
            return 'null';
        return "'$value'";
    }

    /**Debe ser capaz de saber cuando el valor ya se modificó y no modificarlo de nuevo
     * 
     * @param $record
     * @param $value
     * @param $field
     * @param $connType
     * @param bool $needToEval
     * @return mixed
     */
    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType){
        return $value;
    }
    public static function getValueType(){
        return BaseType::VALUE;
    }
    public static function getDefaultValue($connType,$typeProperties ){
        return 'null';
    }
    
    public static function compareProperties($val1, $val2){
        return true;
    }
    
    public static function savedInBD(){
        return true;
    }
    
    public static function dependsOnOtherFields($enum,$field){
        return false;
    }
    public static function showInReport(){
        return true;
    }
}

class PrimaryKey extends BaseType{

    const ID = 'id_enum_1100';
    public static function getDBTypeCreation($enumInstance, $connType,$typeProperties, $enum)
    {
        if($connType == DBConnectionTypes::POSTGREE_9_1){
            return 'serial primary key';
        }
    }
}
class Revision extends BaseType{

    const ID = 'id_enum_rev_1100';
    public static function getDBTypeCreation($enumInstance=null, $connType=null,$typeProperties=null, $enum=null)
    {
        if($connType == DBConnectionTypes::POSTGREE_9_1){
            return 'bigint';
        }
    }
    public static function getValueToDB($record, $value, $field, $connType)
    {
        if(!is_numeric($value)){
            $value = -1;
        }
        return $value + 1;
    }
    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType)
    {
        if(!is_numeric($value)){
            $value = 0;
        }
        return $value;
    }
    public static function getDefaultValue($connType, $typeProperties)
    {
        return 0;
    }
}

abstract class FileType extends BaseType{

    public static function saveToDB(){}
    public static function uploadingFile($fieldName, $enumName, $row  ){
        
    }
    
}

abstract class DB_File extends FileType{

    public static function getDBTypeCreation($enumInstance, $connType,$typeProperties, $enum)
    {
        return 'text';
    }
    public static function saveToDB()
    {
        // TODO: Implement saveToDB() method.
    }

}

/**
 * Class Formula
 * Este tipo especifica un conjunto de tipos que dependen de otras columnas en el modelo de datos para poder
 * funcionar.
 * Se debe crear en el objeto de las propediades del tipo un atributo llamado depFields que debe tener un objeto
 * donde cada llave es el id de cada columna (que dependen de otras) de la cual depende dentro del nomenclador,
 * y otro atributo depdendencies donde se tenga los ids de todos los campos a los cuales se les referencia en la fórmula.
 */
abstract class Formula extends BaseType{
    public static function dependsOnOtherFields($enum, $field){
        return true;
    }

    /**
     * Funcion que se llama si dependsOnOtherFields deveulve true
     * @param $enum  {Enum}     Nomenclador que se esta analizando.
     * @param $field {Field}    Campo dentro del nomenclador que se esta analizando.
     * @return {bool}   O lanza el error si hubo alguno.
     */
    public static function validateDependencies($enumInstance,$enum, $field){}

    /**
     * Funcion que se llama si dependsOnOtherFields devuelve true para comprobar si este tipo depende de un campo en particular.
     * @param $enum     {Enum}      Nomenclador que se esta analizando.
     * @param $field    {Field}     Campo dentro del nomenclador que se esta analizando.
     * @param $onField  {Field}     Campo por quien se pregunta si este tipo depende de el.
     * @return bool
     */
    public static function dependsOn($enum, $field, $onField){}

    /** Función que se debe llamar si dependsOnOtherFields devuelve true.
     * @param $enum     {Enum}  Enum al cual pertenece field      
     * @param $field    {Field} Campo del cual se van a extraer las dependencias.
     * @return array            Arreglo con los id de los campos de los cuales $field depende
     */
    public static function getDependencies($enum, $field)
    {
        $prop = $field->getProperties();
        $dependencies = array();
        foreach ($prop['dependencies'] as $key => $value) {
            $dependencies[$key] = $key;
        }
        return $dependencies;
    }

    /**
     * Funcion que se llama si una columna es referenciada por un nomenclador que es usado en una formula.
     * Pregunta si el tipo puede ser cambiado a otro que tambien lo entienda la formula.
     * @param $fromType
     * @param $toType
     * @return mixed
     */
    public static function canChangeTo($enum, $field, $fromType, $toType){}

    /**
     * Funcion que se llama para saber que tipos son los que este campo es capaz de leer.
     * @return {String}
     */
    public static function getAcceptedTypes($enum, $field){}

    /**
     * Especifica si una formula por su complejidad en tiempo de cómputo necesita ser evaluada solo cuando lo pida el
     * usuario.
     * @return {bool}
     */
    public static function lazyInit($enum, $field){}

    /**
     * Función secundaria para evaluar una formula que es de tipo lazy.
     * @param $record {array}   Son todos los valores de la fila que se esta evaluando.
     * @param $value    {mixed} Es el valor guardado en base de datos del campo.
     * @param $field    {mixed} Son los metadatos del campo.
     * @param $connType {string}Es el tipo de coneccion a base de datos.
     * @return mixed            El objeto a interpetar por el renderizador en el grid del cliente. 
     */
    public static function evalFormula($enumInstance, $enum, $field, $record,$value, $connType){}
    

}



